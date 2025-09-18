/**
 * Security Logger Module
 *
 * Extends the base Logger class with security-specific logging capabilities.
 * Handles structured security event logging with database persistence,
 * severity levels, and alerting integration.
 */

import { Logger } from './logger';
import SecurityEvent from '../models/SecurityEvent';
import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITY_LEVELS,
  SECURITY_ALERT_THRESHOLDS
} from './constants';

interface SecurityEventData {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

interface AlertCheckResult {
  shouldAlert: boolean;
  alertReason?: string;
}

/**
 * AlertChecker class for determining when to trigger alerts
 */
class AlertChecker {
  async checkAuthFailureAlert(data: SecurityEventData): Promise<AlertCheckResult> {
    try {
      // Check recent auth failures from same IP
      const recentFailures = await SecurityEvent.countDocuments({
        eventType: SECURITY_EVENT_TYPES.AUTH_FAILURE,
        ipAddress: data.ipAddress,
        timestamp: { $gte: new Date(Date.now() - 60000) } // Last minute
      });

      if (recentFailures >= SECURITY_ALERT_THRESHOLDS.AUTH_FAILURES_PER_MINUTE) {
        return {
          shouldAlert: true,
          alertReason: `High authentication failure rate from IP: ${recentFailures} failures in last minute`
        };
      }
    } catch (error) {
      // If check fails, don't alert
    }

    return { shouldAlert: false };
  }

  async checkRateLimitAlert(data: SecurityEventData): Promise<AlertCheckResult> {
    try {
      // Check recent rate limit violations
      const recentViolations = await SecurityEvent.countDocuments({
        eventType: SECURITY_EVENT_TYPES.RATE_LIMIT_VIOLATION,
        ipAddress: data.ipAddress,
        timestamp: { $gte: new Date(Date.now() - 3600000) } // Last hour
      });

      if (recentViolations >= SECURITY_ALERT_THRESHOLDS.RATE_LIMIT_VIOLATIONS_PER_HOUR) {
        return {
          shouldAlert: true,
          alertReason: `High rate limit violations from IP: ${recentViolations} violations in last hour`
        };
      }
    } catch (error) {
      // If check fails, don't alert
    }

    return { shouldAlert: false };
  }

  async checkInputValidationAlert(data: SecurityEventData): Promise<AlertCheckResult> {
    try {
      // Check recent input validation failures
      const recentFailures = await SecurityEvent.countDocuments({
        eventType: SECURITY_EVENT_TYPES.INPUT_VALIDATION_FAILURE,
        ipAddress: data.ipAddress,
        timestamp: { $gte: new Date(Date.now() - 60000) } // Last minute
      });

      if (recentFailures >= SECURITY_ALERT_THRESHOLDS.INPUT_VALIDATION_FAILURES_PER_MINUTE) {
        return {
          shouldAlert: true,
          alertReason: `High input validation failure rate from IP: ${recentFailures} failures in last minute`
        };
      }
    } catch (error) {
      // If check fails, don't alert
    }

    return { shouldAlert: false };
  }

  async checkAISecurityAlert(data: SecurityEventData): Promise<AlertCheckResult> {
    // AI security events are always critical and should alert
    return {
      shouldAlert: true,
      alertReason: 'AI security event detected with high risk'
    };
  }

  async checkSuspiciousActivityAlert(data: SecurityEventData): Promise<AlertCheckResult> {
    try {
      // Check recent suspicious activities
      const recentActivities = await SecurityEvent.countDocuments({
        eventType: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        ipAddress: data.ipAddress,
        timestamp: { $gte: new Date(Date.now() - 3600000) } // Last hour
      });

      if (recentActivities >= SECURITY_ALERT_THRESHOLDS.SUSPICIOUS_ACTIVITIES_PER_HOUR) {
        return {
          shouldAlert: true,
          alertReason: `High suspicious activity rate from IP: ${recentActivities} activities in last hour`
        };
      }
    } catch (error) {
      // If check fails, don't alert
    }

    return { shouldAlert: false };
  }
}

/**
 * SecurityLogger class extending base Logger
 * Provides specialized methods for security event logging
 */
export class SecurityLogger extends Logger {
  private alertChecker: AlertChecker;

  constructor(correlationId?: string) {
    super(correlationId);
    this.alertChecker = new AlertChecker();
  }

  /**
   * Log authentication failure event
   */
  async logAuthFailure(data: SecurityEventData & {
    failureReason: string;
    attemptedUsername?: string;
  }): Promise<void> {
    const severity = this.determineAuthFailureSeverity(data);
    const alertResult = await this.alertChecker.checkAuthFailureAlert(data);

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.AUTH_FAILURE,
      severity,
      ...data,
      alertTriggered: alertResult.shouldAlert
    });

    if (alertResult.shouldAlert) {
      this.warn(`Security Alert: ${alertResult.alertReason}`, {
        eventType: SECURITY_EVENT_TYPES.AUTH_FAILURE,
        severity,
        userId: data.userId,
        ipAddress: data.ipAddress
      });
    }
  }

  /**
   * Log rate limit violation event
   */
  async logRateLimitViolation(data: SecurityEventData & {
    endpoint: string;
    limitType: string;
    requestCount: number;
  }): Promise<void> {
    const severity = SECURITY_SEVERITY_LEVELS.MEDIUM;
    const alertResult = await this.alertChecker.checkRateLimitAlert(data);

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.RATE_LIMIT_VIOLATION,
      severity,
      ...data,
      alertTriggered: alertResult.shouldAlert
    });

    if (alertResult.shouldAlert) {
      this.warn(`Security Alert: ${alertResult.alertReason}`, {
        eventType: SECURITY_EVENT_TYPES.RATE_LIMIT_VIOLATION,
        severity,
        endpoint: data.endpoint,
        ipAddress: data.ipAddress
      });
    }
  }

  /**
   * Log input validation failure event
   */
  async logInputValidationFailure(data: SecurityEventData & {
    field: string;
    validationRule: string;
    inputValue?: string;
  }): Promise<void> {
    const severity = SECURITY_SEVERITY_LEVELS.LOW;
    const alertResult = await this.alertChecker.checkInputValidationAlert(data);

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.INPUT_VALIDATION_FAILURE,
      severity,
      ...data,
      alertTriggered: alertResult.shouldAlert
    });

    if (alertResult.shouldAlert) {
      this.warn(`Security Alert: ${alertResult.alertReason}`, {
        eventType: SECURITY_EVENT_TYPES.INPUT_VALIDATION_FAILURE,
        severity,
        field: data.field,
        ipAddress: data.ipAddress
      });
    }
  }

  /**
   * Log AI security event
   */
  async logAISecurityEvent(data: SecurityEventData & {
    aiAction: string;
    securityRisk: string;
    confidence: number;
  }): Promise<void> {
    const severity = this.determineAISecuritySeverity(data);
    const alertResult = await this.alertChecker.checkAISecurityAlert(data);

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.AI_SECURITY_EVENT,
      severity,
      ...data,
      alertTriggered: alertResult.shouldAlert
    });

    if (alertResult.shouldAlert) {
      this.error(`Critical Security Alert: ${alertResult.alertReason}`, {
        eventType: SECURITY_EVENT_TYPES.AI_SECURITY_EVENT,
        severity,
        aiAction: data.aiAction,
        securityRisk: data.securityRisk,
        confidence: data.confidence
      });
    }
  }

  /**
   * Log privacy compliance action event
   */
  async logPrivacyComplianceAction(data: SecurityEventData & {
    action: string;
    regulation: string;
    dataSubjectId?: string;
  }): Promise<void> {
    const severity = SECURITY_SEVERITY_LEVELS.MEDIUM;

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.PRIVACY_COMPLIANCE_ACTION,
      severity,
      ...data,
      alertTriggered: false // Privacy actions typically don't trigger alerts
    });

    this.info(`Privacy Compliance Action: ${data.action}`, {
      eventType: SECURITY_EVENT_TYPES.PRIVACY_COMPLIANCE_ACTION,
      regulation: data.regulation,
      dataSubjectId: data.dataSubjectId
    });
  }

  /**
   * Log suspicious activity event
   */
  async logSuspiciousActivity(data: SecurityEventData & {
    activityType: string;
    riskScore: number;
    indicators: string[];
  }): Promise<void> {
    const severity = this.determineSuspiciousActivitySeverity(data);
    const alertResult = await this.alertChecker.checkSuspiciousActivityAlert(data);

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
      severity,
      ...data,
      alertTriggered: alertResult.shouldAlert
    });

    if (alertResult.shouldAlert) {
      this.error(`Security Alert: ${alertResult.alertReason}`, {
        eventType: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        severity,
        activityType: data.activityType,
        riskScore: data.riskScore
      });
    }
  }

  /**
   * Log access denied event
   */
  async logAccessDenied(data: SecurityEventData & {
    resource: string;
    requiredPermission: string;
    attemptedAction: string;
  }): Promise<void> {
    const severity = SECURITY_SEVERITY_LEVELS.MEDIUM;

    await this.logSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
      severity,
      ...data,
      alertTriggered: false
    });

    this.warn(`Access Denied: ${data.attemptedAction} on ${data.resource}`, {
      eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
      resource: data.resource,
      requiredPermission: data.requiredPermission
    });
  }

  /**
   * Generic method to log any security event
   */
  private async logSecurityEvent(eventData: {
    eventType: string;
    severity: string;
    userId?: string;
    ipAddress: string;
    userAgent: string;
    location?: string;
    details: Record<string, any>;
    metadata?: Record<string, any>;
    alertTriggered: boolean;
  }): Promise<void> {
    try {
      // Create security event in database
      await SecurityEvent.create({
        userId: eventData.userId,
        eventType: eventData.eventType,
        severity: eventData.severity,
        correlationId: this.getCorrelationId(),
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        location: eventData.location,
        details: eventData.details,
        metadata: eventData.metadata,
        alertTriggered: eventData.alertTriggered
      });

      // Log to Winston logger
      const logLevel = this.getLogLevelForSeverity(eventData.severity);
      const message = `Security Event: ${eventData.eventType} [${eventData.severity}]`;

      this[logLevel](message, {
        securityEvent: true,
        eventType: eventData.eventType,
        severity: eventData.severity,
        userId: eventData.userId,
        correlationId: this.getCorrelationId(),
        alertTriggered: eventData.alertTriggered
      });
    } catch (error) {
      // If database logging fails, still log to Winston
      this.error('Failed to log security event to database', error as Error, {
        eventType: eventData.eventType,
        severity: eventData.severity
      });
    }
  }

  /**
   * Determine severity for authentication failures
   */
  private determineAuthFailureSeverity(data: SecurityEventData): string {
    // Could implement more sophisticated logic based on patterns
    return SECURITY_SEVERITY_LEVELS.MEDIUM;
  }

  /**
   * Determine severity for AI security events
   */
  private determineAISecuritySeverity(data: any): string {
    if (data.confidence > 0.9 && data.securityRisk === 'high') {
      return SECURITY_SEVERITY_LEVELS.CRITICAL;
    } else if (data.confidence > 0.7) {
      return SECURITY_SEVERITY_LEVELS.HIGH;
    }
    return SECURITY_SEVERITY_LEVELS.MEDIUM;
  }

  /**
   * Determine severity for suspicious activities
   */
  private determineSuspiciousActivitySeverity(data: any): string {
    if (data.riskScore > 0.8) {
      return SECURITY_SEVERITY_LEVELS.HIGH;
    } else if (data.riskScore > 0.5) {
      return SECURITY_SEVERITY_LEVELS.MEDIUM;
    }
    return SECURITY_SEVERITY_LEVELS.LOW;
  }

  /**
   * Get appropriate log level for security severity
   */
  private getLogLevelForSeverity(severity: string): 'info' | 'warn' | 'error' {
    switch (severity) {
      case SECURITY_SEVERITY_LEVELS.CRITICAL:
      case SECURITY_SEVERITY_LEVELS.HIGH:
        return 'error';
      case SECURITY_SEVERITY_LEVELS.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }
}

// Global security logger instance
export const securityLogger = new SecurityLogger();