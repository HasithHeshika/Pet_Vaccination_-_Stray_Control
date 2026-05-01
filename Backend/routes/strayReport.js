const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createStrayReport,
  getStrayReports,
  getStrayReportById,
  updateStrayReportStatus
} = require('../controllers/strayReportController');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

// @route   POST /api/stray-reports
// @desc    Submit a new stray animal report
// @access  Public
router.post(
  '/',
  [
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('image').optional().isString().withMessage('Image must be a string URL'),
    body('reportedBy').optional().isMongoId().withMessage('reportedBy must be a valid user id'),
    body('status').optional().isIn(['pending', 'in-progress', 'resolved']).withMessage('Invalid status')
  ],
  handleValidation,
  createStrayReport
);

// @route   GET /api/stray-reports
// @desc    Get all stray reports
// @access  Public
router.get('/', getStrayReports);

// @route   GET /api/stray-reports/:id
// @desc    Get a single stray report
// @access  Public
router.get('/:id', getStrayReportById);

// @route   PATCH /api/stray-reports/:id/status
// @desc    Update report status
// @access  Public (can be secured later without changing the API shape)
router.patch(
  '/:id/status',
  [
    body('status').isIn(['pending', 'in-progress', 'resolved']).withMessage('Invalid status')
  ],
  handleValidation,
  updateStrayReportStatus
);

module.exports = router;
