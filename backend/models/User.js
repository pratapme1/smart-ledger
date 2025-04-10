// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    // Only require password for local strategy users (not social login)
    required: function() {
      return !this.googleId && !this.githubId;
    }
  },
  googleId: {
    type: String
  },
  githubId: {
    type: String
  },
  avatar: {
    type: String
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's been modified (or is new) and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    console.log('Hashing password in pre-save hook');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    console.error('Error hashing password:', err);
    next(err);
  }
});

module.exports = mongoose.model('User', UserSchema);