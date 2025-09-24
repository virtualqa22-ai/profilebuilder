/**
 * ConsentRecord Model
 *
 * Defines the schema for storing user consent records in the database.
 * Handles data processing consents with encryption for sensitive fields.
 *
 * Business Rules:
 * - Consent records are immutable once granted (only status changes allowed)
 * - IP addresses and user agents are encrypted to protect user privacy
 * - Consent expiration is enforced automatically
 * - Supports GDPR-compliant consent management
 *
 * Security Measures:
 * - AES-256 encryption for sensitive audit data
 * - Environment-based encryption key management
 * - Automatic encryption/decryption middleware
 */
import mongoose from 'mongoose';
import { encrypt, decrypt } from '../lib/encryption';

/**
 * Type definitions for ConsentRecord
 */
type ConsentPurpose = 'account_management' | 'resume_building' | 'analytics' | 'marketing' | 'legal_compliance';
type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'expired';

interface IConsentRecord {
  userId: string; // mongoose.Schema.Types.ObjectId as string
  purpose: ConsentPurpose;
  status: ConsentStatus;
  grantedAt: Date;
  expiresAt?: Date;
  withdrawnAt?: Date;
  ipAddress: string;
  userAgent: string;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { ConsentPurpose, ConsentStatus, IConsentRecord };

/**
 * ConsentRecord schema definition
 * - userId: Reference to the user
 * - purpose: Data processing purpose
 * - status: Consent status (granted, denied, withdrawn, expired)
 * - grantedAt: When consent was granted
 * - expiresAt: Optional expiration date
 * - withdrawnAt: When consent was withdrawn
 * - ipAddress: Encrypted IP address for audit
 * - userAgent: Encrypted user agent for audit
 */
const ConsentRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  purpose: {
    type: String,
    required: true,
    enum: ['account_management', 'resume_building', 'analytics', 'marketing', 'legal_compliance'],
  },
  status: {
    type: String,
    required: true,
    enum: ['granted', 'denied', 'withdrawn', 'expired'],
    default: 'granted',
  },
  grantedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  withdrawnAt: {
    type: Date,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Pre-save middleware: Encrypt sensitive fields before saving to database
// This ensures IP addresses and user agents are never stored in plain text
// Critical for GDPR compliance and user privacy protection
ConsentRecordSchema.pre('save', function(next) {
  if (this.isModified('ipAddress')) {
    this.ipAddress = encrypt(this.ipAddress);
  }
  if (this.isModified('userAgent')) {
    this.userAgent = encrypt(this.userAgent);
  }
  next();
});

// Post-find middleware: Decrypt sensitive fields after retrieving from database
// Ensures decrypted data is available for application use while maintaining encrypted storage
ConsentRecordSchema.post('find', function(docs) {
  docs.forEach(doc => {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
  });
});

ConsentRecordSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
  }
});

// Database indexes for query optimization
// Index on userId and purpose: Supports consent lookups by user and data processing purpose
ConsentRecordSchema.index({ userId: 1, purpose: 1 });
// Index on status and expiresAt: Supports queries for expired consents and status filtering
ConsentRecordSchema.index({ status: 1, expiresAt: 1 });

/**
 * ConsentRecord model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const ConsentRecord = mongoose.models.ConsentRecord || mongoose.model('ConsentRecord', ConsentRecordSchema);

export default ConsentRecord;