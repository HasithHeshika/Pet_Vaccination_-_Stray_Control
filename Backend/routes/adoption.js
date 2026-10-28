const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  applyForAdoption,
  updateListingStatus,
  getMyListings
} = require('../controllers/adoptionController');

const router = express.Router();
const auth = require('../middleware/auth');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

// ── Public routes ───────────────────────────────────────────────────────────

// @route   GET /api/adoptions
// @desc    Get all available adoption listings (with filters)
// @access  Public
router.get('/', getAllListings);

// @route   GET /api/adoptions/:id
// @desc    Get single adoption listing
// @access  Public
router.get('/:id', getListingById);

// ── Protected routes ────────────────────────────────────────────────────────

// @route   GET /api/adoptions/user/my-listings
// @desc    Get listings created by the logged-in user
// @access  Private
router.get('/user/my-listings', auth, getMyListings);

// @route   POST /api/adoptions
// @desc    Create a new adoption listing
// @access  Private
router.post(
  '/',
  auth,
  [
    body('petName').trim().notEmpty().withMessage('Pet name is required'),
    body('species')
      .isIn(['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'])
      .withMessage('Invalid species'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('rehomingFee').optional().isNumeric().withMessage('Rehoming fee must be a number'),
    body('photos').optional().isArray().withMessage('Photos must be an array')
  ],
  handleValidation,
  createListing
);

// @route   PUT /api/adoptions/:id
// @desc    Update an adoption listing (owner only)
// @access  Private
router.put('/:id', auth, updateListing);

// @route   DELETE /api/adoptions/:id
// @desc    Delete an adoption listing (owner or admin)
// @access  Private
router.delete('/:id', auth, deleteListing);

// @route   POST /api/adoptions/:id/inquire
// @desc    Submit an adoption inquiry/application
// @access  Private
router.post(
  '/:id/inquire',
  auth,
  [
    body('message').optional().trim(),
    body('contactPhone').optional().trim()
  ],
  handleValidation,
  applyForAdoption
);

// @route   PATCH /api/adoptions/:id/status
// @desc    Update listing status (Available/Pending/Adopted/Cancelled)
// @access  Private (owner)
router.patch(
  '/:id/status',
  auth,
  [
    body('status')
      .isIn(['Available', 'Pending', 'Adopted', 'Cancelled'])
      .withMessage('Invalid status value')
  ],
  handleValidation,
  updateListingStatus
);

module.exports = router;
