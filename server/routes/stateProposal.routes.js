const express = require('express');
const router = express.Router();
const {
  createProposal,
  getProposals,
  getProposalById,
  updateAndResubmit,
  sendCentralFeedback,
  approveProposal,
  rejectProposal,
} = require('../controllers/stateProposal.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireOfficerOrAbove } = require('../middleware/role.middleware');

router.use(authenticate);

// List & view proposals
router.get('/', requireOfficerOrAbove, getProposals);
router.get('/:id', requireOfficerOrAbove, getProposalById);

// State Officer endpoints
router.post('/', requireOfficerOrAbove, createProposal);
router.put('/:id', requireOfficerOrAbove, updateAndResubmit);

// Central Admin endpoints
router.post('/:id/reply-feedback', requireAdmin, sendCentralFeedback);
router.post('/:id/approve', requireAdmin, approveProposal);
router.post('/:id/reject', requireAdmin, rejectProposal);

module.exports = router;
