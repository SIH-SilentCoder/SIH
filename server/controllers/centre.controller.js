const ProcurementCentre = require('../models/ProcurementCentre.model');
const Slot = require('../models/Slot.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// GET /api/centres - List centres (filtered by farmer eligibility if logged in as farmer)
const getCentres = async (req, res, next) => {
  try {
    const { district, state, cropId, page = 1, limit = 50 } = req.query;
    let filter = { isActive: true };

    if (district) filter.district = { $regex: district, $options: 'i' };
    if (state) filter.state = { $regex: state, $options: 'i' };

    // If State Officer or District Officer, strictly constrain centres
    if (req.user && req.user.role === 'state_officer' && req.user.state) {
      filter.state = { $regex: `^${req.user.state}$`, $options: 'i' };
    } else if (req.user && req.user.role === 'district_officer') {
      if (req.user.district) filter.district = { $regex: `^${req.user.district}$`, $options: 'i' };
      if (req.user.state) filter.state = { $regex: `^${req.user.state}$`, $options: 'i' };
    }

    // If farmer, prioritize centres in their district + any open centres
    if (req.user && req.user.role === 'farmer') {
      const profile = await FarmerProfile.findOne({ userId: req.user._id });
      if (profile && profile.district) {
        filter.$or = [
          { eligibilityDistricts: { $size: 0 } },
          { eligibilityDistricts: { $elemMatch: { $regex: profile.district, $options: 'i' } } },
          { district: { $regex: profile.district, $options: 'i' } },
        ];
      }
    }

    let centres = await ProcurementCentre.find(filter)
      .populate('availableCrops', 'name mspPrice unit season')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ name: 1 });

    // Fallback: ONLY for farmers if district filter produced 0 centres so they can still select a mandi
    if ((!centres || centres.length === 0) && (!req.user || req.user.role === 'farmer')) {
      centres = await ProcurementCentre.find({ isActive: true })
        .populate('availableCrops', 'name mspPrice unit season')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ name: 1 });
    }

    const total = centres.length;

    res.json(
      new ApiResponse(200, {
        centres,
        pagination: { page: Number(page), limit: Number(limit), total },
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/centres/:id
const getCentreById = async (req, res, next) => {
  try {
    const centre = await ProcurementCentre.findById(req.params.id)
      .populate('availableCrops', 'name mspPrice unit season category')
      .populate('officerIds', 'name');

    if (!centre || !centre.isActive) {
      throw new ApiError(404, 'Procurement centre not found.');
    }

    res.json(new ApiResponse(200, { centre }));
  } catch (error) {
    next(error);
  }
};

// GET /api/centres/:id/slots?date=YYYY-MM-DD
const getCentreSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) throw new ApiError(400, 'Date is required.');

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    let slots = await Slot.find({
      centreId: req.params.id,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'closed' },
    }).sort({ startTime: 1 });

    // If no slots exist for this date yet, auto-generate standard slots so farmer is never blocked
    if (!slots || slots.length === 0) {
      const centre = await ProcurementCentre.findById(req.params.id);
      if (centre && centre.operatingHours) {
        const duration = centre.slotDurationMinutes || 60;
        const capacity = Math.max(1, Math.floor((centre.dailyCapacity || 100) / (8 * 60 / duration)));
        const [startH, startM] = (centre.operatingHours.start || '09:00').split(':').map(Number);
        const [endH, endM] = (centre.operatingHours.end || '17:00').split(':').map(Number);

        let slotStart = startH * 60 + startM;
        const slotEnd = endH * 60 + endM;
        const newSlots = [];

        while (slotStart + duration <= slotEnd) {
          const startTime = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
          const endTime = `${String(Math.floor((slotStart + duration) / 60)).padStart(2, '0')}:${String((slotStart + duration) % 60).padStart(2, '0')}`;

          newSlots.push({
            centreId: centre._id,
            date: dayStart,
            startTime,
            endTime,
            capacity,
            booked: 0,
            status: 'available',
          });
          slotStart += duration;
        }

        if (newSlots.length > 0) {
          await Slot.insertMany(newSlots);
          slots = await Slot.find({
            centreId: req.params.id,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $ne: 'closed' },
          }).sort({ startTime: 1 });
        }
      }
    }

    res.json(new ApiResponse(200, { slots }));
  } catch (error) {
    next(error);
  }
};

module.exports = { getCentres, getCentreById, getCentreSlots };
