const express = require('express');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const router = express.Router();

// GET /users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log access
    await AuditLog.create({
      userId: req.params.id,
      action: 'access',
      resourceType: 'user',
      resourceId: req.params.id,
      performedBy: req.headers['x-user-id'] || 'system',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users - Create new user
router.post('/', async (req, res) => {
  try {
    const { email, name, privacyMode } = req.body;

    const user = new User({ email, name, privacyMode });
    await user.save();

    // Log creation
    await AuditLog.create({
      userId: user._id,
      action: 'modify',
      resourceType: 'user',
      resourceId: user._id.toString(),
      performedBy: req.headers['x-user-id'] || 'system',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: 'User created'
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log modification
    await AuditLog.create({
      userId: req.params.id,
      action: 'modify',
      resourceType: 'user',
      resourceId: req.params.id,
      performedBy: req.headers['x-user-id'] || 'system',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: 'User updated'
    });

    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /users/:id - Delete user (GDPR compliance)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log deletion
    await AuditLog.create({
      userId: req.params.id,
      action: 'delete',
      resourceType: 'user',
      resourceId: req.params.id,
      performedBy: req.headers['x-user-id'] || 'system',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: 'User deleted'
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;