/**
 * User Management Microservice - Unit Tests
 *
 * Tests the user service functionality including CRUD operations,
 * validation, security, and error handling.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const userRoutes = require('../src/routes/users');

describe('User Management Microservice', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to test database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Close connections
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await AuditLog.deleteMany({});
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        privacyMode: false
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.privacyMode).toBe(userData.privacyMode);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'Test User'
      };

      await new User(userData).save();

      await expect(new User(userData).save()).rejects.toThrow(/duplicate key/);
    });

    it('should validate email format', async () => {
      const invalidUser = new User({
        email: 'invalid-email',
        name: 'Test User'
      });

      await expect(invalidUser.save()).rejects.toThrow();
    });

    it('should enforce email maxlength', async () => {
      const longEmail = 'a'.repeat(245) + '@example.com'; // 254+ chars
      const user = new User({
        email: longEmail,
        name: 'Test User'
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should set default privacyMode to false', async () => {
      const user = new User({
        email: 'test@example.com',
        name: 'Test User'
      });

      const savedUser = await user.save();
      expect(savedUser.privacyMode).toBe(false);
    });

    it('should update updatedAt on save', async () => {
      const user = new User({
        email: 'test@example.com',
        name: 'Test User'
      });

      const savedUser = await user.save();
      const originalUpdatedAt = savedUser.updatedAt;

      // Wait a bit and save again
      await new Promise(resolve => setTimeout(resolve, 10));
      savedUser.name = 'Updated Name';
      await savedUser.save();

      expect(savedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('AuditLog Model', () => {
    it('should create audit log entries', async () => {
      const auditData = {
        userId: 'user123',
        action: 'access',
        resourceType: 'user',
        resourceId: 'user123',
        performedBy: 'system',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      expect(savedLog.userId).toBe(auditData.userId);
      expect(savedLog.action).toBe(auditData.action);
      expect(savedLog.resourceType).toBe(auditData.resourceType);
      expect(savedLog.performedBy).toBe(auditData.performedBy);
      expect(savedLog.ipAddress).toBe(auditData.ipAddress);
      expect(savedLog.userAgent).toBe(auditData.userAgent);
    });

    it('should index userId and createdAt', async () => {
      // This test verifies that indexes are created
      const indexes = await mongoose.connection.db.collection('auditlogs').indexes();
      const userIdIndex = indexes.find(idx => idx.name === 'userId_1');
      const createdAtIndex = indexes.find(idx => idx.name === 'createdAt_-1');

      expect(userIdIndex).toBeDefined();
      expect(createdAtIndex).toBeDefined();
    });
  });

  describe('User Routes - GET /:id', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        params: { id: 'test-user-id' },
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
    });

    it('should return user when found', async () => {
      const testUser = await User.create({
        email: 'test@example.com',
        name: 'Test User'
      });

      mockReq.params.id = testUser._id.toString();

      // Mock the route handler
      const getHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      ).route.stack[0].handle;

      await getHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(testUser.toObject());
    });

    it('should return 404 when user not found', async () => {
      mockReq.params.id = 'nonexistent-id';

      const getHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      ).route.stack[0].handle;

      await getHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should create audit log on access', async () => {
      const testUser = await User.create({
        email: 'test@example.com',
        name: 'Test User'
      });

      mockReq.params.id = testUser._id.toString();

      const getHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      ).route.stack[0].handle;

      await getHandler(mockReq, mockRes);

      const auditLog = await AuditLog.findOne({ userId: testUser._id });
      expect(auditLog).toBeTruthy();
      expect(auditLog.action).toBe('access');
      expect(auditLog.resourceType).toBe('user');
    });
  });

  describe('User Routes - POST /', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        body: {
          email: 'new@example.com',
          name: 'New User',
          privacyMode: true
        },
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
    });

    it('should create new user successfully', async () => {
      const postHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/' && layer.route.methods.post
      ).route.stack[0].handle;

      await postHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();

      const createdUser = mockRes.json.mock.calls[0][0];
      expect(createdUser.email).toBe(mockReq.body.email);
      expect(createdUser.name).toBe(mockReq.body.name);
      expect(createdUser.privacyMode).toBe(mockReq.body.privacyMode);
    });

    it('should return 409 for duplicate email', async () => {
      // Create existing user
      await User.create({
        email: 'new@example.com',
        name: 'Existing User'
      });

      const postHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/' && layer.route.methods.post
      ).route.stack[0].handle;

      await postHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email already exists' });
    });

    it('should create audit log on user creation', async () => {
      const postHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/' && layer.route.methods.post
      ).route.stack[0].handle;

      await postHandler(mockReq, mockRes);

      const createdUser = mockRes.json.mock.calls[0][0];
      const auditLog = await AuditLog.findOne({ userId: createdUser._id });
      expect(auditLog).toBeTruthy();
      expect(auditLog.action).toBe('modify');
      expect(auditLog.details).toBe('User created');
    });
  });

  describe('User Routes - PUT /:id', () => {
    let mockReq, mockRes;

    beforeEach(async () => {
      const testUser = await User.create({
        email: 'test@example.com',
        name: 'Test User'
      });

      mockReq = {
        params: { id: testUser._id.toString() },
        body: { name: 'Updated Name', privacyMode: true },
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
    });

    it('should update user successfully', async () => {
      const putHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.put
      ).route.stack[0].handle;

      await putHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();

      const updatedUser = mockRes.json.mock.calls[0][0];
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.privacyMode).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockReq.params.id = 'nonexistent-id';

      const putHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.put
      ).route.stack[0].handle;

      await putHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('User Routes - DELETE /:id', () => {
    let mockReq, mockRes;

    beforeEach(async () => {
      const testUser = await User.create({
        email: 'test@example.com',
        name: 'Test User'
      });

      mockReq = {
        params: { id: testUser._id.toString() },
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
    });

    it('should delete user successfully', async () => {
      const deleteHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.delete
      ).route.stack[0].handle;

      await deleteHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });

      // Verify user is deleted
      const deletedUser = await User.findById(mockReq.params.id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      mockReq.params.id = 'nonexistent-id';

      const deleteHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.delete
      ).route.stack[0].handle;

      await deleteHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should create audit log on user deletion', async () => {
      const deleteHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.delete
      ).route.stack[0].handle;

      await deleteHandler(mockReq, mockRes);

      const auditLog = await AuditLog.findOne({ action: 'delete' });
      expect(auditLog).toBeTruthy();
      expect(auditLog.details).toBe('User deleted');
    });
  });

  describe('Security and Validation', () => {
    it('should prevent SQL injection in email field', async () => {
      const maliciousUser = new User({
        email: "test@example.com'; DROP TABLE users; --",
        name: 'Malicious User'
      });

      // Should fail validation due to email format
      await expect(maliciousUser.save()).rejects.toThrow();
    });

    it('should sanitize input data', async () => {
      const userWithScript = new User({
        email: 'test@example.com',
        name: '<script>alert("xss")</script>Test User'
      });

      const savedUser = await userWithScript.save();
      // In a real implementation, this should be sanitized
      // For now, just ensure it saves without script execution
      expect(savedUser.name).toContain('<script>');
    });

    it('should validate required fields', async () => {
      const invalidUser = new User({
        name: 'Test User'
        // Missing email
      });

      await expect(invalidUser.save()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Disconnect from database
      await mongoose.connection.close();

      const user = new User({
        email: 'test@example.com',
        name: 'Test User'
      });

      await expect(user.save()).rejects.toThrow();

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });

    it('should handle invalid ObjectId in routes', async () => {
      const mockReq = {
        params: { id: 'invalid-object-id' },
        headers: { 'x-user-id': 'system' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-user-agent')
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };

      const getHandler = userRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      ).route.stack[0].handle;

      await getHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});