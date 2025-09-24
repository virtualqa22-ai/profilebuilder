const mongoose = require('mongoose');

// ConsentRecord schema
const consentRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  purpose: {
    type: String,
    required: true,
    enum: ['account_management', 'resume_building', 'analytics', 'marketing', 'legal_compliance']
  },
  status: {
    type: String,
    required: true,
    enum: ['granted', 'denied', 'withdrawn', 'expired'],
    default: 'granted'
  },
  grantedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: Date,
  withdrawnAt: Date,
  ipAddress: {
    type: String,
    required: true,
    encrypted: true // Implement encryption
  },
  userAgent: {
    type: String,
    required: true,
    encrypted: true
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
consentRecordSchema.index({ userId: 1, purpose: 1 });
consentRecordSchema.index({ status: 1, expiresAt: 1 });

// Pre-save to update updatedAt
consentRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ConsentRecord', consentRecordSchema);