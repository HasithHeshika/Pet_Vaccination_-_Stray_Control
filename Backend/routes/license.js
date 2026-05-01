const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const BreederLicense = require('../models/BreederLicense');

// @route   POST /api/licenses/apply
// @desc    Submit a new breeder license application
// @access  Private
router.post('/apply', auth, async (req, res) => {
  try {
    const { businessName, facilityAddress, documentsUrl } = req.body;

    const newLicense = new BreederLicense({
      applicantId: req.user._id,
      businessName,
      facilityAddress,
      documentsUrl,
      status: 'Pending'
    });

    const savedLicense = await newLicense.save();
    res.status(201).json(savedLicense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/licenses
// @desc    Get all breeder licenses
// @access  Private/Admin
router.get('/', auth, admin, async (req, res) => {
  try {
    const licenses = await BreederLicense.find().populate('applicantId', ['fullName', 'email', 'phone']);
    res.json(licenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/licenses/my-licenses
// @desc    Get current user's licenses
// @access  Private
router.get('/my-licenses', auth, async (req, res) => {
  try {
    const licenses = await BreederLicense.find({ applicantId: req.user._id });
    res.json(licenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/licenses/:id/status
// @desc    Update license status (Approve/Reject)
// @access  Private/Admin
router.put('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status, notes, issueDate, expiryDate } = req.body;

    let license = await BreederLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ message: 'License not found' });

    license.status = status;
    if (notes) license.notes = notes;
    
    if (status === 'Approved') {
      license.issueDate = issueDate || new Date();
      // Default expiry is 1 year from issue
      if (!expiryDate) {
        const nextYear = new Date(license.issueDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        license.expiryDate = nextYear;
      } else {
        license.expiryDate = expiryDate;
      }
    }

    await license.save();
    res.json(license);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/licenses/:id/renew
// @desc    Renew a license
// @access  Private
router.post('/:id/renew', auth, async (req, res) => {
  try {
    let license = await BreederLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ message: 'License not found' });

    // Verify ownership
    if (license.applicantId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    license.status = 'Pending'; // Revert back to pending for renewal review
    license.notes = 'Renewal Requested';
    
    await license.save();
    res.json(license);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
