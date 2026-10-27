const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createLostReport,
  getLostReports,
  updateLostReport,
  deleteLostReport,
  getLostReportById,
  updateLostReportStatus
} = require('../controllers/lostReportController');
const auth = require('../middleware/auth'); // For verifying JWT tokens
const validateObjectId = require('../middleware/validateObjectId');
const { SPECIES } = require('../models/LostReport');
const { MAX_IMAGES, validateUploadedImage } = require('../utils/imageValidation');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  return next();
};

// Shared checks for the new optional fields (create and edit)
const reportFieldRules = [
  body('species').optional({ values: 'falsy' }).isIn(SPECIES).withMessage('Invalid species'),
  body('speciesOther').optional().trim().isLength({ max: 60 }).withMessage('Species is too long'),
  body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('images').optional().isArray({ max: MAX_IMAGES }).withMessage('You can attach a maximum of two photos'),
  body('images.*').custom(validateUploadedImage),
  body('tagPetId').optional({ values: 'falsy' }).trim().isLength({ max: 40 }).withMessage('Pet ID is too long'),
  body('linkedPet').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid pet')
];

// @route   POST /api/lost-and-found
// @desc    Submit a lost or found pet report (reportType: 'lost' | 'found')
// @access  Private
router.post(
  '/',
  auth,
  [
    body('reportType').optional().isIn(['lost', 'found']).withMessage('Report type must be lost or found'),
    ...reportFieldRules
  ],
  handleValidation,
  createLostReport
);

// @route   GET /api/lost-and-found?type=lost|found
// @desc    Get all lost / found reports (first photo only)
// @access  Public (so feed can be viewed)
router.get('/', getLostReports);

// @route   GET /api/lost-and-found/:id
// @desc    Get a single report with all photos
// @access  Public
router.get('/:id', validateObjectId(), getLostReportById);

// @route   PUT /api/lost-and-found/:id
// @desc    Update a report
// @access  Private (reporter or admin)
router.put('/:id', auth, validateObjectId(), reportFieldRules, handleValidation, updateLostReport);

// @route   DELETE /api/lost-and-found/:id
// @desc    Delete a report
// @access  Private (reporter or admin)
router.delete('/:id', auth, validateObjectId(), deleteLostReport);

// @route   PATCH /api/lost-and-found/:id/status
// @desc    Update a report status
// @access  Private
router.patch('/:id/status', auth, validateObjectId(), updateLostReportStatus);

module.exports = router;
