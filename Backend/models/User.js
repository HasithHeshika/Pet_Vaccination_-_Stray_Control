const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, required: true }
  },
  nicNumber: {
    type: String,
    required: true,
    unique: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  role: {
    type: String,
    enum: ['user', 'veterinarian', 'admin'],
    default: 'user'
  },
  vetLicenseNumber: {
    type: String,
    trim: true
  },
  clinicName: {
    type: String,
    trim: true
  },
  oauthAccounts: {
    google: { type: String, trim: true },
    apple: { type: String, trim: true }
  },
  profilePicture: {
    type: String,
    default: '',
    select: false
  },
  // Password reset: only a SHA-256 hash of the emailed token is stored
  passwordResetTokenHash: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  // Login tokens issued before this time are rejected (set when a password is reset)
  passwordChangedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// True if a login token issued at `issuedAtSeconds` predates the last password reset
userSchema.methods.tokenIssuedBeforePasswordChange = function(issuedAtSeconds) {
  if (!this.passwordChangedAt || !issuedAtSeconds) return false;
  // 1 s of slack: a token issued in the same second as the reset is still valid
  return issuedAtSeconds * 1000 < this.passwordChangedAt.getTime() - 1000;
};

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
