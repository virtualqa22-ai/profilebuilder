const express = require('express');
const Resume = require('../models/Resume');
const logger = require('../utils/logger');

const router = express.Router();

// GET /resumes/:id - Get resume by ID
router.get('/:id', async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(resume);
  } catch (error) {
    logger.error('Error fetching resume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /resumes/user/:userId - Get resumes by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.params.userId });
    res.json(resumes);
  } catch (error) {
    logger.error('Error fetching user resumes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /resumes - Create new resume
router.post('/', async (req, res) => {
  try {
    const { userId, title, content, locale, photos, certifications, hobbies, references } = req.body;
    const resume = new Resume({ userId, title, content, locale, photos, certifications, hobbies, references });
    await resume.save();
    res.status(201).json(resume);
  } catch (error) {
    logger.error('Error creating resume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /resumes/:id - Update resume
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const resume = await Resume.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(resume);
  } catch (error) {
    logger.error('Error updating resume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /resumes/:id - Delete resume
router.delete('/:id', async (req, res) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    logger.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;