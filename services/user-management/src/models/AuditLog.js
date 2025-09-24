const mongoose = require('mongoose');

// AuditLog schema - append-only, immutable
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['access', 'modify', 'delete', 'export', 'consent_granted', 'consent_withdrawn']
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['user', 'resume', 'consent']
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    encrypted: true // Note: Implement encryption middleware
  },
  userAgent: {
    type: String,
    required: true,
    encrypted: true
  },
  performedBy: {
    type: String,
    required: true,
    index: true
  },
  details: String,
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  // No updates allowed - append-only
  timestamps: false
});

// Indexes
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

// Pre-save to ensure no updates
auditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('AuditLog entries are immutable'));
  }
  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);