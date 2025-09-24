const mongoose = require('mongoose');

// ErasureRequest schema for GDPR compliance
const erasureRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: Date,
  ipAddress: {
    type: String,
    required: true,
    encrypted: true
  },
  userAgent: {
    type: String,
    required: true,
    encrypted: true
  },
  estimatedCompletion: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
erasureRequestSchema.index({ userId: 1, status: 1 });
erasureRequestSchema.index({ status: 1, requestedAt: -1 });

// Pre-save to update updatedAt
erasureRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ErasureRequest', erasureRequestSchema);