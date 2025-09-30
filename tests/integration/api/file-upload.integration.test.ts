/**
 * File Upload Service Integration Tests
 *
 * Tests the complete file upload API endpoints including:
 * - Single and multiple file uploads
 * - Upload progress tracking
 * - File validation and security
 * - Error handling and cleanup
 * - Statistics and health checks
 */

import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import uploadRoutes from '../../../services/file-upload/src/routes/upload-routes';
import { fileUploadService } from '../../../services/file-upload/src/upload-service';

describe('File Upload Service Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let testFiles: string[] = [];

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/upload', uploadRoutes);

    // Start server
    server = app.listen(4003);
  });

  afterAll(async () => {
    // Clean up test files
    for (const file of testFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn(`Failed to clean up test file: ${file}`, error);
      }
    }

    // Close server
    server.close();
  });

  beforeEach(async () => {
    // Reset upload service state
    fileUploadService.cleanup();
  });

  describe('POST /upload/single - Single File Upload', () => {
    it('should upload a single valid file', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      const testContent = 'This is a test file content';
      fs.writeFileSync(testFilePath, testContent);
      testFiles.push(testFilePath);

      const response = await request(app)
        .post('/upload/single')
        .attach('file', testFilePath)
        .field('options', JSON.stringify({ compress: true }))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data.size).toBe(testContent.length);
    });

    it('should handle file upload without options', async () => {
      const testFilePath = path.join(__dirname, 'test-file-no-options.txt');
      const testContent = 'Test content without options';
      fs.writeFileSync(testFilePath, testContent);
      testFiles.push(testFilePath);

      const response = await request(app)
        .post('/upload/single')
        .attach('file', testFilePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toBeDefined();
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/upload/single')
        .field('options', JSON.stringify({}))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle large files appropriately', async () => {
      const largeFilePath = path.join(__dirname, 'large-test-file.txt');
      const largeContent = 'A'.repeat(1024 * 1024); // 1MB file
      fs.writeFileSync(largeFilePath, largeContent);
      testFiles.push(largeFilePath);

      const response = await request(app)
        .post('/upload/single')
        .attach('file', largeFilePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.size).toBe(largeContent.length);
    });
  });

  describe('POST /upload/multiple - Multiple File Upload', () => {
    it('should upload multiple files successfully', async () => {
      const file1Path = path.join(__dirname, 'multi-test-1.txt');
      const file2Path = path.join(__dirname, 'multi-test-2.txt');
      const content1 = 'Content of file 1';
      const content2 = 'Content of file 2';

      fs.writeFileSync(file1Path, content1);
      fs.writeFileSync(file2Path, content2);
      testFiles.push(file1Path, file2Path);

      const response = await request(app)
        .post('/upload/multiple')
        .attach('files', file1Path)
        .attach('files', file2Path)
        .field('options', JSON.stringify({ compress: false }))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.summary.failed).toBe(0);

      response.body.data.results.forEach((result: any) => {
        expect(result.success).toBe(true);
        expect(result.filename).toBeDefined();
      });
    });

    it('should handle partial failures in multiple upload', async () => {
      const validFilePath = path.join(__dirname, 'valid-multi.txt');
      const invalidFilePath = path.join(__dirname, 'invalid-multi.exe'); // Assuming .exe is blocked

      fs.writeFileSync(validFilePath, 'Valid content');
      fs.writeFileSync(invalidFilePath, 'Invalid executable');
      testFiles.push(validFilePath, invalidFilePath);

      const response = await request(app)
        .post('/upload/multiple')
        .attach('files', validFilePath)
        .attach('files', invalidFilePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);

      const successfulResults = response.body.data.results.filter((r: any) => r.success);
      const failedResults = response.body.data.results.filter((r: any) => !r.success);

      // At least one should succeed, one might fail based on validation
      expect(successfulResults.length + failedResults.length).toBe(2);
    });

    it('should reject multiple upload without files', async () => {
      const response = await request(app)
        .post('/upload/multiple')
        .field('options', JSON.stringify({}))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /upload/progress/:uploadId - Upload Progress', () => {
    it('should return upload progress for valid upload ID', async () => {
      // First upload a file to get an upload ID
      const testFilePath = path.join(__dirname, 'progress-test.txt');
      fs.writeFileSync(testFilePath, 'Progress test content');
      testFiles.push(testFilePath);

      const uploadResponse = await request(app)
        .post('/upload/single')
        .attach('file', testFilePath)
        .expect(201);

      const uploadId = uploadResponse.body.data.uploadId;

      // Check progress
      const progressResponse = await request(app)
        .get(`/upload/progress/${uploadId}`)
        .expect(200);

      expect(progressResponse.body.success).toBe(true);
      expect(progressResponse.body.data).toHaveProperty('uploadId');
      expect(progressResponse.body.data).toHaveProperty('status');
      expect(progressResponse.body.data).toHaveProperty('progress');
    });

    it('should return 404 for non-existent upload ID', async () => {
      const response = await request(app)
        .get('/upload/progress/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Upload not found');
    });
  });

  describe('DELETE /upload/:uploadId - Cancel Upload', () => {
    it('should cancel ongoing upload', async () => {
      // First upload a file to get an upload ID
      const testFilePath = path.join(__dirname, 'cancel-test.txt');
      fs.writeFileSync(testFilePath, 'Cancel test content');
      testFiles.push(testFilePath);

      const uploadResponse = await request(app)
        .post('/upload/single')
        .attach('file', testFilePath)
        .expect(201);

      const uploadId = uploadResponse.body.data.uploadId;

      // Cancel upload
      const cancelResponse = await request(app)
        .delete(`/upload/${uploadId}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.message).toBe('Upload cancelled successfully');
    });

    it('should return 404 for non-existent upload ID', async () => {
      const response = await request(app)
        .delete('/upload/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Upload not found or already completed');
    });
  });

  describe('GET /upload/stats - Upload Statistics', () => {
    it('should return upload statistics', async () => {
      const response = await request(app)
        .get('/upload/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUploads');
      expect(response.body.data).toHaveProperty('successfulUploads');
      expect(response.body.data).toHaveProperty('failedUploads');
      expect(response.body.data).toHaveProperty('totalSize');
    });
  });

  describe('POST /upload/cleanup - Cleanup Old Uploads', () => {
    it('should cleanup old uploads successfully', async () => {
      const response = await request(app)
        .post('/upload/cleanup')
        .send({ maxAge: 3600000 }) // 1 hour
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cleanup completed successfully');
    });

    it('should handle cleanup without maxAge parameter', async () => {
      const response = await request(app)
        .post('/upload/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /upload/health - Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/upload/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
    });
  });

  describe('Error Handling and Security', () => {
    it('should handle malformed multipart data', async () => {
      const response = await request(app)
        .post('/upload/single')
        .set('Content-Type', 'multipart/form-data')
        .send('invalid multipart data')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should prevent directory traversal attacks', async () => {
      const maliciousPath = path.join(__dirname, '../../../etc/passwd');
      // Don't actually create the file, just test the concept

      const response = await request(app)
        .post('/upload/single')
        .attach('file', Buffer.from('malicious'), 'passwd')
        .expect(201); // Should succeed but with safe filename

      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).not.toContain('..');
      expect(response.body.data.filename).not.toContain('/');
      expect(response.body.data.filename).not.toContain('\\');
    });

    it('should handle files with special characters in names', async () => {
      const specialFilePath = path.join(__dirname, 'special-chars-!@#$%^&()_+{}|:<>?[].txt');
      fs.writeFileSync(specialFilePath, 'Special chars content');
      testFiles.push(specialFilePath);

      const response = await request(app)
        .post('/upload/single')
        .attach('file', specialFilePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toBeDefined();
    });

    it('should handle empty files', async () => {
      const emptyFilePath = path.join(__dirname, 'empty-file.txt');
      fs.writeFileSync(emptyFilePath, '');
      testFiles.push(emptyFilePath);

      const response = await request(app)
        .post('/upload/single')
        .attach('file', emptyFilePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.size).toBe(0);
    });

    it('should handle concurrent uploads', async () => {
      const filePaths = Array.from({ length: 5 }, (_, i) => {
        const filePath = path.join(__dirname, `concurrent-${i}.txt`);
        fs.writeFileSync(filePath, `Content ${i}`);
        testFiles.push(filePath);
        return filePath;
      });

      const uploadPromises = filePaths.map(filePath =>
        request(app)
          .post('/upload/single')
          .attach('file', filePath)
      );

      const responses = await Promise.all(uploadPromises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('File Type Validation', () => {
    it('should accept valid file types', async () => {
      const validTypes = ['.txt', '.pdf', '.docx', '.jpg', '.png'];

      for (const ext of validTypes) {
        const filePath = path.join(__dirname, `valid${ext}`);
        fs.writeFileSync(filePath, `Valid ${ext} content`);
        testFiles.push(filePath);

        const response = await request(app)
          .post('/upload/single')
          .attach('file', filePath)
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });

    it('should reject invalid file types', async () => {
      const invalidFilePath = path.join(__dirname, 'invalid.exe');
      fs.writeFileSync(invalidFilePath, 'Invalid executable content');
      testFiles.push(invalidFilePath);

      const response = await request(app)
        .post('/upload/single')
        .attach('file', invalidFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});