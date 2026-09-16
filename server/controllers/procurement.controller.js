const Procurement = require('../models/Procurement.model');
const Booking = require('../models/Booking.model');
const Payment = require('../models/Payment.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification/NotificationService');
const paymentService = require('../services/payment.service');

// GET /api/procurements/:id
const getProcurement = async (req, res, next) => {
  try {
    const procurement = await Procurement.findById(req.params.id)
      .populate('farmerId', 'name mobile')
      .populate('centreId', 'name address')
      .populate('cropId', 'name mspPrice unit')
      .populate('officerId', 'name');

    if (!procurement) throw new ApiError(404, 'Procurement record not found.');

    if (
      req.user.role === 'farmer' &&
      procurement.farmerId._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(403, 'Access denied.');
    }

    const payment = await Payment.findOne({ procurementId: procurement._id });
    res.json(new ApiResponse(200, { procurement, payment }));
  } catch (error) {
    next(error);
  }
};

// PUT /api/procurements/:id/status - Officer/admin/quality staff updates procurement status
const updateProcurementStatus = async (req, res, next) => {
  try {
    const { status, grade, quantity, pricePerUnit, qualityNotes, moisture, foreignMatter } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const procurement = await Procurement.findById(req.params.id);
    if (!procurement) throw new ApiError(404, 'Procurement record not found.');

    // Officer can only update their centre's procurements
    if (req.user.role === 'officer') {
      const profile = await OfficerProfile.findOne({ userId: req.user._id });
      if (!profile || profile.centreId.toString() !== procurement.centreId.toString()) {
        throw new ApiError(403, 'You are not assigned to this procurement centre.');
      }
    }

    const updates = {
      status,
      officerId: req.user._id,
    };
    if (grade) updates.grade = grade;
    if (qualityNotes) updates.qualityNotes = qualityNotes;
    if (moisture) updates.moisture = moisture;
    if (foreignMatter) updates.foreignMatter = foreignMatter;

    if (status === 'in_progress') {
      // Update booking status
      await Booking.findByIdAndUpdate(procurement.bookingId, { status: 'procurement_in_progress' });
    }

    if (status === 'completed') {
      const finalQty = quantity || procurement.quantity;
      const price = pricePerUnit || procurement.pricePerUnit;
      updates.quantity = finalQty;
      updates.pricePerUnit = price;
      updates.totalAmount = finalQty * price;
      updates.completedAt = new Date();
      updates.procurementDate = new Date();

      // Generate official slip number if not present
      if (!procurement.slipNumber && !updates.slipNumber) {
        updates.slipNumber = `SLIP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      // Update booking status
      await Booking.findByIdAndUpdate(procurement.bookingId, { status: 'procurement_completed' });

      // Initialize payment record
      const payment = await paymentService.initializePayment(
        procurement._id,
        procurement.bookingId,
        procurement.farmerId,
        updates.totalAmount
      );

      notificationService.procurementCompleted(procurement.farmerId, { _id: procurement.bookingId, token: '' }, updates.totalAmount);

      if (req.io) {
        req.io.to(`user:${procurement.farmerId}`).emit('procurement:updated', {
          procurementId: procurement._id,
          status: 'completed',
          paymentId: payment._id,
        });
      }
    }

    if (status === 'rejected') {
      await Booking.findByIdAndUpdate(procurement.bookingId, { status: 'cancelled' });
    }

    const updated = await Procurement.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(new ApiResponse(200, { procurement: updated }, 'Procurement status updated & weight slip generated.'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/procurements/:id/forward-payment — Mandi Officer reviews slip & forwards to payment department
const forwardProcurementToPayment = async (req, res, next) => {
  try {
    const procurement = await Procurement.findById(req.params.id);
    if (!procurement) throw new ApiError(404, 'Procurement record not found.');

    procurement.officerApproved = true;
    procurement.officerApprovedAt = new Date();
    procurement.officerApprovedBy = req.user._id;
    await procurement.save();

    // Find payment & update to processing
    const payment = await Payment.findOne({ procurementId: procurement._id });
    if (payment) {
      payment.status = 'processing';
      payment.processedBy = req.user._id;
      await payment.save();
    }

    // Update booking status to payment_processing
    await Booking.findByIdAndUpdate(procurement.bookingId, { status: 'payment_processing' });

    // Notify farmer
    notificationService.paymentProcessing(procurement.farmerId, procurement._id);

    if (req.io) {
      req.io.to(`user:${procurement.farmerId}`).emit('payment:updated', {
        procurementId: procurement._id,
        status: 'processing',
      });
    }

    res.json(new ApiResponse(200, { procurement, payment }, 'Procurement slip approved & forwarded to Direct Payment Department.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/procurements - Create procurement record when booking moves to verification
const createProcurement = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId)
      .populate('cropId', 'mspPrice');

    if (!booking) throw new ApiError(404, 'Booking not found.');

    const existing = await Procurement.findOne({ bookingId });
    if (existing) {
      return res.json(new ApiResponse(200, { procurement: existing }, 'Procurement already exists.'));
    }

    const procurement = await Procurement.create({
      bookingId: booking._id,
      farmerId: booking.farmerId,
      centreId: booking.centreId,
      cropId: booking.cropId,
      cropName: booking.cropName,
      quantity: booking.quantity,
      unit: booking.unit,
      pricePerUnit: booking.cropId?.mspPrice,
      officerId: req.user._id,
      status: 'pending',
    });

    await Booking.findByIdAndUpdate(bookingId, { status: 'verified' });

    if (req.io) {
      req.io.to(`user:${booking.farmerId}`).emit('procurement:updated', {
        procurementId: procurement._id,
        status: 'pending',
      });
    }

    res.status(201).json(new ApiResponse(201, { procurement }, 'Procurement record created.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { getProcurement, updateProcurementStatus, createProcurement, forwardProcurementToPayment };
