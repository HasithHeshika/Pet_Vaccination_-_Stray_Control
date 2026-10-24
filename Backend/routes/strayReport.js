const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createStrayReport,
  getStrayReports,
  getStrayReportById,
  updateStrayReportStatus
} = require('../controllers/strayReportController');

const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const optionalAuth = require('../middleware/optionalAuth');
const validateObjectId = require('../middleware/validateObjectId');
const rateLimit = require('../middleware/rateLimit');

// Public form: limit spam submissions per IP
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many stray reports from this connection. Please try again later.'
});

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
  reportLimiter,
  optionalAuth,
  [
    body('location').trim().notEmpty().withMessage('Location is required')
      .isLength({ max: 300 }).withMessage('Location is too long'),
    body('description').trim().notEmpty().withMessage('Description is required')
      .isLength({ max: 2000 }).withMessage('Description is too long'),
    body('image').optional().isString().withMessage('Image must be a string URL')
  ],
  handleValidation,
  createStrayReport
);

// @route   GET /api/stray-reports
// @desc    Get all stray reports
// @access  Private/Admin
router.get('/', auth, admin, getStrayReports);

// @route   GET /api/stray-reports/:id
// @desc    Get a single stray report
// @access  Private/Admin
router.get('/:id', auth, admin, validateObjectId(), getStrayReportById);

// @route   PATCH /api/stray-reports/:id/status
// @desc    Update report status
// @access  Private/Admin
router.patch(
  '/:id/status',
  auth,
  admin,
  validateObjectId(),
  [
    body('status').isIn(['pending', 'in-progress', 'resolved']).withMessage('Invalid status')
  ],
  handleValidation,
  updateStrayReportStatus
);

module.exports = router;
