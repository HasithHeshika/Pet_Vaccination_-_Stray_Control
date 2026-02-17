const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Pet = require('../models/Pet');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

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
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
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
router.get('/:id/pets', authMiddleware, async (req, res) => {
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
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('address.street').optional().notEmpty().withMessage('Street cannot be empty'),
  body('address.city').optional().notEmpty().withMessage('City cannot be empty'),
  body('address.province').optional().notEmpty().withMessage('Province cannot be empty'),
  body('address.postalCode').optional().notEmpty().withMessage('Postal code cannot be empty'),
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
    ).select('-password');

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
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change own password
// @access  Private
router.put('/change-password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
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
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update any user (Admin only)
// @access  Private/Admin
router.put('/:id', authMiddleware, adminMiddleware, [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('nicNumber').optional().notEmpty().withMessage('NIC cannot be empty'),
  body('address.street').optional().notEmpty().withMessage('Street cannot be empty'),
  body('address.city').optional().notEmpty().withMessage('City cannot be empty'),
  body('address.province').optional().notEmpty().withMessage('Province cannot be empty'),
  body('address.postalCode').optional().notEmpty().withMessage('Postal code cannot be empty'),
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