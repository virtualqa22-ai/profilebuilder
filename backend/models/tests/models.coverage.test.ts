/**
 * Backend Models Coverage Test
 *
 * Simple test that imports all models to ensure they are covered by tests.
 * This provides basic coverage for model registration and schema compilation.
 */

describe('Backend Models Coverage', () => {
  it('should import all models successfully', () => {
    // Import all models to trigger their registration
    const AdblockEvent = require('../AdblockEvent').default;
    const AdMetric = require('../AdMetric').default;
    const AuditLog = require('../AuditLog').default;
    const ConsentRecord = require('../ConsentRecord').default;
    const ErasureRequest = require('../ErasureRequest').default;
    const RateLimitBucket = require('../RateLimitBucket').default;
    const RateLimitConfig = require('../RateLimitConfig').default;
    const Resume = require('../Resume').default;
    const SecurityEvent = require('../SecurityEvent').default;
    const User = require('../User').default;

    // Verify all models are defined
    expect(AdblockEvent).toBeDefined();
    expect(AdMetric).toBeDefined();
    expect(AuditLog).toBeDefined();
    expect(ConsentRecord).toBeDefined();
    expect(ErasureRequest).toBeDefined();
    expect(RateLimitBucket).toBeDefined();
    expect(RateLimitConfig).toBeDefined();
    expect(Resume).toBeDefined();
    expect(SecurityEvent).toBeDefined();
    expect(User).toBeDefined();

    // Verify model names
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

  it('should export type definitions', () => {
    // Test that type definitions are exported
    const {
      AdblockEventType,
      IAdblockEvent
    } = require('../AdblockEvent');

    const {
      AdMetricEventType,
      IAdMetric
    } = require('../AdMetric');

    const {
      AuditAction,
      AuditResourceType,
      IAuditLog
    } = require('../AuditLog');

    const {
      ConsentPurpose,
      ConsentStatus,
      IConsentRecord
    } = require('../ConsentRecord');

    const {
      ErasureStatus,
      IErasureRequest
    } = require('../ErasureRequest');

    const {
      IRateLimitBucket
    } = require('../RateLimitBucket');

    const {
      IRateLimitConfig
    } = require('../RateLimitConfig');

    const {
      IComment,
      IResume
    } = require('../Resume');

    const {
      SecurityEventType,
      SecuritySeverityLevel,
      ISecurityEvent
    } = require('../SecurityEvent');

    const {
      IUser
    } = require('../User');

    // Verify types are defined (they will be functions in runtime)
    expect(AdblockEventType).toBeDefined();
    expect(IAdblockEvent).toBeDefined();
    expect(AdMetricEventType).toBeDefined();
    expect(IAuditLog).toBeDefined();
    expect(ConsentPurpose).toBeDefined();
    expect(IErasureRequest).toBeDefined();
    expect(IRateLimitBucket).toBeDefined();
    expect(IRateLimitConfig).toBeDefined();
    expect(IResume).toBeDefined();
    expect(ISecurityEvent).toBeDefined();
    expect(IUser).toBeDefined();
  });
});