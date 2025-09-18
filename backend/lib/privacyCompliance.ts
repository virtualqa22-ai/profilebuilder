/**
 * Privacy Compliance Module
 *
 * Implements GDPR-like data privacy features including:
 * - Data consent management
 * - Right to erasure
 * - Data portability
 * - Privacy audit logging
 * - Data processing records
 */

import User from '../models/User';
import Resume from '../models/Resume';
import ConsentRecord from '../models/ConsentRecord';
import AuditLog from '../models/AuditLog';
import ErasureRequest from '../models/ErasureRequest';

/**
 * Data Processing Purpose Types
 */
export enum DataProcessingPurpose {
  ACCOUNT_MANAGEMENT = 'account_management',
  RESUME_BUILDING = 'resume_building',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  LEGAL_COMPLIANCE = 'legal_compliance',
}

/**
 * Consent Status Types
 */
export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
}

/**
 * Data Consent Record
 */
export interface DataConsent {
  userId: string;
  purpose: DataProcessingPurpose;
  status: ConsentStatus;
  grantedAt: Date;
  expiresAt?: Date;
  withdrawnAt?: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Privacy Audit Log Entry
 */
export interface PrivacyAuditLog {
  userId: string;
  action: 'access' | 'modify' | 'delete' | 'export' | 'consent_granted' | 'consent_withdrawn';
  resourceType: 'user' | 'resume' | 'consent';
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  performedBy: string; // user ID or 'system'
  details?: string;
}

/**
 * Data Portability Export Format
 */
export interface DataExport {
  user: {
    personalData: any;
    consents: DataConsent[];
    auditLog: PrivacyAuditLog[];
  };
  resumes: any[];
  metadata: {
    exportDate: Date;
    formatVersion: string;
    dataController: string;
  };
}

/**
 * Manages user data consents
 */
export class ConsentManager {
  /**
   * Grants consent for data processing
   */
  static async grantConsent(
    userId: string,
    purpose: DataProcessingPurpose,
    ipAddress: string,
    userAgent: string,
    expiresAt?: Date
  ): Promise<DataConsent> {
    const consent: DataConsent = {
      userId,
      purpose,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      expiresAt,
      ipAddress,
      userAgent,
    };

    // Save consent to database
    const consentRecord = new ConsentRecord({
      userId,
      purpose,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      expiresAt,
      ipAddress,
      userAgent,
    });
    await consentRecord.save();

    // Log the consent grant
    await PrivacyAuditor.logAuditEvent({
      userId,
      action: 'consent_granted',
      resourceType: 'consent',
      resourceId: purpose,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      performedBy: userId,
      details: `Consent granted for ${purpose}`,
    });

    return consent;
  }

  /**
   * Withdraws consent for data processing
   */
  static async withdrawConsent(
    userId: string,
    purpose: DataProcessingPurpose,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // Update consent status in database
    await ConsentRecord.findOneAndUpdate(
      { userId, purpose },
      { status: ConsentStatus.WITHDRAWN, withdrawnAt: new Date() },
      { new: true }
    );

    // Log the consent withdrawal
    await PrivacyAuditor.logAuditEvent({
      userId,
      action: 'consent_withdrawn',
      resourceType: 'consent',
      resourceId: purpose,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      performedBy: userId,
      details: `Consent withdrawn for ${purpose}`,
    });
  }

  /**
   * Checks if user has given consent for a purpose
   */
  static async hasConsent(
    userId: string,
    purpose: DataProcessingPurpose
  ): Promise<boolean> {
    // Check database for active consent
    const consent = await ConsentRecord.findOne({ userId, purpose }).sort({ grantedAt: -1 });
    return consent?.status === ConsentStatus.GRANTED && (!consent.expiresAt || consent.expiresAt > new Date());
  }

  /**
   * Gets all consents for a user
   */
  static async getUserConsents(userId: string): Promise<DataConsent[]> {
    // Retrieve from database
    return await ConsentRecord.find({ userId }).sort({ grantedAt: -1 });
  }
}

/**
 * Handles data erasure requests (Right to be Forgotten)
 */
export class DataErasureManager {
  /**
   * Initiates data erasure process for a user
   */
  static async initiateErasure(
    userId: string,
    reason: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ requestId: string; estimatedCompletion: Date }> {
    const requestId = `erasure_${Date.now()}_${userId}`;

    // Save erasure request to database
    const erasureRequest = new ErasureRequest({
      userId,
      requestId,
      reason,
      status: 'pending',
      requestedAt: new Date(),
      ipAddress,
      userAgent,
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await erasureRequest.save();

    // Log the erasure request
    await PrivacyAuditor.logAuditEvent({
      userId,
      action: 'delete',
      resourceType: 'user',
      resourceId: userId,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      performedBy: userId,
      details: `Data erasure requested: ${reason}`,
    });

    return { requestId, estimatedCompletion: erasureRequest.estimatedCompletion };
  }

  /**
   * Performs complete data erasure for a user
   */
  static async performErasure(userId: string): Promise<void> {
    try {
      // Delete user account
      await User.findByIdAndDelete(userId);

      // Delete all user resumes
      await Resume.deleteMany({ userId });

      // Delete consent records
      await ConsentRecord.deleteMany({ userId });

      // Delete audit logs (except erasure logs)
      await AuditLog.deleteMany({ userId, action: { $ne: 'delete' } });

      // Update erasure request status
      await ErasureRequest.findOneAndUpdate(
        { userId, status: 'processing' },
        { status: 'completed', completedAt: new Date() }
      );

      // Log final erasure
      await PrivacyAuditor.logAuditEvent({
        userId,
        action: 'delete',
        resourceType: 'user',
        resourceId: userId,
        timestamp: new Date(),
        ipAddress: 'system',
        userAgent: 'system',
        performedBy: 'system',
        details: 'Complete data erasure performed',
      });

    } catch (error) {
      // Update erasure request status to failed
      await ErasureRequest.findOneAndUpdate(
        { userId, status: 'processing' },
        { status: 'failed' }
      );
      console.error('Data erasure failed:', error);
      throw new Error('Data erasure process failed');
    }
  }

  /**
   * Anonymizes user data instead of complete deletion (alternative to erasure)
   */
  static async anonymizeUserData(userId: string): Promise<void> {
    // Anonymize user data by replacing PII with generic values
    await User.findByIdAndUpdate(userId, {
      email: `anonymous_${userId}@deleted.local`,
      name: 'Anonymous User',
    });

    // Anonymize resumes
    const resumes = await Resume.find({ userId });
    for (const resume of resumes) {
      await Resume.findByIdAndUpdate(resume._id, {
        title: 'Anonymized Resume',
        content: 'This resume has been anonymized for privacy compliance.',
      });
    }

    // Log anonymization
    await PrivacyAuditor.logAuditEvent({
      userId,
      action: 'modify',
      resourceType: 'user',
      resourceId: userId,
      timestamp: new Date(),
      ipAddress: 'system',
      userAgent: 'system',
      performedBy: 'system',
      details: 'User data anonymized for privacy compliance',
    });
  }
}

/**
 * Handles data portability requests
 */
export class DataPortabilityManager {
  /**
   * Exports all user data in portable format
   */
  static async exportUserData(userId: string): Promise<DataExport> {
    // Gather all user data
    const user = await User.findById(userId);
    const resumes = await Resume.find({ userId });
    const consents = await ConsentManager.getUserConsents(userId);
    const auditLog = await PrivacyAuditor.getUserAuditLog(userId);

    const exportData: DataExport = {
      user: {
        personalData: user,
        consents,
        auditLog,
      },
      resumes,
      metadata: {
        exportDate: new Date(),
        formatVersion: '1.0',
        dataController: 'CareerVerve Profile Builder',
      },
    };

    // Log the data export
    await PrivacyAuditor.logAuditEvent({
      userId,
      action: 'export',
      resourceType: 'user',
      resourceId: userId,
      timestamp: new Date(),
      ipAddress: 'system',
      userAgent: 'system',
      performedBy: userId,
      details: 'Data export requested and completed',
    });

    return exportData;
  }

  /**
   * Validates data export format
   */
  static validateExportFormat(data: DataExport): boolean {
    // Implement validation logic
    // Check required fields, data integrity, etc.
    return data.user && data.resumes && data.metadata && data.metadata.exportDate && data.metadata.formatVersion;
  }
}

/**
 * Privacy audit and logging system
 */
export class PrivacyAuditor {
  /**
   * Logs privacy-related audit events
   */
  static async logAuditEvent(event: PrivacyAuditLog): Promise<void> {
    // Save to secure audit log database
    const auditLog = new AuditLog(event);
    await auditLog.save();

    console.log('Privacy Audit Event:', {
      ...event,
      timestamp: event.timestamp.toISOString(),
    });
  }

  /**
   * Retrieves audit log for a user
   */
  static async getUserAuditLog(userId: string): Promise<PrivacyAuditLog[]> {
    // Retrieve from audit database
    return await AuditLog.find({ userId }).sort({ timestamp: -1 });
  }

  /**
   * Generates privacy compliance report
   */
  static async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalUsers: number;
    consentGranted: number;
    consentWithdrawn: number;
    dataErasureRequests: number;
    dataExportRequests: number;
  }> {
    // Generate compliance metrics from audit logs
    const consentGranted = await AuditLog.countDocuments({
      action: 'consent_granted',
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const consentWithdrawn = await AuditLog.countDocuments({
      action: 'consent_withdrawn',
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const dataErasureRequests = await AuditLog.countDocuments({
      action: 'delete',
      resourceType: 'user',
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const dataExportRequests = await AuditLog.countDocuments({
      action: 'export',
      resourceType: 'user',
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const totalUsers = await User.countDocuments();

    return {
      totalUsers,
      consentGranted,
      consentWithdrawn,
      dataErasureRequests,
      dataExportRequests,
    };
  }
}

/**
 * Cookie consent management
 */
export class CookieConsentManager {
  /**
   * Essential cookies (always allowed)
   */
  static readonly ESSENTIAL_COOKIES = [
    'session',
    'csrf',
    'auth',
  ];

  /**
   * Functional cookies
   */
  static readonly FUNCTIONAL_COOKIES = [
    'preferences',
    'language',
  ];

  /**
   * Analytics cookies
   */
  static readonly ANALYTICS_COOKIES = [
    'analytics',
    'tracking',
  ];

  /**
   * Marketing cookies
   */
  static readonly MARKETING_COOKIES = [
    'marketing',
    'advertising',
  ];

  /**
   * Validates cookie consent preferences
   */
  static validateCookieConsent(preferences: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  }): boolean {
    // Essential cookies must always be true
    return preferences.essential === true;
  }

  /**
   * Gets allowed cookies based on consent
   */
  static getAllowedCookies(preferences: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  }): string[] {
    const allowed: string[] = [];

    if (preferences.essential) allowed.push(...this.ESSENTIAL_COOKIES);
    if (preferences.functional) allowed.push(...this.FUNCTIONAL_COOKIES);
    if (preferences.analytics) allowed.push(...this.ANALYTICS_COOKIES);
    if (preferences.marketing) allowed.push(...this.MARKETING_COOKIES);

    return allowed;
  }
}