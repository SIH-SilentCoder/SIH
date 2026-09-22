const Booking = require('../models/Booking.model');
const QueueEntry = require('../models/QueueEntry.model');
const Procurement = require('../models/Procurement.model');
const Payment = require('../models/Payment.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getLiveQueue } = require('../services/queue.service');
const { startOfDay, endOfDay } = require('../utils/helpers');
const notificationService = require('../services/notification/NotificationService');
const smsService = require('../services/sms/SMSService');

const { assertJurisdictionAccess, filterByJurisdiction } = require('../utils/jurisdiction');

// GET /api/officer/dashboard
const getOfficerDashboard = async (req, res, next) => {
  try {
    const officerProfile = await OfficerProfile.findOne({ userId: req.user._id })
      .populate('centreId', 'name address avgServiceTimeMinutes district state');

    const centreId = officerProfile?.centreId?._id;
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Fetch all pending farmer profiles and filter by officer's jurisdiction
    const allPendingKyc = await FarmerProfile.find({ kycStatus: 'Pending' }).populate('userId', 'state district');
    const scopedPendingKyc = filterByJurisdiction(req.user, allPendingKyc, (p) => ({
      state: p.userId?.state,
      district: p.userId?.district,
    }));
    const pendingKycCount = scopedPendingKyc.length;

    if (!centreId) {
      // High-level officer (District / State / Central) without a direct center assignment
      res.json(
        new ApiResponse(200, {
          jurisdiction: {
            role: req.user.role,
            state: req.user.state,
            district: req.user.district,
          },
          stats: {
            totalToday: 0,
            arrived: 0,
            waiting: 0,
            completed: 0,
            cancelled: 0,
            pending: 0,
            pendingKycCount,
          },
          queue: { currentToken: null, waitingCount: 0 },
          todayBookings: [],
        })
      );
      return;
    }

    const [
      totalToday,
      arrivedCount,
      completedCount,
      cancelledCount,
      waitingCount,
    ] = await Promise.all([
      Booking.countDocuments({ centreId, bookingDate: { $gte: dayStart, $lte: dayEnd }, status: { $ne: 'cancelled' } }),
      Booking.countDocuments({ centreId, bookingDate: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['arrived', 'verification', 'verified', 'procurement_in_progress', 'procurement_completed', 'payment_processing', 'payment_completed'] } }),
      Booking.countDocuments({ centreId, bookingDate: { $gte: dayStart, $lte: dayEnd }, status: 'procurement_completed' }),
      Booking.countDocuments({ centreId, bookingDate: { $gte: dayStart, $lte: dayEnd }, status: 'cancelled' }),
      QueueEntry.countDocuments({ centreId, queueDate: { $gte: dayStart, $lte: dayEnd }, status: 'waiting' }),
    ]);

    const queueState = await getLiveQueue(centreId, today);

    // Get today's bookings for table
    const todayBookings = await Booking.find({
      centreId,
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'cancelled' },
    })
      .populate('farmerId', 'name mobile')
      .populate('cropId', 'name')
      .sort({ slotStartTime: 1, token: 1 });

    res.json(
      new ApiResponse(200, {
        centre: officerProfile.centreId,
        jurisdiction: {
          role: req.user.role,
          state: req.user.state,
          district: req.user.district,
        },
        stats: {
          totalToday,
          arrived: arrivedCount,
          waiting: waitingCount,
          completed: completedCount,
          cancelled: cancelledCount,
          pending: totalToday - completedCount - cancelledCount,
          pendingKycCount,
        },
        queue: queueState,
        todayBookings,
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/officer/bookings?status=&date=
const getOfficerBookings = async (req, res, next) => {
  try {
    const officerProfile = await OfficerProfile.findOne({ userId: req.user._id });
    const { status, date, page = 1, limit = 20, search } = req.query;
    const centreId = officerProfile?.centreId;

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const filter = {
      bookingDate: { $gte: dayStart, $lte: dayEnd },
    };
    if (centreId) filter.centreId = centreId;
    if (status) filter.status = status;

    let bookings = await Booking.find(filter)
      .populate('farmerId', 'name mobile state district')
      .populate('cropId', 'name')
      .sort({ token: 1 });

    // Enforce jurisdiction filtering if officer has district or state restriction
    bookings = filterByJurisdiction(req.user, bookings, (b) => ({
      state: b.farmerId?.state,
      district: b.farmerId?.district,
      centreId: b.centreId,
    }));

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.token?.toLowerCase().includes(s) ||
          b.bookingId?.toLowerCase().includes(s) ||
          b.farmerId?.name?.toLowerCase().includes(s)
      );
    }

    const total = bookings.length;
    const paginated = bookings.slice((page - 1) * limit, page * limit);

    res.json(
      new ApiResponse(200, {
        bookings: paginated,
        pagination: { page: Number(page), limit: Number(limit), total },
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/officer/kyc-approvals — List pending farmer KYC applications for approval
const getPendingKycApprovals = async (req, res, next) => {
  try {
    const { status = 'Pending', search } = req.query;
    const filter = {};
    if (status !== 'all') {
      filter.kycStatus = status;
    }

    let profiles = await FarmerProfile.find(filter).populate('userId', 'name mobile email state district');

    // Restrict list strictly to officer's jurisdiction (State / District / Center)
    profiles = filterByJurisdiction(req.user, profiles, (p) => ({
      state: p.userId?.state,
      district: p.userId?.district,
    }));

    if (search) {
      const s = search.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.kisanId?.toLowerCase().includes(s) ||
          p.aadhaarNumber?.toLowerCase().includes(s) ||
          p.userId?.name?.toLowerCase().includes(s) ||
          p.userId?.mobile?.includes(s)
      );
    }

    res.json(
      new ApiResponse(200, {
        profiles,
        total: profiles.length,
        jurisdiction: {
          role: req.user.role,
          state: req.user.state,
          district: req.user.district,
        },
      }, 'Pending farmer KYC applications retrieved successfully.')
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/officer/kyc-approvals/:profileId — Approve or Reject farmer KYC
const updateKycApproval = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const { action, remarks } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      throw new ApiError(400, 'Invalid action. Must be "approve" or "reject".');
    }

    const profile = await FarmerProfile.findById(profileId).populate('userId', 'name mobile state district');
    if (!profile) {
      throw new ApiError(404, 'Farmer KYC profile not found.');
    }

    // STRICT JURISDICTION CHECK: Ensure officer is authorized for this farmer's location
    assertJurisdictionAccess(req.user, {
      state: profile.userId?.state,
      district: profile.userId?.district,
    });

    const targetUserId = profile.userId?._id || profile.userId;
    const targetUserMobile = profile.userId?.mobile;
    const isApprove = action === 'approve';
    profile.kycStatus = isApprove ? 'Verified' : 'Rejected';
    profile.kycRemarks = remarks || (isApprove ? `Approved by ${req.user.role.toUpperCase()} Officer` : `Rejected by ${req.user.role.toUpperCase()} Officer`);
    profile.userId = targetUserId;
    await profile.save();

    // Send Notification to farmer
    if (targetUserId) {
      if (isApprove) {
        await notificationService.kycApproved(targetUserId, profile.kycRemarks);
      } else {
        await notificationService.kycRejected(targetUserId, profile.kycRemarks);
      }
    }

    // Send real SMS
    if (targetUserMobile) {
      const smsMsg = isApprove
        ? `Kisan Portal: Your KYC has been APPROVED by ${req.user.role.toUpperCase()} Officer. You can now book procurement slots!`
        : `Kisan Portal: Your KYC was REJECTED by ${req.user.role.toUpperCase()} Officer. Remarks: ${profile.kycRemarks}. Please update details.`;
      try {
        await smsService.sendSms(targetUserMobile, smsMsg);
      } catch (sErr) {
        console.warn('[Officer Controller] SMS send failed:', sErr.message);
      }
    }

    res.json(
      new ApiResponse(200, {
        profile,
        kycStatus: profile.kycStatus,
      }, `Farmer KYC has been successfully ${isApprove ? 'APPROVED' : 'REJECTED'}.`)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOfficerDashboard,
  getOfficerBookings,
  getPendingKycApprovals,
  updateKycApproval,
};
