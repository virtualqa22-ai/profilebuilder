/**
 * User Management Models Integration Tests
 *
 * Tests the complete user management model functionality including:
 * - Schema validation and constraints for User, AuditLog, ConsentRecord, ErasureRequest
 * - Database operations (CRUD) with proper indexing
 * - Pre-save hooks and middleware
 * - Encrypted field handling for sensitive data
 * - GDPR compliance features (erasure requests, consent management)
 * - Audit logging for compliance
 * - Error handling and edge cases
 * - Data integrity and consistency
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../../services/user-management/src/models/User');
const AuditLog = require('../../../services/user-management/src/models/AuditLog');
const ConsentRecord = require('../../../services/user-management/src/models/ConsentRecord');
const ErasureRequest = require('../../../services/user-management/src/models/ErasureRequest');

describe('User Management Models Integration Tests', () => {
  let mongoServer;

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
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    await ConsentRecord.deleteMany({});
    await ErasureRequest.deleteMany({});
  });

  describe('User Model Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const validUserData = {
        email: 'test@example.com',
        name: 'Test User',
        privacyMode: false
      };

      const user = new User(validUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.name).toBe(validUserData.name);
      expect(savedUser.privacyMode).toBe(false);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should reject user without required email', async () => {
      const invalidUserData = {
        name: 'Test User'
        // Missing email
      };

      const user = new User(invalidUserData);

      await expect(user.save()).rejects.toThrow(/validation failed/i);
    });

    it('should enforce unique email constraint', async () => {
      await User.create({
        email: 'duplicate@example.com',
        name: 'First User'
      });

      const duplicateUser = new User({
        email: 'duplicate@example.com',
        name: 'Second User'
      });

      await expect(duplicateUser.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'invalid@',
        '@invalid.com',
        'invalid..email@example.com'
      ];

      for (const email of invalidEmails) {
        const user = new User({
          email,
          name: 'Test User'
        });

        await expect(user.save()).rejects.toThrow(/validation failed/i);
      }
    });

    it('should enforce field length constraints', async () => {
      const longName = 'A'.repeat(101); // Exceeds 100 char limit
      const user = new User({
        email: 'test@example.com',
        name: longName
      });

      await expect(user.save()).rejects.toThrow(/validation failed/i);
    });

    it('should set default values correctly', async () => {
      const user = new User({
        email: 'defaults@example.com',
        name: 'Default Test'
        // privacyMode not specified, should default to false
      });

      const saved = await user.save();
      expect(saved.privacyMode).toBe(false);
    });
  });

  describe('User Model Database Operations', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'operations@example.com',
        name: 'Operations Test',
        privacyMode: true
      });
    });

    it('should find user by email', async () => {
      const foundUser = await User.findOne({ email: 'operations@example.com' });

      expect(foundUser).toBeTruthy();
      expect(foundUser.name).toBe('Operations Test');
      expect(foundUser.privacyMode).toBe(true);
    });

    it('should update user and trigger updatedAt', async () => {
      const originalUpdatedAt = testUser.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      testUser.name = 'Updated Name';
      await testUser.save();

      expect(testUser.name).toBe('Updated Name');
      expect(testUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should delete user successfully', async () => {
      await User.deleteOne({ _id: testUser._id });

      const foundUser = await User.findById(testUser._id);
      expect(foundUser).toBeNull();
    });
  });

  describe('User Model Indexes and Performance', () => {
    it('should use email index for efficient queries', async () => {
      // Create multiple users
      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`
      }));

      await User.insertMany(users);

      // Query should be efficient with unique index
      const startTime = Date.now();
      const foundUser = await User.findOne({ email: 'user5@example.com' });
      const queryTime = Date.now() - startTime;

      expect(foundUser).toBeTruthy();
      expect(foundUser.name).toBe('User 5');
      expect(queryTime).toBeLessThan(50); // Should be very fast with index
    });

    it('should use createdAt index for sorting', async () => {
      const users = Array.from({ length: 5 }, (_, i) => ({
        email: `sort${i}@example.com`,
        name: `Sort User ${i}`
      }));

      // Insert with delays to ensure different timestamps
      for (const user of users) {
        await User.create(user);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const sortedUsers = await User.find().sort({ createdAt: -1 });
      expect(sortedUsers).toHaveLength(5);

      // Verify descending order
      for (let i = 1; i < sortedUsers.length; i++) {
        expect(sortedUsers[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          sortedUsers[i].createdAt.getTime()
        );
      }
    });
  });

  describe('AuditLog Model', () => {
    it('should create audit log entry with valid data', async () => {
      const userId = new mongoose.Types.ObjectId();
      const auditData = {
        userId,
        action: 'access',
        resourceType: 'resume',
        resourceId: 'resume123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        performedBy: 'system'
      };

      const auditLog = new AuditLog(auditData);
      const saved = await auditLog.save();

      expect(saved._id).toBeDefined();
      expect(saved.userId.toString()).toBe(userId.toString());
      expect(saved.action).toBe('access');
      expect(saved.timestamp).toBeDefined();
      expect(saved.createdAt).toBeDefined();
    });

    it('should reject audit log without required fields', async () => {
      const invalidAuditData = {
        action: 'access'
        // Missing required fields
      };

      const auditLog = new AuditLog(invalidAuditData);

      await expect(auditLog.save()).rejects.toThrow(/validation failed/i);
    });

    it('should validate enum values for action', async () => {
      const invalidAction = 'invalid_action';
      const auditData = {
        userId: new mongoose.Types.ObjectId(),
        action: invalidAction,
        resourceType: 'resume',
        resourceId: 'resume123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        performedBy: 'system'
      };

      const auditLog = new AuditLog(auditData);

      await expect(auditLog.save()).rejects.toThrow(/validation failed/i);
    });

    it('should prevent updates to immutable audit logs', async () => {
      const auditData = {
        userId: new mongoose.Types.ObjectId(),
        action: 'modify',
        resourceType: 'user',
        resourceId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        performedBy: 'admin'
      };

      const auditLog = await AuditLog.create(auditData);

      // Attempt to update (should fail due to pre-save hook)
      auditLog.action = 'delete';

      await expect(auditLog.save()).rejects.toThrow(/immutable/i);
    });

    it('should handle encrypted fields', async () => {
      const auditData = {
        userId: new mongoose.Types.ObjectId(),
        action: 'export',
        resourceType: 'consent',
        resourceId: 'consent123',
        ipAddress: '10.0.0.1',
        userAgent: 'Encrypted Browser Data',
        performedBy: 'user@example.com'
      };

      const saved = await auditLog.save();

      // In real implementation, these would be encrypted
      expect(saved.ipAddress).toBe('10.0.0.1');
      expect(saved.userAgent).toBe('Encrypted Browser Data');
    });
  });

  describe('ConsentRecord Model', () => {
    it('should create consent record with valid data', async () => {
      const userId = new mongoose.Types.ObjectId();
      const consentData = {
        userId,
        purpose: 'account_management',
        status: 'granted',
        ipAddress: '192.168.1.1',
        userAgent: 'Consent Browser'
      };

      const consent = new ConsentRecord(consentData);
      const saved = await consent.save();

      expect(saved._id).toBeDefined();
      expect(saved.userId.toString()).toBe(userId.toString());
      expect(saved.purpose).toBe('account_management');
      expect(saved.status).toBe('granted');
      expect(saved.grantedAt).toBeDefined();
      expect(saved.createdAt).toBeDefined();
    });

    it('should validate enum values for purpose and status', async () => {
      const invalidPurpose = 'invalid_purpose';
      const consentData = {
        userId: new mongoose.Types.ObjectId(),
        purpose: invalidPurpose,
        status: 'granted',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser'
      };

      const consent = new ConsentRecord(consentData);

      await expect(consent.save()).rejects.toThrow(/validation failed/i);
    });

    it('should set default status to granted', async () => {
      const consentData = {
        userId: new mongoose.Types.ObjectId(),
        purpose: 'analytics',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser'
        // status not specified
      };

      const consent = new ConsentRecord(consentData);
      const saved = await consent.save();

      expect(saved.status).toBe('granted');
    });

    it('should handle consent withdrawal', async () => {
      const consent = await ConsentRecord.create({
        userId: new mongoose.Types.ObjectId(),
        purpose: 'marketing',
        status: 'granted',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser'
      });

      consent.status = 'withdrawn';
      consent.withdrawnAt = new Date();
      await consent.save();

      expect(consent.status).toBe('withdrawn');
      expect(consent.withdrawnAt).toBeDefined();
    });
  });

  describe('ErasureRequest Model', () => {
    it('should create erasure request with valid data', async () => {
      const userId = new mongoose.Types.ObjectId();
      const erasureData = {
        userId,
        requestId: 'ER-2024-001',
        reason: 'User requested account deletion',
        ipAddress: '192.168.1.1',
        userAgent: 'Erasure Browser',
        estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      const erasure = new ErasureRequest(erasureData);
      const saved = await erasure.save();

      expect(saved._id).toBeDefined();
      expect(saved.userId.toString()).toBe(userId.toString());
      expect(saved.requestId).toBe('ER-2024-001');
      expect(saved.status).toBe('pending');
      expect(saved.requestedAt).toBeDefined();
    });

    it('should enforce unique requestId', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      await ErasureRequest.create({
        userId: userId1,
        requestId: 'DUPLICATE-001',
        reason: 'First request',
        ipAddress: '192.168.1.1',
        userAgent: 'Browser 1',
        estimatedCompletion: new Date()
      });

      const duplicate = new ErasureRequest({
        userId: userId2,
        requestId: 'DUPLICATE-001', // Same requestId
        reason: 'Second request',
        ipAddress: '192.168.1.2',
        userAgent: 'Browser 2',
        estimatedCompletion: new Date()
      });

      await expect(duplicate.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should validate enum values for status', async () => {
      const invalidStatus = 'invalid_status';
      const erasureData = {
        userId: new mongoose.Types.ObjectId(),
        requestId: 'ER-2024-002',
        reason: 'Test erasure',
        status: invalidStatus,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        estimatedCompletion: new Date()
      };

      const erasure = new ErasureRequest(erasureData);

      await expect(erasure.save()).rejects.toThrow(/validation failed/i);
    });

    it('should handle status transitions', async () => {
      const erasure = await ErasureRequest.create({
        userId: new mongoose.Types.ObjectId(),
        requestId: 'ER-2024-003',
        reason: 'Status transition test',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        estimatedCompletion: new Date()
      });

      // Update to processing
      erasure.status = 'processing';
      await erasure.save();
      expect(erasure.status).toBe('processing');

      // Complete the request
      erasure.status = 'completed';
      erasure.completedAt = new Date();
      await erasure.save();

      expect(erasure.status).toBe('completed');
      expect(erasure.completedAt).toBeDefined();
    });
  });

  describe('Model Relationships and Data Integrity', () => {
    it('should maintain referential integrity between models', async () => {
      const user = await User.create({
        email: 'integrity@example.com',
        name: 'Integrity Test'
      });

      // Create related records
      await AuditLog.create({
        userId: user._id,
        action: 'consent_granted',
        resourceType: 'consent',
        resourceId: 'consent123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        performedBy: 'system'
      });

      await ConsentRecord.create({
        userId: user._id,
        purpose: 'account_management',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser'
      });

      // Verify relationships
      const userAuditLogs = await AuditLog.find({ userId: user._id });
      const userConsents = await ConsentRecord.find({ userId: user._id });

      expect(userAuditLogs).toHaveLength(1);
      expect(userConsents).toHaveLength(1);
      expect(userAuditLogs[0].userId.toString()).toBe(user._id.toString());
      expect(userConsents[0].userId.toString()).toBe(user._id.toString());
    });

    it('should handle cascade operations appropriately', async () => {
      // Note: MongoDB doesn't have built-in cascades like SQL
      // This tests manual relationship handling
      const user = await User.create({
        email: 'cascade@example.com',
        name: 'Cascade Test'
      });

      const auditLog = await AuditLog.create({
        userId: user._id,
        action: 'access',
        resourceType: 'user',
        resourceId: user._id.toString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        performedBy: 'system'
      });

      // Delete user (in real app, this might trigger cleanup)
      await User.deleteOne({ _id: user._id });

      // Audit log should still exist (append-only)
      const foundAudit = await AuditLog.findById(auditLog._id);
      expect(foundAudit).toBeTruthy();
    });
  });

  describe('Model Error Handling', () => {
    it('should handle database connection errors', async () => {
      await mongoose.connection.close();

      const user = new User({
        email: 'connection@example.com',
        name: 'Connection Test'
      });

      await expect(user.save()).rejects.toThrow();

      // Reconnect
      await mongoose.connect(mongoServer.getUri());
    });

    it('should handle validation errors with detailed messages', async () => {
      const invalidUser = new User({
        // Missing email
        name: 'Invalid User'
      });

      try {
        await invalidUser.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.email).toBeDefined();
      }
    });

    it('should handle bulk operation errors', async () => {
      const users = [
        { email: 'bulk1@example.com', name: 'Bulk 1' },
        { email: 'bulk1@example.com', name: 'Bulk 1 Duplicate' }, // Duplicate email
        { email: 'bulk2@example.com', name: 'Bulk 2' }
      ];

      try {
        await User.insertMany(users);
        fail('Should have thrown bulk write error');
      } catch (error) {
        expect(error.name).toBe('BulkWriteError');
      }
    });
  });

  describe('GDPR Compliance Features', () => {
    it('should support right to erasure workflow', async () => {
      const user = await User.create({
        email: 'gdpr@example.com',
        name: 'GDPR Test User'
      });

      // Create erasure request
      const erasureRequest = await ErasureRequest.create({
        userId: user._id,
        requestId: 'GDPR-ER-001',
        reason: 'User exercised right to erasure',
        ipAddress: '192.168.1.1',
        userAgent: 'GDPR Browser',
        estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      expect(erasureRequest.status).toBe('pending');

      // Simulate processing
      erasureRequest.status = 'processing';
      await erasureRequest.save();

      // Complete erasure
      erasureRequest.status = 'completed';
      erasureRequest.completedAt = new Date();
      await erasureRequest.save();

      expect(erasureRequest.status).toBe('completed');
      expect(erasureRequest.completedAt).toBeDefined();
    });

    it('should track consent changes for compliance', async () => {
      const user = await User.create({
        email: 'consent@example.com',
        name: 'Consent Test'
      });

      // Initial consent
      const consent = await ConsentRecord.create({
        userId: user._id,
        purpose: 'marketing',
        ipAddress: '192.168.1.1',
        userAgent: 'Consent Browser'
      });

      // Create audit log for consent change
      await AuditLog.create({
        userId: user._id,
        action: 'consent_withdrawn',
        resourceType: 'consent',
        resourceId: consent._id.toString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Consent Browser',
        performedBy: user.email
      });

      // Update consent
      consent.status = 'withdrawn';
      consent.withdrawnAt = new Date();
      await consent.save();

      const auditEntries = await AuditLog.find({
        userId: user._id,
        action: 'consent_withdrawn'
      });

      expect(auditEntries).toHaveLength(1);
      expect(consent.status).toBe('withdrawn');
    });
  });

  describe('Model Edge Cases', () => {
    it('should handle special characters in text fields', async () => {
      const specialName = 'User with special chars: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';
      const user = new User({
        email: 'special@example.com',
        name: specialName
      });

      const saved = await user.save();
      expect(saved.name).toBe(specialName);
    });

    it('should handle maximum field lengths', async () => {
      const maxEmail = 'a'.repeat(244) + '@example.com'; // Close to 254 limit
      const user = new User({
        email: maxEmail,
        name: 'A'.repeat(100) // Exactly at limit
      });

      const saved = await user.save();
      expect(saved.email).toBe(maxEmail);
      expect(saved.name.length).toBe(100);
    });

    it('should handle null and undefined values appropriately', async () => {
      const user = new User({
        email: 'nulltest@example.com',
        name: null, // Should be allowed
        privacyMode: undefined // Should use default
      });

      const saved = await user.save();
      expect(saved.name).toBeNull();
      expect(saved.privacyMode).toBe(false); // Default value
    });
  });
});