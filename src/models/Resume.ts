import mongoose from 'mongoose';

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
}, { timestamps: true });

const Resume = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

export default Resume;