const User = require('../models/User.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const Booking = require('../models/Booking.model');
const Procurement = require('../models/Procurement.model');
const Payment = require('../models/Payment.model');
const Slot = require('../models/Slot.model');
const Crop = require('../models/Crop.model');
const State = require('../models/State.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { startOfDay, endOfDay } = require('../utils/helpers');
const { ROLES, OFFICER_ROLES, ROLE_LABELS, generateEmployeeId } = require('../utils/roleHierarchy');

// GET /api/admin/dashboard
const getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    const [
      totalFarmers,
      totalOfficers,
      totalCentres,
      totalBookings,
      todayBookings,
      completedProcurements,
      pendingProcurements,
      totalPaymentsPaid,
      totalPaymentsPending,
      cancelledBookings,
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.FARMER, isActive: true }),
      User.countDocuments({ role: { $in: OFFICER_ROLES }, isActive: true }),
      ProcurementCentre.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }),
      Procurement.countDocuments({ status: 'completed' }),
      Procurement.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'paid' }),
      Payment.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'cancelled' }),
    ]);

    // Total procurement value
    const [procValue] = await Procurement.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Last 7 days booking trends
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const bookingTrend = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Centre utilization
    const centreUtilization = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$centreId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'procurementcentres',
          localField: '_id',
          foreignField: '_id',
          as: 'centre',
        },
      },
      { $unwind: '$centre' },
      { $project: { name: '$centre.name', count: 1 } },
    ]);

    // Crop-wise procurement
    const cropStats = await Procurement.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$cropName',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    res.json(
      new ApiResponse(200, {
        summary: {
          totalFarmers,
          totalOfficers,
          totalCentres,
          totalBookings,
          todayBookings,
          completedProcurements,
          pendingProcurements,
          cancelledBookings,
          totalPaymentsPaid,
          totalPaymentsPending,
          totalProcurementValue: procValue?.total || 0,
        },
        bookingTrend,
        centreUtilization,
        cropStats,
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/farmers
const getFarmers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, district, isActive } = req.query;
    const filter = { role: ROLES.FARMER };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const userIds = users.map((u) => u._id);
    const profiles = await FarmerProfile.find({ userId: { $in: userIds } });

    const farmers = users.map((u) => ({
      user: u,
      profile: profiles.find((p) => p.userId.toString() === u._id.toString()) || null,
    }));

    const total = await User.countDocuments(filter);
    res.json(new ApiResponse(200, { farmers, pagination: { page: Number(page), limit: Number(limit), total } }));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/bookings
const getAllBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, centreId, date, search, cropId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (centreId) filter.centreId = centreId;
    if (cropId) filter.cropId = cropId;

    if (date) {
      const d = new Date(date);
      filter.bookingDate = { $gte: startOfDay(d), $lte: endOfDay(d) };
    }

    let bookings = await Booking.find(filter)
      .populate('farmerId', 'name mobile')
      .populate('centreId', 'name district')
      .populate('cropId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (search) {
      const s = search.toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.token?.toLowerCase().includes(s) ||
          b.bookingId?.toLowerCase().includes(s) ||
          b.farmerId?.name?.toLowerCase().includes(s)
      );
    }

    const total = await Booking.countDocuments(filter);
    res.json(new ApiResponse(200, { bookings, pagination: { page: Number(page), limit: Number(limit), total } }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/officers
const createOfficer = async (req, res, next) => {
  try {
    const { name, mobile, email, password, centreId, employeeId, designation } = req.body;

    const existing = await User.findOne({ mobile });
    if (existing) throw new ApiError(409, 'This mobile number is already registered.');

    const user = await User.create({ name, mobile, email, password, role: ROLES.PROCUREMENT_OFFICER, level: 5 });
    const profile = await OfficerProfile.create({
      userId: user._id,
      centreId,
      employeeId,
      designation: designation || 'Procurement Officer',
    });

    // Add officer to centre
    await ProcurementCentre.findByIdAndUpdate(centreId, { $addToSet: { officerIds: user._id } });

    res.status(201).json(new ApiResponse(201, { user, profile }, 'Officer created successfully.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/officers
const getOfficers = async (req, res, next) => {
  try {
    const officers = await User.find({ role: { $in: OFFICER_ROLES } }).sort({ createdAt: -1 });
    const userIds = officers.map((u) => u._id);
    const profiles = await OfficerProfile.find({ userId: { $in: userIds } })
      .populate('centreId', 'name district');

    const result = officers.map((u) => ({
      user: u,
      profile: profiles.find((p) => p.userId.toString() === u._id.toString()) || null,
    }));

    res.json(new ApiResponse(200, { officers: result }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/centres
const createCentre = async (req, res, next) => {
  try {
    const centre = await ProcurementCentre.create(req.body);
    res.status(201).json(new ApiResponse(201, { centre }, 'Procurement centre created.'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/centres/:id
const updateCentre = async (req, res, next) => {
  try {
    const centre = await ProcurementCentre.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!centre) throw new ApiError(404, 'Centre not found.');
    res.json(new ApiResponse(200, { centre }, 'Centre updated.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/slots/generate - Bulk slot generation for a centre
const generateSlots = async (req, res, next) => {
  try {
    const { centreId, startDate, endDate, slotDurationMinutes, capacityPerSlot } = req.body;
    const centre = await ProcurementCentre.findById(centreId);
    if (!centre) throw new ApiError(404, 'Centre not found.');

    const slots = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    const duration = slotDurationMinutes || centre.slotDurationMinutes || 60;
    const capacity = capacityPerSlot || Math.floor(centre.dailyCapacity / (8 * 60 / duration));

    while (current <= end) {
      const [startH, startM] = centre.operatingHours.start.split(':').map(Number);
      const [endH, endM] = centre.operatingHours.end.split(':').map(Number);

      let slotStart = startH * 60 + startM;
      const slotEnd = endH * 60 + endM;

      while (slotStart + duration <= slotEnd) {
        const startTime = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
        const endTime = `${String(Math.floor((slotStart + duration) / 60)).padStart(2, '0')}:${String((slotStart + duration) % 60).padStart(2, '0')}`;

        // Skip if slot already exists
        const exists = await Slot.findOne({ centreId, date: new Date(current), startTime });
        if (!exists) {
          slots.push({
            centreId,
            date: new Date(current),
            startTime,
            endTime,
            capacity,
            booked: 0,
            status: 'available',
          });
        }
        slotStart += duration;
      }
      current.setDate(current.getDate() + 1);
    }

    if (slots.length > 0) {
      await Slot.insertMany(slots);
    }

    res.status(201).json(new ApiResponse(201, { created: slots.length }, `${slots.length} slots generated.`));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/crops
const getCrops = async (req, res, next) => {
  try {
    const crops = await Crop.find().sort({ name: 1 });
    res.json(new ApiResponse(200, { crops }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/crops
const createCrop = async (req, res, next) => {
  try {
    const crop = await Crop.create(req.body);
    res.status(201).json(new ApiResponse(201, { crop }, 'Crop created.'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/crops/:id
const updateCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!crop) throw new ApiError(404, 'Crop not found.');
    res.json(new ApiResponse(200, { crop }, 'Crop updated.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const bookingsByDay = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'procurement_completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const topCrops = await Procurement.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$cropName', quantity: { $sum: '$quantity' }, value: { $sum: '$totalAmount' } } },
      { $sort: { value: -1 } },
      { $limit: 5 },
    ]);

    res.json(new ApiResponse(200, { bookingsByDay, paymentStats, topCrops }));
  } catch (error) {
    next(error);
  }
};

// Toggle farmer active status
const toggleFarmerStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== ROLES.FARMER) throw new ApiError(404, 'Farmer not found.');
    user.isActive = !user.isActive;
    await user.save();
    res.json(new ApiResponse(200, { user }, `Farmer account ${user.isActive ? 'activated' : 'deactivated'}.`));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/states
const createState = async (req, res, next) => {
  try {
    const { name, code, zone, nodalHeadName, nodalHeadMobile, nodalHeadEmail, description } = req.body;
    if (!name || !code) throw new ApiError(400, 'State name and code are required.');

    const existing = await State.findOne({ $or: [{ name }, { code }] });
    if (existing) throw new ApiError(409, 'A state with this name or code already exists.');

    const stateRecord = await State.create({
      name,
      code: code.toUpperCase(),
      zone: zone || 'North',
      nodalHeadName,
      nodalHeadMobile,
      nodalHeadEmail,
      description,
      isActive: true,
    });

    res.status(201).json(new ApiResponse(201, { state: stateRecord }, 'State added to national network successfully.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/states
const getStates = async (req, res, next) => {
  try {
    const states = await State.find().sort({ name: 1 });

    const result = await Promise.all(
      states.map(async (st) => {
        const officerCount = await User.countDocuments({ state: new RegExp(`^${st.name}$`, 'i'), role: { $in: OFFICER_ROLES } });
        const centreCount = await ProcurementCentre.countDocuments({ state: new RegExp(`^${st.name}$`, 'i') });
        return {
          ...st.toObject(),
          officerCount,
          centreCount,
        };
      })
    );

    res.json(new ApiResponse(200, { states: result }));
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/state-officers
const createStateOfficer = async (req, res, next) => {
  try {
    const { name, mobile, email, password, state, department, departmentRole, designation } = req.body;
    if (!name || !mobile || !state) throw new ApiError(400, 'Officer name, mobile, and state are required.');

    const existing = await User.findOne({ mobile });
    if (existing) throw new ApiError(409, 'This mobile number is already registered.');

    const count = await User.countDocuments({ role: ROLES.STATE_OFFICER, state: new RegExp(`^${state}$`, 'i') });
    const locationCode = (state.length >= 2 ? state.slice(0, 2) : 'ST').toUpperCase();
    const empId = generateEmployeeId(ROLES.STATE_OFFICER, locationCode, count + 1);

    const user = await User.create({
      name,
      mobile,
      email,
      password: password || 'Kisan@123',
      role: ROLES.STATE_OFFICER,
      level: 2,
      state,
      department: department || 'Administration & Nodal Department',
      departmentRole: departmentRole || 'State Nodal Officer',
      employeeId: empId,
      isActive: true,
      mustChangePassword: true,
    });

    const profile = await OfficerProfile.create({
      userId: user._id,
      employeeId: empId,
      designation: designation || 'State Procurement / Nodal Officer',
    });

    res.status(201).json(new ApiResponse(201, { user, profile }, `State Officer account created for ${state} with Employee ID ${empId}.`));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getFarmers,
  getAllBookings,
  createOfficer,
  getOfficers,
  createCentre,
  updateCentre,
  generateSlots,
  getCrops,
  createCrop,
  updateCrop,
  getAnalytics,
  toggleFarmerStatus,
  createState,
  getStates,
  createStateOfficer,
};
