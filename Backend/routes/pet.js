const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Pet = require('../models/Pet');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const vetMiddleware = require('../middleware/vet');
const optionalAuth = require('../middleware/optionalAuth');
const validateObjectId = require('../middleware/validateObjectId');
const rateLimit = require('../middleware/rateLimit');
const crypto = require('crypto');
const { generateQRCode } = require('../utils/qrGenerator');
const { sendFinderContactEmail } = require('../services/notificationService');

const { MAX_IMAGES: MAX_PET_IMAGES, validateImage: validatePetImage } = require('../utils/imageValidation');

// Generate unique Pet ID
const generatePetId = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex').substring(0, 6);
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
  body('weight').isFloat({ min: 0 }).withMessage('Valid weight is required'),
  body('photoUrls')
    .optional()
    .isArray({ max: MAX_PET_IMAGES })
    .withMessage('A pet can have a maximum of two images'),
  body('photoUrls.*').optional().custom(validatePetImage)
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array()
      });
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
      photoUrl,
      photoUrls = []
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
      photoUrls,
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

// @route   PUT /api/pets/:id/photos
// @desc    Replace a pet's images (Owner or Admin)
// @access  Private
router.put('/:id/photos', authMiddleware, validateObjectId(), [
  body('photoUrls')
    .isArray({ max: MAX_PET_IMAGES })
    .withMessage('A pet can have a maximum of two images'),
  body('photoUrls.*').custom(validatePetImage)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    if (pet.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    pet.photoUrls = req.body.photoUrls;
    pet.photoUrl = undefined;
    await pet.save();

    await pet.populate('owner', 'fullName email phone address');
    res.json({ message: 'Pet images updated successfully', pet });
  } catch (error) {
    console.error('Update pet images error:', error);
    res.status(500).json({ message: 'Server error while updating pet images' });
  }
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @route   GET /api/pets/search?q=
// @desc    Find patients by Pet ID or pet name (small result set for the vet portal)
// @access  Private/Admin/Vet
router.get('/search', authMiddleware, vetMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) {
      return res.status(400).json({ message: 'Enter at least 2 characters to search' });
    }

    const pattern = new RegExp(escapeRegex(q), 'i');
    const pets = await Pet.find({ $or: [{ petId: q.toUpperCase() }, { petName: pattern }] })
      .select('petId petName petType petTypeOther breed breedOther age gender color owner')
      .populate('owner', 'fullName')
      .limit(20);

    res.json({ pets });
  } catch (error) {
    console.error('Pet search error:', error);
    res.status(500).json({ message: 'Server error' });
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
router.get('/:id', authMiddleware, validateObjectId(), async (req, res) => {
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

// Fields anyone who scans the QR tag may see. Owner email, phone and address are never public;
// finders reach the owner through the contact relay below.
const PUBLIC_PET_FIELDS = 'petId petName petType petTypeOther breed breedOther age gender color weight microchipNumber ' +
  'medicalHistory.allergies medicalHistory.existingConditions photoUrl photoUrls qrCode registrationDate owner';

const toPublicPet = (pet) => {
  const data = pet.toObject();
  const fullName = pet.owner?.fullName || '';
  data.owner = { firstName: fullName.split(' ')[0] || 'Owner' };
  data.canContactOwner = Boolean(pet.owner?.email);
  return data;
};

// @route   GET /api/pets/petid/:petId
// @desc    Get pet by Pet ID (for QR code scanning). Logged-in owners/admins/vets get full details.
// @access  Public (limited fields)
router.get('/petid/:petId', optionalAuth, async (req, res) => {
  try {
    const pet = await Pet.findOne({ petId: req.params.petId })
      .populate('owner', 'fullName email phone');

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    const user = req.user;
    const isPrivileged = user && (
      user.isAdmin ||
      user.role === 'veterinarian' ||
      pet.owner?._id.toString() === user._id.toString()
    );

    if (isPrivileged) {
      return res.json({ pet });
    }

    const publicPet = await Pet.findById(pet._id).select(PUBLIC_PET_FIELDS).populate('owner', 'fullName email');
    res.json({ pet: toPublicPet(publicPet) });
  } catch (error) {
    console.error('Get pet by petId error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many messages sent. Please try again later.'
});

// Protects each owner's inbox even if messages come from many different addresses
const perPetContactLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `pet:${String(req.params.petId).toUpperCase()}`,
  message: 'This owner has already received several messages today. Please try again tomorrow.'
});

// @route   POST /api/pets/petid/:petId/contact
// @desc    Send a message to a pet's owner without revealing the owner's contact details
// @access  Public (rate limited)
router.post('/petid/:petId/contact', contactLimiter, perPetContactLimiter, [
  body('finderName').trim().notEmpty().withMessage('Your name is required').isLength({ max: 100 }),
  body('finderContact').trim().notEmpty().withMessage('A phone number or email is required').isLength({ max: 150 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const pet = await Pet.findOne({ petId: req.params.petId }).populate('owner', 'fullName email');
    if (!pet || !pet.owner?.email) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    const result = await sendFinderContactEmail({
      ownerEmail: pet.owner.email,
      ownerName: pet.owner.fullName,
      petName: pet.petName,
      petId: pet.petId,
      finderName: req.body.finderName,
      finderContact: req.body.finderContact,
      message: req.body.message
    });

    if (!result.success) {
      return res.status(503).json({ message: 'Message could not be delivered right now. Please try again later.' });
    }

    res.json({ message: 'Your message has been sent to the owner' });
  } catch (error) {
    console.error('Contact owner error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
