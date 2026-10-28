const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createStrayReport,
  getStrayReports,
  getStrayReportById,
  updateStrayReportStatus,
  toggleSupport,
  addComment,
  getComments
} = require('../controllers/strayReportController');
const { INCIDENT_TYPES, URGENCY_LEVELS } = require('../models/StrayReport');
const { MAX_IMAGES, validateUploadedImage } = require('../utils/imageValidation');

const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const optionalAuth = require('../middleware/optionalAuth');
const validateObjectId = require('../middleware/validateObjectId');
const rateLimit = require('../middleware/rateLimit');

// Public form: limit spam submissions per IP
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // Configurable so automated tests (which all run from one address) can submit more than 10
  max: Number(process.env.MAX_INCIDENT_REPORTS_PER_HOUR) || 10,
  message: 'Too many reports from this connection. Please try again later.'
});

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  return next();
};

// @route   POST /api/stray-reports  (also /api/incidents)
// @desc    Report an animal incident: violence/abuse, sick or injured animal, stray sighting, or community complaint
// @access  Public (login optional)
router.post(
  '/',
  reportLimiter,
  optionalAuth,
  [
    body('incidentType').optional().isIn(INCIDENT_TYPES).withMessage('Invalid incident type'),
    body('otherIncidentType')
      .if(body('incidentType').equals('other'))
      .trim().notEmpty().withMessage('Please describe the type of incident')
      .isLength({ max: 100 }).withMessage('Incident type is too long'),
    body('urgency').optional({ values: 'falsy' }).isIn(URGENCY_LEVELS).withMessage('Invalid urgency level'),
    body('location').trim().notEmpty().withMessage('Location is required')
      .isLength({ max: 300 }).withMessage('Location is too long'),
    body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('description').trim().notEmpty().withMessage('Description is required')
      .isLength({ max: 2000 }).withMessage('Description is too long'),
    body('image').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Image link must be a web address'),
    body('images').optional().isArray({ max: MAX_IMAGES }).withMessage('You can attach a maximum of two photos'),
    body('images.*').custom(validateUploadedImage),
    body('reporterName').optional().trim().isLength({ max: 100 }).withMessage('Name is too long'),
    body('reporterContact').optional().trim().isLength({ max: 150 }).withMessage('Contact details are too long'),
    body('category').optional().isString().withMessage('Category must be a string'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be true or false')
  ],
  handleValidation,
  createStrayReport
);

// @route   GET /api/stray-reports
// @desc    Administrators: every report with full details (open and most urgent first).
//          Everyone else: the community feed of public reports, without the reporter's identity,
//          contact details, exact location, photos or internal notes. Supports ?category=&status=
// @access  Public (login optional)
router.get('/', optionalAuth, getStrayReports);

// @route   GET /api/stray-reports/:id
// @desc    One report: full details for administrators, the public view of a public report otherwise
// @access  Public (login optional)
router.get('/:id', optionalAuth, validateObjectId(), getStrayReportById);

// @route   PATCH /api/stray-reports/:id/status
// @desc    Update report status (admin only)
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

// ── New community engagement routes ─────────────────────────────────────────

// @route   POST /api/stray-reports/:id/support
// @desc    Toggle support (upvote) on a stray report
// @access  Private (auth)
router.post('/:id/support', auth, validateObjectId(), toggleSupport);

// @route   GET /api/stray-reports/:id/comments
// @desc    Get all comments for a stray report
// @access  Public
router.get('/:id/comments', optionalAuth, validateObjectId(), getComments);

// @route   POST /api/stray-reports/:id/comments
// @desc    Add a comment to a stray report
// @access  Private (auth)
router.post(
  '/:id/comments',
  auth,
  validateObjectId(),
  [
    body('text').isString().withMessage('Comment text is required').bail()
      .trim().notEmpty().withMessage('Comment text is required')
      .isLength({ max: 1000 }).withMessage('Comment is too long')
  ],
  handleValidation,
  addComment
);

module.exports = router;
