const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, closeDB } = require('../config/db');
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

async function clearDatabase() {
  await connectDB();
  console.log('🗑️  Clearing all tables in PostgreSQL database...');
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
  console.log('✅ All data successfully deleted from PostgreSQL database.');
  await closeDB();
  process.exit(0);
}

clearDatabase().catch((err) => {
  console.error('❌ Clear database error:', err);
  process.exit(1);
});
