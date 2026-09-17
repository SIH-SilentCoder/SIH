/**
 * Role Hierarchy for Kisan Procurement Connect
 * ─────────────────────────────────────────────
 * Level 1 — Central Procurement Organization
 * Level 2 — State Procurement / Nodal Department
 * Level 3 — District Nodal Officer
 * Level 4 — Mandi/Centre Level – Procurement Center Head
 * Level 5 — Procurement Officer | Quality & Weighing Staff | Data/System Staff
 * Level 6 — Gate / Verification Staff
 * Level 7 — Farmer (self-registration only)
 */

const ROLES = {
  CENTRAL_ADMIN: 'central_admin',
  STATE_OFFICER: 'state_officer',
  DISTRICT_OFFICER: 'district_officer',
  CENTRE_HEAD: 'centre_head',
  PROCUREMENT_OFFICER: 'procurement_officer',
  QUALITY_STAFF: 'quality_staff',
  DATA_STAFF: 'data_staff',
  GATE_STAFF: 'gate_staff',
  FARMER: 'farmer',
};

/** Numeric level for each role (lower = higher authority). */
const ROLE_LEVELS = {
  [ROLES.CENTRAL_ADMIN]: 1,
  [ROLES.STATE_OFFICER]: 2,
  [ROLES.DISTRICT_OFFICER]: 3,
  [ROLES.CENTRE_HEAD]: 4,
  [ROLES.PROCUREMENT_OFFICER]: 5,
  [ROLES.QUALITY_STAFF]: 5,
  [ROLES.DATA_STAFF]: 5,
  [ROLES.GATE_STAFF]: 6,
  [ROLES.FARMER]: 7,
};

/** Human-readable label for each role. */
const ROLE_LABELS = {
  [ROLES.CENTRAL_ADMIN]: 'Central Procurement Organization',
  [ROLES.STATE_OFFICER]: 'State Procurement / Nodal Department',
  [ROLES.DISTRICT_OFFICER]: 'District Nodal Officer',
  [ROLES.CENTRE_HEAD]: 'Procurement Center Head',
  [ROLES.PROCUREMENT_OFFICER]: 'Procurement Officer',
  [ROLES.QUALITY_STAFF]: 'Quality & Weighing Staff',
  [ROLES.DATA_STAFF]: 'Data / System Staff',
  [ROLES.GATE_STAFF]: 'Gate / Verification Staff',
  [ROLES.FARMER]: 'Farmer',
};

/** Prefix used when auto-generating Employee IDs. */
const ROLE_ID_PREFIX = {
  [ROLES.CENTRAL_ADMIN]: 'CPO',
  [ROLES.STATE_OFFICER]: 'SPO',
  [ROLES.DISTRICT_OFFICER]: 'DNO',
  [ROLES.CENTRE_HEAD]: 'PCH',
  [ROLES.PROCUREMENT_OFFICER]: 'PO',
  [ROLES.QUALITY_STAFF]: 'QWS',
  [ROLES.DATA_STAFF]: 'DSS',
  [ROLES.GATE_STAFF]: 'GVS',
};

/**
 * Which roles each role is allowed to create.
 * For example central_admin can create state_officer accounts.
 */
const CAN_CREATE = {
  [ROLES.CENTRAL_ADMIN]: [ROLES.STATE_OFFICER],
  [ROLES.STATE_OFFICER]: [ROLES.DISTRICT_OFFICER],
  [ROLES.DISTRICT_OFFICER]: [ROLES.CENTRE_HEAD],
  [ROLES.CENTRE_HEAD]: [
    ROLES.PROCUREMENT_OFFICER,
    ROLES.QUALITY_STAFF,
    ROLES.DATA_STAFF,
    ROLES.GATE_STAFF,
  ],
  [ROLES.PROCUREMENT_OFFICER]: [],
  [ROLES.QUALITY_STAFF]: [],
  [ROLES.DATA_STAFF]: [],
  [ROLES.GATE_STAFF]: [],
  [ROLES.FARMER]: [],
};

/** All roles that use Employee ID login (everything except farmer). */
const OFFICER_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.FARMER);

/** All officer-level roles that have management authority. */
const MANAGEMENT_ROLES = [
  ROLES.CENTRAL_ADMIN,
  ROLES.STATE_OFFICER,
  ROLES.DISTRICT_OFFICER,
  ROLES.CENTRE_HEAD,
];

/** Default password for auto-created officer accounts. */
const DEFAULT_PASSWORD = 'Kisan@123';

/**
 * Generate a sequential Employee ID.
 * @param {string} role - One of ROLES.*
 * @param {string} [locationCode] - e.g. 'PB' for Punjab, 'LDH' for Ludhiana
 * @param {number} sequence - Sequential number (padded to 3 digits)
 * @returns {string} e.g. 'SPO-PB-001'
 */
function generateEmployeeId(role, locationCode, sequence) {
  const prefix = ROLE_ID_PREFIX[role];
  if (!prefix) return null; // farmers don't get employee IDs
  const seqStr = String(sequence).padStart(3, '0');
  return locationCode ? `${prefix}-${locationCode}-${seqStr}` : `${prefix}-${seqStr}`;
}

/**
 * Check whether `creatorRole` is allowed to create `targetRole`.
 */
function canCreate(creatorRole, targetRole) {
  return (CAN_CREATE[creatorRole] || []).includes(targetRole);
}

/**
 * Check whether a role is at or above a given level.
 */
function isAtOrAboveLevel(role, level) {
  return (ROLE_LEVELS[role] || 99) <= level;
}

/**
 * Check whether role is an officer-level role (login via employeeId).
 */
function isOfficerRole(role) {
  return OFFICER_ROLES.includes(role);
}

module.exports = {
  ROLES,
  ROLE_LEVELS,
  ROLE_LABELS,
  ROLE_ID_PREFIX,
  CAN_CREATE,
  OFFICER_ROLES,
  MANAGEMENT_ROLES,
  DEFAULT_PASSWORD,
  generateEmployeeId,
  canCreate,
  isAtOrAboveLevel,
  isOfficerRole,
  STATE_DEPARTMENTS: [
    { id: 'agriculture', name: 'Agriculture & Crop Management', code: 'AGR' },
    { id: 'procurement', name: 'Procurement & Mandi Board', code: 'PRC' },
    { id: 'logistics', name: 'Logistics & Warehousing', code: 'LOG' },
    { id: 'quality', name: 'Quality Assurance & Inspection', code: 'QA' },
    { id: 'admin', name: 'Administration & Nodal Department', code: 'ADM' },
  ],
};
