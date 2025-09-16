import mongoose from 'mongoose';

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

const Resume = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

export default Resume;