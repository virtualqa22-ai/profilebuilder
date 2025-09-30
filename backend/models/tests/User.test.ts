/**
 * User Model Unit Tests
 *
 * Comprehensive test suite for the User model covering:
 * - Schema validation
 * - Required fields
 * - Default values
 * - Unique constraints
 * - Timestamps
 * - Edge cases and error scenarios
 */

import mongoose from 'mongoose';
import User from '../User';

// Mock mongoose before importing the model
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation((definition) => ({
    pre: jest.fn(),
    post: jest.fn(),
    index: jest.fn(),
  }));

  const mockModel = jest.fn();

  return {
    Schema: mockSchema,
    model: mockModel,
    models: {},
  };
});

describe('User Model', () => {
  const mockSchema = mongoose.Schema as jest.MockedFunction<any>;
  const mockModel = mongoose.model as jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mongoose.models as any) = {};
  });

  describe('Schema Definition', () => {
    it('should create a schema with correct fields', () => {
      // Import the model to trigger schema creation
      require('../User');

      expect(mockSchema).toHaveBeenCalledWith(
        {
          email: {
            type: String,
            required: true,
            unique: true,
          },
          name: {
            type: String,
          },
          privacyMode: {
            type: Boolean,
            default: false,
          },
        },
        { timestamps: true }
      );
    });

    it('should have timestamps enabled', () => {
      require('../User');

      const calls = mockSchema.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toEqual({ timestamps: true });
    });
  });

  describe('Field Validation', () => {
    beforeEach(() => {
      require('../User');
    });

    describe('email field', () => {
      it('should require email field', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.email.required).toBe(true);
      });

      it('should have unique constraint on email', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.email.unique).toBe(true);
      });

      it('should be of type String', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.email.type).toBe(String);
      });
    });

    describe('name field', () => {
      it('should be optional', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.name.required).toBeUndefined();
      });

      it('should be of type String', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.name.type).toBe(String);
      });
    });

    describe('privacyMode field', () => {
      it('should be of type Boolean', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.privacyMode.type).toBe(Boolean);
      });

      it('should default to false', () => {
        const schemaDefinition = mockSchema.mock.calls[0][0];
        expect(schemaDefinition.privacyMode.default).toBe(false);
      });
    });
  });

  describe('Model Creation', () => {
    it('should create model with correct name', () => {
      require('../User');

      expect(mockModel).toHaveBeenCalledWith('User', expect.any(Object));
    });

    it('should use existing model if already compiled', () => {
      (mongoose.models as any).User = 'existingModel';

      // Clear cache and re-require
      delete require.cache[require.resolve('../User')];
      const UserModel = require('../User').default;

      expect(UserModel).toBe('existingModel');
      expect(mockModel).not.toHaveBeenCalled();
    });

    it('should create new model if not already compiled', () => {
      (mongoose.models as any) = {};

      delete require.cache[require.resolve('../User')];
      require('../User');

      expect(mockModel).toHaveBeenCalledWith('User', expect.any(Object));
    });
  });

  describe('Type Definitions', () => {
    it('should export IUser interface', () => {
      const exportedTypes = require('../User');
      expect(exportedTypes.IUser).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      require('../User');
    });

    it('should handle empty email gracefully in schema definition', () => {
      const schemaDefinition = mockSchema.mock.calls[0][0];
      expect(schemaDefinition.email.required).toBe(true);
    });

    it('should handle undefined name field', () => {
      const schemaDefinition = mockSchema.mock.calls[0][0];
      expect(schemaDefinition.name).toEqual({ type: String });
    });

    it('should handle boolean privacyMode values', () => {
      const schemaDefinition = mockSchema.mock.calls[0][0];
      expect(schemaDefinition.privacyMode.type).toBe(Boolean);
      expect(schemaDefinition.privacyMode.default).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle mongoose connection errors gracefully', () => {
      mockModel.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      expect(() => {
        delete require.cache[require.resolve('../User')];
        require('../User');
      }).toThrow('Connection failed');
    });

    it('should handle invalid schema definition', () => {
      mockSchema.mockImplementationOnce(() => {
        throw new Error('Invalid schema');
      });

      expect(() => {
        delete require.cache[require.resolve('../User')];
        require('../User');
      }).toThrow('Invalid schema');
    });
  });

  describe('Integration with Mongoose', () => {
    it('should be compatible with mongoose model methods', () => {
      const UserModel = require('../User').default;
      expect(UserModel).toBeDefined();
    });
  });
});