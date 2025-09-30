/**
 * Rate Limit Configuration Model
 *
 * Defines the schema for rate limit configurations in the database.
 * Stores endpoint-specific rate limiting rules and quotas.
 * Supports dynamic configuration updates for different endpoints.
 */
import mongoose from 'mongoose';

/**
 * Type definitions for RateLimitConfig
 */
interface IRateLimitConfig {
  endpoint: string;
  method: string;
  quotaLimit: number;
  windowMs: number;
  description?: string;
  isActive: boolean;
  priority: number;
  burstLimit?: number;
  cooldownMs?: number;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { IRateLimitConfig };

/**
 * Rate limit configuration schema definition
 *
 * - endpoint: API endpoint pattern (e.g., 'ai-rewrite', 'ai-suggestions', 'ai-lint')
 * - method: HTTP method (GET, POST, PUT, DELETE, etc.)
 * - quotaLimit: Maximum requests allowed per window
 * - windowMs: Time window in milliseconds (default: 60000 for 1 minute)
 * - description: Human-readable description of the endpoint
 * - isActive: Whether this configuration is currently active
 * - priority: Priority order for matching (higher numbers = higher priority)
 * - burstLimit: Optional burst limit for short-term spikes
 * - cooldownMs: Optional cooldown period after rate limit is hit
 */
const RateLimitConfigSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    default: 'POST',
  },
  quotaLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 10000, // Reasonable upper limit
  },
  windowMs: {
    type: Number,
    required: true,
    min: 1000, // Minimum 1 second
    max: 3600000, // Maximum 1 hour
    default: 60000, // 1 minute default
  },
  description: {
    type: String,
    maxlength: 500,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000,
  },
  burstLimit: {
    type: Number,
    min: 1,
    max: 10000,
  },
  cooldownMs: {
    type: Number,
    min: 1000, // Minimum 1 second
    max: 300000, // Maximum 5 minutes
  },
}, { timestamps: true });

/**
 * Indexes for optimal query performance
 * - endpoint: Primary lookup for configuration retrieval
 * - isActive + priority: For efficient active configuration queries
 * - method + endpoint: For method-specific lookups
 */
RateLimitConfigSchema.index({ endpoint: 1 });
RateLimitConfigSchema.index({ isActive: 1, priority: -1 });
RateLimitConfigSchema.index({ method: 1, endpoint: 1 });

/**
 * Pre-save middleware to ensure data consistency
 * Validates configuration parameters
 */
RateLimitConfigSchema.pre('save', function(next) {
  // Ensure burst limit doesn't exceed quota limit
  if (this.burstLimit && this.burstLimit > this.quotaLimit) {
    this.burstLimit = this.quotaLimit;
  }

  // Ensure cooldown doesn't exceed window
  if (this.cooldownMs && this.cooldownMs >= this.windowMs) {
    this.cooldownMs = Math.max(1000, this.windowMs - 1000);
  }

  next();
});

/**
 * Instance method to get formatted window duration
 */
RateLimitConfigSchema.methods.getWindowDuration = function(): string {
  const seconds = Math.floor(this.windowMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Instance method to check if configuration is valid
 */
RateLimitConfigSchema.methods.isValid = function(): boolean {
  return this.isActive &&
         this.quotaLimit > 0 &&
         this.windowMs > 0;
};

/**
 * Static method to get active configurations sorted by priority
 */
RateLimitConfigSchema.statics.getActiveConfigs = async function(): Promise<IRateLimitConfig[]> {
  return this.find({ isActive: true })
    .sort({ priority: -1, updatedAt: -1 });
};

/**
 * Static method to get configuration for specific endpoint and method
 */
RateLimitConfigSchema.statics.getConfigForEndpoint = async function(
  endpoint: string,
  method: string = 'POST'
): Promise<IRateLimitConfig | null> {
  return this.findOne({
    endpoint,
    method,
    isActive: true
  }).sort({ priority: -1 });
};

/**
 * Static method to update configuration priority
 */
RateLimitConfigSchema.statics.updatePriority = async function(
  endpoint: string,
  priority: number
): Promise<IRateLimitConfig | null> {
  return this.findOneAndUpdate(
    { endpoint },
    { priority },
    { new: true }
  );
};

/**
 * Rate limit configuration model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const RateLimitConfig = mongoose.models.RateLimitConfig ||
  mongoose.model<IRateLimitConfig>('RateLimitConfig', RateLimitConfigSchema);

export default RateLimitConfig;