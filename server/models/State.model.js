const mongoose = require('mongoose');
const { PostgresModel } = require('../utils/postgresModel');

const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    zone: {
      type: String,
      enum: ['North', 'South', 'East', 'West', 'Central', 'North-East'],
      default: 'North',
    },
    nodalHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    nodalHeadName: {
      type: String,
      trim: true,
    },
    nodalHeadMobile: String,
    nodalHeadEmail: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = new PostgresModel(
  'State',
  { zone: 'North', isActive: true },
  {},
  stateSchema
);
