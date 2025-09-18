/**
 * User Model
 *
 * Defines the schema for user data in the database.
 * Handles user authentication and privacy settings.
 */
import mongoose from 'mongoose';

/**
 * User schema definition
 * - email: Unique identifier for the user
 * - name: Optional display name
 * - privacyMode: Controls data storage preferences (false = cloud enabled)
 */
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

/**
 * User model instance
 * Uses existing model if already compiled, otherwise creates new one
 */
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
