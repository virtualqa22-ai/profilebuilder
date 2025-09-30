// File Manager Service for Document Generation
// Handles file operations with security, validation, and error handling

const fs = require('fs').promises;
const path = require('path');
const { validatePath, validateFileSize } = require('../utils/validation');
const { validateFileOperation } = require('../utils/security');
const { createError, ERROR_CODES } = require('../utils/error-handling');
const { info: logInfo, error: logError } = require('../utils/logger');

/**
 * File Manager class for secure file operations
 */
class FileManager {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'output');
    this.ensureOutputDirectory();
  }

  /**
   * Ensures the output directory exists
   * @private
   */
  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (err) {
      logError('Failed to create output directory', { error: err.message });
    }
  }

  /**
   * Saves a document to the file system
   * @param {string} filename - Name of the file
   * @param {Buffer|string} content - File content
   * @param {Object} options - Save options
   * @returns {Promise<string>} Full path to saved file
   */
  async saveDocument(filename, content, options = {}) {
    try {
      // Validate file path
      const validationErrors = validatePath(filename);
      if (validationErrors.length > 0) {
        throw createError(ERROR_CODES.SECURITY_ERROR, validationErrors.join(', '));
      }

      // Validate file operation
      const sanitizedPath = validateFileOperation('write', filename, {
        size: content.length,
      });

      // Determine full path
      const fullPath = options.path
        ? path.join(options.path, sanitizedPath)
        : path.join(this.outputDir, sanitizedPath);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content);

      // Log success
      logInfo('Document saved', {
        filename: fullPath,
        size: content.length,
        type: options.type || 'document',
      });

      return fullPath;

    } catch (err) {
      logError('Document save failed', {
        filename,
        error: err.message,
        size: content ? content.length : 0,
      });

      throw createError(ERROR_CODES.FILE_ERROR, `File save failed: ${err.message}`);
    }
  }

  /**
   * Reads a document from the file system
   * @param {string} filename - Name of the file to read
   * @param {Object} options - Read options
   * @returns {Promise<Buffer|string>} File content
   */
  async readDocument(filename, options = {}) {
    try {
      // Validate file path
      const validationErrors = validatePath(filename);
      if (validationErrors.length > 0) {
        throw createError(ERROR_CODES.SECURITY_ERROR, validationErrors.join(', '));
      }

      // Validate file operation
      const sanitizedPath = validateFileOperation('read', filename);

      // Determine full path
      const fullPath = options.path
        ? path.join(options.path, sanitizedPath)
        : path.join(this.outputDir, sanitizedPath);

      // Read file
      const content = await fs.readFile(fullPath);

      // Validate file size
      if (!validateFileSize(content.length)) {
        throw createError(ERROR_CODES.SECURITY_ERROR, 'File size exceeds limit');
      }

      logInfo('Document read', {
        filename: fullPath,
        size: content.length,
      });

      return options.encoding ? content.toString(options.encoding) : content;

    } catch (err) {
      logError('Document read failed', {
        filename,
        error: err.message,
      });

      throw createError(ERROR_CODES.FILE_ERROR, `File read failed: ${err.message}`);
    }
  }

  /**
   * Deletes a document from the file system
   * @param {string} filename - Name of the file to delete
   * @param {Object} options - Delete options
   * @returns {Promise<boolean>} Success status
   */
  async deleteDocument(filename, options = {}) {
    try {
      // Validate file path
      const validationErrors = validatePath(filename);
      if (validationErrors.length > 0) {
        throw createError(ERROR_CODES.SECURITY_ERROR, validationErrors.join(', '));
      }

      // Determine full path
      const fullPath = options.path
        ? path.join(options.path, filename)
        : path.join(this.outputDir, filename);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        // File doesn't exist, consider it successfully deleted
        return true;
      }

      // Delete file
      await fs.unlink(fullPath);

      logInfo('Document deleted', { filename: fullPath });

      return true;

    } catch (err) {
      logError('Document delete failed', {
        filename,
        error: err.message,
      });

      throw createError(ERROR_CODES.FILE_ERROR, `File delete failed: ${err.message}`);
    }
  }

  /**
   * Lists documents in a directory
   * @param {string} dirPath - Directory path (optional, defaults to output dir)
   * @param {Object} options - List options
   * @returns {Promise<string[]>} Array of filenames
   */
  async listDocuments(dirPath = '', options = {}) {
    try {
      const targetDir = dirPath ? path.join(this.outputDir, dirPath) : this.outputDir;

      // Validate directory path
      if (dirPath) {
        const validationErrors = validatePath(dirPath);
        if (validationErrors.length > 0) {
          throw createError(ERROR_CODES.SECURITY_ERROR, validationErrors.join(', '));
        }
      }

      const files = await fs.readdir(targetDir);

      // Filter by extension if specified
      let filteredFiles = files;
      if (options.extension) {
        filteredFiles = files.filter(file => file.endsWith(`.${options.extension}`));
      }

      // Filter by pattern if specified
      if (options.pattern) {
        const regex = new RegExp(options.pattern);
        filteredFiles = filteredFiles.filter(file => regex.test(file));
      }

      logInfo('Documents listed', {
        directory: targetDir,
        count: filteredFiles.length,
      });

      return filteredFiles;

    } catch (err) {
      logError('Document listing failed', {
        directory: dirPath,
        error: err.message,
      });

      throw createError(ERROR_CODES.FILE_ERROR, `Directory listing failed: ${err.message}`);
    }
  }

  /**
   * Gets file metadata
   * @param {string} filename - Name of the file
   * @param {Object} options - Options
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(filename, options = {}) {
    try {
      // Validate file path
      const validationErrors = validatePath(filename);
      if (validationErrors.length > 0) {
        throw createError(ERROR_CODES.SECURITY_ERROR, validationErrors.join(', '));
      }

      // Determine full path
      const fullPath = options.path
        ? path.join(options.path, filename)
        : path.join(this.outputDir, filename);

      const stats = await fs.stat(fullPath);

      const metadata = {
        filename,
        fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };

      return metadata;

    } catch (err) {
      logError('File metadata retrieval failed', {
        filename,
        error: err.message,
      });

      throw createError(ERROR_CODES.FILE_ERROR, `Metadata retrieval failed: ${err.message}`);
    }
  }

  /**
   * Cleans up old files based on age
   * @param {number} maxAgeDays - Maximum age in days
   * @param {Object} options - Cleanup options
   * @returns {Promise<number>} Number of files cleaned up
   */
  async cleanupOldFiles(maxAgeDays = 30, options = {}) {
    try {
      const files = await this.listDocuments('', options);
      let cleanedCount = 0;

      for (const file of files) {
        try {
          const metadata = await this.getFileMetadata(file, options);

          if (metadata.isFile) {
            const ageDays = (Date.now() - metadata.modified.getTime()) / (1000 * 60 * 60 * 24);

            if (ageDays > maxAgeDays) {
              await this.deleteDocument(file, options);
              cleanedCount++;
            }
          }
        } catch (err) {
          // Continue with other files if one fails
          logError('Error cleaning up file', { file, error: err.message });
        }
      }

      logInfo('File cleanup completed', { cleanedCount, maxAgeDays });

      return cleanedCount;

    } catch (err) {
      logError('File cleanup failed', { error: err.message });
      throw createError(ERROR_CODES.FILE_ERROR, `Cleanup failed: ${err.message}`);
    }
  }
}

module.exports = FileManager;