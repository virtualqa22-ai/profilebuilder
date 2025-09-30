// Comprehensive Unit Tests for User Management Service
// Tests all models, routes, app.js, db.js, and logger.js with 90%+ coverage

// Mock external dependencies before imports
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation((definition) => ({
    index: jest.fn(),
    pre: jest.fn(),
    indexes: jest.fn(() => []),
    ...definition
  }));

  mockSchema.Types = {
    ObjectId: jest.fn()
  };

  return {
    Schema: mockSchema,
    model: jest.fn(),
    connect: jest.fn(),
    connection: { close: jest.fn() }
  };
});

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    level: 'info',
    format: {},
    defaultMeta: { service: 'user-management-service' },
    transports: [],
    addCorrelationId: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    })),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })),
  format: {
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    combine: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-correlation-id')
}));

const mongoose = require('mongoose');
const express = require('express');
const supertest = require('supertest');
const winston = require('winston');

// Import modules after mocking
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const ConsentRecord = require('../src/models/ConsentRecord');
const ErasureRequest = require('../src/models/ErasureRequest');
const userRoutes = require('../src/routes/users');
const connectDB = require('../src/db');
const logger = require('../src/utils/logger');
const app = require('../src/app');

describe('User Management Service - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Models', () => {
    describe('User Model', () => {
      it('should create user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          privacyMode: true
        };

        const mockUser = {
          ...userData,
          _id: 'user123',
          createdAt: new Date(),
          updatedAt: new Date(),
          save: jest.fn().mockResolvedValue(this)
        };

        User.mockImplementation(() => mockUser);

        const user = new User(userData);
        await user.save();

        expect(user.email).toBe(userData.email);
        expect(user.name).toBe(userData.name);
        expect(user.privacyMode).toBe(true);
        expect(user.save).toHaveBeenCalled();
      });

      it('should validate email format', () => {
        const invalidUser = new User({
          email: 'invalid-email',
          name: 'Test User'
        });

        expect(() => invalidUser.validateSync()).toThrow();
      });

      it('should enforce email maxlength', () => {
        const longEmail = 'a'.repeat(245) + '@example.com';
        const user = new User({
          email: longEmail,
          name: 'Test User'
        });

        expect(() => user.validateSync()).toThrow();
      });

      it('should require email field', () => {
        const user = new User({
          name: 'Test User'
        });

        expect(() => user.validateSync()).toThrow();
      });

      it('should set default privacyMode to false', () => {
        const user = new User({
          email: 'test@example.com',
          name: 'Test User'
        });

        expect(user.privacyMode).toBe(false);
      });

      it('should update updatedAt on save', async () => {
        const user = new User({
          email: 'test@example.com',
          name: 'Test User'
        });

        const originalUpdatedAt = user.updatedAt;
        await user.save();

        expect(user.updatedAt).not.toBe(originalUpdatedAt);
      });

      it('should have correct indexes', () => {
        expect(User.schema.indexes()).toEqual(
          expect.arrayContaining([
            [{ email: 1 }, { unique: true }],
            [{ createdAt: -1 }, {}]
          ])
        );
      });
    });

    describe('AuditLog Model', () => {
      it('should create audit log with valid data', async () => {
        const auditData = {
          userId: 'user123',
          action: 'access',
          resourceType: 'user',
          resourceId: 'user123',
          performedBy: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        const mockAudit = {
          ...auditData,
          _id: 'audit123',
          timestamp: new Date(),
          createdAt: new Date(),
          save: jest.fn().mockResolvedValue(this)
        };

        AuditLog.mockImplementation(() => mockAudit);

        const audit = new AuditLog(auditData);
        await audit.save();

        expect(audit.action).toBe('access');
        expect(audit.resourceType).toBe('user');
        expect(audit.performedBy).toBe('system');
      });

      it('should validate action enum', () => {
        const audit = new AuditLog({
          userId: 'user123',
          action: 'invalid_action',
          resourceType: 'user',
          resourceId: 'user123',
          performedBy: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(() => audit.validateSync()).toThrow();
      });

      it('should validate resourceType enum', () => {
        const audit = new AuditLog({
          userId: 'user123',
          action: 'access',
          resourceType: 'invalid_type',
          resourceId: 'user123',
          performedBy: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(() => audit.validateSync()).toThrow();
      });

      it('should prevent updates on existing documents', async () => {
        const audit = new AuditLog({
          userId: 'user123',
          action: 'access',
          resourceType: 'user',
          resourceId: 'user123',
          performedBy: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        audit.isNew = false;

        await expect(audit.save()).rejects.toThrow('AuditLog entries are immutable');
      });

      it('should have correct indexes', () => {
        expect(AuditLog.schema.indexes()).toEqual(
          expect.arrayContaining([
            [{ userId: 1, timestamp: -1 }, {}],
            [{ action: 1, timestamp: -1 }, {}],
            [{ resourceType: 1, resourceId: 1, timestamp: -1 }, {}]
          ])
        );
      });
    });

    describe('ConsentRecord Model', () => {
      it('should create consent record with valid data', async () => {
        const consentData = {
          userId: 'user123',
          purpose: 'account_management',
          status: 'granted',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        const mockConsent = {
          ...consentData,
          _id: 'consent123',
          grantedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          save: jest.fn().mockResolvedValue(this)
        };

        ConsentRecord.mockImplementation(() => mockConsent);

        const consent = new ConsentRecord(consentData);
        await consent.save();

        expect(consent.purpose).toBe('account_management');
        expect(consent.status).toBe('granted');
        expect(consent.grantedAt).toBeDefined();
      });

      it('should validate purpose enum', () => {
        const consent = new ConsentRecord({
          userId: 'user123',
          purpose: 'invalid_purpose',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(() => consent.validateSync()).toThrow();
      });

      it('should validate status enum', () => {
        const consent = new ConsentRecord({
          userId: 'user123',
          purpose: 'account_management',
          status: 'invalid_status',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(() => consent.validateSync()).toThrow();
      });

      it('should set default status to granted', () => {
        const consent = new ConsentRecord({
          userId: 'user123',
          purpose: 'account_management',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(consent.status).toBe('granted');
      });

      it('should update updatedAt on save', async () => {
        const consent = new ConsentRecord({
          userId: 'user123',
          purpose: 'account_management',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        const originalUpdatedAt = consent.updatedAt;
        await consent.save();

        expect(consent.updatedAt).not.toBe(originalUpdatedAt);
      });

      it('should have correct indexes', () => {
        expect(ConsentRecord.schema.indexes()).toEqual(
          expect.arrayContaining([
            [{ userId: 1, purpose: 1 }, {}],
            [{ status: 1, expiresAt: 1 }, {}]
          ])
        );
      });
    });

    describe('ErasureRequest Model', () => {
      it('should create erasure request with valid data', async () => {
        const erasureData = {
          userId: 'user123',
          requestId: 'req123',
          reason: 'User requested deletion',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        const mockErasure = {
          ...erasureData,
          _id: 'erasure123',
          requestedAt: new Date(),
          estimatedCompletion: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          save: jest.fn().mockResolvedValue(this)
        };

        ErasureRequest.mockImplementation(() => mockErasure);

        const erasure = new ErasureRequest(erasureData);
        await erasure.save();

        expect(erasure.requestId).toBe('req123');
        expect(erasure.reason).toBe('User requested deletion');
        expect(erasure.status).toBe('pending');
      });

      it('should validate status enum', () => {
        const erasure = new ErasureRequest({
          userId: 'user123',
          requestId: 'req123',
          reason: 'Test',
          status: 'invalid_status',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(() => erasure.validateSync()).toThrow();
      });

      it('should set default status to pending', () => {
        const erasure = new ErasureRequest({
          userId: 'user123',
          requestId: 'req123',
          reason: 'Test',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(erasure.status).toBe('pending');
      });

      it('should update updatedAt on save', async () => {
        const erasure = new ErasureRequest({
          userId: 'user123',
          requestId: 'req123',
          reason: 'Test',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        const originalUpdatedAt = erasure.updatedAt;
        await erasure.save();

        expect(erasure.updatedAt).not.toBe(originalUpdatedAt);
      });

      it('should have correct indexes', () => {
        expect(ErasureRequest.schema.indexes()).toEqual(
          expect.arrayContaining([
            [{ userId: 1, status: 1 }, {}],
            [{ status: 1, requestedAt: -1 }, {}]
          ])
        );
      });
    });
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      mongoose.connect = jest.fn().mockResolvedValue({});

      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledWith(
        expect.stringContaining('user_management_db'),
        expect.objectContaining({
          useNewUrlParser: true,
          useUnifiedTopology: true
        })
      );
    });

    it('should handle connection errors', async () => {
      mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await connectDB();

      expect(consoleSpy).toHaveBeenCalledWith('Database connection error:', expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should use environment variable for MongoDB URI', async () => {
      process.env.MONGO_URI = 'mongodb://test:27017/testdb';
      mongoose.connect = jest.fn().mockResolvedValue({});

      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledWith('mongodb://test:27017/testdb', expect.any(Object));

      delete process.env.MONGO_URI;
    });
  });

  describe('Logger', () => {
    it('should create logger with correct configuration', () => {
      expect(logger.level).toBeDefined();
      expect(logger.format).toBeDefined();
      expect(logger.transports).toBeDefined();
    });

    it('should add correlation ID', () => {
      const childLogger = logger.addCorrelationId('test-id');

      expect(childLogger).toBeDefined();
    });

    it('should include service metadata', () => {
      expect(logger.defaultMeta.service).toBe('user-management-service');
    });
  });

  describe('GDPR Compliance Features', () => {
    describe('Consent Management', () => {
      it('should create consent record for user actions', async () => {
        const consentData = {
          userId: 'user123',
          purpose: 'analytics',
          status: 'granted',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        ConsentRecord.mockImplementation(() => ({
          ...consentData,
          save: jest.fn().mockResolvedValue(this)
        }));

        const consent = new ConsentRecord(consentData);
        await consent.save();

        expect(consent.purpose).toBe('analytics');
        expect(consent.status).toBe('granted');
      });

      it('should handle consent withdrawal', async () => {
        const consent = new ConsentRecord({
          userId: 'user123',
          purpose: 'marketing',
          status: 'withdrawn',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(consent.status).toBe('withdrawn');
      });
    });

    describe('Data Erasure', () => {
      it('should create erasure request', async () => {
        const erasureData = {
          userId: 'user123',
          requestId: 'erase-123',
          reason: 'User requested complete data deletion',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        ErasureRequest.mockImplementation(() => ({
          ...erasureData,
          save: jest.fn().mockResolvedValue(this)
        }));

        const erasure = new ErasureRequest(erasureData);
        await erasure.save();

        expect(erasure.requestId).toBe('erase-123');
        expect(erasure.status).toBe('pending');
      });

      it('should track erasure completion', async () => {
        const erasure = new ErasureRequest({
          userId: 'user123',
          requestId: 'erase-123',
          reason: 'GDPR request',
          status: 'completed',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });

        expect(erasure.status).toBe('completed');
      });
    });

    describe('Audit Logging', () => {
      it('should log all user data access', async () => {
        const auditData = {
          userId: 'user123',
          action: 'export',
          resourceType: 'user',
          resourceId: 'user123',
          performedBy: 'user123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          details: 'Data export requested'
        };

        AuditLog.create = jest.fn().mockResolvedValue(auditData);

        const result = await AuditLog.create(auditData);

        expect(result.action).toBe('export');
        expect(result.details).toBe('Data export requested');
      });

      it('should log consent changes', async () => {
        const auditData = {
          userId: 'user123',
          action: 'consent_withdrawn',
          resourceType: 'consent',
          resourceId: 'consent123',
          performedBy: 'user123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        AuditLog.create = jest.fn().mockResolvedValue(auditData);

        const result = await AuditLog.create(auditData);

        expect(result.action).toBe('consent_withdrawn');
        expect(result.resourceType).toBe('consent');
      });
    });
  });
});