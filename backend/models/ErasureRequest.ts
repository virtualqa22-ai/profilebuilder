/**
 * ErasureRequest Model
 *
 * Defines the schema for tracking data erasure requests in the database.
 * Manages the lifecycle of erasure processes for GDPR compliance.
 *
 * Business Rules:
 * - Erasure requests must be tracked with unique IDs for auditability
 * - 30-day completion window for GDPR compliance (magic number: 30 * 24 * 60 * 60 * 1000 ms)
 * - Status transitions: pending -> processing -> completed/failed
 * - Failed erasures require manual intervention and logging
 * - IP addresses and user agents encrypted for privacy
 *
 * Security Measures:
 * - AES-256 encryption for sensitive audit data
 * - Environment-based encryption key management
 * - Unique request IDs prevent enumeration attacks
 * - Comprehensive audit trail for compliance verification
 */
import mongoose from 'mongoose';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

const encrypt = (text: string) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * ErasureRequest schema definition
 * - userId: Reference to the user requesting erasure
 * - requestId: Unique identifier for the erasure request
 * - reason: Reason provided for the erasure request
 * - status: Current status of the erasure process
 * - requestedAt: When the erasure was requested
 * - completedAt: When the erasure was completed (if applicable)
 * - ipAddress: Encrypted IP address of the requester
 * - userAgent: Encrypted user agent of the requester
 * - estimatedCompletion: Estimated completion date
 */
const ErasureRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  completedAt: {
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
  estimatedCompletion: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

// Encrypt sensitive fields before saving
ErasureRequestSchema.pre('save', function(next) {
  if (this.isModified('ipAddress')) {
    this.ipAddress = encrypt(this.ipAddress);
  }
  if (this.isModified('userAgent')) {
    this.userAgent = encrypt(this.userAgent);
  }
  next();
});

// Decrypt sensitive fields after finding
ErasureRequestSchema.post('find', function(docs) {
  docs.forEach(doc => {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
  });
});

ErasureRequestSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
  }
});

// Indexes for efficient queries
ErasureRequestSchema.index({ userId: 1, status: 1 });
ErasureRequestSchema.index({ status: 1, requestedAt: -1 });

/**
 * ErasureRequest model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const ErasureRequest = mongoose.models.ErasureRequest || mongoose.model('ErasureRequest', ErasureRequestSchema);

export default ErasureRequest;