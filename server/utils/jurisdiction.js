const ApiError = require('./ApiError');
const { ROLES, ROLE_LEVELS } = require('./roleHierarchy');

/**
 * Normalizes text for case-insensitive matching.
 */
function norm(str) {
  return (str || '').trim().toLowerCase();
}

/**
 * Returns a database query filter object based on the user's role hierarchy & jurisdiction.
 * 
 * - Central Admin (Level 1): Returns {} (All India / unrestricted)
 * - State Officer (Level 2): Returns { state: regex }
 * - District Officer (Level 3): Returns { district: regex }
 * - Centre Head & Staff (Level 4-6): Returns { centreId: user.centreId }
 *
 * @param {Object} user - req.user object
 * @returns {Object} query filter snippet
 */
function getJurisdictionFilter(user) {
  if (!user) return {};

  const level = ROLE_LEVELS[user.role] || 99;

  // Level 1: Central Admin — All India access
  if (level === 1 || user.role === ROLES.CENTRAL_ADMIN) {
    return {};
  }

  // Level 2: State Officer — State level restriction
  if (level === 2 || user.role === ROLES.STATE_OFFICER) {
    if (!user.state) {
      throw new ApiError(400, 'Officer does not have an assigned state scope.');
    }
    return { state: new RegExp(`^${user.state}$`, 'i') };
  }

  // Level 3: District Officer — District level restriction
  if (level === 3 || user.role === ROLES.DISTRICT_OFFICER) {
    if (!user.district) {
      throw new ApiError(400, 'Officer does not have an assigned district scope.');
    }
    const filter = { district: new RegExp(`^${user.district}$`, 'i') };
    if (user.state) {
      filter.state = new RegExp(`^${user.state}$`, 'i');
    }
    return filter;
  }

  // Level 4-6: Mandi / Centre Head & Officers — Procurement Centre restriction
  if (user.centreId) {
    return { centreId: user.centreId };
  }

  // Fallback: If officer has district assigned, restrict to district
  if (user.district) {
    return { district: new RegExp(`^${user.district}$`, 'i') };
  }
  if (user.state) {
    return { state: new RegExp(`^${user.state}$`, 'i') };
  }

  return {};
}

/**
 * Checks whether a target location (state, district, centreId) is within the officer's jurisdiction.
 * Throws ApiError(403) if outside jurisdiction.
 *
 * @param {Object} user - Authorized req.user
 * @param {Object} location - { state, district, centreId }
 */
function assertJurisdictionAccess(user, { state, district, centreId } = {}) {
  if (!user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const level = ROLE_LEVELS[user.role] || 99;

  // Central Admin has unrestricted national access
  if (level === 1 || user.role === ROLES.CENTRAL_ADMIN) {
    return true;
  }

  // State Officer: Target state must match officer's state
  if (level === 2 || user.role === ROLES.STATE_OFFICER) {
    if (state && norm(state) !== norm(user.state)) {
      throw new ApiError(
        403,
        `Access denied. You can only manage resources in your assigned state (${user.state || 'N/A'}).`
      );
    }
    return true;
  }

  // District Officer: Target district must match officer's district
  if (level === 3 || user.role === ROLES.DISTRICT_OFFICER) {
    if (district && norm(district) !== norm(user.district)) {
      throw new ApiError(
        403,
        `Access denied. You can only manage resources in your assigned district (${user.district || 'N/A'}).`
      );
    }
    if (state && user.state && norm(state) !== norm(user.state)) {
      throw new ApiError(
        403,
        `Access denied. You can only manage resources in your assigned state (${user.state}).`
      );
    }
    return true;
  }

  // Centre Level Officer / Staff: Target centreId must match officer's centreId
  if (level >= 4) {
    if (user.centreId && centreId && String(centreId) !== String(user.centreId)) {
      throw new ApiError(
        403,
        'Access denied. You can only manage resources for your assigned procurement centre.'
      );
    }
    if (district && user.district && norm(district) !== norm(user.district)) {
      throw new ApiError(
        403,
        `Access denied. You can only manage resources within your district (${user.district}).`
      );
    }
    return true;
  }

  return true;
}

/**
 * Filter an array of in-memory records based on officer's jurisdiction.
 *
 * @param {Object} user - Authorized req.user
 * @param {Array} items - Array of items to filter
 * @param {Function} getLocation - Function returning { state, district, centreId } for each item
 * @returns {Array} Filtered items
 */
function filterByJurisdiction(user, items = [], getLocation = (item) => item) {
  if (!user || !Array.isArray(items)) return items;

  const level = ROLE_LEVELS[user.role] || 99;

  // Central Admin — all items
  if (level === 1 || user.role === ROLES.CENTRAL_ADMIN) {
    return items;
  }

  return items.filter((item) => {
    const loc = getLocation(item) || {};
    const itemState = loc.state;
    const itemDistrict = loc.district;
    const itemCentreId = loc.centreId;

    if (level === 2 || user.role === ROLES.STATE_OFFICER) {
      if (!user.state) return true;
      return Boolean(itemState && norm(itemState) === norm(user.state));
    }

    if (level === 3 || user.role === ROLES.DISTRICT_OFFICER) {
      if (!user.district) return true;
      const districtMatch = Boolean(itemDistrict && norm(itemDistrict) === norm(user.district));
      const stateMatch = user.state && itemState ? norm(itemState) === norm(user.state) : true;
      return districtMatch && stateMatch;
    }

    if (level >= 4) {
      if (user.centreId) {
        return itemCentreId ? String(itemCentreId) === String(user.centreId) : false;
      }
      if (user.district) {
        return itemDistrict ? norm(itemDistrict) === norm(user.district) : false;
      }
    }

    return true;
  });
}

module.exports = {
  getJurisdictionFilter,
  assertJurisdictionAccess,
  filterByJurisdiction,
};
