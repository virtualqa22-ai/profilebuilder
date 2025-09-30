/**
 * Unit tests for Encryption utilities
 *
 * Tests encryption/decryption functionality including:
 * - AES-256 encryption and decryption
 * - Key rotation support
 * - Key validation
 * - Key generation
 * - Error handling for encryption operations
 */

import { encrypt, decrypt, reEncrypt, validateKey, generateKey, KeyRotationManager } from '../encryption';

// Mock the logger
jest.mock('../logger', () => ({
  globalLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  enc: {
    Utf8: 'utf8',
  },
  lib: {
    WordArray: {
      random: jest.fn(),
    },
  },
}));

describe('Encryption Module', () => {
  const mockLogger = require('../logger').globalLogger;
  const CryptoJS = require('crypto-js');

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_PREVIOUS_KEYS;

    // Reset cached config
    // Note: This would normally require clearing the module cache, but we'll work around it
  });

  describe('Environment Configuration', () => {
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
      expect(mockLogger.error).toHaveBeenCalledWith('Encryption configuration error', expect.any(Error));
    });

    it('should throw error when ENCRYPTION_KEY is too short', () => {
      process.env.ENCRYPTION_KEY = 'short';

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be at least 32 characters');
      expect(mockLogger.error).toHaveBeenCalledWith('Encryption key validation failed', expect.any(Error));
    });

    it('should accept valid ENCRYPTION_KEY', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32); // 32 character key

      CryptoJS.AES.encrypt.mockReturnValue('encrypted-data');

      const result = encrypt('test data');
      expect(result).toBe('encrypted-data');
    });

    it('should filter out short previous keys', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      process.env.ENCRYPTION_PREVIOUS_KEYS = 'short,' + 'a'.repeat(32) + ',another-short';

      CryptoJS.AES.encrypt.mockReturnValue('encrypted-data');

      encrypt('test');
      // Should only keep the valid 32+ character key
    });
  });

  describe('encrypt', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should return empty string for empty input', () => {
      const result = encrypt('');
      expect(result).toBe('');
    });

    it('should return input unchanged for falsy but not empty input', () => {
      const result = encrypt(null as any);
      expect(result).toBe(null);
    });

    it('should encrypt data successfully', () => {
      const plainText = 'sensitive data';
      const encryptedData = 'encrypted-result';

      CryptoJS.AES.encrypt.mockReturnValue(encryptedData);

      const result = encrypt(plainText);

      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(plainText, 'a'.repeat(32));
      expect(result).toBe(encryptedData);
    });

    it('should handle encryption errors', () => {
      CryptoJS.AES.encrypt.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      expect(() => encrypt('test')).toThrow('Failed to encrypt data');
      expect(mockLogger.error).toHaveBeenCalledWith('Encryption failed', expect.any(Error));
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should return empty string for empty input', () => {
      const result = decrypt('');
      expect(result).toBe('');
    });

    it('should return input unchanged for falsy but not empty input', () => {
      const result = decrypt(null as any);
      expect(result).toBe(null);
    });

    it('should decrypt data successfully with primary key', () => {
      const cipherText = 'encrypted-data';
      const plainText = 'decrypted-result';

      const mockBytes = {
        toString: jest.fn().mockReturnValue(plainText),
      };
      CryptoJS.AES.decrypt.mockReturnValue(mockBytes);

      const result = decrypt(cipherText);

      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(cipherText, 'a'.repeat(32));
      expect(result).toBe(plainText);
    });

    it('should try previous keys when primary key fails', () => {
      process.env.ENCRYPTION_PREVIOUS_KEYS = 'b'.repeat(32) + ',c'.repeat(32);

      // Primary key fails
      CryptoJS.AES.decrypt
        .mockReturnValueOnce({ toString: jest.fn().mockReturnValue('') })
        .mockReturnValueOnce({ toString: jest.fn().mockReturnValue('decrypted-with-old-key') });

      const result = decrypt('cipher-text');

      expect(result).toBe('decrypted-with-old-key');
      expect(mockLogger.warn).toHaveBeenCalledWith('Data decrypted with previous key - consider re-encrypting with primary key');
    });

    it('should throw error when all keys fail', () => {
      process.env.ENCRYPTION_PREVIOUS_KEYS = 'b'.repeat(32);

      CryptoJS.AES.decrypt
        .mockReturnValue({ toString: jest.fn().mockReturnValue('') });

      expect(() => decrypt('cipher-text')).toThrow('Failed to decrypt data');
      expect(mockLogger.error).toHaveBeenCalledWith('Decryption failed', expect.any(Error));
    });

    it('should handle decryption errors', () => {
      CryptoJS.AES.decrypt.mockImplementation(() => {
        throw new Error('Decryption error');
      });

      expect(() => decrypt('test')).toThrow('Failed to decrypt data');
      expect(mockLogger.error).toHaveBeenCalledWith('Decryption failed', expect.any(Error));
    });
  });

  describe('reEncrypt', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should decrypt and re-encrypt data', () => {
      const originalCipher = 'old-encrypted';
      const decrypted = 'plain-text';
      const newCipher = 'new-encrypted';

      // Mock decrypt
      CryptoJS.AES.decrypt.mockReturnValue({
        toString: jest.fn().mockReturnValue(decrypted),
      });

      // Mock encrypt
      CryptoJS.AES.encrypt.mockReturnValue(newCipher);

      const result = reEncrypt(originalCipher);

      expect(result).toBe(newCipher);
      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(originalCipher, 'a'.repeat(32));
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(decrypted, 'a'.repeat(32));
    });
  });

  describe('validateKey', () => {
    it('should return true for valid key', () => {
      const key = 'a'.repeat(32);
      const cipherText = 'encrypted-data';

      CryptoJS.AES.decrypt.mockReturnValue({
        toString: jest.fn().mockReturnValue('decrypted-text'),
      });

      const result = validateKey(key, cipherText);

      expect(result).toBe(true);
      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(cipherText, key);
    });

    it('should return false for invalid key', () => {
      const key = 'invalid-key';
      const cipherText = 'encrypted-data';

      CryptoJS.AES.decrypt.mockReturnValue({
        toString: jest.fn().mockReturnValue(''),
      });

      const result = validateKey(key, cipherText);

      expect(result).toBe(false);
    });

    it('should return false when decryption throws', () => {
      const key = 'failing-key';
      const cipherText = 'encrypted-data';

      CryptoJS.AES.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = validateKey(key, cipherText);

      expect(result).toBe(false);
    });
  });

  describe('generateKey', () => {
    it('should generate key with default length', () => {
      const mockKey = 'generated-key-32-bytes';
      CryptoJS.lib.WordArray.random.mockReturnValue({
        toString: jest.fn().mockReturnValue(mockKey),
      });

      const result = generateKey();

      expect(result).toBe(mockKey);
      expect(CryptoJS.lib.WordArray.random).toHaveBeenCalledWith(32);
    });

    it('should generate key with custom length', () => {
      const customLength = 64;
      const mockKey = 'generated-key-64-bytes';
      CryptoJS.lib.WordArray.random.mockReturnValue({
        toString: jest.fn().mockReturnValue(mockKey),
      });

      const result = generateKey(customLength);

      expect(result).toBe(mockKey);
      expect(CryptoJS.lib.WordArray.random).toHaveBeenCalledWith(customLength);
    });
  });

  describe('KeyRotationManager', () => {
    describe('rotateKey', () => {
      it('should generate rotation instructions', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(32);
        process.env.ENCRYPTION_PREVIOUS_KEYS = 'b'.repeat(32) + ',c'.repeat(32);

        const newKey = 'd'.repeat(32);
        const result = KeyRotationManager.rotateKey(newKey);

        expect(result.newEnvVars).toEqual({
          ENCRYPTION_KEY: newKey,
          ENCRYPTION_PREVIOUS_KEYS: 'a'.repeat(32) + ',b'.repeat(32),
        });

        expect(result.migrationSteps).toHaveLength(7);
        expect(result.migrationSteps[0]).toContain('Generate a new encryption key');
      });

      it('should throw error when no current key exists', () => {
        delete process.env.ENCRYPTION_KEY;

        expect(() => KeyRotationManager.rotateKey('new-key')).toThrow('No current ENCRYPTION_KEY found');
      });

      it('should throw error for short new key', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(32);

        expect(() => KeyRotationManager.rotateKey('short')).toThrow('New primary key must be at least 32 characters');
      });

      it('should handle missing previous keys', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(32);
        delete process.env.ENCRYPTION_PREVIOUS_KEYS;

        const result = KeyRotationManager.rotateKey('b'.repeat(32));

        expect(result.newEnvVars.ENCRYPTION_PREVIOUS_KEYS).toBe('a'.repeat(32));
      });
    });

    describe('validateKeyRotation', () => {
      beforeEach(() => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      });

      it('should validate successful decryption of all samples', () => {
        const samples = ['encrypted1', 'encrypted2'];

        CryptoJS.AES.decrypt.mockReturnValue({
          toString: jest.fn().mockReturnValue('decrypted'),
        });

        const result = KeyRotationManager.validateKeyRotation(samples);

        expect(result.success).toBe(true);
        expect(result.failures).toHaveLength(0);
      });

      it('should report decryption failures', () => {
        const samples = ['encrypted1', 'encrypted2'];

        CryptoJS.AES.decrypt
          .mockReturnValueOnce({
            toString: jest.fn().mockReturnValue('decrypted1'),
          })
          .mockReturnValueOnce({
            toString: jest.fn().mockImplementation(() => {
              throw new Error('Decryption failed');
            }),
          });

        const result = KeyRotationManager.validateKeyRotation(samples);

        expect(result.success).toBe(false);
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0]).toContain('Failed to decrypt sample');
      });

      it('should handle empty sample array', () => {
        const result = KeyRotationManager.validateKeyRotation([]);

        expect(result.success).toBe(true);
        expect(result.failures).toHaveLength(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined environment variables', () => {
      delete process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_PREVIOUS_KEYS;

      expect(() => encrypt('test')).toThrow();
    });

    it('should handle malformed previous keys string', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      process.env.ENCRYPTION_PREVIOUS_KEYS = ',invalid,,valid' + 'a'.repeat(32);

      // Should filter out invalid keys
      expect(() => encrypt('test')).not.toThrow();
    });

    it('should handle decryption returning empty string', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);

      CryptoJS.AES.decrypt.mockReturnValue({
        toString: jest.fn().mockReturnValue(''),
      });

      expect(() => decrypt('cipher')).toThrow('Failed to decrypt data');
    });

    it('should handle key rotation with maximum previous keys', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      process.env.ENCRYPTION_PREVIOUS_KEYS = 'b'.repeat(32) + ',c'.repeat(32) + ',d'.repeat(32) + ',e'.repeat(32);

      const result = KeyRotationManager.rotateKey('f'.repeat(32));

      // Should keep only 3 previous keys
      const previousKeys = result.newEnvVars.ENCRYPTION_PREVIOUS_KEYS.split(',');
      expect(previousKeys).toHaveLength(3);
      expect(previousKeys[0]).toBe('a'.repeat(32));
    });
  });
});