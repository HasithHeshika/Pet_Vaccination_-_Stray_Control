const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  contactBreeder,
  getMyListings
} = require('../controllers/breedingController');

const router = express.Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

// ── Public routes ───────────────────────────────────────────────────────────

// @route   GET /api/breeding-matches
// @desc    Get all active breeding listings (with filters)
// @access  Public
router.get('/', getAllListings);

// ── Protected routes ────────────────────────────────────────────────────────

// @route   GET /api/breeding-matches/user/my-listings
// @desc    Get listings created by the logged-in user
// @access  Private
// IMPORTANT: must be declared BEFORE /:id so Express doesn't treat 'user' as an id
router.get('/user/my-listings', auth, getMyListings);

// @route   GET /api/breeding-matches/:id
// @desc    Get a single breeding listing
// @access  Public
router.get('/:id', optionalAuth, getListingById);

// @route   POST /api/breeding-matches
// @desc    Create a new breeding listing
// @access  Private
router.post(
  '/',
  auth,
  [
    body('petName').trim().notEmpty().withMessage('Pet name is required'),
    body('species')
      .isIn(['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'])
      .withMessage('Invalid species'),
    body('breed').trim().notEmpty().withMessage('Breed is required'),
    body('gender')
      .isIn(['Male', 'Female'])
      .withMessage('Gender must be Male or Female'),
    body('photos').optional().isArray().withMessage('Photos must be an array'),
    body('breederLicense').optional().isMongoId().withMessage('Invalid breeder license ID')
  ],
  handleValidation,
  createListing
);

// @route   PUT /api/breeding-matches/:id
// @desc    Update a breeding listing (owner only)
// @access  Private
router.put('/:id', auth, updateListing);

// @route   DELETE /api/breeding-matches/:id
// @desc    Delete a breeding listing (owner or admin)
// @access  Private
router.delete('/:id', auth, deleteListing);

// @route   POST /api/breeding-matches/:id/contact
// @desc    Send a contact inquiry to a breeder
// @access  Private
router.post(
  '/:id/contact',
  auth,
  [
    body('message').optional().trim(),
    body('contactPhone').optional().trim(),
    body('petName').optional().trim(),
    body('petBreed').optional().trim()
  ],
  handleValidation,
  contactBreeder
);

module.exports = router;
