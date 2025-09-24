const mongoose = require('mongoose');

const resumeTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  structure: {
    type: Object,
    required: true
  },
  locale: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
resumeTemplateSchema.index({ name: 1 }, { unique: true });
resumeTemplateSchema.index({ locale: 1 });
resumeTemplateSchema.index({ isActive: 1 });

// Pre-save
resumeTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ResumeTemplate', resumeTemplateSchema);