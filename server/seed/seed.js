const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const User = require('../models/User.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const ProcurementCentre = require('../models/ProcurementCentre.model');
const Crop = require('../models/Crop.model');
const Slot = require('../models/Slot.model');
const Booking = require('../models/Booking.model');
const QueueEntry = require('../models/QueueEntry.model');
const Procurement = require('../models/Procurement.model');
const Payment = require('../models/Payment.model');
const Notification = require('../models/Notification.model');
const State = require('../models/State.model');
const { generateToken, generateBookingId, startOfDay } = require('../utils/helpers');
const { connectDB, closeDB } = require('../config/db');
const { ROLES, ROLE_LEVELS, ROLE_LABELS, DEFAULT_PASSWORD } = require('../utils/roleHierarchy');

async function seed() {
  await connectDB();

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    FarmerProfile.deleteMany({}),
    OfficerProfile.deleteMany({}),
    ProcurementCentre.deleteMany({}),
    Crop.deleteMany({}),
    Slot.deleteMany({}),
    Booking.deleteMany({}),
    QueueEntry.deleteMany({}),
    Procurement.deleteMany({}),
    Payment.deleteMany({}),
    Notification.deleteMany({}),
    State.deleteMany({}),
  ]);
  console.log('✅ Data cleared');

  // ── CROPS ──────────────────────────────────────────
  console.log('🌾 Seeding crops...');
  const crops = await Crop.insertMany([
    { name: 'Wheat', nameHindi: 'गेहूं', mspPrice: 2275, unit: 'quintal', season: 'Rabi', category: 'Cereal', isActive: true },
    { name: 'Rice (Paddy)', nameHindi: 'धान', mspPrice: 2183, unit: 'quintal', season: 'Kharif', category: 'Cereal', isActive: true },
    { name: 'Maize', nameHindi: 'मक्का', mspPrice: 2090, unit: 'quintal', season: 'Kharif', category: 'Cereal', isActive: true },
    { name: 'Mustard', nameHindi: 'सरसों', mspPrice: 5650, unit: 'quintal', season: 'Rabi', category: 'Oilseed', isActive: true },
    { name: 'Cotton', nameHindi: 'कपास', mspPrice: 7020, unit: 'quintal', season: 'Kharif', category: 'Cotton', isActive: true },
    { name: 'Chickpea (Gram)', nameHindi: 'चना', mspPrice: 5440, unit: 'quintal', season: 'Rabi', category: 'Pulse', isActive: true },
    { name: 'Soybean', nameHindi: 'सोयाबीन', mspPrice: 4600, unit: 'quintal', season: 'Kharif', category: 'Oilseed', isActive: true },
  ]);
  console.log(`✅ ${crops.length} crops seeded`);

  // ══════════════════════════════════════════════════
  //  LEVEL 1 — CENTRAL PROCUREMENT ORGANIZATION
  // ══════════════════════════════════════════════════
  console.log('\n🏛️  Seeding Level 1 — Central Procurement Organization...');
  const centralAdmin = await User.create({
    name: 'Dr. Ramesh Kumar',
    mobile: '9000000001',
    email: 'central@kisanconnect.gov.in',
    password: 'Admin@123',
    role: ROLES.CENTRAL_ADMIN,
    level: ROLE_LEVELS[ROLES.CENTRAL_ADMIN],
    employeeId: 'CPO-001',
    isActive: true,
    mustChangePassword: false,
  });
  console.log(`  ✅ Central Admin: CPO-001 (${centralAdmin.name})`);

  // ══════════════════════════════════════════════════
  //  LEVEL 2 — STATE PROCUREMENT / NODAL DEPARTMENT
  // ══════════════════════════════════════════════════
  console.log('🏢 Seeding Level 2 — State Officers...');
  const statePunjab = await User.create({
    name: 'Sardar Jaspreet Singh',
    mobile: '9100000001',
    email: 'punjab@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.STATE_OFFICER,
    level: ROLE_LEVELS[ROLES.STATE_OFFICER],
    employeeId: 'SPO-PUN-001',
    parentId: centralAdmin._id,
    state: 'Punjab',
    isActive: true,
    mustChangePassword: false,
  });

  const stateMP = await User.create({
    name: 'Shri Dinesh Verma',
    mobile: '9100000002',
    email: 'mp@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.STATE_OFFICER,
    level: ROLE_LEVELS[ROLES.STATE_OFFICER],
    employeeId: 'SPO-MP-001',
    parentId: centralAdmin._id,
    state: 'Madhya Pradesh',
    isActive: true,
    mustChangePassword: false,
  });
  console.log(`  ✅ State Officers: SPO-PUN-001 (Punjab), SPO-MP-001 (MP)`);

  // ══════════════════════════════════════════════════
  //  LEVEL 3 — DISTRICT NODAL OFFICERS
  // ══════════════════════════════════════════════════
  console.log('🏘️  Seeding Level 3 — District Nodal Officers...');
  const districtLudhiana = await User.create({
    name: 'Gurpreet Kaur Bajwa',
    mobile: '9200000001',
    email: 'dno.ludhiana@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.DISTRICT_OFFICER,
    level: ROLE_LEVELS[ROLES.DISTRICT_OFFICER],
    employeeId: 'DNO-LDH-001',
    parentId: statePunjab._id,
    state: 'Punjab',
    district: 'Ludhiana',
    isActive: true,
    mustChangePassword: false,
  });

  const districtAmritsar = await User.create({
    name: 'Harmanpreet Singh Gill',
    mobile: '9200000002',
    email: 'dno.amritsar@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.DISTRICT_OFFICER,
    level: ROLE_LEVELS[ROLES.DISTRICT_OFFICER],
    employeeId: 'DNO-AMR-001',
    parentId: statePunjab._id,
    state: 'Punjab',
    district: 'Amritsar',
    isActive: true,
    mustChangePassword: false,
  });

  const districtPatiala = await User.create({
    name: 'Navjot Singh Sidhu',
    mobile: '9200000003',
    email: 'dno.patiala@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.DISTRICT_OFFICER,
    level: ROLE_LEVELS[ROLES.DISTRICT_OFFICER],
    employeeId: 'DNO-PTL-001',
    parentId: statePunjab._id,
    state: 'Punjab',
    district: 'Patiala',
    isActive: true,
    mustChangePassword: false,
  });
  console.log(`  ✅ District Officers: DNO-LDH-001, DNO-AMR-001, DNO-PTL-001`);

  // ── CENTRES ────────────────────────────────────────
  console.log('🏢 Seeding procurement centres...');
  const [centre1, centre2, centre3] = await ProcurementCentre.insertMany([
    {
      centreId: 'KPC-LDH-001',
      name: 'Ludhiana Main Procurement Centre',
      address: 'Grain Market, Near Bus Stand, Ludhiana',
      district: 'Ludhiana',
      state: 'Punjab',
      pincode: '141001',
      contactPhone: '0161-2345678',
      contactEmail: 'ludhiana@kisanconnect.gov.in',
      operatingHours: { start: '09:00', end: '17:00' },
      dailyCapacity: 150,
      slotDurationMinutes: 60,
      avgServiceTimeMinutes: 8,
      cancellationCutoffHours: 12,
      availableCrops: [crops[0]._id, crops[1]._id, crops[2]._id, crops[3]._id],
      eligibilityDistricts: ['Ludhiana', 'Fatehgarh Sahib'],
      isActive: true,
      description: 'Primary wheat and paddy procurement centre for Ludhiana district.',
      facilities: ['Weighing Bridge', 'Storage Facility', 'Waiting Area', 'Drinking Water', 'Restrooms'],
    },
    {
      centreId: 'KPC-AMR-001',
      name: 'Amritsar Procurement Centre',
      address: 'Mandi Complex, GT Road, Amritsar',
      district: 'Amritsar',
      state: 'Punjab',
      pincode: '143001',
      contactPhone: '0183-2567890',
      contactEmail: 'amritsar@kisanconnect.gov.in',
      operatingHours: { start: '08:30', end: '16:30' },
      dailyCapacity: 120,
      slotDurationMinutes: 60,
      avgServiceTimeMinutes: 10,
      cancellationCutoffHours: 24,
      availableCrops: [crops[0]._id, crops[1]._id, crops[4]._id, crops[5]._id],
      eligibilityDistricts: ['Amritsar', 'Tarn Taran'],
      isActive: true,
      description: 'Multi-crop procurement centre serving Amritsar and Tarn Taran districts.',
      facilities: ['Weighing Machine', 'Cold Storage', 'ATM', 'Canteen'],
    },
    {
      centreId: 'KPC-PTL-001',
      name: 'Patiala District Procurement Centre',
      address: 'Old Mandi Road, Rajpura, Patiala',
      district: 'Patiala',
      state: 'Punjab',
      pincode: '147001',
      contactPhone: '0175-2234567',
      contactEmail: 'patiala@kisanconnect.gov.in',
      operatingHours: { start: '09:00', end: '17:00' },
      dailyCapacity: 200,
      slotDurationMinutes: 60,
      avgServiceTimeMinutes: 7,
      cancellationCutoffHours: 12,
      availableCrops: [crops[0]._id, crops[3]._id, crops[6]._id, crops[2]._id],
      eligibilityDistricts: ['Patiala', 'Sangrur', 'Barnala'],
      isActive: true,
      description: 'Largest procurement centre in the region. Handles wheat, mustard, and soybean.',
      facilities: ['Automated Weighing', 'Large Waiting Area', 'Solar Shade', 'Medical Aid'],
    },
  ]);
  console.log('✅ 3 centres seeded');

  // ══════════════════════════════════════════════════
  //  LEVEL 4 — CENTRE HEADS (Procurement Center Head)
  // ══════════════════════════════════════════════════
  console.log('👔 Seeding Level 4 — Centre Heads...');
  const centreHead1 = await User.create({
    name: 'Amarjit Singh Bhullar',
    mobile: '9300000001',
    email: 'pch.ludhiana@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.CENTRE_HEAD,
    level: ROLE_LEVELS[ROLES.CENTRE_HEAD],
    employeeId: 'PCH-LDH-001',
    parentId: districtLudhiana._id,
    state: 'Punjab',
    district: 'Ludhiana',
    centreId: centre1._id,
    isActive: true,
    mustChangePassword: false,
  });
  await OfficerProfile.create({ userId: centreHead1._id, centreId: centre1._id, employeeId: 'PCH-LDH-001', designation: ROLE_LABELS[ROLES.CENTRE_HEAD] });

  const centreHead2 = await User.create({
    name: 'Kuldeep Singh Mann',
    mobile: '9300000002',
    email: 'pch.amritsar@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.CENTRE_HEAD,
    level: ROLE_LEVELS[ROLES.CENTRE_HEAD],
    employeeId: 'PCH-AMR-001',
    parentId: districtAmritsar._id,
    state: 'Punjab',
    district: 'Amritsar',
    centreId: centre2._id,
    isActive: true,
    mustChangePassword: false,
  });
  await OfficerProfile.create({ userId: centreHead2._id, centreId: centre2._id, employeeId: 'PCH-AMR-001', designation: ROLE_LABELS[ROLES.CENTRE_HEAD] });

  const centreHead3 = await User.create({
    name: 'Harinder Kaur Sandhu',
    mobile: '9300000003',
    email: 'pch.patiala@kisanconnect.gov.in',
    password: DEFAULT_PASSWORD,
    role: ROLES.CENTRE_HEAD,
    level: ROLE_LEVELS[ROLES.CENTRE_HEAD],
    employeeId: 'PCH-PTL-001',
    parentId: districtPatiala._id,
    state: 'Punjab',
    district: 'Patiala',
    centreId: centre3._id,
    isActive: true,
    mustChangePassword: false,
  });
  await OfficerProfile.create({ userId: centreHead3._id, centreId: centre3._id, employeeId: 'PCH-PTL-001', designation: ROLE_LABELS[ROLES.CENTRE_HEAD] });
  console.log(`  ✅ Centre Heads: PCH-LDH-001, PCH-AMR-001, PCH-PTL-001`);

  // ══════════════════════════════════════════════════
  //  LEVEL 5 — PROCUREMENT OFFICERS, QUALITY & WEIGHING, DATA/SYSTEM STAFF
  // ══════════════════════════════════════════════════
  console.log('👮 Seeding Level 5 — Officers & Staff...');

  // Helper to create centre-level staff
  async function createCentreStaff(name, mobile, email, role, empId, parentUser, centre) {
    const user = await User.create({
      name, mobile, email: email || undefined,
      password: DEFAULT_PASSWORD,
      role,
      level: ROLE_LEVELS[role],
      employeeId: empId,
      parentId: parentUser._id,
      state: centre.state || 'Punjab',
      district: centre.district,
      centreId: centre._id,
      isActive: true,
      mustChangePassword: false,
    });
    await OfficerProfile.create({
      userId: user._id,
      centreId: centre._id,
      employeeId: empId,
      designation: ROLE_LABELS[role],
    });
    await ProcurementCentre.findByIdAndUpdate(centre._id, { $addToSet: { officerIds: user._id } });
    return user;
  }

  // Ludhiana Centre staff
  const po1 = await createCentreStaff('Gurpreet Singh', '9810000001', 'officer1@kisanconnect.gov.in', ROLES.PROCUREMENT_OFFICER, 'PO-LDH-001', centreHead1, centre1);
  const po2 = await createCentreStaff('Mandeep Kaur', '9810000002', null, ROLES.PROCUREMENT_OFFICER, 'PO-LDH-002', centreHead1, centre1);
  const qw1 = await createCentreStaff('Bhagwant Singh', '9810000003', null, ROLES.QUALITY_STAFF, 'QWS-LDH-001', centreHead1, centre1);
  const ds1 = await createCentreStaff('Ravinder Kumar', '9810000004', null, ROLES.DATA_STAFF, 'DSS-LDH-001', centreHead1, centre1);

  // Amritsar Centre staff
  const po3 = await createCentreStaff('Harmandeep Kaur', '9820000002', 'officer2@kisanconnect.gov.in', ROLES.PROCUREMENT_OFFICER, 'PO-AMR-001', centreHead2, centre2);
  const po4 = await createCentreStaff('Sukhdev Singh', '9820000003', null, ROLES.PROCUREMENT_OFFICER, 'PO-AMR-002', centreHead2, centre2);
  const qw2 = await createCentreStaff('Preetinder Kaur', '9820000004', null, ROLES.QUALITY_STAFF, 'QWS-AMR-001', centreHead2, centre2);
  const ds2 = await createCentreStaff('Amandeep Singh', '9820000005', null, ROLES.DATA_STAFF, 'DSS-AMR-001', centreHead2, centre2);

  // Patiala Centre staff
  const po5 = await createCentreStaff('Balwinder Singh', '9830000003', 'officer3@kisanconnect.gov.in', ROLES.PROCUREMENT_OFFICER, 'PO-PTL-001', centreHead3, centre3);
  const po6 = await createCentreStaff('Jaswinder Kaur', '9830000004', null, ROLES.PROCUREMENT_OFFICER, 'PO-PTL-002', centreHead3, centre3);
  const qw3 = await createCentreStaff('Lakhvir Singh', '9830000005', null, ROLES.QUALITY_STAFF, 'QWS-PTL-001', centreHead3, centre3);
  const ds3 = await createCentreStaff('Kamaljit Kaur', '9830000006', null, ROLES.DATA_STAFF, 'DSS-PTL-001', centreHead3, centre3);

  console.log('  ✅ 6 Procurement Officers, 3 Quality Staff, 3 Data Staff seeded');

  // ══════════════════════════════════════════════════
  //  LEVEL 6 — GATE / VERIFICATION STAFF
  // ══════════════════════════════════════════════════
  console.log('🚪 Seeding Level 6 — Gate/Verification Staff...');
  const gv1 = await createCentreStaff('Harbhajan Singh', '9840000001', null, ROLES.GATE_STAFF, 'GVS-LDH-001', centreHead1, centre1);
  const gv2 = await createCentreStaff('Sarabjit Kaur', '9840000002', null, ROLES.GATE_STAFF, 'GVS-LDH-002', centreHead1, centre1);
  const gv3 = await createCentreStaff('Paramjit Singh', '9840000003', null, ROLES.GATE_STAFF, 'GVS-AMR-001', centreHead2, centre2);
  const gv4 = await createCentreStaff('Dalbir Kaur', '9840000004', null, ROLES.GATE_STAFF, 'GVS-AMR-002', centreHead2, centre2);
  const gv5 = await createCentreStaff('Ranjit Singh', '9840000005', null, ROLES.GATE_STAFF, 'GVS-PTL-001', centreHead3, centre3);
  const gv6 = await createCentreStaff('Gurmeet Kaur', '9840000006', null, ROLES.GATE_STAFF, 'GVS-PTL-002', centreHead3, centre3);
  console.log('  ✅ 6 Gate/Verification Staff seeded');

  // ══════════════════════════════════════════════════
  //  LEVEL 7 — FARMERS (self-registration)
  // ══════════════════════════════════════════════════
  console.log('🌾 Seeding 15 farmers...');
  const farmerData = [
    { name: 'Rajveer Singh', mobile: '9751000001', email: 'farmer@example.com', district: 'Ludhiana', village: 'Doraha', farmerId: 'FMR-LDH-001' },
    { name: 'Harjinder Kaur', mobile: '9751000002', district: 'Ludhiana', village: 'Khanna', farmerId: 'FMR-LDH-002' },
    { name: 'Sukhwinder Singh', mobile: '9751000003', district: 'Ludhiana', village: 'Machhiwara', farmerId: 'FMR-LDH-003' },
    { name: 'Manpreet Kaur', mobile: '9751000004', district: 'Ludhiana', village: 'Raikot', farmerId: 'FMR-LDH-004' },
    { name: 'Gurdeep Singh', mobile: '9751000005', district: 'Ludhiana', village: 'Samrala', farmerId: 'FMR-LDH-005' },
    { name: 'Amarjit Singh', mobile: '9751000006', district: 'Amritsar', village: 'Jandiala', farmerId: 'FMR-AMR-001' },
    { name: 'Kulwinder Kaur', mobile: '9751000007', district: 'Amritsar', village: 'Majitha', farmerId: 'FMR-AMR-002' },
    { name: 'Daljit Singh', mobile: '9751000008', district: 'Amritsar', village: 'Rayya', farmerId: 'FMR-AMR-003' },
    { name: 'Baljinder Singh', mobile: '9751000009', district: 'Patiala', village: 'Nabha', farmerId: 'FMR-PTL-001' },
    { name: 'Satinder Kaur', mobile: '9751000010', district: 'Patiala', village: 'Rajpura', farmerId: 'FMR-PTL-002' },
    { name: 'Paramjit Singh', mobile: '9751000011', district: 'Patiala', village: 'Sangrur', farmerId: 'FMR-PTL-003' },
    { name: 'Navdeep Singh', mobile: '9751000012', district: 'Ludhiana', village: 'Sidhwan Bet', farmerId: 'FMR-LDH-006' },
    { name: 'Jaspal Kaur', mobile: '9751000013', district: 'Amritsar', village: 'Tarn Taran', farmerId: 'FMR-AMR-004' },
    { name: 'Ranjit Singh', mobile: '9751000014', district: 'Patiala', village: 'Bhawanigarh', farmerId: 'FMR-PTL-004' },
    { name: 'Lakhwinder Singh', mobile: '9751000015', district: 'Ludhiana', village: 'Mullanpur', farmerId: 'FMR-LDH-007' },
  ];

  const farmers = [];
  for (const f of farmerData) {
    const user = await User.create({
      name: f.name,
      mobile: f.mobile,
      email: f.email || undefined,
      password: 'Farmer@123',
      role: ROLES.FARMER,
      level: ROLE_LEVELS[ROLES.FARMER],
      state: 'Punjab',
      district: f.district,
      isActive: true,
    });

    const centreForDistrict = f.district === 'Ludhiana' ? centre1 : f.district === 'Amritsar' ? centre2 : centre3;
    const cropForFarmer = crops[Math.floor(Math.random() * 4)];

    await FarmerProfile.create({
      userId: user._id,
      farmerIdNumber: f.farmerId,
      state: 'Punjab',
      district: f.district,
      village: f.village,
      address: `Near Panchayat Office, ${f.village}, ${f.district}, Punjab`,
      crops: [{ cropId: cropForFarmer._id, cropName: cropForFarmer.name, estimatedQuantity: Math.floor(Math.random() * 80 + 20), unit: 'quintal' }],
      isProfileComplete: true,
    });
    farmers.push({ user, district: f.district, centreForDistrict, cropForFarmer });
  }
  console.log(`✅ ${farmers.length} farmers seeded`);

  // ── SLOTS (next 7 days for all 3 centres) ──────────
  console.log('📅 Generating slots...');
  const slotDocs = [];
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    for (const centre of [centre1, centre2, centre3]) {
      const [startH, startM] = centre.operatingHours.start.split(':').map(Number);
      const [endH, endM] = centre.operatingHours.end.split(':').map(Number);
      let slotStart = startH * 60 + startM;
      const slotEnd = endH * 60 + endM;
      const duration = centre.slotDurationMinutes;
      const capacity = Math.floor(centre.dailyCapacity / ((slotEnd - slotStart) / duration));

      while (slotStart + duration <= slotEnd) {
        const st = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
        const et = `${String(Math.floor((slotStart + duration) / 60)).padStart(2, '0')}:${String((slotStart + duration) % 60).padStart(2, '0')}`;
        slotDocs.push({ centreId: centre._id, date: new Date(date), startTime: st, endTime: et, capacity, booked: 0, status: 'available' });
        slotStart += duration;
      }
    }
  }
  const slots = await Slot.insertMany(slotDocs);
  console.log(`✅ ${slots.length} slots generated`);

  // ── BOOKINGS, QUEUE, PROCUREMENTS, PAYMENTS ────────
  console.log('📋 Creating sample bookings with various statuses...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySlots = (centreId) => slots.filter(
    (s) => s.centreId.toString() === centreId.toString() &&
            s.date.getTime() === today.getTime()
  );

  const bookingScenarios = [
    // Ludhiana Centre
    { farmerIdx: 0, centreId: centre1._id, cropIdx: 0, qty: 50, status: 'payment_completed', qStatus: 'completed', procStatus: 'completed', payStatus: 'paid' },
    { farmerIdx: 1, centreId: centre1._id, cropIdx: 0, qty: 35, status: 'payment_processing', qStatus: 'completed', procStatus: 'completed', payStatus: 'processing' },
    { farmerIdx: 2, centreId: centre1._id, cropIdx: 3, qty: 60, status: 'procurement_completed', qStatus: 'completed', procStatus: 'completed', payStatus: 'pending' },
    { farmerIdx: 3, centreId: centre1._id, cropIdx: 0, qty: 45, status: 'procurement_in_progress', qStatus: 'serving', procStatus: 'in_progress', payStatus: null },
    { farmerIdx: 4, centreId: centre1._id, cropIdx: 2, qty: 30, status: 'verification', qStatus: 'waiting', procStatus: null, payStatus: null },
    { farmerIdx: 11, centreId: centre1._id, cropIdx: 0, qty: 55, status: 'arrived', qStatus: 'waiting', procStatus: null, payStatus: null },
    { farmerIdx: 14, centreId: centre1._id, cropIdx: 0, qty: 40, status: 'booked', qStatus: 'waiting', procStatus: null, payStatus: null },

    // Amritsar Centre
    { farmerIdx: 5, centreId: centre2._id, cropIdx: 0, qty: 42, status: 'payment_completed', qStatus: 'completed', procStatus: 'completed', payStatus: 'paid' },
    { farmerIdx: 6, centreId: centre2._id, cropIdx: 1, qty: 28, status: 'procurement_completed', qStatus: 'completed', procStatus: 'completed', payStatus: 'pending' },
    { farmerIdx: 7, centreId: centre2._id, cropIdx: 4, qty: 15, status: 'booked', qStatus: 'waiting', procStatus: null, payStatus: null },
    { farmerIdx: 12, centreId: centre2._id, cropIdx: 0, qty: 38, status: 'arrived', qStatus: 'waiting', procStatus: null, payStatus: null },

    // Patiala Centre
    { farmerIdx: 8, centreId: centre3._id, cropIdx: 3, qty: 65, status: 'payment_completed', qStatus: 'completed', procStatus: 'completed', payStatus: 'paid' },
    { farmerIdx: 9, centreId: centre3._id, cropIdx: 0, qty: 75, status: 'procurement_in_progress', qStatus: 'serving', procStatus: 'in_progress', payStatus: null },
    { farmerIdx: 10, centreId: centre3._id, cropIdx: 6, qty: 50, status: 'booked', qStatus: 'waiting', procStatus: null, payStatus: null },
    { farmerIdx: 13, centreId: centre3._id, cropIdx: 0, qty: 55, status: 'booked', qStatus: 'waiting', procStatus: null, payStatus: null },
  ];

  for (let i = 0; i < bookingScenarios.length; i++) {
    const s = bookingScenarios[i];
    const farmer = farmers[s.farmerIdx];
    const crop = crops[s.cropIdx];
    const centreSlots = todaySlots(s.centreId);
    if (!centreSlots.length) continue;

    const slotIndex = Math.min(i % centreSlots.length, centreSlots.length - 1);
    const slot = centreSlots[slotIndex];
    const tokenNum = i + 100;
    const token = generateToken(tokenNum);
    const bookingId = generateBookingId();

    const booking = await Booking.create({
      bookingId,
      farmerId: farmer.user._id,
      centreId: s.centreId,
      slotId: slot._id,
      cropId: crop._id,
      cropName: crop.name,
      quantity: s.qty,
      unit: 'quintal',
      token,
      bookingDate: today,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
      status: s.status,
    });

    await Slot.findByIdAndUpdate(slot._id, { $inc: { booked: 1 } });

    await QueueEntry.create({
      bookingId: booking._id,
      farmerId: farmer.user._id,
      centreId: s.centreId,
      slotId: slot._id,
      token,
      position: tokenNum,
      queueDate: today,
      status: s.qStatus,
      ...(s.qStatus === 'completed' ? { completedAt: new Date() } : {}),
      ...(s.qStatus === 'serving' ? { servedAt: new Date(), counter: 'Counter 1' } : {}),
    });

    if (s.procStatus) {
      const totalAmount = s.qty * crop.mspPrice;
      const proc = await Procurement.create({
        bookingId: booking._id,
        farmerId: farmer.user._id,
        centreId: s.centreId,
        cropId: crop._id,
        cropName: crop.name,
        quantity: s.qty,
        unit: 'quintal',
        grade: ['A', 'B', 'A', 'B'][i % 4],
        pricePerUnit: crop.mspPrice,
        totalAmount,
        officerId: po1._id,
        status: s.procStatus,
        procurementDate: s.procStatus === 'completed' ? new Date() : undefined,
        completedAt: s.procStatus === 'completed' ? new Date() : undefined,
      });

      if (s.payStatus) {
        const txnId = `DEMO-TXN-${Date.now().toString(36).toUpperCase()}-${i}`;
        await Payment.create({
          procurementId: proc._id,
          bookingId: booking._id,
          farmerId: farmer.user._id,
          amount: totalAmount,
          status: s.payStatus,
          transactionId: s.payStatus === 'paid' ? txnId : undefined,
          referenceNo: s.payStatus === 'paid' ? `PFMS-${Math.random().toString(36).substring(2, 10).toUpperCase()}` : undefined,
          paymentDate: s.payStatus === 'paid' ? new Date() : undefined,
          isDemoPayment: true,
          notes: '[DEMO] Simulated payment record for demonstration purposes.',
          processedBy: po1._id,
          paymentMethod: 'bank_transfer',
        });
      }
    }

    await Notification.create({
      userId: farmer.user._id,
      type: 'booking_confirmed',
      title: 'Booking Confirmed ✓',
      message: `Your procurement slot is booked for ${today.toLocaleDateString('en-IN')} at ${slot.startTime}. Your token number is ${token}.`,
      isRead: i < 5,
      metadata: { bookingId: booking._id.toString(), token },
    });
  }

  // Upcoming bookings
  console.log('📅 Creating upcoming bookings...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tomorrowSlots = slots.filter(
    (s) => s.centreId.toString() === centre1._id.toString() &&
            s.date.getTime() === tomorrow.getTime()
  );

  if (tomorrowSlots.length >= 2) {
    for (let i = 0; i < 2 && i < farmers.slice(0, 3).length; i++) {
      const farmer = farmers[i];
      const slot = tomorrowSlots[i];
      const token = generateToken(200 + i);
      const booking = await Booking.create({
        bookingId: generateBookingId(),
        farmerId: farmer.user._id,
        centreId: centre1._id,
        slotId: slot._id,
        cropId: crops[0]._id,
        cropName: crops[0].name,
        quantity: 40 + i * 10,
        unit: 'quintal',
        token,
        bookingDate: tomorrow,
        slotStartTime: slot.startTime,
        slotEndTime: slot.endTime,
        status: 'booked',
      });
      await Slot.findByIdAndUpdate(slot._id, { $inc: { booked: 1 } });
      await QueueEntry.create({
        bookingId: booking._id,
        farmerId: farmer.user._id,
        centreId: centre1._id,
        slotId: slot._id,
        token,
        position: 200 + i,
        queueDate: tomorrow,
        status: 'waiting',
      });
      await Notification.create({
        userId: farmer.user._id,
        type: 'slot_reminder',
        title: 'Slot Reminder',
        message: `Your procurement slot is tomorrow at ${slot.startTime}. Please arrive 10 minutes early. Token: ${token}.`,
        isRead: false,
        metadata: { bookingId: booking._id.toString(), token },
      });
    }
  }

  // ══════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════
  console.log('\n✅ ═══════════════════════════════════════════════════════════');
  console.log('   SEED COMPLETE — Full Hierarchy Demo Credentials');
  console.log('   ═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('   🏛️  LEVEL 1 — CENTRAL ADMIN');
  console.log('   Employee ID: CPO-001  |  Password: Admin@123');
  console.log('   Mobile: 9000000001');
  console.log('');
  console.log('   🏢 LEVEL 2 — STATE OFFICERS');
  console.log('   SPO-PUN-001 (Punjab)      |  Password: Kisan@123');
  console.log('   SPO-MP-001  (MP)          |  Password: Kisan@123');
  console.log('');
  console.log('   🏘️  LEVEL 3 — DISTRICT NODAL OFFICERS');
  console.log('   DNO-LDH-001 (Ludhiana)    |  Password: Kisan@123');
  console.log('   DNO-AMR-001 (Amritsar)    |  Password: Kisan@123');
  console.log('   DNO-PTL-001 (Patiala)     |  Password: Kisan@123');
  console.log('');
  console.log('   👔 LEVEL 4 — CENTRE HEADS');
  console.log('   PCH-LDH-001 (Ludhiana)    |  Password: Kisan@123');
  console.log('   PCH-AMR-001 (Amritsar)    |  Password: Kisan@123');
  console.log('   PCH-PTL-001 (Patiala)     |  Password: Kisan@123');
  console.log('');
  console.log('   👮 LEVEL 5 — OFFICERS & STAFF');
  console.log('   PO-LDH-001 / PO-LDH-002  |  Password: Kisan@123');
  console.log('   QWS-LDH-001               |  Password: Kisan@123');
  console.log('   DSS-LDH-001               |  Password: Kisan@123');
  console.log('   (+ Amritsar & Patiala staff with same pattern)');
  console.log('');
  console.log('   🚪 LEVEL 6 — GATE/VERIFICATION STAFF');
  console.log('   GVS-LDH-001 / GVS-LDH-002  |  Password: Kisan@123');
  console.log('   (+ Amritsar & Patiala staff with same pattern)');
  console.log('');
  console.log('   🌾 LEVEL 7 — FARMER (login with mobile)');
  console.log('   Mobile: 9751000001  |  Password: Farmer@123');
  console.log('   ═══════════════════════════════════════════════════════════\n');

  await closeDB();
  console.log('🔌 Disconnected from PostgreSQL');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
