const User = require('../models/User.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const StateProposal = require('../models/StateProposal.model');
const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  ROLES, ROLE_LEVELS, ROLE_LABELS, ROLE_ID_PREFIX,
  CAN_CREATE, DEFAULT_PASSWORD, canCreate, isOfficerRole,
} = require('../utils/roleHierarchy');
const { assertJurisdictionAccess, filterByJurisdiction } = require('../utils/jurisdiction');

/**
 * Auto-generate a unique Employee ID.
 * Format: PREFIX-LOCATION-SEQ  (e.g. SPO-PB-001, DNO-LDH-002)
 */
async function nextEmployeeId(role, locationCode) {
  const prefix = ROLE_ID_PREFIX[role];
  if (!prefix) return null;

  const pattern = locationCode ? `${prefix}-${locationCode}-` : `${prefix}-`;

  // Find all existing users with matching employeeId prefix
  const existing = await User.find({});
  const matchingIds = existing
    .filter((u) => u.employeeId && u.employeeId.startsWith(pattern))
    .map((u) => {
      const parts = u.employeeId.split('-');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });

  const nextSeq = matchingIds.length > 0 ? Math.max(...matchingIds) + 1 : 1;
  const seqStr = String(nextSeq).padStart(3, '0');
  return locationCode ? `${prefix}-${locationCode}-${seqStr}` : `${prefix}-${seqStr}`;
}

// POST /api/staff/create — Create a subordinate account
const createSubordinate = async (req, res, next) => {
  try {
    const creator = req.user;
    const { name, mobile, email, targetRole, state, district, centreId } = req.body;

    // ── Validate hierarchy ─────────────────────────────
    if (creator.role === ROLES.DISTRICT_OFFICER) {
      throw new ApiError(403, 'District Officers are not authorized to create officer accounts. Officer appointments must be proposed by State Officers.');
    }
    if (!targetRole) {
      throw new ApiError(400, 'Target role is required.');
    }
    if (!canCreate(creator.role, targetRole)) {
      const allowed = CAN_CREATE[creator.role] || [];
      throw new ApiError(403,
        `Your role (${ROLE_LABELS[creator.role]}) can only create: ${allowed.map((r) => ROLE_LABELS[r]).join(', ') || 'none'}.`
      );
    }
    if (!name || !name.trim()) {
      throw new ApiError(400, 'Name is required.');
    }

    // ── Check mobile uniqueness if provided ────────────
    if (mobile) {
      const existingMobile = await User.findOne({ mobile });
      if (existingMobile) {
        throw new ApiError(409, 'This mobile number is already registered.');
      }
    }

    // ── Determine location code for Employee ID ────────
    let locationCode = '';
    const roleLevel = ROLE_LEVELS[targetRole];

    if (roleLevel === 2) {
      // State officer: use 2-letter state abbreviation
      const stateVal = state || creator.state;
      if (!stateVal) throw new ApiError(400, 'State is required for this role.');
      locationCode = stateVal.substring(0, 3).toUpperCase();
    } else if (roleLevel === 3) {
      // District officer: use district abbreviation
      const districtVal = district || creator.district;
      if (!districtVal) throw new ApiError(400, 'District is required for this role.');
      locationCode = districtVal.substring(0, 3).toUpperCase();
    } else if (roleLevel >= 4) {
      // Centre-level roles: use centre code or district
      if (centreId) {
        const centre = await ProcurementCentre.findById(centreId);
        if (centre && centre.centreId) {
          // Use the centre's code (e.g. KPC-LDH-001 → LDH)
          const parts = centre.centreId.split('-');
          locationCode = parts.length >= 2 ? parts[1] : centre.district.substring(0, 3).toUpperCase();
        }
      }
      if (!locationCode) {
        const districtVal = district || creator.district;
        if (districtVal) locationCode = districtVal.substring(0, 3).toUpperCase();
      }
    }

    // ── Generate Employee ID ───────────────────────────
    const employeeId = await nextEmployeeId(targetRole, locationCode);

    // ── Inherit & Enforce location scope from creator ──
    const userState = state || creator.state;
    const userDistrict = district || creator.district;
    const userCentreId = centreId || creator.centreId;

    // Strict Jurisdiction Check: Cannot create officer outside creator's territory
    assertJurisdictionAccess(creator, {
      state: userState,
      district: userDistrict,
      centreId: userCentreId,
    });

    const isStateOfficer = creator.role === ROLES.STATE_OFFICER;
    const initialActive = !isStateOfficer;

    // ── Create user ────────────────────────────────────
    const user = await User.create({
      name: name.trim(),
      mobile: mobile || undefined,
      email: email?.toLowerCase() || undefined,
      password: DEFAULT_PASSWORD,
      role: targetRole,
      level: ROLE_LEVELS[targetRole],
      employeeId,
      parentId: creator._id,
      state: userState,
      district: userDistrict,
      centreId: userCentreId,
      mustChangePassword: true,
      isActive: initialActive,
    });

    // ── Create officer profile for centre-level / district roles ──
    if (userCentreId || roleLevel <= 3) {
      await OfficerProfile.create({
        userId: user._id,
        centreId: userCentreId || null,
        employeeId,
        designation: ROLE_LABELS[targetRole],
        state: userState,
        district: userDistrict,
      });

      // Add to centre's officerIds if active
      if (userCentreId && initialActive) {
        await ProcurementCentre.findByIdAndUpdate(userCentreId, {
          $addToSet: { officerIds: user._id },
        });
      }
    }

    if (isStateOfficer) {
      const proposal = await StateProposal.create({
        proposalId: `PROP-OFF-${Date.now().toString().slice(-4)}`,
        title: `[State Proposal] Appoint ${ROLE_LABELS[targetRole] || targetRole} - ${name.trim()}`,
        category: 'add_officer_staff',
        state: userState,
        department: 'Administration & Nodal Department',
        description: `State Officer ${creator.name} proposed appointing ${ROLE_LABELS[targetRole]} (${name.trim()}, Emp ID: ${employeeId}) for district ${userDistrict || 'N/A'}. Awaiting Central Officer approval.`,
        proposedBy: creator._id,
        proposedByName: creator.name,
        status: 'pending_central_approval',
        payload: {
          userId: user._id,
          name: name.trim(),
          email: email?.toLowerCase(),
          mobile,
          role: targetRole,
          state: userState,
          district: userDistrict,
          centreId: userCentreId,
          employeeId,
        },
      });

      // Notify Central Admins
      const centralAdmins = await User.find({ role: ROLES.CENTRAL_ADMIN });
      for (const admin of centralAdmins) {
        await Notification.create({
          userId: admin._id,
          type: 'general',
          title: `New Officer Proposal (${proposal.proposalId})`,
          message: `State Officer ${creator.name} (${userState}) proposed appointing ${ROLE_LABELS[targetRole]}: ${name.trim()}. Requires Central approval.`,
        });
      }

      return res.status(201).json(
        new ApiResponse(201, {
          user,
          employeeId,
          proposalId: proposal.proposalId,
          pendingApproval: true,
          defaultPassword: DEFAULT_PASSWORD,
          roleLabel: ROLE_LABELS[targetRole],
        }, `${ROLE_LABELS[targetRole]} proposal submitted! It will become active after Central Officer approval. Employee ID: ${employeeId}`)
      );
    }

    res.status(201).json(
      new ApiResponse(201, {
        user,
        employeeId,
        defaultPassword: DEFAULT_PASSWORD,
        roleLabel: ROLE_LABELS[targetRole],
      }, `${ROLE_LABELS[targetRole]} account created. Employee ID: ${employeeId}`)
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/staff/subordinates — Get direct subordinates of current user
const getSubordinates = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    let query = { parentId: req.user._id };

    if (req.user.role === ROLES.DISTRICT_OFFICER && req.user.district) {
      query = {
        $or: [
          { parentId: req.user._id },
          {
            district: new RegExp(`^${req.user.district}$`, 'i'),
            role: { $in: [ROLES.CENTRE_HEAD, ROLES.PROCUREMENT_OFFICER, ROLES.QUALITY_STAFF, ROLES.DATA_STAFF, ROLES.GATE_STAFF] },
            ...(req.user.state ? { state: new RegExp(`^${req.user.state}$`, 'i') } : {}),
          },
        ],
      };
    } else if (req.user.role === ROLES.STATE_OFFICER && req.user.state) {
      query = {
        $or: [
          { parentId: req.user._id },
          {
            state: new RegExp(`^${req.user.state}$`, 'i'),
            role: { $in: [ROLES.DISTRICT_OFFICER, ROLES.CENTRE_HEAD, ROLES.PROCUREMENT_OFFICER, ROLES.QUALITY_STAFF, ROLES.DATA_STAFF, ROLES.GATE_STAFF] },
          },
        ],
      };
    }

    const allUsers = await User.find(query).sort({ createdAt: -1 });

    let subordinates = allUsers;

    // Optional search filter
    if (search) {
      const s = search.toLowerCase();
      subordinates = subordinates.filter(
        (u) =>
          u.name?.toLowerCase().includes(s) ||
          u.employeeId?.toLowerCase().includes(s) ||
          u.mobile?.includes(s)
      );
    }

    const total = subordinates.length;
    const startIdx = (page - 1) * limit;
    subordinates = subordinates.slice(startIdx, startIdx + Number(limit));

    // Enrich with role labels
    subordinates = subordinates.map((u) => ({
      ...u.toJSON(),
      roleLabel: ROLE_LABELS[u.role] || u.role,
    }));

    res.json(new ApiResponse(200, {
      subordinates,
      pagination: { page: Number(page), limit: Number(limit), total },
    }));
  } catch (error) {
    next(error);
  }
};

// GET /api/staff/hierarchy — Get full hierarchy tree below current user
const getHierarchy = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Recursively build the tree
    async function buildTree(parentId) {
      const children = await User.find({ parentId });
      const tree = [];
      for (const child of children) {
        const subTree = await buildTree(child._id);
        tree.push({
          ...child.toJSON(),
          roleLabel: ROLE_LABELS[child.role] || child.role,
          subordinates: subTree,
          subordinateCount: subTree.length,
        });
      }
      return tree;
    }

    const hierarchy = await buildTree(userId);

    // Count totals at each level
    function countByRole(nodes) {
      const counts = {};
      for (const node of nodes) {
        counts[node.role] = (counts[node.role] || 0) + 1;
        const subCounts = countByRole(node.subordinates || []);
        for (const [role, count] of Object.entries(subCounts)) {
          counts[role] = (counts[role] || 0) + count;
        }
      }
      return counts;
    }

    const summary = countByRole(hierarchy);
    const summaryLabeled = Object.fromEntries(
      Object.entries(summary).map(([role, count]) => [ROLE_LABELS[role] || role, count])
    );

    res.json(new ApiResponse(200, {
      hierarchy,
      summary: summaryLabeled,
      totalSubordinates: Object.values(summary).reduce((a, b) => a + b, 0),
    }));
  } catch (error) {
    next(error);
  }
};

// PUT /api/staff/:id/toggle — Activate / deactivate a subordinate
const toggleSubordinate = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found.');

    // Verify the current user is an ancestor of the target
    let isAncestor = false;
    let current = user;
    while (current.parentId) {
      if (current.parentId.toString() === req.user._id.toString()) {
        isAncestor = true;
        break;
      }
      current = await User.findById(current.parentId);
      if (!current) break;
    }

    if (!isAncestor) {
      throw new ApiError(403, 'You can only manage accounts within your hierarchy.');
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json(new ApiResponse(200, { user },
      `Account ${user.isActive ? 'activated' : 'deactivated'}: ${user.name} (${user.employeeId || user.mobile})`
    ));
  } catch (error) {
    next(error);
  }
};

// PUT /api/staff/:id/reset-password — Reset a subordinate's password
const resetSubordinatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found.');

    // Verify hierarchy
    let isAncestor = false;
    let current = user;
    while (current.parentId) {
      if (current.parentId.toString() === req.user._id.toString()) {
        isAncestor = true;
        break;
      }
      current = await User.findById(current.parentId);
      if (!current) break;
    }

    if (!isAncestor) {
      throw new ApiError(403, 'You can only reset passwords for accounts within your hierarchy.');
    }

    user.password = DEFAULT_PASSWORD;
    user.mustChangePassword = true;
    await user.save();

    res.json(new ApiResponse(200, { defaultPassword: DEFAULT_PASSWORD },
      `Password reset to default for ${user.name} (${user.employeeId}). They must change it on next login.`
    ));
  } catch (error) {
    next(error);
  }
};

// GET /api/staff/creatable-roles — What roles can the current user create?
const getCreatableRoles = async (req, res, next) => {
  try {
    const creatableRoles = CAN_CREATE[req.user.role] || [];
    const roles = creatableRoles.map((role) => ({
      value: role,
      label: ROLE_LABELS[role],
      level: ROLE_LEVELS[role],
    }));

    res.json(new ApiResponse(200, { roles }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubordinate,
  getSubordinates,
  getHierarchy,
  toggleSubordinate,
  resetSubordinatePassword,
  getCreatableRoles,
};
