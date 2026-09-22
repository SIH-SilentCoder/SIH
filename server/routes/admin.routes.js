const express = require('express');
const router = express.Router();
const {
  getAdminDashboard, getFarmers, getAllBookings, createOfficer, getOfficers,
  createCentre, updateCentre, generateSlots, getCrops, createCrop, updateCrop,
  getAnalytics, toggleFarmerStatus, createState, getStates, createStateOfficer,
  appointOfficer, registerFarmerByOfficer, deleteCrop, deleteCentre,
} = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
  requireAdmin,
  requireDistrictOrAbove,
  requireCentreHeadOrAbove,
  requireStateOrAbove,
} = require('../middleware/role.middleware');

// All routes require authentication
router.use(authenticate);

// ─── Central Admin Only ────────────────────────────────────────
router.get('/dashboard', requireAdmin, getAdminDashboard);
router.get('/states', requireAdmin, getStates);
router.post('/states', requireAdmin, createState);
router.post('/state-officers', requireAdmin, createStateOfficer);
router.get('/analytics', requireAdmin, getAnalytics);

// ─── District Officer + Above (level ≤ 3) ─────────────────────
// Farmers
router.get('/farmers', requireDistrictOrAbove, getFarmers);
router.put('/farmers/:id/toggle', requireDistrictOrAbove, toggleFarmerStatus);
router.post('/farmers/register', requireCentreHeadOrAbove, registerFarmerByOfficer);

// Officers — Hierarchical officer appointment (Centre Head or above)
router.get('/officers', requireDistrictOrAbove, getOfficers);
router.post('/officers', requireAdmin, createOfficer);           // legacy (admin only)
router.post('/officers/appoint', requireCentreHeadOrAbove, appointOfficer);

// Procurement Centres
router.get('/centres', requireDistrictOrAbove, (req, res) => {
  const ProcurementCentre = require('../models/ProcurementCentre.model');
  const { filterByJurisdiction } = require('../utils/jurisdiction');
  ProcurementCentre.find()
    .populate('availableCrops', 'name mspPrice unit')
    .then((centres) => {
      // Filter by officer's district/state if not central admin
      const filtered = filterByJurisdiction(req.user, centres, (c) => ({
        state: c.state,
        district: c.district,
      }));
      res.json({ success: true, data: { centres: filtered } });
    })
    .catch((err) => res.status(500).json({ success: false, message: err.message }));
});
router.post('/centres', requireDistrictOrAbove, createCentre);
router.put('/centres/:id', requireDistrictOrAbove, updateCentre);
router.delete('/centres/:id', requireDistrictOrAbove, deleteCentre);

// Bookings
router.get('/bookings', requireDistrictOrAbove, getAllBookings);

// ─── District Officer + Above: Crops ──────────────────────────
router.get('/crops', requireDistrictOrAbove, getCrops);
router.post('/crops', requireDistrictOrAbove, createCrop);
router.put('/crops/:id', requireDistrictOrAbove, updateCrop);
router.delete('/crops/:id', requireDistrictOrAbove, deleteCrop);

// ─── Centre Head + Above: Slot generation ─────────────────────
router.post('/slots/generate', requireCentreHeadOrAbove, generateSlots);

module.exports = router;
