/**
 * AuditLog Model
 *
 * Defines the schema for storing privacy audit logs in the database.
 * This model is designed to be append-only and immutable for compliance.
 * Handles encryption for sensitive audit data.
 *
 * Business Rules:
 * - Audit logs are immutable and cannot be modified or deleted
 * - All data processing activities must be logged for GDPR compliance
 * - Sensitive audit data (IP addresses, user agents) are encrypted
 * - Supports comprehensive audit trail for security and compliance
 * - Append-only design ensures forensic integrity
 *
 * Security Measures:
 * - AES-256 encryption for sensitive audit fields
 * - Environment-based encryption key management
 * - Automatic encryption/decryption middleware
 * - Immutable operations prevent tampering
 */
import mongoose from 'mongoose';
import { encrypt, decrypt } from '../lib/encryption';
import { createStandardImmutableHooks } from '../lib/modelUtils';

/**
 * AuditLog schema definition
 * - userId: Reference to the user (can be null for system actions)
 * - action: Type of action performed (access, modify, delete, export, consent_granted, consent_withdrawn)
 * - resourceType: Type of resource affected (user, resume, consent)
 * - resourceId: ID of the affected resource
 * - timestamp: When the action occurred (indexed for efficient time-based queries)
 * - ipAddress: Encrypted IP address for audit trail (GDPR compliance)
 * - userAgent: Encrypted user agent for audit trail (GDPR compliance)
 * - performedBy: ID of user or 'system' (indexed for performance)
 * - details: Additional details about the action (optional context)
 *
 * CRITICAL: This collection is append-only and immutable. No updates or deletes are allowed
 * to maintain forensic integrity and regulatory compliance. All operations that attempt
 * to modify audit logs will throw errors.
 */
const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['access', 'modify', 'delete', 'export', 'consent_granted', 'consent_withdrawn'],
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['user', 'resume', 'consent'],
  },
  resourceId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
    index: true,
  },
  details: {
    type: String,
  },
}, { timestamps: true });

// Encrypt sensitive fields before saving
AuditLogSchema.pre('save', function(next) {
  if (this.isModified('ipAddress')) {
    this.ipAddress = encrypt(this.ipAddress);
  }
  if (this.isModified('userAgent')) {
    this.userAgent = encrypt(this.userAgent);
  }
  next();
});

// Decrypt sensitive fields after finding
AuditLogSchema.post('find', function(docs) {
  docs.forEach(doc => {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
  });
});

AuditLogSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
  }
});

// Indexes for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

// IMMUTABILITY ENFORCEMENT: Prevent updates to maintain forensic integrity
// Audit logs must remain unchanged to preserve regulatory compliance and evidence chain
AuditLogSchema.pre('findOneAndUpdate', function(next) {
  throw new Error('Audit logs are immutable and cannot be updated');
});

AuditLogSchema.pre('updateOne', function(next) {
  throw new Error('Audit logs are immutable and cannot be updated');
});

AuditLogSchema.pre('updateMany', function(next) {
  throw new Error('Audit logs are immutable and cannot be updated');
});

AuditLogSchema.pre('findOneAndDelete', function(next) {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

AuditLogSchema.pre('deleteOne', function(next) {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

AuditLogSchema.pre('deleteMany', function(next) {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

// Database indexes for efficient audit log queries
// Index on userId and timestamp: Supports user-specific audit trail queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
// Index on action and timestamp: Supports filtering by action type with time sorting
AuditLogSchema.index({ action: 1, timestamp: -1 });
// Index on resourceType, resourceId, and timestamp: Supports resource-specific audit queries
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

/**
 * AuditLog model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

export default AuditLog;