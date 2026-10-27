const express = require('express');
const router = express.Router();
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

// @route   POST /api/lost-and-found
// @desc    Submit a new lost pet report
// @access  Private
router.post('/', auth, createLostReport);

// @route   GET /api/lost-and-found
// @desc    Get all lost pet reports
// @access  Public (so feed can be viewed)
router.get('/', getLostReports);

// @route   GET /api/lost-and-found/:id
// @desc    Get a single lost pet report by ID
// @access  Public
router.get('/:id', validateObjectId(), getLostReportById);

// @route   PUT /api/lost-and-found/:id
// @desc    Update a lost pet report
// @access  Private
router.put('/:id', auth, validateObjectId(), updateLostReport);

// @route   DELETE /api/lost-and-found/:id
// @desc    Delete a lost pet report
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteLostReport);

// @route   PATCH /api/lost-and-found/:id/status
// @desc    Update a lost pet report status
// @access  Private
router.patch('/:id/status', auth, validateObjectId(), updateLostReportStatus);

module.exports = router;
