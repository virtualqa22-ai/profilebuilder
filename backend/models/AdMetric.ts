/**
 * AdMetric Model
 *
 * Defines the schema for ad metrics data in the database.
 * Tracks anonymized user interactions with ads for analytics.
 * Ensures privacy by storing hashed user IDs only.
 */
import mongoose from 'mongoose';

/**
 * Type definitions for AdMetric
 */
type AdMetricEventType = 'impression' | 'click' | 'view' | 'hover' | 'close';

interface IAdMetric {
  hashedUserId: string;
  adId: string;
  eventType: AdMetricEventType;
  timestamp: Date;
  metadata: Record<string, unknown>;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { AdMetricEventType, IAdMetric };

/**
 * AdMetric schema definition
 * - hashedUserId: Anonymized user identifier (SHA-256 hash)
 * - adId: Unique identifier for the advertisement
 * - eventType: Type of ad interaction (impression, click, view, etc.)
 * - timestamp: When the event occurred
 * - metadata: Additional event-specific data (optional)
 */
const AdMetricSchema = new mongoose.Schema({
  hashedUserId: {
    type: String,
    required: true,
    index: true, // Index for efficient queries
  },
  adId: {
    type: String,
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: ['impression', 'click', 'view', 'hover', 'close'], // Define allowed event types
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true, // Index for time-based queries
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for additional data
    default: {},
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'ad_metrics', // Explicit collection name
});

/**
 * Pre-save middleware to ensure timestamp is set
 */
AdMetricSchema.pre('save', function(next) {
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  next();
});

/**
 * AdMetric model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const AdMetric = mongoose.models.AdMetric || mongoose.model('AdMetric', AdMetricSchema);

export default AdMetric;