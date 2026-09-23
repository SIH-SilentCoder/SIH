const User = require('../models/User.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const Booking = require('../models/Booking.model');
const Procurement = require('../models/Procurement.model');
const Payment = require('../models/Payment.model');
const Slot = require('../models/Slot.model');
const Crop = require('../models/Crop.model');
const State = require('../models/State.model');
const StateProposal = require('../models/StateProposal.model');
const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { startOfDay, endOfDay } = require('../utils/helpers');
const { ROLES, OFFICER_ROLES, ROLE_LABELS, ROLE_LEVELS, generateEmployeeId, canCreate, DEFAULT_PASSWORD } = require('../utils/roleHierarchy');
const { filterByJurisdiction } = require('../utils/jurisdiction');

// GET /api/admin/dashboard
const getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    const isStateOfficer = req.user.role === ROLES.STATE_OFFICER;
    const isDistrictOfficer = req.user.role === ROLES.DISTRICT_OFFICER;

    const stateRegex = (isStateOfficer || isDistrictOfficer) && req.user.state ? new RegExp(`^${req.user.state}$`, 'i') : null;
    const districtRegex = isDistrictOfficer && req.user.district ? new RegExp(`^${req.user.district}$`, 'i') : null;

    let userFilter = {};
    let centreFilter = { isActive: true };

    if (isStateOfficer) {
      if (stateRegex) {
        userFilter.state = stateRegex;
        centreFilter.state = stateRegex;
      }
    } else if (isDistrictOfficer) {
      if (districtRegex) {
        userFilter.district = districtRegex;
        centreFilter.district = districtRegex;
      }
      if (stateRegex) {
        userFilter.state = stateRegex;
        centreFilter.state = stateRegex;
      }
    }

    let jurisdictionCentres = [];
    let jurisdictionCentreIds = [];
    if (isStateOfficer || isDistrictOfficer) {
      jurisdictionCentres = await ProcurementCentre.find(centreFilter);
      jurisdictionCentreIds = jurisdictionCentres.map((c) => c._id);
    }

    const isJurisdictionScoped = isStateOfficer || isDistrictOfficer;
    const bookingScope = isJurisdictionScoped
      ? (jurisdictionCentreIds.length > 0 ? { centreId: { $in: jurisdictionCentreIds } } : { centreId: '__none__' })
      : {};

    const [
      totalFarmers,
      totalOfficers,
      totalCentres,
      totalBookings,
      todayBookings,
      completedProcurements,
      pendingProcurements,
      cancelledBookings,
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.FARMER, isActive: true, ...userFilter }),
      User.countDocuments({ role: { $in: OFFICER_ROLES }, isActive: true, ...userFilter }),
      ProcurementCentre.countDocuments(centreFilter),
      Booking.countDocuments(bookingScope),
      Booking.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd }, ...bookingScope }),
      Procurement.countDocuments({ status: 'completed', ...(jurisdictionCentreIds.length > 0 ? { centreId: { $in: jurisdictionCentreIds } } : (isJurisdictionScoped ? { centreId: '__none__' } : {})) }),
      Procurement.countDocuments({ status: 'pending', ...(jurisdictionCentreIds.length > 0 ? { centreId: { $in: jurisdictionCentreIds } } : (isJurisdictionScoped ? { centreId: '__none__' } : {})) }),
      Booking.countDocuments({ status: 'cancelled', ...bookingScope }),
    ]);

    // Jurisdiction-scoped payments
    let totalPaymentsPaid = 0;
    let totalPaymentsPending = 0;
    if (isJurisdictionScoped) {
      if (jurisdictionCentreIds.length > 0) {
        const centreBookings = await Booking.find({ centreId: { $in: jurisdictionCentreIds } });
        const bookingIds = centreBookings.map((b) => b._id);
        if (bookingIds.length > 0) {
          totalPaymentsPaid = await Payment.countDocuments({ status: 'paid', bookingId: { $in: bookingIds } });
          totalPaymentsPending = await Payment.countDocuments({ status: 'pending', bookingId: { $in: bookingIds } });
        }
      }
    } else {
      totalPaymentsPaid = await Payment.countDocuments({ status: 'paid' });
      totalPaymentsPending = await Payment.countDocuments({ status: 'pending' });
    }

    // Total procurement value
    const procMatch = { status: 'completed' };
    if (stateCentreIds.length > 0) procMatch.centreId = { $in: stateCentreIds };
    const [procValue] = await Procurement.aggregate([
      { $match: procMatch },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Last 7 days booking trends
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const bookingTrend = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, ...bookingScope } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Centre utilization
    const centreUtilization = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$centreId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'procurementcentres',
          localField: '_id',
          foreignField: '_id',
          as: 'centre',
        },
      },
      { $unwind: '$centre' },
      { $project: { name: '$centre.name', count: 1 } },
    ]);

    // Crop-wise procurement
    const cropStats = await Procurement.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$cropName',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    res.json(
      new ApiResponse(200, {
        summary: {
          totalFarmers,
          totalOfficers,
          totalCentres,
          totalBookings,
          todayBookings,
          completedProcurements,
          pendingProcurements,
          cancelledBookings,
          totalPaymentsPaid,
          totalPaymentsPending,
          totalProcurementValue: procValue?.total || 0,
        },
        bookingTrend,
        centreUtilization,
        cropStats,
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/farmers
const getFarmers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, district, isActive } = req.query;
    const filter = { role: ROLES.FARMER };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // State and District restriction
    if (req.user.role === ROLES.STATE_OFFICER && req.user.state) {
      filter.state = new RegExp(`^${req.user.state}$`, 'i');
      if (district) {
        filter.district = new RegExp(`^${district}$`, 'i');
      }
    } else if (req.user.role === ROLES.DISTRICT_OFFICER) {
      if (req.user.district) {
        filter.district = new RegExp(`^${req.user.district}$`, 'i');
      }
      if (req.user.state) {
        filter.state = new RegExp(`^${req.user.state}$`, 'i');
      }
    } else if (district) {
      filter.district = new RegExp(`^${district}$`, 'i');
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const userIds = users.map((u) => u._id);
    const profiles = await FarmerProfile.find({ userId: { $in: userIds } });

    const farmers = users.map((u) => ({
      user: u,
      profile: profiles.find((p) => p.userId.toString() === u._id.toString()) || null,
    }));

    const total = await User.countDocuments(filter);
    res.json(new ApiResponse(200, { farmers, pagination: { page: Number(page), limit: Number(limit), total } }));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/bookings
const getAllBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, centreId, date, search, cropId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (cropId) filter.cropId = cropId;

    // State restriction if user is State Officer
    if (req.user.role === ROLES.STATE_OFFICER && req.user.state) {
      const stateCentres = await ProcurementCentre.find({ state: new RegExp(`^${req.user.state}$`, 'i') });
      const stateCentreIds = stateCentres.map((c) => c._id);
      if (centreId) {
        if (!stateCentreIds.some((id) => String(id) === String(centreId))) {
          return res.json(new ApiResponse(200, { bookings: [], pagination: { page: Number(page), limit: Number(limit), total: 0 } }));
        }
        filter.centreId = centreId;
      } else {
        filter.centreId = stateCentreIds.length > 0 ? { $in: stateCentreIds } : '__none__';
      }
    } else if (req.user.role === ROLES.DISTRICT_OFFICER) {
      const distCentres = await ProcurementCentre.find({
        ...(req.user.district ? { district: new RegExp(`^${req.user.district}$`, 'i') } : {}),
        ...(req.user.state ? { state: new RegExp(`^${req.user.state}$`, 'i') } : {}),
      });
      const distCentreIds = distCentres.map((c) => c._id);
      if (centreId) {
        if (!distCentreIds.some((id) => String(id) === String(centreId))) {
          return res.json(new ApiResponse(200, { bookings: [], pagination: { page: Number(page), limit: Number(limit), total: 0 } }));
        }
        filter.centreId = centreId;
      } else {
        filter.centreId = distCentreIds.length > 0 ? { $in: distCentreIds } : '__none__';
      }
    } else if (centreId) {
      filter.centreId = centreId;
    }

    if (date) {
      const d = new Date(date);
      filter.bookingDate = { $gte: startOfDay(d), $lte: endOfDay(d) };
    }

    let bookings = await Booking.find(filter)
      .populate('farmerId', 'name mobile')
      .populate('centreId', 'name district')
      .populate('cropId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (search) {
      const s = search.toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.token?.toLowerCase().includes(s) ||
          b.bookingId?.toLowerCase().includes(s) ||
          b.farmerId?.name?.toLowerCase().includes(s)
      );
    }

    const total = await Booking.countDocuments(filter);
    res.json(new ApiResponse(200, { bookings, pagination: { page: Number(page), limit: Number(limit), total } }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/officers — legacy (admin only, kept for backward compatibility)
const createOfficer = async (req, res, next) => {
  try {
    const { name, mobile, email, password, centreId, employeeId, designation } = req.body;

    const existing = await User.findOne({ mobile });
    if (existing) throw new ApiError(409, 'This mobile number is already registered.');

    const user = await User.create({ name, mobile, email, password, role: ROLES.PROCUREMENT_OFFICER, level: 5 });
    const profile = await OfficerProfile.create({
      userId: user._id,
      centreId,
      employeeId,
      designation: designation || 'Procurement Officer',
    });

    if (centreId) {
      await ProcurementCentre.findByIdAndUpdate(centreId, { $addToSet: { officerIds: user._id } });
    }

    res.status(201).json(new ApiResponse(201, { user, profile }, 'Officer created successfully.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/officers/appoint — Appoint subordinate officers hierarchically
const appointOfficer = async (req, res, next) => {
  try {
    const { name, mobile, email, role, centreId, designation, district, state } = req.body;
    const creator = req.user;

    if (!name || !mobile || !role) {
      throw new ApiError(400, 'Name, mobile, and role are required.');
    }

    // District Officers are not permitted to appoint officers
    if (creator.role === ROLES.DISTRICT_OFFICER) {
      throw new ApiError(403, 'District Officers are not authorized to appoint officers. Officer appointments must be proposed by State Officers.');
    }

    // Validate that creator can create this role
    if (!canCreate(creator.role, role)) {
      throw new ApiError(
        403,
        `As ${ROLE_LABELS[creator.role] || creator.role}, you can only appoint: ${(require('../utils/roleHierarchy').CAN_CREATE[creator.role] || []).map(r => ROLE_LABELS[r] || r).join(', ')}`
      );
    }

    const isStateOfficer = creator.role === ROLES.STATE_OFFICER;

    // Strict state jurisdiction check for State Officer
    if (isStateOfficer) {
      if (!creator.state) {
        throw new ApiError(400, 'Your officer profile does not have an assigned state.');
      }
      if (state && state.trim().toLowerCase() !== creator.state.trim().toLowerCase()) {
        throw new ApiError(403, `Access denied. As State Officer, you can only appoint officers within your assigned state (${creator.state}).`);
      }
    }

    const existing = await User.findOne({ mobile });
    if (existing) throw new ApiError(409, 'This mobile number is already registered.');

    // If centreId provided, fetch centre for auto-filling jurisdiction
    let assignedCentre = null;
    const effectiveCentreId = centreId || (creator.role === ROLES.CENTRE_HEAD ? creator.centreId : null);
    if (effectiveCentreId) {
      assignedCentre = await ProcurementCentre.findById(effectiveCentreId);
      if (assignedCentre && isStateOfficer && assignedCentre.state.toLowerCase() !== creator.state.toLowerCase()) {
        throw new ApiError(403, `Access denied. Procurement centre "${assignedCentre.name}" is outside your state.`);
      }
    }

    // Determine jurisdiction — inherit from centre or creator if not provided
    const officerState = isStateOfficer ? creator.state : (state || assignedCentre?.state || creator.state || '');
    const officerDistrict = district || assignedCentre?.district || creator.district || '';
    const officerLevel = ROLE_LEVELS[role] || 5;

    // Auto-generate employee ID
    const locationCode = (officerDistrict.length >= 3 ? officerDistrict.slice(0, 3) : (officerState.slice(0, 2) || 'XX')).toUpperCase();
    const count = await User.countDocuments({ role, district: officerDistrict || { $exists: true } });
    const empId = generateEmployeeId(role, locationCode, count + 1);

    // Active status: Central Admin direct creations are ACTIVE immediately.
    // State Officer appointments require Central Officer approval before activation!
    const isDirectActive = !isStateOfficer;

    const user = await User.create({
      name,
      mobile,
      email: email || '',
      password: DEFAULT_PASSWORD,
      role,
      level: officerLevel,
      state: officerState,
      district: officerDistrict,
      centreId: effectiveCentreId || null,
      isActive: isDirectActive,
      mustChangePassword: true,
      employeeId: empId,
      parentId: creator._id,
    });

    const profile = await OfficerProfile.create({
      userId: user._id,
      centreId: effectiveCentreId || null,
      employeeId: empId,
      designation: designation || ROLE_LABELS[role] || 'Officer',
      state: officerState,
      district: officerDistrict,
    });

    if (effectiveCentreId) {
      await ProcurementCentre.findByIdAndUpdate(effectiveCentreId, { $addToSet: { officerIds: user._id } });
    }

    // If appointed by State Officer, route through Central Approval workflow
    if (isStateOfficer) {
      const countProp = await StateProposal.countDocuments();
      const proposalId = `PROP-${new Date().getFullYear()}-${String(countProp + 1).padStart(3, '0')}`;

      const proposal = await StateProposal.create({
        proposalId,
        state: officerState,
        department: creator.department || 'Procurement & Mandi Board',
        category: 'add_officer_staff',
        title: `Officer Appointment: ${name} (${ROLE_LABELS[role] || role}) - ${officerDistrict || officerState}`,
        description: `State Officer ${creator.name} (${officerState}) appointed ${name} as ${ROLE_LABELS[role] || role} for ${officerDistrict || officerState}. Requires Central Officer authorization to activate.`,
        proposedBy: creator._id,
        proposedByName: creator.name,
        proposedByEmpId: creator.employeeId,
        payload: {
          userId: user._id,
          name,
          mobile,
          email,
          role,
          level: officerLevel,
          state: officerState,
          district: officerDistrict,
          centreId: effectiveCentreId || null,
          designation: designation || ROLE_LABELS[role] || 'Officer',
          employeeId: empId,
        },
        status: 'pending_central_approval',
      });

      // Send high-priority alert notification to Central Admins
      const centralAdmins = await User.find({ role: ROLES.CENTRAL_ADMIN });
      for (const admin of centralAdmins) {
        await Notification.create({
          userId: admin._id,
          type: 'general',
          title: `New Officer Appointment Pending Approval (${proposalId})`,
          message: `State Officer ${creator.name} (${officerState}) submitted an officer appointment proposal for ${name} (${ROLE_LABELS[role] || role}). Central approval required.`,
          metadata: { proposalId: proposal._id, userId: user._id },
        });
      }

      return res.status(201).json(
        new ApiResponse(201, {
          user,
          profile,
          proposal,
          employeeId: empId,
          pendingApproval: true,
          defaultPassword: DEFAULT_PASSWORD,
        }, `Officer appointment submitted to Central Officer for approval. Employee ID: ${empId}. Account will become active once authorized by Central Officer.`)
      );
    }

    res.status(201).json(
      new ApiResponse(201, { user, profile, employeeId: empId, defaultPassword: DEFAULT_PASSWORD },
        `Officer appointed successfully. Employee ID: ${empId}, Default Password: ${DEFAULT_PASSWORD}`)
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/farmers/register — Officer registers a farmer manually
const registerFarmerByOfficer = async (req, res, next) => {
  try {
    const { name, mobile, email, state, district, village, address } = req.body;
    const officer = req.user;

    if (!name || !mobile) throw new ApiError(400, 'Farmer name and mobile number are required.');
    if (!/^[6-9]\d{9}$/.test(mobile)) throw new ApiError(400, 'Please provide a valid 10-digit mobile number.');

    const existing = await User.findOne({ mobile });
    if (existing) throw new ApiError(409, 'A user with this mobile number already exists.');

    const farmerState = (officer.role === ROLES.STATE_OFFICER || officer.role === ROLES.DISTRICT_OFFICER)
      ? officer.state
      : (state || officer.state || '');
    const farmerDistrict = (officer.role === ROLES.DISTRICT_OFFICER)
      ? officer.district
      : (district || officer.district || '');

    // Create user account
    const user = await User.create({
      name,
      mobile,
      email: email || '',
      password: mobile, // Default password = mobile number
      role: ROLES.FARMER,
      level: 7,
      state: farmerState,
      district: farmerDistrict,
      isActive: true,
      mustChangePassword: true,
    });

    // Create farmer profile
    const profile = await FarmerProfile.create({
      userId: user._id,
      state: farmerState,
      district: farmerDistrict,
      village: village || '',
      address: address || '',
      kycStatus: 'Not Started',
      isProfileComplete: false,
    });

    res.status(201).json(
      new ApiResponse(201,
        { user, profile, defaultPassword: mobile },
        `Farmer registered successfully. Default login password is mobile number: ${mobile}`
      )
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/officers
const getOfficers = async (req, res, next) => {
  try {
    const officerFilter = { role: { $in: OFFICER_ROLES } };

    // State and District restriction
    if (req.user.role === ROLES.STATE_OFFICER && req.user.state) {
      officerFilter.state = new RegExp(`^${req.user.state}$`, 'i');
    } else if (req.user.role === ROLES.DISTRICT_OFFICER) {
      const userDist = req.user.district;
      const userState = req.user.state;
      if (userState) {
        officerFilter.state = new RegExp(`^${userState}$`, 'i');
      }
      if (userDist) {
        const districtCentres = await ProcurementCentre.find({
          district: new RegExp(`^${userDist}$`, 'i'),
          ...(userState ? { state: new RegExp(`^${userState}$`, 'i') } : {})
        });
        const distCentreIds = districtCentres.map((c) => c._id);

        officerFilter.$or = [
          { district: new RegExp(`^${userDist}$`, 'i') },
          ...(distCentreIds.length > 0 ? [{ centreId: { $in: distCentreIds } }] : [])
        ];
      }
    }

    const officers = await User.find(officerFilter).sort({ createdAt: -1 });
    const userIds = officers.map((u) => u._id);
    const profiles = await OfficerProfile.find({ userId: { $in: userIds } })
      .populate('centreId', 'name district');

    const result = officers.map((u) => ({
      user: u,
      profile: profiles.find((p) => p.userId.toString() === u._id.toString()) || null,
    }));

    res.json(new ApiResponse(200, { officers: result }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/centres
const createCentre = async (req, res, next) => {
  try {
    const officer = req.user;
    const body = { ...req.body };

    // District Officers and Central Admins are not permitted to add centres directly
    if (officer.role === ROLES.DISTRICT_OFFICER) {
      throw new ApiError(403, 'District Officers are not authorized to create procurement centres.');
    }

    // Auto-fill district/state from officer profile if not provided
    if (!body.district && officer.district) body.district = officer.district;
    if (!body.state && officer.state) body.state = officer.state;

    // State Officer restriction: can only create within their state
    if (officer.role === ROLES.STATE_OFFICER) {
      if (body.state && body.state.trim().toLowerCase() !== officer.state.trim().toLowerCase()) {
        throw new ApiError(403, `Access denied. You can only create procurement centres in your assigned state (${officer.state}).`);
      }
      body.state = officer.state;
    }

    if (!body.district || !body.state) {
      throw new ApiError(400, 'District and State are required to create a procurement centre.');
    }
    if (!body.name) throw new ApiError(400, 'Centre name is required.');
    if (!body.address) throw new ApiError(400, 'Centre address is required.');

    // Auto-generate a unique centreId
    const distCode = (body.district.slice(0, 3)).toUpperCase();
    const count = await ProcurementCentre.countDocuments({ district: body.district });
    body.centreId = body.centreId || `KPC-${distCode}-${String(count + 1).padStart(3, '0')}`;

    const isStateOfficer = officer.role === ROLES.STATE_OFFICER;
    // State Officer's centre is created in inactive state pending Central Officer approval
    body.isActive = !isStateOfficer;

    const centre = await ProcurementCentre.create(body);

    if (isStateOfficer) {
      const countProp = await StateProposal.countDocuments();
      const proposalId = `PROP-${new Date().getFullYear()}-${String(countProp + 1).padStart(3, '0')}`;

      const proposal = await StateProposal.create({
        proposalId,
        state: body.state,
        department: officer.department || 'Procurement & Mandi Board',
        category: 'add_mandi',
        title: `New Mandi Setup: ${body.name} (${body.district})`,
        description: `State Officer ${officer.name} (${body.state}) submitted new procurement centre ${body.name} in ${body.district}. Requires Central Officer authorization to activate.`,
        proposedBy: officer._id,
        proposedByName: officer.name,
        proposedByEmpId: officer.employeeId,
        payload: {
          centreDbId: centre._id,
          ...body,
        },
        status: 'pending_central_approval',
      });

      // Send high-priority alert notification to Central Admins
      const centralAdmins = await User.find({ role: ROLES.CENTRAL_ADMIN });
      for (const admin of centralAdmins) {
        await Notification.create({
          userId: admin._id,
          type: 'general',
          title: `New Mandi Pending Central Approval (${proposalId})`,
          message: `State Officer ${officer.name} (${body.state}) submitted a new procurement centre: "${body.name}" (${body.district}). Central authorization required to activate.`,
          metadata: { proposalId: proposal._id, centreId: centre._id },
        });
      }

      return res.status(201).json(
        new ApiResponse(201, { centre, proposal, pendingApproval: true },
          `Procurement centre created and submitted for Central Officer approval. Centre ID: ${centre.centreId}. Centre will become active once approved by Central Officer.`)
      );
    }

    res.status(201).json(new ApiResponse(201, { centre }, 'Procurement centre created successfully.'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/centres/:id
const updateCentre = async (req, res, next) => {
  try {
    const existing = await ProcurementCentre.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Centre not found.');

    if (req.user.role === ROLES.STATE_OFFICER && existing.state?.toLowerCase() !== req.user.state?.toLowerCase()) {
      throw new ApiError(403, `Access denied. You can only manage centres in your assigned state (${req.user.state}).`);
    }

    const centre = await ProcurementCentre.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(new ApiResponse(200, { centre }, 'Procurement centre updated successfully.'));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/centres/:id
const deleteCentre = async (req, res, next) => {
  try {
    const centre = await ProcurementCentre.findById(req.params.id);
    if (!centre) throw new ApiError(404, 'Centre not found.');

    if (req.user.role === ROLES.STATE_OFFICER && centre.state?.toLowerCase() !== req.user.state?.toLowerCase()) {
      throw new ApiError(403, `Access denied. You can only manage centres in your assigned state (${req.user.state}).`);
    }

    centre.isActive = false;
    await centre.save();
    res.json(new ApiResponse(200, { centre }, 'Procurement centre deactivated successfully.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/slots/generate - Bulk slot generation for a centre
const generateSlots = async (req, res, next) => {
  try {
    const { centreId, startDate, endDate, slotDurationMinutes, capacityPerSlot } = req.body;
    const centre = await ProcurementCentre.findById(centreId);
    if (!centre) throw new ApiError(404, 'Centre not found.');

    const slots = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    const duration = slotDurationMinutes || centre.slotDurationMinutes || 60;
    const capacity = capacityPerSlot || Math.floor(centre.dailyCapacity / (8 * 60 / duration));

    while (current <= end) {
      const [startH, startM] = centre.operatingHours.start.split(':').map(Number);
      const [endH, endM] = centre.operatingHours.end.split(':').map(Number);

      let slotStart = startH * 60 + startM;
      const slotEnd = endH * 60 + endM;

      while (slotStart + duration <= slotEnd) {
        const startTime = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
        const endTime = `${String(Math.floor((slotStart + duration) / 60)).padStart(2, '0')}:${String((slotStart + duration) % 60).padStart(2, '0')}`;

        // Skip if slot already exists
        const exists = await Slot.findOne({ centreId, date: new Date(current), startTime });
        if (!exists) {
          slots.push({
            centreId,
            date: new Date(current),
            startTime,
            endTime,
            capacity,
            booked: 0,
            status: 'available',
          });
        }
        slotStart += duration;
      }
      current.setDate(current.getDate() + 1);
    }

    if (slots.length > 0) {
      await Slot.insertMany(slots);
    }

    res.status(201).json(new ApiResponse(201, { created: slots.length }, `${slots.length} slots generated.`));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/crops
const getCrops = async (req, res, next) => {
  try {
    const crops = await Crop.find().sort({ name: 1 });
    res.json(new ApiResponse(200, { crops }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/crops
const createCrop = async (req, res, next) => {
  try {
    const crop = await Crop.create(req.body);
    res.status(201).json(new ApiResponse(201, { crop }, 'Crop created.'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/crops/:id
const updateCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!crop) throw new ApiError(404, 'Crop not found.');
    res.json(new ApiResponse(200, { crop }, 'Crop updated.'));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/crops/:id
const deleteCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!crop) throw new ApiError(404, 'Crop not found.');
    res.json(new ApiResponse(200, { crop }, 'Crop deactivated successfully.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const bookingsByDay = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'procurement_completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const topCrops = await Procurement.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$cropName', quantity: { $sum: '$quantity' }, value: { $sum: '$totalAmount' } } },
      { $sort: { value: -1 } },
      { $limit: 5 },
    ]);

    res.json(new ApiResponse(200, { bookingsByDay, paymentStats, topCrops }));
  } catch (error) {
    next(error);
  }
};

// Toggle farmer active status
const toggleFarmerStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== ROLES.FARMER) throw new ApiError(404, 'Farmer not found.');
    user.isActive = !user.isActive;
    await user.save();
    res.json(new ApiResponse(200, { user }, `Farmer account ${user.isActive ? 'activated' : 'deactivated'}.`));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/states
const createState = async (req, res, next) => {
  try {
    const { name, code, zone, nodalHeadName, nodalHeadMobile, nodalHeadEmail, description } = req.body;
    if (!name || !code) throw new ApiError(400, 'State name and code are required.');

    const existing = await State.findOne({ $or: [{ name }, { code }] });
    if (existing) throw new ApiError(409, 'A state with this name or code already exists.');

    const stateRecord = await State.create({
      name,
      code: code.toUpperCase(),
      zone: zone || 'North',
      nodalHeadName,
      nodalHeadMobile,
      nodalHeadEmail,
      description,
      isActive: true,
    });

    res.status(201).json(new ApiResponse(201, { state: stateRecord }, 'State added to national network successfully.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/states
const getStates = async (req, res, next) => {
  try {
    const states = await State.find().sort({ name: 1 });

    const result = await Promise.all(
      states.map(async (st) => {
        const officerCount = await User.countDocuments({ state: new RegExp(`^${st.name}$`, 'i'), role: { $in: OFFICER_ROLES } });
        const centreCount = await ProcurementCentre.countDocuments({ state: new RegExp(`^${st.name}$`, 'i') });
        return {
          ...st.toObject(),
          officerCount,
          centreCount,
        };
      })
    );

    res.json(new ApiResponse(200, { states: result }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/state-officers
const createStateOfficer = async (req, res, next) => {
  try {
    const { name, mobile, email, password, state, department, departmentRole, designation } = req.body;
    if (!name || !mobile || !state) throw new ApiError(400, 'Officer name, mobile, and state are required.');

    const existing = await User.findOne({ mobile });
    if (existing) throw new ApiError(409, 'This mobile number is already registered.');

    const count = await User.countDocuments({ role: ROLES.STATE_OFFICER, state: new RegExp(`^${state}$`, 'i') });
    const locationCode = (state.length >= 2 ? state.slice(0, 2) : 'ST').toUpperCase();
    const empId = generateEmployeeId(ROLES.STATE_OFFICER, locationCode, count + 1);

    const user = await User.create({
      name,
      mobile,
      email,
      password: password || 'Kisan@123',
      role: ROLES.STATE_OFFICER,
      level: 2,
      state,
      department: department || 'Administration & Nodal Department',
      departmentRole: departmentRole || 'State Nodal Officer',
      employeeId: empId,
      isActive: true,
      mustChangePassword: true,
    });

    const profile = await OfficerProfile.create({
      userId: user._id,
      employeeId: empId,
      designation: designation || 'State Procurement / Nodal Officer',
    });

    res.status(201).json(new ApiResponse(201, { user, profile }, `State Officer account created for ${state} with Employee ID ${empId}.`));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getFarmers,
  getAllBookings,
  createOfficer,
  appointOfficer,
  registerFarmerByOfficer,
  getOfficers,
  createCentre,
  updateCentre,
  deleteCentre,
  generateSlots,
  getCrops,
  createCrop,
  updateCrop,
  deleteCrop,
  getAnalytics,
  toggleFarmerStatus,
  createState,
  getStates,
  createStateOfficer,
};
