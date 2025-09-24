/**
 * Model Utilities
 *
 * Shared utilities for Mongoose models to reduce code duplication
 * and ensure consistent behavior across immutable models.
 */

/**
 * Creates pre-save hooks for immutable models
 * @param operation - The operation name for error messages
 * @returns Hook function
 */
export const createImmutabilityHook = (operation: string) => {
  return function(next: (err?: Error) => void) {
    const error = new Error(`${operation} are immutable and cannot be ${this.op || 'modified'}`);
    next(error);
  };
};

/**
 * Creates pre-hooks for multiple immutable operations
 * @param operations - Array of operations to make immutable
 * @param modelName - Name of the model for error messages
 * @returns Object with hook functions
 */
export const createImmutableHooks = (operations: string[], modelName: string) => {
  const hooks: Record<string, (next: (err?: Error) => void) => void> = {};

  operations.forEach(operation => {
    hooks[`pre${operation.charAt(0).toUpperCase() + operation.slice(1)}`] = createImmutabilityHook(modelName);
  });

  return hooks;
};

/**
 * Standard immutable operations for audit/security models
 */
export const IMMUTABLE_OPERATIONS = [
  'findOneAndUpdate',
  'updateOne',
  'updateMany',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
] as const;

/**
 * Creates standard immutable hooks for audit/security models
 * @param modelName - Name of the model
 * @returns Hook functions object
 */
export const createStandardImmutableHooks = (modelName: string) => {
  return createImmutableHooks([...IMMUTABLE_OPERATIONS], modelName);
};