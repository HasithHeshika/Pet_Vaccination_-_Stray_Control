const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Pet = require('../models/Pet');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { generateQRCode } = require('../utils/qrGenerator');

// Generate unique Pet ID
const generatePetId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PET${timestamp}${random}`.toUpperCase();
};

// @route   POST /api/pets/register
// @desc    Register a new pet (Admin only)
// @access  Private/Admin
router.post('/register', authMiddleware, adminMiddleware, [
  body('ownerId').notEmpty().withMessage('Owner ID is required'),
  body('petName').trim().notEmpty().withMessage('Pet name is required'),
  body('petType').notEmpty().withMessage('Pet type is required'),
  body('breed').trim().notEmpty().withMessage('Breed is required'),
  body('age.years').isInt({ min: 0 }).withMessage('Valid age in years is required'),
  body('age.months').isInt({ min: 0, max: 11 }).withMessage('Valid age in months is required'),
  body('gender').isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('color').trim().notEmpty().withMessage('Color is required'),
  body('weight').isFloat({ min: 0 }).withMessage('Valid weight is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      ownerId,
      petName,
      petType,
      petTypeOther,
      breed,
      breedOther,
      age,
      gender,
      color,
      weight,
      microchipNumber,
      medicalHistory,
      photoUrl
    } = req.body;

    // Verify owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    // Generate unique Pet ID
    const petId = generatePetId();

    // Prepare QR code data
    const qrData = {
      petId,
      petName,
      petType: petType === 'Other' ? petTypeOther : petType,
      breed: breed === 'Other' ? breedOther : breed,
      age,
      gender,
      color,
      microchipNumber,
      ownerName: owner.fullName,
      ownerPhone: owner.phone,
      ownerEmail: owner.email,
      registrationDate: new Date()
    };

    // Generate QR code
    const qrCode = await generateQRCode(qrData);

    // Create new pet
    const pet = new Pet({
      petId,
      owner: ownerId,
      petName,
      petType,
      petTypeOther: petType === 'Other' ? petTypeOther : undefined,
      breed,
      breedOther: breed === 'Other' ? breedOther : undefined,
      age,
      gender,
      color,
      weight,
      microchipNumber,
      medicalHistory,
      photoUrl,
      qrCode
    });

    await pet.save();

    // Populate owner details
    await pet.populate('owner', 'fullName email phone address');

    res.status(201).json({
      message: 'Pet registered successfully',
      pet
    });
  } catch (error) {
    console.error('Pet registration error:', error);
    res.status(500).json({ message: 'Server error during pet registration' });
  }
});

// @route   GET /api/pets
// @desc    Get all pets (Admin only)
// @access  Private/Admin
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pets = await Pet.find()
      .populate('owner', 'fullName email phone')
      .sort({ registrationDate: -1 });

    res.json({ pets });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pets/:id
// @desc    Get pet by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id)
      .populate('owner', 'fullName email phone address');

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Check if user owns the pet or is admin
    if (pet.owner._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ pet });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pets/petid/:petId
// @desc    Get pet by Pet ID (for QR code scanning)
// @access  Public
router.get('/petid/:petId', async (req, res) => {
  try {
    const pet = await Pet.findOne({ petId: req.params.petId })
      .populate('owner', 'fullName email phone');

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    res.json({ pet });
  } catch (error) {
    console.error('Get pet by petId error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;