const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Pet = require('../models/Pet');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const jwt = require('jsonwebtoken');
const { createAndSendPasswordReset } = require('../services/passwordReset');

// Optional text field: isString() first, so objects such as {"$gt": ""} are refused with 400
const textField = (field, message) => body(field).optional().isString().withMessage(message).bail().trim().notEmpty().withMessage(message);

const MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024;
const PROFILE_PICTURE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const validateProfilePicture = (image) => {
  const match = typeof image === 'string' && image.match(PROFILE_PICTURE_DATA_URL);

  if (!match) {
    throw new Error('Profile picture must be a JPEG, PNG, or WebP image');
  }

  if (Buffer.byteLength(match[1], 'base64') > MAX_PROFILE_PICTURE_SIZE) {
    throw new Error('Profile picture must be 2 MB or smaller');
  }

  return true;
};

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private/Admin
router.get('/:id([0-9a-fA-F]{24})', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/pets
// @desc    Get all pets of a user
// @access  Private
router.get('/:id([0-9a-fA-F]{24})/pets', authMiddleware, async (req, res) => {
  try {
    // Check if user is requesting their own pets or if admin
    if (req.params.id !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const pets = await Pet.find({ owner: req.params.id })
      .populate('owner', 'fullName email phone')
      .sort({ registrationDate: -1 });

    res.json({ pets });
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update own profile (any authenticated user)
// @access  Private
router.put('/profile', authMiddleware, [
  textField('fullName', 'Full name cannot be empty'),
  textField('phone', 'Phone cannot be empty'),
  textField('address.street', 'Street cannot be empty'),
  textField('address.city', 'City cannot be empty'),
  textField('address.province', 'Province cannot be empty'),
  textField('address.postalCode', 'Postal code cannot be empty'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const allowedFields = ['fullName', 'phone'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Handle nested address object
    if (req.body.address) {
      const addrFields = ['street', 'city', 'province', 'postalCode'];
      addrFields.forEach(field => {
        if (req.body.address[field] !== undefined) {
          updates[`address.${field}`] = req.body.address[field];
        }
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password +profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        nicNumber: user.nicNumber,
        role: user.role,
        isAdmin: user.isAdmin,
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile-picture
// @desc    Replace the signed-in user's profile picture
// @access  Private
router.put('/profile-picture', authMiddleware, [
  body('profilePicture')
    .custom(validateProfilePicture)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePicture: req.body.profilePicture } },
      { new: true, runValidators: true }
    ).select('-password +profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Server error while updating profile picture' });
  }
});

// @route   DELETE /api/users/profile-picture
// @desc    Remove the signed-in user's profile picture
// @access  Private
router.delete('/profile-picture', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePicture: '' } },
      { new: true }
    ).select('-password +profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({ message: 'Server error while removing profile picture' });
  }
});

// @route   PATCH /api/users/:id/verify
// @desc    Verify a pending user account (Admin only)
// @access  Private/Admin
router.patch('/:id([0-9a-fA-F]{24})/verify', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: req.user._id
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `${user.fullName} has been verified`,
      user
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Server error while verifying user' });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change own password
// @access  Private
router.put('/change-password', authMiddleware, [
  body('currentPassword').isString().withMessage('Current password is required').bail()
    .notEmpty().withMessage('Current password is required'),
  body('newPassword').isString().withMessage('New password must be at least 6 characters').bail()
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    // Sign out every other session (a stolen token stops working), and give this one a fresh token
    user.passwordChangedAt = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Password changed successfully', token });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/:id/send-password-reset
// @desc    Email a user a password reset link (Admin only; the admin never sees or sets the password)
// @access  Private/Admin
router.post('/:id([0-9a-fA-F]{24})/send-password-reset', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await createAndSendPasswordReset(user, { requestedByAdmin: true });
    if (!result.success) {
      return res.status(503).json({ message: 'The reset email could not be sent. Please try again later.' });
    }

    res.json({ message: `A password reset link has been emailed to ${user.email}` });
  } catch (error) {
    console.error('Admin send password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update any user (Admin only)
// @access  Private/Admin
router.put('/:id([0-9a-fA-F]{24})', authMiddleware, adminMiddleware, [
  textField('fullName', 'Full name cannot be empty'),
  textField('phone', 'Phone cannot be empty'),
  body('email').optional().isString().withMessage('Valid email is required').bail()
    .trim().toLowerCase().isEmail().withMessage('Valid email is required'),
  textField('nicNumber', 'NIC cannot be empty'),
  textField('address.street', 'Street cannot be empty'),
  textField('address.city', 'City cannot be empty'),
  textField('address.province', 'Province cannot be empty'),
  textField('address.postalCode', 'Postal code cannot be empty'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const allowedFields = ['fullName', 'phone', 'email', 'nicNumber'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.address) {
      const addrFields = ['street', 'city', 'province', 'postalCode'];
      addrFields.forEach(field => {
        if (req.body.address[field] !== undefined) {
          updates[`address.${field}`] = req.body.address[field];
        }
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Check for duplicate email or NIC
    if (updates.email || updates.nicNumber) {
      const existing = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(updates.email ? [{ email: updates.email }] : []),
          ...(updates.nicNumber ? [{ nicNumber: updates.nicNumber }] : [])
        ]
      });
      if (existing) {
        return res.status(400).json({ message: 'Email or NIC already in use by another user' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
