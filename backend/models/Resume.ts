import mongoose from 'mongoose';
import { encrypt, decrypt } from '../lib/encryption';

/**
 * Type definitions for Resume
 */
interface IComment {
  field: string;
  text: string;
  author: string;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IResume {
  title: string;
  content: string;
  locale: string;
  version: number;
  photos?: string;
  certifications?: string;
  hobbies?: string;
  references?: string;
  comments: IComment[];
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type { IComment, IResume };

// Define sensitive fields that require encryption/decryption
const sensitiveFields = ['content', 'photos', 'certifications', 'hobbies', 'references'];

// Helper function to encrypt sensitive fields in a document or update object
function encryptFields(obj: any) {
  sensitiveFields.forEach(field => {
    if (obj[field]) {
      obj[field] = encrypt(obj[field]);
    }
  });
}

// Helper function to decrypt sensitive fields in a document
function decryptFields(doc: any) {
  if (!doc) return;
  sensitiveFields.forEach(field => {
    if (doc[field]) {
      doc[field] = decrypt(doc[field]);
    }
  });
}

// Helper function to decrypt fields in an array of documents
function decryptFieldsInArray(docs: any[]) {
  docs.forEach(doc => decryptFields(doc));
}

const CommentSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const ResumeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for this resume.'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  content: {
    type: String,
    required: [true, 'Please provide content for this resume.'],
  },
  locale: {
    type: String,
    required: [true, 'Please specify a locale for this resume.'],
  },
  version: {
    type: Number,
    default: 1,
  },
  photos: { // New optional field
    type: String,
  },
  certifications: { // New optional field
    type: String,
  },
  hobbies: { // New optional field
    type: String,
  },
  references: { // New optional field
    type: String,
  },
  comments: [CommentSchema],
}, { timestamps: true });

// Add database indexes for query optimization
// Index on locale for filtering resumes by locale
ResumeSchema.index({ locale: 1 });

// Index on createdAt for sorting by creation date (descending for recent first)
ResumeSchema.index({ createdAt: -1 });

// Index on updatedAt for sorting by last modification
ResumeSchema.index({ updatedAt: -1 });

// Compound index for locale + createdAt for efficient filtering and sorting
ResumeSchema.index({ locale: 1, createdAt: -1 });

// Encrypt sensitive fields before saving
ResumeSchema.pre('save', function(next) {
  sensitiveFields.forEach(field => {
    if (this.isModified(field)) {
      this[field] = encrypt(this[field]);
    }
  });
  next();
});

// Encrypt sensitive fields before updating
ResumeSchema.pre('updateOne', function(next) {
  const update = this.getUpdate() as any;
  if (update && typeof update === 'object') {
    if (update.$set) {
      encryptFields(update.$set);
    }
    encryptFields(update);
  }
  next();
});

ResumeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update && typeof update === 'object') {
    if (update.$set) {
      encryptFields(update.$set);
    }
    encryptFields(update);
  }
  next();
});

ResumeSchema.pre('findOneAndReplace', function(next) {
  const replacement = this.getUpdate() as any;
  encryptFields(replacement);
  next();
});

ResumeSchema.pre('updateMany', function(next) {
  const update = this.getUpdate() as any;
  if (update && typeof update === 'object') {
    if (update.$set) {
      encryptFields(update.$set);
    }
    encryptFields(update);
  }
  next();
});

// Decrypt sensitive fields after finding
ResumeSchema.post('find', function(docs) {
  decryptFieldsInArray(docs);
});

ResumeSchema.post('findOne', function(doc) {
  decryptFields(doc);
});

ResumeSchema.post('findOneAndUpdate', function(doc) {
  decryptFields(doc);
});

ResumeSchema.post('findOneAndReplace', function(doc) {
  decryptFields(doc);
});

ResumeSchema.post('findOneAndDelete', function(doc) {
  decryptFields(doc);
});

const Resume = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

export default Resume;
