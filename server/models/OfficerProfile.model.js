const mongoose = require('mongoose');
const { PostgresModel } = require('../utils/postgresModel');

const officerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    centreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProcurementCentre',
      required: false,
      index: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
      default: 'Procurement Officer',
    },
    state: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = new PostgresModel('OfficerProfile', { designation: 'Procurement Officer' }, {}, officerProfileSchema);
