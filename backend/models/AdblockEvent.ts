/**
 * AdblockEvent Model
 *
 * Defines the schema for adblock event data in the database.
 * Tracks anonymized adblock-related events for analytics and compliance.
 * Ensures privacy by storing hashed user IDs only.
 */
import mongoose from 'mongoose';

/**
 * Type definitions for AdblockEvent
 */
type AdblockEventType = 'blocked' | 'whitelisted' | 'detected' | 'bypassed';

interface IAdblockEvent {
  hashedUserId: string;
  adId?: string;
  eventType: AdblockEventType;
  timestamp: Date;
  metadata: Record<string, unknown>;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { AdblockEventType, IAdblockEvent };

/**
 * AdblockEvent schema definition
 * - hashedUserId: Anonymized user identifier (SHA-256 hash)
 * - adId: Unique identifier for the advertisement (if applicable)
 * - eventType: Type of adblock event (blocked, whitelisted, detected, etc.)
 * - timestamp: When the event occurred
 * - metadata: Additional event-specific data (optional, e.g., adblocker type)
 */
const AdblockEventSchema = new mongoose.Schema({
  hashedUserId: {
    type: String,
    required: true,
    index: true, // Index for efficient queries
  },
  adId: {
    type: String,
    index: true, // Optional, for events related to specific ads
  },
  eventType: {
    type: String,
    required: true,
    enum: ['blocked', 'whitelisted', 'detected', 'bypassed'], // Define allowed event types
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true, // Index for time-based queries
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for additional data like adblocker info
    default: {},
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'adblock_events', // Explicit collection name
});

/**
 * Pre-save middleware to ensure timestamp is set
 */
AdblockEventSchema.pre('save', function(next) {
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  next();
});

/**
 * AdblockEvent model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const AdblockEvent = mongoose.models.AdblockEvent || mongoose.model('AdblockEvent', AdblockEventSchema);

export default AdblockEvent;