import mongoose from 'mongoose';

const LocaleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this locale.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  code: {
    type: String,
    required: [true, 'Please provide a code for this locale.'],
    maxlength: [10, 'Code cannot be more than 10 characters'],
    unique: true,
  },
});

export default mongoose.models.Locale || mongoose.model('Locale', LocaleSchema);
