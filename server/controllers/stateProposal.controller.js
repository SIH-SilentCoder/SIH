const StateProposal = require('../models/StateProposal.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const User = require('../models/User.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const Crop = require('../models/Crop.model');
const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES, generateEmployeeId } = require('../utils/roleHierarchy');
const { assertJurisdictionAccess } = require('../utils/jurisdiction');

// Helper to generate proposal tracking ID
async function generateProposalId() {
  const count = await StateProposal.countDocuments();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(3, '0');
  return `PROP-${year}-${seq}`;
}

// POST /api/state-proposals
const createProposal = async (req, res, next) => {
  try {
    const { category, title, description, department, payload } = req.body;
    const user = req.user;

    if (!category || !title || !payload) {
      throw new ApiError(400, 'Category, title, and payload are required.');
    }

    const state = user.state || payload.state;
    if (!state && user.role !== ROLES.CENTRAL_ADMIN) {
      throw new ApiError(400, 'Officer state scope is required to submit proposals.');
    }

    const proposalId = await generateProposalId();

    const proposal = await StateProposal.create({
      proposalId,
      state: state || 'National',
      department: department || user.department || 'Procurement & Mandi Board',
      category,
      title,
      description,
      proposedBy: user._id,
      proposedByName: user.name,
      proposedByEmpId: user.employeeId || 'SPO-001',
      payload,
      status: 'pending_central_approval',
    });

    // Notify Central Admins
    const centralAdmins = await User.find({ role: ROLES.CENTRAL_ADMIN });
    for (const admin of centralAdmins) {
      await Notification.create({
        userId: admin._id,
        type: 'general',
        title: `New State Proposal Pending Approval (${proposalId})`,
        message: `State Officer ${user.name} (${state}) submitted a new proposal: "${title}". Central approval required.`,
        metadata: { centreId: payload.centreId || null },
      });
    }

    res.status(201).json(new ApiResponse(201, { proposal }, 'State proposal submitted for Central Officer approval.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/state-proposals
const getProposals = async (req, res, next) => {
  try {
    const { status, category, state, search } = req.query;
    const user = req.user;

    const filter = {};

    // State restriction if user is State Officer
    if (user.role === ROLES.STATE_OFFICER) {
      filter.state = new RegExp(`^${user.state}$`, 'i');
    } else if (state) {
      filter.state = new RegExp(`^${state}$`, 'i');
    }

    if (status) filter.status = status;
    if (category) filter.category = category;

    let proposals = await StateProposal.find(filter)
      .populate('proposedBy', 'name email mobile employeeId role department')
      .sort({ createdAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      proposals = proposals.filter(
        (p) =>
          p.proposalId?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.state?.toLowerCase().includes(q) ||
          p.proposedByName?.toLowerCase().includes(q)
      );
    }

    res.json(new ApiResponse(200, { proposals }));
  } catch (error) {
    next(error);
  }
};

// GET /api/state-proposals/:id
const getProposalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let proposal = await StateProposal.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { proposalId: id }],
    }).populate('proposedBy', 'name email mobile employeeId role department');

    if (!proposal) throw new ApiError(404, 'Proposal not found.');

    assertJurisdictionAccess(req.user, { state: proposal.state });

    res.json(new ApiResponse(200, { proposal }));
  } catch (error) {
    next(error);
  }
};

// PUT /api/state-proposals/:id (State Officer updates payload and re-submits)
const updateAndResubmit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, payload, revisionNote } = req.body;

    const proposal = await StateProposal.findById(id);
    if (!proposal) throw new ApiError(404, 'Proposal not found.');

    assertJurisdictionAccess(req.user, { state: proposal.state });

    if (proposal.status === 'approved') {
      throw new ApiError(400, 'Cannot edit an already approved proposal.');
    }

    if (title) proposal.title = title;
    if (description) proposal.description = description;
    if (payload) proposal.payload = payload;

    proposal.status = 'pending_central_approval';

    if (revisionNote) {
      proposal.feedbackHistory.push({
        senderId: req.user._id,
        senderName: req.user.name,
        senderRole: req.user.role,
        message: `[State Officer Revision]: ${revisionNote}`,
      });
    }

    await proposal.save();

    // Notify Central Admins
    const centralAdmins = await User.find({ role: ROLES.CENTRAL_ADMIN });
    for (const admin of centralAdmins) {
      await Notification.create({
        userId: admin._id,
        type: 'general',
        title: `Proposal Revised & Re-submitted (${proposal.proposalId})`,
        message: `State Officer ${req.user.name} (${proposal.state}) updated proposal "${proposal.title}" based on feedback.`,
      });
    }

    res.json(new ApiResponse(200, { proposal }, 'Proposal revised and re-submitted for Central approval.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/state-proposals/:id/reply-feedback (Central Officer sends Reply SMS / Feedback)
const sendCentralFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      throw new ApiError(400, 'Feedback message is required.');
    }

    const proposal = await StateProposal.findById(id);
    if (!proposal) throw new ApiError(404, 'Proposal not found.');

    proposal.feedbackHistory.push({
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: 'Central Officer (CPO)',
      message: message.trim(),
    });

    proposal.status = 'changes_requested';
    await proposal.save();

    // Send Notification + Simulated SMS to State Officer
    if (proposal.proposedBy) {
      await Notification.create({
        userId: proposal.proposedBy,
        type: 'general',
        title: `Central Officer SMS Reply (${proposal.proposalId})`,
        message: `Central Officer (${req.user.name}) requested changes: "${message}". Please update the proposal details and re-submit.`,
        deliveryStatus: { inApp: true, sms: true, push: true },
      });
    }

    res.json(new ApiResponse(200, { proposal }, 'Reply SMS & feedback sent to State Officer successfully. Status set to Changes Requested.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/state-proposals/:id/approve (Central Officer approves & executes changes live)
const approveProposal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const proposal = await StateProposal.findById(id);
    if (!proposal) throw new ApiError(404, 'Proposal not found.');

    if (proposal.status === 'approved') {
      throw new ApiError(400, 'Proposal is already approved.');
    }

    const payload = proposal.payload || {};
    let executedRecord = null;

    // Execute live database insertion based on category
    if (proposal.category === 'add_mandi') {
      executedRecord = await ProcurementCentre.create({
        name: payload.name,
        code: payload.code || `MND-${Date.now().toString().slice(-4)}`,
        state: proposal.state,
        district: payload.district,
        address: payload.address || `${payload.district}, ${proposal.state}`,
        pincode: payload.pincode || '141001',
        dailyCapacity: Number(payload.dailyCapacity) || 100,
        operatingHours: payload.operatingHours || { start: '08:00', end: '18:00' },
        slotDurationMinutes: Number(payload.slotDurationMinutes) || 60,
        availableCrops: payload.availableCrops || [],
        isActive: true,
      });
    } else if (proposal.category === 'add_officer_staff') {
      const existingUser = await User.findOne({ mobile: payload.mobile });
      if (existingUser) {
        throw new ApiError(409, `User with mobile number ${payload.mobile} already exists.`);
      }

      const role = payload.role || ROLES.DISTRICT_OFFICER;
      const count = await User.countDocuments({ role });
      const empId = payload.employeeId || generateEmployeeId(role, payload.districtCode || proposal.state.slice(0, 2).toUpperCase(), count + 1);

      executedRecord = await User.create({
        name: payload.name,
        mobile: payload.mobile,
        email: payload.email,
        password: payload.password || 'Kisan@123',
        role,
        level: role === ROLES.DISTRICT_OFFICER ? 3 : 5,
        state: proposal.state,
        district: payload.district,
        department: payload.department || proposal.department,
        departmentRole: payload.departmentRole || 'Officer',
        employeeId: empId,
        isActive: true,
        mustChangePassword: true,
      });

      await OfficerProfile.create({
        userId: executedRecord._id,
        centreId: payload.centreId || null,
        employeeId: empId,
        designation: payload.designation || 'District Nodal Officer',
      });
    } else if (proposal.category === 'add_crop') {
      const existingCrop = await Crop.findOne({ name: payload.name });
      if (existingCrop) {
        throw new ApiError(409, `Crop "${payload.name}" already exists.`);
      }
      executedRecord = await Crop.create({
        name: payload.name,
        nameHindi: payload.nameHindi || payload.name,
        mspPrice: Number(payload.mspPrice) || 2200,
        unit: payload.unit || 'quintal',
        season: payload.season || 'Rabi',
        category: payload.category || 'Cereal',
        description: payload.description || `State approved crop for ${proposal.state}`,
        isActive: true,
      });
    } else if (proposal.category === 'add_district') {
      // Create District Lead Officer account & register district reference
      const empId = `DNO-${(payload.districtName || 'DIST').slice(0, 3).toUpperCase()}-001`;
      executedRecord = await User.create({
        name: payload.nodalOfficerName || `District Officer ${payload.districtName}`,
        mobile: payload.contactMobile || `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: payload.contactEmail || `dno.${payload.districtName.toLowerCase()}@gov.in`,
        password: 'Kisan@123',
        role: ROLES.DISTRICT_OFFICER,
        level: 3,
        state: proposal.state,
        district: payload.districtName,
        department: proposal.department || 'Administration & Nodal Department',
        departmentRole: 'District Nodal Officer',
        employeeId: empId,
        isActive: true,
      });
    }

    proposal.status = 'approved';
    proposal.appliedAt = new Date();
    proposal.appliedBy = req.user._id;

    if (remarks) {
      proposal.feedbackHistory.push({
        senderId: req.user._id,
        senderName: req.user.name,
        senderRole: 'Central Officer (CPO)',
        message: `[Approval Order]: ${remarks}`,
      });
    }

    await proposal.save();

    // Notify State Officer
    if (proposal.proposedBy) {
      await Notification.create({
        userId: proposal.proposedBy,
        type: 'general',
        title: `Proposal Approved! (${proposal.proposalId})`,
        message: `Central Officer approved your proposal "${proposal.title}". The changes are now LIVE in the database system.`,
        deliveryStatus: { inApp: true, sms: true, push: true },
      });
    }

    res.json(
      new ApiResponse(
        200,
        { proposal, executedRecord },
        `Proposal ${proposal.proposalId} approved by Central Officer and applied live to database system.`
      )
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/state-proposals/:id/reject
const rejectProposal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const proposal = await StateProposal.findById(id);
    if (!proposal) throw new ApiError(404, 'Proposal not found.');

    proposal.status = 'rejected';

    if (remarks) {
      proposal.feedbackHistory.push({
        senderId: req.user._id,
        senderName: req.user.name,
        senderRole: 'Central Officer (CPO)',
        message: `[Rejection Order]: ${remarks}`,
      });
    }

    await proposal.save();

    if (proposal.proposedBy) {
      await Notification.create({
        userId: proposal.proposedBy,
        type: 'general',
        title: `Proposal Rejected (${proposal.proposalId})`,
        message: `Your proposal "${proposal.title}" was rejected by Central Officer. Reason: ${remarks || 'Non-compliant specifications.'}`,
      });
    }

    res.json(new ApiResponse(200, { proposal }, 'Proposal marked as rejected.'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProposal,
  getProposals,
  getProposalById,
  updateAndResubmit,
  sendCentralFeedback,
  approveProposal,
  rejectProposal,
};
