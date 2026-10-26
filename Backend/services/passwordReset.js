const crypto = require('crypto');
const User = require('../models/User');
const { getFrontendUrl } = require('../utils/frontendUrl');
const { sendPasswordResetEmail } = require('./notificationService');

const RESET_TOKEN_TTL_MINUTES = 30;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Creates a one-time reset token for the user and emails them the link.
// Only the hash of the token is stored, so a database leak can't be used to reset passwords.
const createAndSendPasswordReset = async (user, { requestedByAdmin = false } = {}) => {
  const token = crypto.randomBytes(32).toString('hex');

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)
      }
    }
  );

  const resetLink = `${getFrontendUrl()}/reset-password/${token}`;
  return sendPasswordResetEmail(user.email, user.fullName, resetLink, {
    expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    requestedByAdmin
  });
};

// Sets a new password if the token is valid and unexpired. Returns the user, or null.
const resetPasswordWithToken = async (token, newPassword) => {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(String(token || '')),
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) return null;

  user.password = newPassword;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();
  await user.save();
  return user;
};

module.exports = {
  RESET_TOKEN_TTL_MINUTES,
  hashToken,
  createAndSendPasswordReset,
  resetPasswordWithToken
};
