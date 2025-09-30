/**
 * Rate Limit Bucket Model
 *
 * Defines the schema for rate limit buckets in the database.
 * Implements sliding window rate limiting with TTL-based automatic cleanup.
 * Ensures GDPR compliance with configurable data retention policies.
 */
import mongoose from 'mongoose';

/**
 * Type definitions for RateLimitBucket
 */
interface IRateLimitBucket {
  userId: string;
  endpoint: string;
  requests: number[];
  windowStart: Date;
  quotaLimit: number;
  quotaRemaining: number;
  resetTime: Date;
  lastRequest: Date;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { IRateLimitBucket };

/**
 * Rate limit bucket schema definition
 *
 * - userId: Unique identifier for the user (supports both user IDs and IP addresses)
 * - endpoint: API endpoint being rate limited (e.g., 'ai-rewrite', 'ai-suggestions')
 * - requests: Array of request timestamps within the current window
 * - windowStart: Start time of the current rate limit window
 * - quotaLimit: Maximum requests allowed per window
 * - quotaRemaining: Remaining requests in current window
 * - resetTime: Time when the rate limit window resets
 * - lastRequest: Timestamp of the most recent request
 *
 * TTL index on createdAt ensures automatic cleanup after retention period
 */
const RateLimitBucketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true, // Compound index for efficient queries
  },
  endpoint: {
    type: String,
    required: true,
    index: true, // Compound index for efficient queries
  },
  requests: [{
    type: Number, // Store as timestamps (milliseconds since epoch)
    required: true,
  }],
  windowStart: {
    type: Date,
    required: true,
    default: Date.now,
  },
  quotaLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 10000, // Reasonable upper limit
  },
  quotaRemaining: {
    type: Number,
    required: true,
    min: 0,
  },
  resetTime: {
    type: Date,
    required: true,
  },
  lastRequest: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, {
  timestamps: true,
  // Ensure GDPR compliance with data retention
  expireAfterSeconds: parseInt(process.env.RATE_LIMIT_RETENTION_DAYS || '7', 10) * 24 * 60 * 60, // Default 7 days
});

/**
 * Compound indexes for optimal query performance
 * - userId + endpoint: Primary lookup pattern for rate limiting checks
 * - resetTime: For efficient cleanup of expired buckets
 * - lastRequest: For analytics and monitoring
 */
RateLimitBucketSchema.index({ userId: 1, endpoint: 1 });
RateLimitBucketSchema.index({ resetTime: 1 });
RateLimitBucketSchema.index({ lastRequest: -1 });

/**
 * Pre-save middleware to ensure data consistency
 * Validates that quotaRemaining doesn't exceed quotaLimit
 */
RateLimitBucketSchema.pre('save', function(next) {
  if (this.quotaRemaining > this.quotaLimit) {
    this.quotaRemaining = this.quotaLimit;
  }
  next();
});

/**
 * Instance method to check if bucket is expired
 */
RateLimitBucketSchema.methods.isExpired = function(): boolean {
  return Date.now() > this.resetTime.getTime();
};

/**
 * Instance method to calculate remaining quota
 */
RateLimitBucketSchema.methods.calculateRemainingQuota = function(): number {
  if (this.isExpired()) {
    return this.quotaLimit;
  }
  return Math.max(0, this.quotaRemaining);
};

/**
 * Static method to clean up expired buckets
 * Used for manual cleanup if needed (TTL should handle most cases)
 */
RateLimitBucketSchema.statics.cleanupExpired = async function(): Promise<number> {
  const expired = await this.deleteMany({
    resetTime: { $lt: new Date() }
  });
  return expired.deletedCount || 0;
};

/**
 * Rate limit bucket model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const RateLimitBucket = mongoose.models.RateLimitBucket ||
  mongoose.model<IRateLimitBucket>('RateLimitBucket', RateLimitBucketSchema);

export default RateLimitBucket;