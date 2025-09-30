/**
 * Integration Tests for Resume API Routes
 *
 * Tests resume CRUD operations, authentication, validation, and caching.
 */

/// <reference types="jest" />

import { NextRequest } from 'next/server';
import { GET, POST } from '../../../api/resumes/route';
import { GET as GET_BY_ID, PUT, DELETE as DELETE_BY_ID } from '../../../api/resumes/[id]/route';

// Mock all dependencies
jest.mock('../../../backend/dbConnect');
jest.mock('../../../backend/models/Resume');
jest.mock('next-auth');
jest.mock('../../../backend/lib/localeService');
jest.mock('../../../backend/lib/validations');
jest.mock('../../../backend/lib/messages');
jest.mock('../../../backend/lib/constants');
jest.mock('../../../backend/lib/errorHandler');
jest.mock('../../../backend/lib/cacheManager');
jest.mock('../../../backend/lib/auth');

describe('Resume API Routes', () => {
  let mockDbConnect: jest.Mock;
  let mockResumeModel: any;
  let mockUserModel: any;
  let mockRequireAuth: jest.Mock;
  let mockGetLocaleByCode: jest.Mock;
  let mockValidateResumeModelData: jest.Mock;
  let mockGetCacheManager: jest.Mock;
  let mockCacheManager: any;
  let mockApplySecurityHeaders: jest.Mock;
  let mockCreateErrorResponse: jest.Mock;
  let mockHandleDatabaseError: jest.Mock;
  let mockHandleValidationError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get all mocks
    mockDbConnect = require('../../../backend/dbConnect');
    mockResumeModel = require('../../../backend/models/Resume').default;
    mockUserModel = mongoose.model('User');
    mockRequireAuth = require('../../../backend/lib/auth').requireAuth;
    mockGetLocaleByCode = require('../../../backend/lib/localeService').getLocaleByCode;
    mockValidateResumeModelData = require('../../../backend/lib/validations').validateResumeModelData;
    mockGetCacheManager = require('../../../backend/lib/cacheManager').getCacheManager;
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      invalidatePattern: jest.fn(),
      delete: jest.fn(),
    };
    mockGetCacheManager.mockReturnValue(mockCacheManager);
    mockApplySecurityHeaders = require('../../../backend/lib/errorHandler').applySecurityHeaders;
    mockCreateErrorResponse = require('../../../backend/lib/errorHandler').createErrorResponse;
    mockHandleDatabaseError = require('../../../backend/lib/errorHandler').handleDatabaseError;
    mockHandleValidationError = require('../../../backend/lib/errorHandler').handleValidationError;

    // Setup default mocks
    mockDbConnect.mockResolvedValue(undefined);
    mockRequireAuth.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockGetLocaleByCode.mockReturnValue({ code: 'en-US', name: 'English (US)' });
    mockValidateResumeModelData.mockReturnValue({});
    mockApplySecurityHeaders.mockImplementation((res) => res);
    mockCreateErrorResponse.mockReturnValue(new Response('Error', { status: 400 }));
    mockHandleDatabaseError.mockImplementation((error) => new Response('DB Error', { status: 500 }));
    mockHandleValidationError.mockImplementation((errors) => new Response('Validation Error', { status: 400 }));

    // Mock mongoose models
    const mongoose = require('mongoose');
    mockUserModel = {
      findOne: jest.fn(),
    };
    mongoose.model = jest.fn((name) => {
      if (name === 'User') return mockUserModel;
      if (name === 'Resume') return mockResumeModel;
      return {};
    });

    // Mock Resume model
    mockResumeModel.create = jest.fn();
    mockResumeModel.find = jest.fn();
    mockResumeModel.findById = jest.fn();
    mockResumeModel.findByIdAndUpdate = jest.fn();
    mockResumeModel.findOneAndUpdate = jest.fn();
    mockResumeModel.deleteOne = jest.fn();
    mockResumeModel.countDocuments = jest.fn();
  });

  describe('GET /api/resumes (List Resumes)', () => {
    it('should return paginated resumes for authenticated user', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResumes = [
        { _id: 'resume1', title: 'Resume 1', content: 'Content 1', locale: 'en-US', userId: 'user123' },
        { _id: 'resume2', title: 'Resume 2', content: 'Content 2', locale: 'en-US', userId: 'user123' },
      ];

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null); // Cache miss
      mockResumeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockResumes),
          }),
        }),
      });
      mockResumeModel.countDocuments.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/resumes?page=1&limit=10');
      const response = await GET(request);

      expect(mockRequireAuth).toHaveBeenCalledWith(request);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockResumeModel.find).toHaveBeenCalledWith({ userId: mockUser._id });
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should return cached results when available', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const cachedResult = {
        success: true,
        data: [{ _id: 'resume1', title: 'Resume 1' }],
        pagination: { page: 1, total: 1, pages: 1 },
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const request = new NextRequest('http://localhost:3000/api/resumes');
      const response = await GET(request);

      expect(mockResumeModel.find).not.toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should filter by locale', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResumes = [{ _id: 'resume1', title: 'Resume 1', locale: 'en-GB', userId: 'user123' }];

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);
      mockResumeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockResumes),
          }),
        }),
      });
      mockResumeModel.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/resumes?locale=en-GB');
      const response = await GET(request);

      expect(mockResumeModel.find).toHaveBeenCalledWith({ userId: mockUser._id, locale: 'en-GB' });
      expect(response.status).toBe(200);
    });

    it('should exclude content fields when includeContent=false', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResumes = [{ _id: 'resume1', title: 'Resume 1', userId: 'user123' }];

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);
      mockResumeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockResumes),
          }),
        }),
      });
      mockResumeModel.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/resumes?includeContent=false');
      const response = await GET(request);

      expect(mockResumeModel.find).toHaveBeenCalledWith(
        { userId: mockUser._id },
        { content: 0, photos: 0, certifications: 0, hobbies: 0, references: 0 }
      );
    });

    it('should handle pagination parameters', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResumes = [{ _id: 'resume1', title: 'Resume 1', userId: 'user123' }];

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue(null);
      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockResumes),
          }),
        }),
      };
      mockResumeModel.find.mockReturnValue(mockQuery);
      mockResumeModel.countDocuments.mockResolvedValue(25);

      const request = new NextRequest('http://localhost:3000/api/resumes?page=2&limit=10&sortBy=updatedAt&sortOrder=desc');
      const response = await GET(request);

      expect(mockQuery.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(response.status).toBe(200);
    });

    it('should handle unauthenticated requests', async () => {
      mockRequireAuth.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      const request = new NextRequest('http://localhost:3000/api/resumes');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/resumes');
      const response = await GET(request);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('User not found', 404, expect.any(String));
    });

    it('should handle database errors', async () => {
      mockUserModel.findOne.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/resumes');
      const response = await GET(request);

      expect(mockHandleDatabaseError).toHaveBeenCalled();
    });
  });

  describe('POST /api/resumes (Create Resume)', () => {
    it('should create a new resume successfully', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const resumeData = {
        title: 'New Resume',
        content: 'Resume content',
        locale: 'en-US',
      };
      const createdResume = { ...resumeData, _id: 'new123', userId: 'user123', version: 1 };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.create.mockResolvedValue(createdResume);

      const request = new NextRequest('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: JSON.stringify(resumeData),
      });
      const response = await POST(request);

      expect(mockValidateResumeModelData).toHaveBeenCalledWith({ ...resumeData, locale: 'en-US' });
      expect(mockResumeModel.create).toHaveBeenCalledWith({ ...resumeData, locale: 'en-US', userId: mockUser._id });
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('should use default locale when not provided', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const resumeData = {
        title: 'New Resume',
        content: 'Resume content',
      };
      const createdResume = { ...resumeData, locale: 'en-US', _id: 'new123', userId: 'user123', version: 1 };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.create.mockResolvedValue(createdResume);

      const request = new NextRequest('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: JSON.stringify(resumeData),
      });
      const response = await POST(request);

      expect(mockResumeModel.create).toHaveBeenCalledWith({ ...resumeData, locale: 'en-US', userId: mockUser._id });
      expect(response.status).toBe(201);
    });

    it('should handle validation errors', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const validationErrors = { title: 'Title is required' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockValidateResumeModelData.mockReturnValue(validationErrors);

      const request = new NextRequest('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Content only' }),
      });
      const response = await POST(request);

      expect(mockHandleValidationError).toHaveBeenCalledWith(validationErrors);
    });

    it('should handle invalid locale', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockGetLocaleByCode.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', content: 'Content', locale: 'invalid' }),
      });
      const response = await POST(request);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('Invalid locale provided', 400, expect.any(String));
    });

    it('should handle unauthenticated requests', async () => {
      mockRequireAuth.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      const request = new NextRequest('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', content: 'Content' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/resumes/[id] (Get Resume by ID)', () => {
    it('should return resume when found and user owns it', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResume = {
        _id: 'resume123',
        title: 'Test Resume',
        content: 'Resume content',
        userId: 'user123',
        toObject: () => mockResume,
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(mockResume);

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123');
      const response = await GET_BY_ID(request, { params: { id: 'resume123' } });

      expect(mockResumeModel.findById).toHaveBeenCalledWith('resume123');
      expect(response.status).toBe(200);
    });

    it('should exclude content fields when includeContent=false', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResume = {
        _id: 'resume123',
        title: 'Test Resume',
        userId: 'user123',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValueOnce(mockResume); // First call for existence check
      mockResumeModel.findById.mockResolvedValueOnce(mockResume); // Second call with projection

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123?includeContent=false');
      const response = await GET_BY_ID(request, { params: { id: 'resume123' } });

      expect(mockResumeModel.findById).toHaveBeenCalledWith('resume123', {
        content: 0, photos: 0, certifications: 0, hobbies: 0, references: 0
      });
    });

    it('should return 404 when resume not found', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/resumes/nonexistent');
      const response = await GET_BY_ID(request, { params: { id: 'nonexistent' } });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('Resume not found', 404, expect.any(String));
    });

    it('should return 403 when user does not own resume', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResume = {
        _id: 'resume123',
        title: 'Test Resume',
        userId: 'differentUser', // Different user
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(mockResume);

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123');
      const response = await GET_BY_ID(request, { params: { id: 'resume123' } });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('Access denied: Resume does not belong to user', 403, expect.any(String));
    });
  });

  describe('PUT /api/resumes/[id] (Update Resume)', () => {
    it('should update resume successfully', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const existingResume = {
        _id: 'resume123',
        title: 'Old Title',
        content: 'Old content',
        locale: 'en-US',
        userId: 'user123',
        version: 1,
      };
      const updateData = {
        title: 'New Title',
        content: 'New content',
      };
      const updatedResume = { ...existingResume, ...updateData, version: 2 };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(existingResume);
      mockResumeModel.findOneAndUpdate.mockResolvedValue(updatedResume);

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      const response = await PUT(request, { params: { id: 'resume123' } });

      expect(mockResumeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'resume123', userId: mockUser._id },
        { ...updateData, $inc: { version: 1 } },
        { new: true, runValidators: true }
      );
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalled();
      expect(mockCacheManager.delete).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should use existing locale when not provided in update', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const existingResume = {
        _id: 'resume123',
        title: 'Old Title',
        locale: 'en-GB',
        userId: 'user123',
        version: 1,
      };
      const updateData = { title: 'New Title' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(existingResume);
      mockValidateResumeModelData.mockReturnValue({});

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      const response = await PUT(request, { params: { id: 'resume123' } });

      expect(mockValidateResumeModelData).toHaveBeenCalledWith({ ...updateData, locale: 'en-GB' });
    });

    it('should handle validation errors on update', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const existingResume = {
        _id: 'resume123',
        title: 'Old Title',
        locale: 'en-US',
        userId: 'user123',
      };
      const validationErrors = { title: 'Title too long' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(existingResume);
      mockValidateResumeModelData.mockReturnValue(validationErrors);

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123', {
        method: 'PUT',
        body: JSON.stringify({ title: 'A'.repeat(200) }),
      });
      const response = await PUT(request, { params: { id: 'resume123' } });

      expect(mockHandleValidationError).toHaveBeenCalledWith(validationErrors);
    });
  });

  describe('DELETE /api/resumes/[id] (Delete Resume)', () => {
    it('should delete resume successfully', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResume = {
        _id: 'resume123',
        title: 'Test Resume',
        userId: 'user123',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(mockResume);
      mockResumeModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123', {
        method: 'DELETE',
      });
      const response = await DELETE_BY_ID(request, { params: { id: 'resume123' } });

      expect(mockResumeModel.deleteOne).toHaveBeenCalledWith({ _id: 'resume123', userId: mockUser._id });
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalled();
      expect(mockCacheManager.delete).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should return 404 when resume not found for deletion', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/resumes/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE_BY_ID(request, { params: { id: 'nonexistent' } });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('Resume not found', 404, expect.any(String));
    });

    it('should return 404 when delete operation affects no documents', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockResume = {
        _id: 'resume123',
        title: 'Test Resume',
        userId: 'user123',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockResolvedValue(mockResume);
      mockResumeModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const request = new NextRequest('http://localhost:3000/api/resumes/resume123', {
        method: 'DELETE',
      });
      const response = await DELETE_BY_ID(request, { params: { id: 'resume123' } });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('Resume not found', 404, expect.any(String));
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDbConnect.mockRejectedValue(new Error('Connection failed'));

      const request = new NextRequest('http://localhost:3000/api/resumes');
      const response = await GET(request);

      expect(mockHandleDatabaseError).toHaveBeenCalled();
    });

    it('should handle JSON parsing errors in POST', async () => {
      const request = new NextRequest('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: 'invalid json',
      });

      await expect(POST(request)).rejects.toThrow();
    });

    it('should handle invalid ObjectId in GET by ID', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockResumeModel.findById.mockRejectedValue(new Error('Invalid ObjectId'));

      const request = new NextRequest('http://localhost:3000/api/resumes/invalid-id');
      const response = await GET_BY_ID(request, { params: { id: 'invalid-id' } });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to retrieve resume: Invalid ObjectId',
        500,
        expect.any(String)
      );
    });
  });
});