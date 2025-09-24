const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    encrypted: true
  },
  locale: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  photos: {
    type: String,
    encrypted: true
  },
  certifications: {
    type: String,
    encrypted: true
  },
  hobbies: {
    type: String,
    encrypted: true
  },
  references: {
    type: String,
    encrypted: true
  },
  comments: [{
    field: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    author: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
resumeSchema.index({ userId: 1 });
resumeSchema.index({ locale: 1 });
resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ updatedAt: -1 });
resumeSchema.index({ locale: 1, createdAt: -1 });

// Pre-save
resumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);