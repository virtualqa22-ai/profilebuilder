import mongoose from 'mongoose';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

const encrypt = (text: string) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

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

// Encrypt sensitive fields before saving
ResumeSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.content = encrypt(this.content);
  }
  if (this.isModified('photos') && this.photos) {
    this.photos = encrypt(this.photos);
  }
  if (this.isModified('certifications') && this.certifications) {
    this.certifications = encrypt(this.certifications);
  }
  if (this.isModified('hobbies') && this.hobbies) {
    this.hobbies = encrypt(this.hobbies);
  }
  if (this.isModified('references') && this.references) {
    this.references = encrypt(this.references);
  }
  next();
});

// Decrypt sensitive fields after finding
ResumeSchema.post('find', function(docs) {
  docs.forEach(doc => {
    if (doc.content) {
      doc.content = decrypt(doc.content);
    }
    if (doc.photos) {
      doc.photos = decrypt(doc.photos);
    }
    if (doc.certifications) {
      doc.certifications = decrypt(doc.certifications);
    }
    if (doc.hobbies) {
      doc.hobbies = decrypt(doc.hobbies);
    }
    if (doc.references) {
      doc.references = decrypt(doc.references);
    }
  });
});

ResumeSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.content) {
      doc.content = decrypt(doc.content);
    }
    if (doc.photos) {
      doc.photos = decrypt(doc.photos);
    }
    if (doc.certifications) {
      doc.certifications = decrypt(doc.certifications);
    }
    if (doc.hobbies) {
      doc.hobbies = decrypt(doc.hobbies);
    }
    if (doc.references) {
      doc.references = decrypt(doc.references);
    }
  }
});

const Resume = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

export default Resume;
