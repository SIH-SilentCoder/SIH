const express = require('express');
const router = express.Router();
const { getProcurement, updateProcurementStatus, createProcurement, forwardProcurementToPayment } = require('../controllers/procurement.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireOfficer } = require('../middleware/role.middleware');

const injectIO = (req, res, next) => { req.io = req.app.get('io'); next(); };

router.use(authenticate);
router.get('/:id', getProcurement);
router.post('/', requireOfficer, injectIO, createProcurement);
router.put('/:id/status', requireOfficer, injectIO, updateProcurementStatus);
router.put('/:id/forward-payment', requireOfficer, injectIO, forwardProcurementToPayment);

module.exports = router;
