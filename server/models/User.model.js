const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PostgresModel } = require('../utils/postgresModel');

const userSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,

  // ── Hierarchy fields ──────────────────────────────
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  level: {
    type: Number,
    default: 7,
  },
  state: {
    type: String,
    trim: true,
  },
  district: {
    type: String,
    trim: true,
  },
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcurementCentre',
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = new PostgresModel('User', { role: 'farmer', isActive: true, level: 7, mustChangePassword: false }, {
  comparePassword: async function (candidatePassword) {
    if (!this.password) return false;
    if (!this.password.startsWith('$2')) {
      return candidatePassword === this.password;
    }
    return bcrypt.compare(candidatePassword, this.password);
  },
}, userSchema);
