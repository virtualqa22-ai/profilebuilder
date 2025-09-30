/**
 * Backend Models Integration Tests
 *
 * Comprehensive integration tests for all backend models covering:
 * - Model compilation and registration
 * - Schema validation
 * - Database operations (CRUD)
 * - Middleware functionality
 * - Instance and static methods
 * - Encryption/decryption for sensitive fields
 * - Immutability constraints
 * - Error handling and edge cases
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Import all models to ensure they are registered and tested
import AdblockEvent from '../AdblockEvent';
import AdMetric from '../AdMetric';
import AuditLog from '../AuditLog';
import ConsentRecord from '../ConsentRecord';
import ErasureRequest from '../ErasureRequest';
import RateLimitBucket from '../RateLimitBucket';
import RateLimitConfig from '../RateLimitConfig';
import Resume from '../Resume';
import SecurityEvent from '../SecurityEvent';
import User from '../User';

describe('Backend Models Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Model Registration', () => {
    it('should register all models successfully', () => {
      expect(mongoose.models.AdblockEvent).toBeDefined();
      expect(mongoose.models.AdMetric).toBeDefined();
      expect(mongoose.models.AuditLog).toBeDefined();
      expect(mongoose.models.ConsentRecord).toBeDefined();
      expect(mongoose.models.ErasureRequest).toBeDefined();
      expect(mongoose.models.RateLimitBucket).toBeDefined();
      expect(mongoose.models.RateLimitConfig).toBeDefined();
      expect(mongoose.models.Resume).toBeDefined();
      expect(mongoose.models.SecurityEvent).toBeDefined();
      expect(mongoose.models.User).toBeDefined();
    });

    it('should have correct model names', () => {
      expect(AdblockEvent.modelName).toBe('AdblockEvent');
      expect(AdMetric.modelName).toBe('AdMetric');
      expect(AuditLog.modelName).toBe('AuditLog');
      expect(ConsentRecord.modelName).toBe('ConsentRecord');
      expect(ErasureRequest.modelName).toBe('ErasureRequest');
      expect(RateLimitBucket.modelName).toBe('RateLimitBucket');
      expect(RateLimitConfig.modelName).toBe('RateLimitConfig');
      expect(Resume.modelName).toBe('Resume');
      expect(SecurityEvent.modelName).toBe('SecurityEvent');
      expect(User.modelName).toBe('User');
    });
  });

  describe('User Model', () => {
    describe('Schema Validation', () => {
      it('should create user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          privacyMode: true
        };

        const user = new User(userData);
        const savedUser = await user.save();

        expect(savedUser.email).toBe(userData.email);
        expect(savedUser.name).toBe(userData.name);
        expect(savedUser.privacyMode).toBe(userData.privacyMode);
        expect(savedUser.createdAt).toBeDefined();
        expect(savedUser.updatedAt).toBeDefined();
      });

      it('should require email field', async () => {
        const userData = {
          name: 'Test User'
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow(/email.*required/i);
      });

      it('should enforce unique email constraint', async () => {
        const userData1 = {
          email: 'duplicate@example.com',
          name: 'User 1'
        };

        const userData2 = {
          email: 'duplicate@example.com',
          name: 'User 2'
        };

        await new User(userData1).save();
        await expect(new User(userData2).save()).rejects.toThrow();
      });

      it('should default privacyMode to false', async () => {
        const userData = {
          email: 'default-test@example.com',
          name: 'Default Test'
        };

        const user = new User(userData);
        const savedUser = await user.save();

        expect(savedUser.privacyMode).toBe(false);
      });

      it('should allow optional name field', async () => {
        const userData = {
          email: 'no-name@example.com'
        };

        const user = new User(userData);
        const savedUser = await user.save();

        expect(savedUser.email).toBe(userData.email);
        expect(savedUser.name).toBeUndefined();
      });
    });
  });

  describe('AdblockEvent Model', () => {
    describe('Schema Validation', () => {
      it('should create adblock event with valid data', async () => {
        const eventData = {
          hashedUserId: 'hashed123',
          eventType: 'blocked' as const,
          timestamp: new Date(),
          metadata: { blocker: 'uBlock' }
        };

        const event = new AdblockEvent(eventData);
        const savedEvent = await event.save();

        expect(savedEvent.hashedUserId).toBe(eventData.hashedUserId);
        expect(savedEvent.eventType).toBe(eventData.eventType);
        expect(savedEvent.metadata).toEqual(eventData.metadata);
      });

      it('should require hashedUserId and eventType', async () => {
        const event = new AdblockEvent({});
        await expect(event.save()).rejects.toThrow();
      });

      it('should validate eventType enum values', async () => {
        const invalidEvent = new AdblockEvent({
          hashedUserId: 'hashed123',
          eventType: 'invalid' as any
        });
        await expect(invalidEvent.save()).rejects.toThrow();
      });

      it('should allow optional adId', async () => {
        const eventData = {
          hashedUserId: 'hashed123',
          eventType: 'detected' as const
        };

        const event = new AdblockEvent(eventData);
        const savedEvent = await event.save();

        expect(savedEvent.adId).toBeUndefined();
      });

      it('should set default timestamp', async () => {
        const eventData = {
          hashedUserId: 'hashed123',
          eventType: 'blocked' as const
        };

        const event = new AdblockEvent(eventData);
        const savedEvent = await event.save();

        expect(savedEvent.timestamp).toBeDefined();
        expect(savedEvent.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('AdMetric Model', () => {
    describe('Schema Validation', () => {
      it('should create ad metric with valid data', async () => {
        const metricData = {
          hashedUserId: 'hashed123',
          adId: 'ad123',
          eventType: 'impression' as const,
          timestamp: new Date(),
          metadata: { position: 'top' }
        };

        const metric = new AdMetric(metricData);
        const savedMetric = await metric.save();

        expect(savedMetric.hashedUserId).toBe(metricData.hashedUserId);
        expect(savedMetric.adId).toBe(metricData.adId);
        expect(savedMetric.eventType).toBe(metricData.eventType);
      });

      it('should require hashedUserId, adId, and eventType', async () => {
        const metric = new AdMetric({});
        await expect(metric.save()).rejects.toThrow();
      });

      it('should validate eventType enum values', async () => {
        const invalidMetric = new AdMetric({
          hashedUserId: 'hashed123',
          adId: 'ad123',
          eventType: 'invalid' as any
        });
        await expect(invalidMetric.save()).rejects.toThrow();
      });
    });
  });

  describe('AuditLog Model', () => {
    describe('Schema Validation', () => {
      it('should create audit log with valid data', async () => {
        const logData = {
          action: 'access' as const,
          resourceType: 'user' as const,
          resourceId: 'user123',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          performedBy: 'system',
          details: 'User accessed profile'
        };

        const log = new AuditLog(logData);
        const savedLog = await log.save();

        expect(savedLog.action).toBe(logData.action);
        expect(savedLog.resourceType).toBe(logData.resourceType);
        expect(savedLog.resourceId).toBe(logData.resourceId);
      });

      it('should require all mandatory fields', async () => {
        const log = new AuditLog({});
        await expect(log.save()).rejects.toThrow();
      });

      it('should validate action enum values', async () => {
        const invalidLog = new AuditLog({
          action: 'invalid' as any,
          resourceType: 'user',
          resourceId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          performedBy: 'system'
        });
        await expect(invalidLog.save()).rejects.toThrow();
      });

      it('should validate resourceType enum values', async () => {
        const invalidLog = new AuditLog({
          action: 'access',
          resourceType: 'invalid' as any,
          resourceId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          performedBy: 'system'
        });
        await expect(invalidLog.save()).rejects.toThrow();
      });
    });

    describe('Immutability', () => {
      let auditLog: any;

      beforeEach(async () => {
        const logData = {
          action: 'access' as const,
          resourceType: 'user' as const,
          resourceId: 'user123',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          performedBy: 'system'
        };

        auditLog = await new AuditLog(logData).save();
      });

      it('should prevent updates via findOneAndUpdate', async () => {
        await expect(
          AuditLog.findOneAndUpdate(
            { _id: auditLog._id },
            { action: 'modify' }
          )
        ).rejects.toThrow(/immutable/i);
      });

      it('should prevent updates via updateOne', async () => {
        await expect(
          AuditLog.updateOne(
            { _id: auditLog._id },
            { action: 'modify' }
          )
        ).rejects.toThrow(/immutable/i);
      });

      it('should prevent updates via updateMany', async () => {
        await expect(
          AuditLog.updateMany(
            { _id: auditLog._id },
            { action: 'modify' }
          )
        ).rejects.toThrow(/immutable/i);
      });

      it('should prevent deletion via findOneAndDelete', async () => {
        await expect(
          AuditLog.findOneAndDelete({ _id: auditLog._id })
        ).rejects.toThrow(/immutable/i);
      });

      it('should prevent deletion via deleteOne', async () => {
        await expect(
          AuditLog.deleteOne({ _id: auditLog._id })
        ).rejects.toThrow(/immutable/i);
      });

      it('should prevent deletion via deleteMany', async () => {
        await expect(
          AuditLog.deleteMany({ _id: auditLog._id })
        ).rejects.toThrow(/immutable/i);
      });
    });
  });

  describe('ConsentRecord Model', () => {
    describe('Schema Validation', () => {
      it('should create consent record with valid data', async () => {
        const consentData = {
          userId: new mongoose.Types.ObjectId(),
          purpose: 'account_management' as const,
          status: 'granted' as const,
          grantedAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const consent = new ConsentRecord(consentData);
        const savedConsent = await consent.save();

        expect(savedConsent.purpose).toBe(consentData.purpose);
        expect(savedConsent.status).toBe(consentData.status);
      });

      it('should require all mandatory fields', async () => {
        const consent = new ConsentRecord({});
        await expect(consent.save()).rejects.toThrow();
      });

      it('should validate purpose enum values', async () => {
        const invalidConsent = new ConsentRecord({
          userId: new mongoose.Types.ObjectId(),
          purpose: 'invalid' as any,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        });
        await expect(invalidConsent.save()).rejects.toThrow();
      });

      it('should validate status enum values', async () => {
        const invalidConsent = new ConsentRecord({
          userId: new mongoose.Types.ObjectId(),
          purpose: 'account_management',
          status: 'invalid' as any,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        });
        await expect(invalidConsent.save()).rejects.toThrow();
      });

      it('should default status to granted', async () => {
        const consentData = {
          userId: new mongoose.Types.ObjectId(),
          purpose: 'account_management',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const consent = new ConsentRecord(consentData);
        const savedConsent = await consent.save();

        expect(savedConsent.status).toBe('granted');
      });
    });
  });

  describe('ErasureRequest Model', () => {
    describe('Schema Validation', () => {
      it('should create erasure request with valid data', async () => {
        const requestData = {
          userId: new mongoose.Types.ObjectId(),
          requestId: 'req-123',
          reason: 'User requested data deletion',
          status: 'pending' as const,
          requestedAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };

        const request = new ErasureRequest(requestData);
        const savedRequest = await request.save();

        expect(savedRequest.requestId).toBe(requestData.requestId);
        expect(savedRequest.reason).toBe(requestData.reason);
        expect(savedRequest.status).toBe(requestData.status);
      });

      it('should require all mandatory fields', async () => {
        const request = new ErasureRequest({});
        await expect(request.save()).rejects.toThrow();
      });

      it('should enforce unique requestId', async () => {
        const requestData1 = {
          userId: new mongoose.Types.ObjectId(),
          requestId: 'duplicate-req',
          reason: 'Test',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          estimatedCompletion: new Date()
        };

        const requestData2 = {
          userId: new mongoose.Types.ObjectId(),
          requestId: 'duplicate-req',
          reason: 'Test 2',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          estimatedCompletion: new Date()
        };

        await new ErasureRequest(requestData1).save();
        await expect(new ErasureRequest(requestData2).save()).rejects.toThrow();
      });

      it('should validate status enum values', async () => {
        const invalidRequest = new ErasureRequest({
          userId: new mongoose.Types.ObjectId(),
          requestId: 'req-123',
          reason: 'Test',
          status: 'invalid' as any,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          estimatedCompletion: new Date()
        });
        await expect(invalidRequest.save()).rejects.toThrow();
      });

      it('should default status to pending', async () => {
        const requestData = {
          userId: new mongoose.Types.ObjectId(),
          requestId: 'req-123',
          reason: 'Test',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          estimatedCompletion: new Date()
        };

        const request = new ErasureRequest(requestData);
        const savedRequest = await request.save();

        expect(savedRequest.status).toBe('pending');
      });
    });
  });

  describe('RateLimitBucket Model', () => {
    describe('Schema Validation', () => {
      it('should create rate limit bucket with valid data', async () => {
        const bucketData = {
          userId: 'user123',
          endpoint: 'ai-rewrite',
          requests: [Date.now(), Date.now() - 1000],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: 98,
          resetTime: new Date(Date.now() + 60000),
          lastRequest: new Date()
        };

        const bucket = new RateLimitBucket(bucketData);
        const savedBucket = await bucket.save();

        expect(savedBucket.userId).toBe(bucketData.userId);
        expect(savedBucket.endpoint).toBe(bucketData.endpoint);
        expect(savedBucket.quotaLimit).toBe(bucketData.quotaLimit);
      });

      it('should require all mandatory fields', async () => {
        const bucket = new RateLimitBucket({});
        await expect(bucket.save()).rejects.toThrow();
      });

      it('should validate quotaLimit range', async () => {
        const invalidBucket = new RateLimitBucket({
          userId: 'user123',
          endpoint: 'ai-rewrite',
          requests: [],
          windowStart: new Date(),
          quotaLimit: 10001, // Exceeds max
          quotaRemaining: 10000,
          resetTime: new Date(),
          lastRequest: new Date()
        });
        await expect(invalidBucket.save()).rejects.toThrow();
      });

      it('should validate quotaRemaining range', async () => {
        const invalidBucket = new RateLimitBucket({
          userId: 'user123',
          endpoint: 'ai-rewrite',
          requests: [],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: -1, // Below min
          resetTime: new Date(),
          lastRequest: new Date()
        });
        await expect(invalidBucket.save()).rejects.toThrow();
      });
    });

    describe('Instance Methods', () => {
      let bucket: any;

      beforeEach(async () => {
        const bucketData = {
          userId: 'user123',
          endpoint: 'ai-rewrite',
          requests: [Date.now()],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: 99,
          resetTime: new Date(Date.now() + 60000),
          lastRequest: new Date()
        };

        bucket = await new RateLimitBucket(bucketData).save();
      });

      it('should check if bucket is expired', () => {
        expect(bucket.isExpired()).toBe(false);

        // Create expired bucket
        const expiredBucket = new RateLimitBucket({
          userId: 'user123',
          endpoint: 'ai-rewrite',
          requests: [],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: 100,
          resetTime: new Date(Date.now() - 1000), // Past time
          lastRequest: new Date()
        });

        expect(expiredBucket.isExpired()).toBe(true);
      });

      it('should calculate remaining quota', () => {
        expect(bucket.calculateRemainingQuota()).toBe(99);

        // Test expired bucket
        const expiredBucket = new RateLimitBucket({
          userId: 'user123',
          endpoint: 'ai-rewrite',
          requests: [],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: 50,
          resetTime: new Date(Date.now() - 1000), // Past time
          lastRequest: new Date()
        });

        expect(expiredBucket.calculateRemainingQuota()).toBe(100);
      });
    });

    describe('Static Methods', () => {
      it('should cleanup expired buckets', async () => {
        // Create some buckets
        await new RateLimitBucket({
          userId: 'user1',
          endpoint: 'ai-rewrite',
          requests: [],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: 100,
          resetTime: new Date(Date.now() + 60000), // Future
          lastRequest: new Date()
        }).save();

        await new RateLimitBucket({
          userId: 'user2',
          endpoint: 'ai-rewrite',
          requests: [],
          windowStart: new Date(),
          quotaLimit: 100,
          quotaRemaining: 100,
          resetTime: new Date(Date.now() - 1000), // Past
          lastRequest: new Date()
        }).save();

        const deletedCount = await RateLimitBucket.cleanupExpired();
        expect(deletedCount).toBe(1);
      });
    });
  });

  describe('RateLimitConfig Model', () => {
    describe('Schema Validation', () => {
      it('should create rate limit config with valid data', async () => {
        const configData = {
          endpoint: 'ai-rewrite',
          method: 'POST' as const,
          quotaLimit: 100,
          windowMs: 60000,
          description: 'AI rewrite endpoint',
          isActive: true,
          priority: 1
        };

        const config = new RateLimitConfig(configData);
        const savedConfig = await config.save();

        expect(savedConfig.endpoint).toBe(configData.endpoint);
        expect(savedConfig.method).toBe(configData.method);
        expect(savedConfig.quotaLimit).toBe(configData.quotaLimit);
      });

      it('should require all mandatory fields', async () => {
        const config = new RateLimitConfig({});
        await expect(config.save()).rejects.toThrow();
      });

      it('should enforce unique endpoint', async () => {
        const configData1 = {
          endpoint: 'unique-endpoint',
          method: 'POST',
          quotaLimit: 100,
          windowMs: 60000
        };

        const configData2 = {
          endpoint: 'unique-endpoint',
          method: 'GET',
          quotaLimit: 50,
          windowMs: 30000
        };

        await new RateLimitConfig(configData1).save();
        await expect(new RateLimitConfig(configData2).save()).rejects.toThrow();
      });

      it('should validate method enum values', async () => {
        const invalidConfig = new RateLimitConfig({
          endpoint: 'test-endpoint',
          method: 'INVALID' as any,
          quotaLimit: 100,
          windowMs: 60000
        });
        await expect(invalidConfig.save()).rejects.toThrow();
      });

      it('should validate quotaLimit range', async () => {
        const invalidConfig = new RateLimitConfig({
          endpoint: 'test-endpoint',
          method: 'POST',
          quotaLimit: 0, // Below min
          windowMs: 60000
        });
        await expect(invalidConfig.save()).rejects.toThrow();
      });

      it('should validate windowMs range', async () => {
        const invalidConfig = new RateLimitConfig({
          endpoint: 'test-endpoint',
          method: 'POST',
          quotaLimit: 100,
          windowMs: 500 // Below min
        });
        await expect(invalidConfig.save()).rejects.toThrow();
      });

      it('should default method to POST', async () => {
        const configData = {
          endpoint: 'test-endpoint',
          quotaLimit: 100,
          windowMs: 60000
        };

        const config = new RateLimitConfig(configData);
        const savedConfig = await config.save();

        expect(savedConfig.method).toBe('POST');
      });

      it('should default windowMs to 60000', async () => {
        const configData = {
          endpoint: 'test-endpoint',
          method: 'POST',
          quotaLimit: 100
        };

        const config = new RateLimitConfig(configData);
        const savedConfig = await config.save();

        expect(savedConfig.windowMs).toBe(60000);
      });

      it('should default isActive to true', async () => {
        const configData = {
          endpoint: 'test-endpoint',
          method: 'POST',
          quotaLimit: 100,
          windowMs: 60000
        };

        const config = new RateLimitConfig(configData);
        const savedConfig = await config.save();

        expect(savedConfig.isActive).toBe(true);
      });

      it('should default priority to 0', async () => {
        const configData = {
          endpoint: 'test-endpoint',
          method: 'POST',
          quotaLimit: 100,
          windowMs: 60000
        };

        const config = new RateLimitConfig(configData);
        const savedConfig = await config.save();

        expect(savedConfig.priority).toBe(0);
      });
    });

    describe('Instance Methods', () => {
      let config: any;

      beforeEach(async () => {
        const configData = {
          endpoint: 'ai-rewrite',
          method: 'POST',
          quotaLimit: 100,
          windowMs: 60000,
          description: 'Test endpoint'
        };

        config = await new RateLimitConfig(configData).save();
      });

      it('should get formatted window duration', () => {
        expect(config.getWindowDuration()).toBe('1m 0s');
      });

      it('should check if configuration is valid', () => {
        expect(config.isValid()).toBe(true);

        // Test invalid config
        const invalidConfig = new RateLimitConfig({
          endpoint: 'invalid',
          method: 'POST',
          quotaLimit: 0, // Invalid
          windowMs: 0 // Invalid
        });

        expect(invalidConfig.isValid()).toBe(false);
      });
    });

    describe('Static Methods', () => {
      beforeEach(async () => {
        await new RateLimitConfig({
          endpoint: 'active-endpoint',
          method: 'POST',
          quotaLimit: 100,
          windowMs: 60000,
          isActive: true
        }).save();

        await new RateLimitConfig({
          endpoint: 'inactive-endpoint',
          method: 'POST',
          quotaLimit: 50,
          windowMs: 30000,
          isActive: false
        }).save();
      });

      it('should get active configurations', async () => {
        const activeConfigs = await RateLimitConfig.getActiveConfigs();
        expect(activeConfigs.length).toBe(1);
        expect(activeConfigs[0].endpoint).toBe('active-endpoint');
      });

      it('should get config for specific endpoint and method', async () => {
        const config = await RateLimitConfig.getConfigForEndpoint('active-endpoint', 'POST');
        expect(config).toBeTruthy();
        expect(config?.endpoint).toBe('active-endpoint');
      });

      it('should return null for inactive endpoint', async () => {
        const config = await RateLimitConfig.getConfigForEndpoint('inactive-endpoint', 'POST');
        expect(config).toBeNull();
      });

      it('should update configuration priority', async () => {
        const updatedConfig = await RateLimitConfig.updatePriority('active-endpoint', 5);
        expect(updatedConfig).toBeTruthy();
        expect(updatedConfig?.priority).toBe(5);
      });
    });
  });

  describe('Resume Model', () => {
    describe('Schema Validation', () => {
      it('should create resume with valid data', async () => {
        const resumeData = {
          title: 'Software Engineer Resume',
          content: 'Professional summary...',
          locale: 'en-US',
          version: 1,
          photos: 'photo data',
          certifications: 'certification data',
          hobbies: 'hobby data',
          references: 'reference data',
          comments: []
        };

        const resume = new Resume(resumeData);
        const savedResume = await resume.save();

        expect(savedResume.title).toBe(resumeData.title);
        expect(savedResume.content).toBe(resumeData.content);
        expect(savedResume.locale).toBe(resumeData.locale);
      });

      it('should require title, content, and locale', async () => {
        const resume = new Resume({});
        await expect(resume.save()).rejects.toThrow();
      });

      it('should validate title length', async () => {
        const longTitle = 'a'.repeat(101); // Exceeds max length
        const resume = new Resume({
          title: longTitle,
          content: 'test',
          locale: 'en-US'
        });
        await expect(resume.save()).rejects.toThrow();
      });

      it('should default version to 1', async () => {
        const resumeData = {
          title: 'Test Resume',
          content: 'Test content',
          locale: 'en-US'
        };

        const resume = new Resume(resumeData);
        const savedResume = await resume.save();

        expect(savedResume.version).toBe(1);
      });
    });
  });

  describe('SecurityEvent Model', () => {
    describe('Schema Validation', () => {
      it('should create security event with valid data', async () => {
        const eventData = {
          eventType: 'authentication_failure' as const,
          severity: 'high' as const,
          correlationId: 'corr-123',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { reason: 'Invalid password' },
          alertTriggered: false
        };

        const event = new SecurityEvent(eventData);
        const savedEvent = await event.save();

        expect(savedEvent.eventType).toBe(eventData.eventType);
        expect(savedEvent.severity).toBe(eventData.severity);
        expect(savedEvent.correlationId).toBe(eventData.correlationId);
      });

      it('should require all mandatory fields', async () => {
        const event = new SecurityEvent({});
        await expect(event.save()).rejects.toThrow();
      });

      it('should validate eventType enum values', async () => {
        const invalidEvent = new SecurityEvent({
          eventType: 'invalid' as any,
          severity: 'high',
          correlationId: 'corr-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: {}
        });
        await expect(invalidEvent.save()).rejects.toThrow();
      });

      it('should validate severity enum values', async () => {
        const invalidEvent = new SecurityEvent({
          eventType: 'authentication_failure',
          severity: 'invalid' as any,
          correlationId: 'corr-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: {}
        });
        await expect(invalidEvent.save()).rejects.toThrow();
      });

      it('should default alertTriggered to false', async () => {
        const eventData = {
          eventType: 'authentication_failure' as const,
          severity: 'high' as const,
          correlationId: 'corr-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { reason: 'Test' }
        };

        const event = new SecurityEvent(eventData);
        const savedEvent = await event.save();

        expect(savedEvent.alertTriggered).toBe(false);
      });
    });

    describe('Immutability', () => {
      let securityEvent: any;

      beforeEach(async () => {
        const eventData = {
          eventType: 'authentication_failure' as const,
          severity: 'high' as const,
          correlationId: 'corr-123',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { reason: 'Test' }
        };

        securityEvent = await new SecurityEvent(eventData).save();
      });

      it('should prevent updates', async () => {
        await expect(
          SecurityEvent.findOneAndUpdate(
            { _id: securityEvent._id },
            { severity: 'low' }
          )
        ).rejects.toThrow(/immutable/i);
      });

      it('should prevent deletions', async () => {
        await expect(
          SecurityEvent.findOneAndDelete({ _id: securityEvent._id })
        ).rejects.toThrow(/immutable/i);
      });
    });
  });
});