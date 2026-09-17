const express = require('express');
const router = express.Router();
const {
  getAdminDashboard, getFarmers, getAllBookings, createOfficer, getOfficers,
  createCentre, updateCentre, generateSlots, getCrops, createCrop, updateCrop,
  getAnalytics, toggleFarmerStatus, createState, getStates, createStateOfficer,
} = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireOfficerOrAbove } = require('../middleware/role.middleware');

router.use(authenticate, requireAdmin);
router.get('/dashboard', getAdminDashboard);
router.get('/farmers', getFarmers);
router.put('/farmers/:id/toggle', toggleFarmerStatus);
router.get('/officers', getOfficers);
router.post('/officers', createOfficer);
router.get('/states', getStates);
router.post('/states', createState);
router.post('/state-officers', createStateOfficer);
router.get('/centres', (req, res) => {
  const ProcurementCentre = require('../models/ProcurementCentre.model');
  ProcurementCentre.find()
    .populate('availableCrops', 'name')
    .then((centres) => res.json({ success: true, data: { centres } }));
});
router.post('/centres', createCentre);
router.put('/centres/:id', updateCentre);
router.get('/bookings', getAllBookings);
router.get('/crops', getCrops);
router.post('/crops', createCrop);
router.put('/crops/:id', updateCrop);
router.post('/slots/generate', generateSlots);
router.get('/analytics', getAnalytics);

module.exports = router;
