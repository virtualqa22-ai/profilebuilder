/**
 * SecurityEvent Model
 *
 * Defines the schema for storing security events in the database.
 * This model is designed to be append-only and immutable for compliance.
 * Handles encryption for sensitive security event data.
 */

import mongoose from 'mongoose';
import { encrypt, decrypt } from '../lib/encryption';
import { SECURITY_EVENT_TYPES, SECURITY_SEVERITY_LEVELS } from '../lib/constants';
import { createStandardImmutableHooks } from '../lib/modelUtils';

/**
 * Type definitions for SecurityEvent
 */
type SecurityEventType = typeof SECURITY_EVENT_TYPES[keyof typeof SECURITY_EVENT_TYPES];
type SecuritySeverityLevel = typeof SECURITY_SEVERITY_LEVELS[keyof typeof SECURITY_SEVERITY_LEVELS];

interface ISecurityEvent {
  userId?: string; // mongoose.Schema.Types.ObjectId as string
  eventType: SecurityEventType;
  severity: SecuritySeverityLevel;
  correlationId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  alertTriggered: boolean;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { SecurityEventType, SecuritySeverityLevel, ISecurityEvent };

/**
 * SecurityEvent schema definition
 * - userId: Reference to the user (can be null for system events)
 * - eventType: Type of security event
 * - severity: Severity level of the event
 * - correlationId: Correlation ID for request tracing
 * - timestamp: When the event occurred
 * - ipAddress: Encrypted IP address for security analysis
 * - userAgent: Encrypted user agent for security analysis
 * - location: Geographic location data (encrypted)
 * - details: Additional event-specific details
 * - metadata: Additional metadata for analysis
 * - alertTriggered: Whether this event triggered an alert
 *
 * Note: This collection is append-only. No updates or deletes allowed.
 */
const SecurityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: Object.values(SECURITY_EVENT_TYPES),
    index: true,
  },
  severity: {
    type: String,
    required: true,
    enum: Object.values(SECURITY_SEVERITY_LEVELS),
    index: true,
  },
  correlationId: {
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
  location: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  alertTriggered: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

// Encrypt sensitive fields before saving
SecurityEventSchema.pre('save', function(next) {
  if (this.isModified('ipAddress')) {
    this.ipAddress = encrypt(this.ipAddress);
  }
  if (this.isModified('userAgent')) {
    this.userAgent = encrypt(this.userAgent);
  }
  if (this.isModified('location') && this.location) {
    this.location = encrypt(this.location);
  }
  next();
});

// Decrypt sensitive fields after finding
SecurityEventSchema.post('find', function(docs) {
  docs.forEach(doc => {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
    if (doc.location) {
      doc.location = decrypt(doc.location);
    }
  });
});

SecurityEventSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.ipAddress) {
      doc.ipAddress = decrypt(doc.ipAddress);
    }
    if (doc.userAgent) {
      doc.userAgent = decrypt(doc.userAgent);
    }
    if (doc.location) {
      doc.location = decrypt(doc.location);
    }
  }
});

// Indexes for efficient querying
SecurityEventSchema.index({ userId: 1, timestamp: -1 });
SecurityEventSchema.index({ eventType: 1, timestamp: -1 });
SecurityEventSchema.index({ severity: 1, timestamp: -1 });
SecurityEventSchema.index({ correlationId: 1 });
SecurityEventSchema.index({ alertTriggered: 1, timestamp: -1 });

// Compound indexes for common queries
SecurityEventSchema.index({ eventType: 1, severity: 1, timestamp: -1 });
SecurityEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// Apply immutable hooks to prevent updates and deletes
const immutableHooks = createStandardImmutableHooks('Security events');
Object.entries(immutableHooks).forEach(([hook, handler]) => {
  SecurityEventSchema.pre(hook as any, handler);
});

/**
 * SecurityEvent model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const SecurityEvent = mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', SecurityEventSchema);

export default SecurityEvent;