import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
  },
  privacyMode: {
    type: Boolean,
    default: false, // false means cloud storage enabled
  },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
