const Booking = require('../models/Booking.model');
const Slot = require('../models/Slot.model');
const QueueEntry = require('../models/QueueEntry.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const Procurement = require('../models/Procurement.model');
const Payment = require('../models/Payment.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateBookingId, generateToken } = require('../utils/helpers');
const { getNextTokenNumber } = require('../services/queue.service');
const notificationService = require('../services/notification/NotificationService');

// POST /api/bookings - Create booking
const createBooking = async (req, res, next) => {
  try {
    const { slotId, cropId, cropName, quantity, unit } = req.body;
    const farmerId = req.user._id;

    if (!slotId) throw new ApiError(400, 'Please select a time slot.');
    if (!cropId) throw new ApiError(400, 'Please select a crop.');
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      throw new ApiError(400, 'Please enter a valid quantity in quintals (minimum 0.1).');
    }

    // Strict KYC Approval Enforcer: Slot booking requires District Procurement Officer approval
    const farmerProfile = await FarmerProfile.findOne({ userId: farmerId });

    if (!farmerProfile || !farmerProfile.aadhaarVerified) {
      throw new ApiError(
        403,
        'e-KYC Mandatory: Please complete your Aadhaar e-KYC and Kisan ID verification before booking a procurement slot.'
      );
    }

    if (farmerProfile.kycStatus === 'Rejected') {
      throw new ApiError(
        403,
        `KYC Application Rejected: Your KYC application was rejected by the District Procurement Officer. Reason: "${farmerProfile.kycRemarks || 'Invalid details'}". Please update and re-submit your KYC for approval.`
      );
    }

    if (farmerProfile.kycStatus !== 'Verified') {
      throw new ApiError(
        403,
        'KYC Approval Pending: Your KYC application has been submitted and is currently pending approval by your District Procurement Officer. Slot booking activates once approved.'
      );
    }

    const cleanCropId = cropId?._id || cropId;

    // 1. Fetch slot
    const slot = await Slot.findById(slotId);
    if (!slot) throw new ApiError(404, 'Selected slot not found.');
    if (slot.status === 'full' || slot.booked >= slot.capacity) {
      throw new ApiError(409, 'This slot is now full. Please choose another slot.');
    }

    // 2. Check for duplicate booking (same farmer, same slot)
    const existingBooking = await Booking.findOne({
      farmerId,
      slotId,
      status: { $ne: 'cancelled' },
    });
    if (existingBooking) {
      throw new ApiError(409, 'You already have an active booking for this time slot. Please choose another time slot or date.');
    }

    // 3. Check for any existing active booking on the same day at same centre
    const dayStart = new Date(slot.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slot.date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingDayBooking = await Booking.findOne({
      farmerId,
      centreId: slot.centreId,
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled'] },
    });
    if (existingDayBooking) {
      const formattedDate = new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      throw new ApiError(409, `You already have an active booking at this centre on ${formattedDate}. You can reserve one slot per centre per day.`);
    }

    // 4. Get centre to verify it is active
    const centre = await ProcurementCentre.findById(slot.centreId);
    if (!centre || !centre.isActive) throw new ApiError(404, 'Procurement centre not found.');

    // 5. Get next token number for this centre/day
    const tokenNum = await getNextTokenNumber(slot.centreId, slot.date);
    const token = generateToken(tokenNum);
    const bookingId = generateBookingId();

    // 6. Create booking
    const newBookingData = {
      bookingId,
      farmerId,
      centreId: slot.centreId,
      slotId,
      cropId: cleanCropId,
      cropName,
      quantity,
      unit: unit || 'quintal',
      token,
      bookingDate: slot.date,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
      status: 'booked',
    };
    const booking = await Booking.create(newBookingData);

    // 7. Increment slot.booked
    const updatedSlot = await Slot.findByIdAndUpdate(
      slotId,
      { $inc: { booked: 1 } },
      { new: true }
    );
    // Mark slot as full if needed
    if (updatedSlot && updatedSlot.booked >= updatedSlot.capacity) {
      updatedSlot.status = 'full';
      await updatedSlot.save();
    }

    // 8. Create queue entry
    await QueueEntry.create({
      bookingId: booking._id,
      farmerId,
      centreId: slot.centreId,
      slotId,
      token,
      position: tokenNum,
      queueDate: slot.date,
      status: 'waiting',
    });

    // 9. Send confirmation notification (async, non-blocking)
    const populatedBooking = await Booking.findById(booking._id)
      .populate('centreId', 'name address district')
      .populate('cropId', 'name mspPrice unit');

    notificationService.bookingConfirmed(farmerId, populatedBooking).catch(() => {});

    // 10. Emit socket event
    const io = req.app?.get('io') || req.io;
    if (io) {
      io.to(`centre:${slot.centreId}`).emit('queue:updated', {
        centreId: slot.centreId,
        action: 'new_booking',
        token,
      });
    }

    res.status(201).json(
      new ApiResponse(201, { booking: populatedBooking }, 'Booking confirmed! Your slot has been reserved.')
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings - Farmer's own bookings
const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { farmerId: req.user._id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('centreId', 'name address district avgServiceTimeMinutes')
      .populate('cropId', 'name mspPrice unit')
      .populate('slotId', 'startTime endTime capacity booked')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json(
      new ApiResponse(200, {
        bookings,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('centreId', 'name address district avgServiceTimeMinutes contactPhone')
      .populate('cropId', 'name mspPrice unit season')
      .populate('slotId', 'startTime endTime capacity booked date');

    if (!booking) throw new ApiError(404, 'Booking not found.');

    // Farmers can only see their own bookings
    if (req.user.role === 'farmer' && booking.farmerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have access to this booking.');
    }

    const procurement = await Procurement.findOne({ bookingId: booking._id });
    const payment = await Payment.findOne({ bookingId: booking._id });
    const queueEntry = await QueueEntry.findOne({ bookingId: booking._id });

    res.json(new ApiResponse(200, { booking, procurement, payment, queueEntry }));
  } catch (error) {
    next(error);
  }
};

// PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('centreId', 'cancellationCutoffHours name');

    if (!booking) throw new ApiError(404, 'Booking not found.');

    if (
      req.user.role === 'farmer' &&
      booking.farmerId.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(403, 'You cannot cancel this booking.');
    }

    if (['cancelled', 'procurement_completed', 'payment_completed', 'payment_processing'].includes(booking.status)) {
      throw new ApiError(400, `Booking cannot be cancelled at this stage (status: ${booking.status}).`);
    }

    // Check cancellation cutoff
    const cutoffHours = booking.centreId?.cancellationCutoffHours ?? 12;
    const slotDateTime = new Date(booking.bookingDate);
    const [h, m] = (booking.slotStartTime || '09:00').split(':');
    slotDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
    const hoursUntilSlot = (slotDateTime - new Date()) / (1000 * 60 * 60);

    if (req.user.role === 'farmer' && hoursUntilSlot < cutoffHours) {
      throw new ApiError(
        400,
        `Cancellation is not allowed within ${cutoffHours} hours of the slot. Please contact the centre directly.`
      );
    }

    // Cancel booking
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by farmer';
    await booking.save();

    // Release slot capacity
    await Slot.findByIdAndUpdate(
      booking.slotId,
      { $inc: { booked: -1 } },
      { new: true }
    );

    // Update slot status back to available if it was full
    const slot = await Slot.findById(booking.slotId);
    if (slot && slot.status === 'full' && slot.booked < slot.capacity) {
      slot.status = 'available';
      await slot.save();
    }

    // Cancel queue entry
    await QueueEntry.findOneAndUpdate(
      { bookingId: booking._id },
      { status: 'cancelled' }
    );

    notificationService.bookingCancelled(booking.farmerId, booking).catch(() => {});

    const io = req.app?.get('io') || req.io;
    if (io) {
      io.to(`centre:${booking.centreId}`).emit('queue:updated', {
        centreId: booking.centreId,
        action: 'booking_cancelled',
        token: booking.token,
      });
    }

    res.json(new ApiResponse(200, { booking }, 'Booking cancelled successfully.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getBookings, getBookingById, cancelBooking };
