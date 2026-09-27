const ApiError = require('../utils/ApiError');
const { ROLES, ROLE_LEVELS, isOfficerRole } = require('../utils/roleHierarchy');

/**
 * Creates a middleware that restricts access to specified roles.
 * @param {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. This area requires ${roles.join(' or ')} access.`
        )
      );
    }
    next();
  };
};

/**
 * Middleware that requires the user to be at or above a given hierarchy level.
 * Lower level number = higher authority.
 * @param {number} maxLevel - Maximum level number allowed (inclusive)
 */
const requireLevel = (maxLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    const role = req.user.role === 'admin' ? ROLES.CENTRAL_ADMIN : req.user.role;
    const userLevel = ROLE_LEVELS[role] || (req.user.role === 'admin' ? 1 : 99);
    if (userLevel > maxLevel) {
      return next(
        new ApiError(403, 'Access denied. Insufficient authority level.')
      );
    }
    next();
  };
};

// ── Pre-built role guards ────────────────────────────────

/** Only farmer role */
const requireFarmer = requireRole(ROLES.FARMER);

/** Any officer-level role (all except farmer) */
const requireOfficerOrAbove = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }
  if (!isOfficerRole(req.user.role)) {
    return next(new ApiError(403, 'Access denied. Officer or above access required.'));
  }
  next();
};

/**
 * Officer + admin roles — backwards-compatible alias.
 * Allows procurement_officer, quality_staff, data_staff, gate_staff,
 * centre_head, district_officer, state_officer, central_admin.
 */
const requireOfficer = requireOfficerOrAbove;

/** Central admin only */
const requireAdmin = requireRole(ROLES.CENTRAL_ADMIN, 'admin');

/** Centre head or above (levels 1-4) */
const requireCentreHeadOrAbove = requireLevel(4);

/** District officer or above (levels 1-3) */
const requireDistrictOrAbove = requireLevel(3);

/** State officer or above (levels 1-2) */
const requireStateOrAbove = requireLevel(2);

module.exports = {
  requireRole,
  requireLevel,
  requireFarmer,
  requireOfficer,
  requireOfficerOrAbove,
  requireAdmin,
  requireCentreHeadOrAbove,
  requireDistrictOrAbove,
  requireStateOrAbove,
};
