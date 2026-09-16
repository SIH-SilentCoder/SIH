const mongoose = require('mongoose');
const { PostgresModel } = require('../utils/postgresModel');

const procurementSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    centreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProcurementCentre',
      required: true,
    },
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: true,
    },
    cropName: String,
    quantity: Number,
    unit: { type: String, default: 'quintal' },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'Rejected'],
    },
    pricePerUnit: Number, // MSP or negotiated price
    totalAmount: Number,
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'in_progress',
        'completed',
        'rejected',
      ],
      default: 'pending',
      index: true,
    },
    qualityNotes: String,
    moisture: String,
    foreignMatter: String,
    slipNumber: {
      type: String,
      sparse: true,
    },
    officerApproved: {
      type: Boolean,
      default: false,
    },
    officerApprovedAt: Date,
    officerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    procurementDate: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = new PostgresModel('Procurement', {}, {}, procurementSchema);
