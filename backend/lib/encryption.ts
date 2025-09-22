/**
 * Centralized Encryption Module
 *
 * Provides secure encryption/decryption utilities with key rotation support.
 * Uses AES-256 encryption for sensitive data protection.
 *
 * Security Features:
 * - Centralized key management
 * - Key rotation support
 * - Environment-based configuration
 * - Secure key validation
 * - No hardcoded secrets
 */

import CryptoJS from 'crypto-js';
import { globalLogger } from './logger';

/**
 * Encryption configuration interface
 */
export interface EncryptionConfig {
  primaryKey: string;
  previousKeys?: string[]; // For key rotation support
  algorithm: 'AES';
}

/**
 * Get encryption configuration from environment
 * Supports key rotation by allowing multiple keys
 */
function getEncryptionConfig(): EncryptionConfig {
  const primaryKey = process.env.ENCRYPTION_KEY;
  const previousKeys = process.env.ENCRYPTION_PREVIOUS_KEYS?.split(',') || [];

  if (!primaryKey) {
    const error = new Error('ENCRYPTION_KEY environment variable is required for data encryption');
    globalLogger.error('Encryption configuration error', error);
    throw error;
  }

  // Validate key strength (should be at least 256 bits)
  if (primaryKey.length < 32) {
    const error = new Error('ENCRYPTION_KEY must be at least 32 characters (256 bits) for security');
    globalLogger.error('Encryption key validation failed', error);
    throw error;
  }

  return {
    primaryKey,
    previousKeys: previousKeys.filter(key => key.length >= 32),
    algorithm: 'AES'
  };
}

// Cache the configuration to avoid repeated environment checks
let encryptionConfig: EncryptionConfig | null = null;

/**
 * Get cached encryption configuration
 */
function getConfig(): EncryptionConfig {
  if (!encryptionConfig) {
    encryptionConfig = getEncryptionConfig();
  }
  return encryptionConfig;
}

/**
 * Encrypts sensitive data using AES-256
 * @param text - Plain text to encrypt
 * @returns Encrypted ciphertext as string
 */
export function encrypt(text: string): string {
  if (!text) return text;

  try {
    const config = getConfig();
    return CryptoJS.AES.encrypt(text, config.primaryKey).toString();
  } catch (error) {
    globalLogger.error('Encryption failed', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts AES-256 encrypted data
 * Supports key rotation by trying previous keys if primary fails
 * @param ciphertext - Encrypted text to decrypt
 * @returns Decrypted plain text
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  try {
    const config = getConfig();

    // Try primary key first
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, config.primaryKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted) return decrypted;
    } catch (error) {
      // Primary key failed, try previous keys for rotation support
    }

    // Try previous keys for backward compatibility during rotation
    for (const key of config.previousKeys || []) {
      try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (decrypted) {
          globalLogger.warn('Data decrypted with previous key - consider re-encrypting with primary key');
          return decrypted;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('Failed to decrypt data with any available key');
  } catch (error) {
    globalLogger.error('Decryption failed', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Re-encrypts data with the current primary key
 * Useful for key rotation maintenance
 * @param ciphertext - Current encrypted data
 * @returns Re-encrypted data with primary key
 */
export function reEncrypt(ciphertext: string): string {
  const decrypted = decrypt(ciphertext);
  return encrypt(decrypted);
}

/**
 * Validates if a key can decrypt given ciphertext
 * @param key - Encryption key to test
 * @param ciphertext - Encrypted data to test against
 * @returns True if key can decrypt the data
 */
export function validateKey(key: string, ciphertext: string): boolean {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return !!decrypted;
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure random key
 * @param length - Key length in bytes (default 32 for AES-256)
 * @returns Random key as base64 string
 */
export function generateKey(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}
/**
 * Generates a cryptographically secure random key
 * @param length - Key length in bytes (default 32 for AES-256)
 * @returns Random key as base64 string
 */
export function generateKey(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * Key rotation utility
 * Helps manage the process of rotating encryption keys
 */
export class KeyRotationManager {
  /**
   * Rotates the encryption key by moving current primary to previous keys
   * @param newPrimaryKey - The new primary encryption key
   * @returns Instructions for updating environment variables
   */
  static rotateKey(newPrimaryKey: string): {
    newEnvVars: Record<string, string>;
    migrationSteps: string[];
  } {
    const currentPrimary = process.env.ENCRYPTION_KEY;
    const currentPrevious = process.env.ENCRYPTION_PREVIOUS_KEYS?.split(',') || [];

    if (!currentPrimary) {
      throw new Error('No current ENCRYPTION_KEY found to rotate');
    }

    // Validate new key
    if (newPrimaryKey.length < 32) {
      throw new Error('New primary key must be at least 32 characters (256 bits)');
    }

    // Create new previous keys list (keep up to 3 previous keys)
    const newPreviousKeys = [currentPrimary, ...currentPrevious.slice(0, 2)].join(',');

    return {
      newEnvVars: {
        ENCRYPTION_KEY: newPrimaryKey,
        ENCRYPTION_PREVIOUS_KEYS: newPreviousKeys
      },
      migrationSteps: [
        '1. Generate a new encryption key using generateKey()',
        '2. Update ENCRYPTION_KEY environment variable with the new key',
        '3. Update ENCRYPTION_PREVIOUS_KEYS with the old primary key',
        '4. Restart the application to load new keys',
        '5. Optionally, run a data migration to re-encrypt existing data with the new key',
        '6. Monitor for any decryption failures and address them',
        '7. After confirming everything works, remove old keys from ENCRYPTION_PREVIOUS_KEYS'
      ]
    };
  }

  /**
   * Validates that all data can be decrypted with current keys
   * @param encryptedSamples - Array of encrypted data samples to test
   * @returns Validation result
   */
  static validateKeyRotation(encryptedSamples: string[]): {
    success: boolean;
    failures: string[];
  } {
    const failures: string[] = [];

    for (const sample of encryptedSamples) {
      try {
        decrypt(sample);
      } catch (error) {
        failures.push(`Failed to decrypt sample: ${error.message}`);
      }
    }

    return {
      success: failures.length === 0,
      failures
    };
  }
}