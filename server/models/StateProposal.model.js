const mongoose = require('mongoose');
const { PostgresModel } = require('../utils/postgresModel');

const stateProposalSchema = new mongoose.Schema(
  {
    proposalId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['add_district', 'add_mandi', 'add_officer_staff', 'add_crop'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    proposedByName: String,
    proposedByEmpId: String,
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_central_approval', 'changes_requested', 'approved', 'rejected'],
      default: 'pending_central_approval',
      index: true,
    },
    feedbackHistory: [
      {
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        senderName: String,
        senderRole: String,
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    appliedAt: Date,
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = new PostgresModel(
  'StateProposal',
  { status: 'pending_central_approval', feedbackHistory: [] },
  {},
  stateProposalSchema
);
