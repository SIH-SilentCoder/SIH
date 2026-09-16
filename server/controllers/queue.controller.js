const QueueEntry = require('../models/QueueEntry.model');
const Booking = require('../models/Booking.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getLiveQueue, getQueuePosition, getNextWaiting } = require('../services/queue.service');
const notificationService = require('../services/notification/NotificationService');
const { startOfDay, endOfDay } = require('../utils/helpers');

// GET /api/queue/:centreId/live
const getLiveQueueState = async (req, res, next) => {
  try {
    const { centreId } = req.params;
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const queueState = await getLiveQueue(centreId, date);
    const centre = await ProcurementCentre.findById(centreId).select('name avgServiceTimeMinutes');

    res.json(new ApiResponse(200, { ...queueState, centre }));
  } catch (error) {
    next(error);
  }
};

// GET /api/queue/:centreId/position?token=F001
const getMyQueuePosition = async (req, res, next) => {
  try {
    const { centreId } = req.params;
    const { token } = req.query;
    if (!token) throw new ApiError(400, 'Token is required.');

    const date = req.query.date ? new Date(req.query.date) : new Date();
    const result = await getQueuePosition(centreId, token, date);
    if (!result) {
      return res.json(
        new ApiResponse(200, {
          position: 1,
          farmersAhead: 0,
          estimatedWaitMinutes: 0,
          status: 'waiting',
          message: 'Queue entry scheduled.',
        })
      );
    }

    res.json(new ApiResponse(200, result));
  } catch (error) {
    next(error);
  }
};

// Verify officer is assigned to this centre
const verifyOfficerCentre = async (userId, centreId) => {
  if (!userId) return false;
  const profile = await OfficerProfile.findOne({ userId });
  if (!profile) return false;
  return profile.centreId.toString() === centreId.toString();
};

// PUT /api/queue/:token/arrived - Officer marks farmer as arrived
const markArrived = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { centreId } = req.body;

    if (req.user.role === 'officer') {
      const isAssigned = await verifyOfficerCentre(req.user._id, centreId);
      if (!isAssigned) throw new ApiError(403, 'You are not assigned to this centre.');
    }

    const date = new Date();
    const entry = await QueueEntry.findOneAndUpdate(
      {
        token,
        centreId,
        queueDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
        status: 'waiting',
      },
      { status: 'called', calledAt: new Date() },
      { new: true }
    );

    if (!entry) throw new ApiError(404, 'Queue entry not found or already processed.');

    // Update booking status
    await Booking.findByIdAndUpdate(entry.bookingId, { status: 'arrived' });

    if (req.io) {
      req.io.to(`centre:${centreId}`).emit('queue:updated', { centreId, token, action: 'arrived' });
      req.io.to(`user:${entry.farmerId}`).emit('booking:updated', { token, status: 'arrived' });
    }

    res.json(new ApiResponse(200, { entry }, 'Farmer marked as arrived.'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/queue/:token/call - Officer calls next token
const callToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { centreId, counter } = req.body;

    if (req.user.role === 'officer') {
      const isAssigned = await verifyOfficerCentre(req.user._id, centreId);
      if (!isAssigned) throw new ApiError(403, 'You are not assigned to this centre.');
    }

    const date = new Date();

    // Only one token can be 'serving' at a time per centre
    await QueueEntry.updateMany(
      { centreId, status: 'serving', queueDate: { $gte: startOfDay(date), $lte: endOfDay(date) } },
      { status: 'waiting' } // revert if somehow there's already one serving
    );

    const entry = await QueueEntry.findOneAndUpdate(
      {
        token,
        centreId,
        queueDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
        status: { $in: ['waiting', 'called'] },
      },
      { status: 'serving', servedAt: new Date(), counter: counter || 'Counter 1' },
      { new: true }
    );

    if (!entry) throw new ApiError(404, 'Queue entry not found.');

    await Booking.findByIdAndUpdate(entry.bookingId, { status: 'verification' });

    // Notify the farmer their token is called
    notificationService.tokenCalled(entry.farmerId, { _id: entry.bookingId, token }, counter);

    // Also notify farmers approaching (e.g., 5 farmers ahead)
    const queueState = await getLiveQueue(centreId, date);
    const waitingEntries = queueState.entries.filter((e) => e.status === 'waiting');
    for (let i = 0; i < Math.min(5, waitingEntries.length); i++) {
      const e = waitingEntries[i];
      if (i < 3) {
        notificationService.queueApproaching(e.farmerId, { _id: e.bookingId, token: e.token }, i + 1);
      }
    }

    if (req.io) {
      req.io.to(`centre:${centreId}`).emit('queue:updated', {
        centreId,
        currentlyServing: token,
        counter,
        action: 'token_called',
      });
      req.io.to(`user:${entry.farmerId}`).emit('token:called', { token, counter });
    }

    res.json(new ApiResponse(200, { entry }, `Token ${token} called to ${counter || 'Counter 1'}.`));
  } catch (error) {
    next(error);
  }
};

// PUT /api/queue/:token/complete - Officer completes serving
const completeToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { centreId } = req.body;

    if (req.user.role === 'officer') {
      const isAssigned = await verifyOfficerCentre(req.user._id, centreId);
      if (!isAssigned) throw new ApiError(403, 'You are not assigned to this centre.');
    }

    const date = new Date();
    const entry = await QueueEntry.findOneAndUpdate(
      {
        token,
        centreId,
        queueDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
        status: { $in: ['serving', 'called', 'waiting'] },
      },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );

    if (!entry) throw new ApiError(404, 'Queue entry not found.');

    if (req.io) {
      req.io.to(`centre:${centreId}`).emit('queue:updated', {
        centreId,
        token,
        action: 'completed',
      });
    }

    res.json(new ApiResponse(200, { entry }, `Token ${token} marked as completed.`));
  } catch (error) {
    next(error);
  }
};

// PUT /api/queue/call-next - Officer calls the very next farmer in queue
const callNextInQueue = async (req, res, next) => {
  try {
    const { centreId, counter } = req.body;

    if (req.user.role === 'officer') {
      const isAssigned = await verifyOfficerCentre(req.user._id, centreId);
      if (!isAssigned) throw new ApiError(403, 'You are not assigned to this centre.');
    }

    const date = new Date();
    const nextEntry = await getNextWaiting(centreId, date);
    if (!nextEntry) throw new ApiError(404, 'No farmers are currently waiting in the queue.');

    // Delegate to callToken
    req.params = { token: nextEntry.token };
    req.body = { centreId, counter };
    return callToken(req, res, next);
  } catch (error) {
    next(error);
  }
};

// GET /api/queue/gate-metrics - Get real-time Mandi Gate Staff Dashboard Metrics
const getGateMetrics = async (req, res, next) => {
  try {
    let centreId = req.query.centreId;
    if (!centreId) {
      const officerProfile = await OfficerProfile.findOne({ userId: req.user._id });
      centreId = officerProfile?.centreId || req.user.centreId;
    }

    if (!centreId) {
      // Fallback: fetch first active centre in officer's district or state
      const query = {};
      if (req.user.district) query.district = new RegExp(`^${req.user.district}$`, 'i');
      if (req.user.state) query.state = new RegExp(`^${req.user.state}$`, 'i');
      const firstCentre = await ProcurementCentre.findOne(query);
      centreId = firstCentre?._id;
    }

    if (!centreId) {
      throw new ApiError(404, 'No procurement centre associated with this officer.');
    }

    const centre = await ProcurementCentre.findById(centreId).select('name district state dailyCapacity slotDurationMinutes operatingHours');
    if (!centre) throw new ApiError(404, 'Procurement centre not found.');

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Fetch all bookings at this centre today
    const todayBookings = await Booking.find({
      centreId: centre._id,
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'cancelled' },
    })
      .populate('farmerId', 'name mobile state district')
      .populate('cropId', 'name mspPrice unit')
      .sort({ slotStartTime: 1, token: 1 });

    const totalCapacity = centre.dailyCapacity || 100;
    const bookedCapacity = todayBookings.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

    const verifiedStatuses = ['arrived', 'verification', 'verified', 'procurement_in_progress', 'procurement_completed', 'payment_processing', 'payment_completed'];
    const verifiedBookings = todayBookings.filter((b) => verifiedStatuses.includes(b.status));
    
    const verifiedTodayCount = verifiedBookings.length;
    const filledCapacity = verifiedBookings.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
    const remainingCapacity = Math.max(0, totalCapacity - filledCapacity);

    // Live Queue State
    const queueState = await getLiveQueue(centre._id, today);
    const currentToken = queueState.currentlyServing?.token || (queueState.entries.find((e) => e.status === 'serving')?.token) || (queueState.entries[0]?.token || 'F001');

    res.json(
      new ApiResponse(200, {
        centre,
        metrics: {
          currentToken,
          verifiedTodayCount,
          pendingVerificationCount: Math.max(0, todayBookings.length - verifiedTodayCount),
          totalBookingsToday: todayBookings.length,
          totalCapacity,
          bookedCapacity,
          filledCapacity,
          remainingCapacity,
          waitingCount: queueState.waitingCount || 0,
        },
        entries: todayBookings,
      })
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/queue/lookup-gate-token - Lookup & inspect token turn status for gate entry
const lookupGateToken = async (req, res, next) => {
  try {
    const { tokenQuery } = req.body;
    if (!tokenQuery || !tokenQuery.trim()) {
      throw new ApiError(400, 'Please enter a Token Number, Booking ID, or Mobile number.');
    }

    const cleanQuery = tokenQuery.trim().toUpperCase();
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Fetch active non-cancelled bookings
    let bookings = await Booking.find({
      status: { $ne: 'cancelled' },
    })
      .populate('farmerId', 'name mobile state district')
      .populate('cropId', 'name mspPrice unit');

    let booking = bookings.find(
      (b) =>
        b.token?.toUpperCase() === cleanQuery ||
        b.bookingId?.toUpperCase() === cleanQuery ||
        b.farmerId?.mobile?.includes(cleanQuery)
    );

    if (!booking) {
      throw new ApiError(404, `No active booking found for "${cleanQuery}" today.`);
    }

    // Fetch Farmer Profile
    const farmerIdVal = booking.farmerId?._id || booking.farmerId;
    const farmerProfile = await FarmerProfile.findOne({ userId: farmerIdVal });

    // Determine Turn Status
    const queueState = await getLiveQueue(booking.centreId, today);
    const verifiedStatuses = ['arrived', 'verification', 'verified', 'procurement_in_progress', 'procurement_completed', 'payment_processing', 'payment_completed'];
    
    const activeServingToken = queueState.currentlyServing?.token || (queueState.entries.find((e) => e.status === 'serving')?.token);

    let turnStatus = 'ON_TIME';
    let turnMessage = 'Slot is scheduled for today.';

    if (verifiedStatuses.includes(booking.status)) {
      turnStatus = 'ALREADY_VERIFIED';
      turnMessage = 'Gate Entry has ALREADY been granted for this token.';
    } else if (activeServingToken && activeServingToken === booking.token) {
      turnStatus = 'CURRENT_TURN';
      turnMessage = 'IT IS THIS TOKEN’S TURN! Call farmer immediately to gate counter.';
    } else {
      // Check current time vs slot time
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = (booking.slotStartTime || '09:00').split(':').map(Number);
      const slotStartMinutes = startH * 60 + startM;

      if (currentMinutes < slotStartMinutes - 30) {
        turnStatus = 'EARLY';
        turnMessage = `Early arrival! Scheduled slot starts at ${booking.slotStartTime}.`;
      } else if (currentMinutes > slotStartMinutes + 120) {
        turnStatus = 'LATE';
        turnMessage = `Late arrival! Slot was scheduled for ${booking.slotStartTime}.`;
      } else {
        turnStatus = 'ON_TIME';
        turnMessage = 'On time for scheduled slot.';
      }
    }

    res.json(
      new ApiResponse(200, {
        booking,
        farmerProfile,
        turnStatus,
        turnMessage,
        canEnterGate: farmerProfile?.kycStatus === 'Verified' && !verifiedStatuses.includes(booking.status),
      })
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/queue/verify-gate-entry/:token - Verify token & grant gate entry
const verifyGateEntry = async (req, res, next) => {
  try {
    const { token } = req.params;

    const cleanToken = token.trim().toUpperCase();

    const bookings = await Booking.find({
      status: { $ne: 'cancelled' },
    }).populate('farmerId', 'name mobile');

    const booking = bookings.find(
      (b) => b.token?.toUpperCase() === cleanToken || b.bookingId?.toUpperCase() === cleanToken
    );

    if (!booking) {
      throw new ApiError(404, `Booking token ${token} not found for today.`);
    }

    // Verify KYC Status
    const farmerIdVal = booking.farmerId?._id || booking.farmerId;
    const farmerProfile = await FarmerProfile.findOne({ userId: farmerIdVal });
    if (farmerProfile?.kycStatus !== 'Verified') {
      throw new ApiError(403, 'Gate Entry Blocked: Farmer KYC has not been approved by District Procurement Officer.');
    }

    // Mark Booking as Arrived
    booking.status = 'arrived';
    await booking.save();

    // Update Queue Entry status
    await QueueEntry.findOneAndUpdate(
      {
        bookingId: booking._id,
      },
      {
        status: 'called',
        calledAt: new Date(),
      },
      { upsert: true }
    );

    if (req.io) {
      req.io.to(`centre:${booking.centreId}`).emit('queue:updated', {
        centreId: booking.centreId,
        token: booking.token,
        action: 'gate_entry_granted',
      });
      req.io.to(`user:${farmerIdVal}`).emit('booking:updated', {
        token: booking.token,
        status: 'arrived',
      });
    }

    // Send Notification to farmer
    notificationService.send(
      farmerIdVal,
      'GATE_ENTRY_GRANTED',
      'Mandi Gate Entry Verified!',
      `Your token ${booking.token} has been verified at Mandi Gate. Please proceed to the quality check area.`
    );

    res.json(
      new ApiResponse(200, {
        booking,
        token: booking.token,
        status: 'arrived',
      }, `Token ${booking.token} verified at Mandi Gate. Gate Entry GRANTED!`)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiveQueueState,
  getMyQueuePosition,
  markArrived,
  callToken,
  completeToken,
  callNextInQueue,
  getGateMetrics,
  lookupGateToken,
  verifyGateEntry,
};
