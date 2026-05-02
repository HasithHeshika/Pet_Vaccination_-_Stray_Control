const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const BreederLicense = require('../models/BreederLicense');
const Pet = require('../models/Pet');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads', 'breeder-documents');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP, and PDF files are allowed'));
    }
    cb(null, true);
  }
});

const licenseValidation = [
  body('personalDetails.breederName').trim().notEmpty().withMessage('Breeder name is required'),
  body('personalDetails.registrationNumber').trim().notEmpty().withMessage('NIC or business registration number is required'),
  body('personalDetails.contactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('personalDetails.email').isEmail().withMessage('Valid email is required'),
  body('personalDetails.address').trim().notEmpty().withMessage('Address is required'),
  body('breedingDetails.animalTypes').isArray({ min: 1 }).withMessage('Select at least one animal type'),
  body('breedingDetails.numberOfAnimals').isInt({ min: 0 }).withMessage('Number of animals is required'),
  body('breedingDetails.facilityDescription').trim().notEmpty().withMessage('Facility description is required'),
  body('breedingDetails.yearsOfExperience').isInt({ min: 0 }).withMessage('Years of experience is required')
];

const normalizeDocuments = (documents = []) => {
  return documents
    .filter(doc => doc && doc.name && doc.type)
    .map(doc => ({
      type: doc.type,
      name: doc.name,
      url: doc.url || ''
    }));
};

const getExpiryState = (license) => {
  if (!license?.expiryDate) return null;
  const today = new Date();
  const expiryDate = new Date(license.expiryDate);
  const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  return {
    daysRemaining: diffDays,
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays <= 30
  };
};

const buildLicensePayload = (req, status) => ({
  breeder: req.user._id,
  applicationType: req.body.applicationType || 'new',
  status,
  personalDetails: req.body.personalDetails,
  breedingDetails: req.body.breedingDetails,
  documents: normalizeDocuments(req.body.documents),
  remarks: req.body.remarks || '',
  activity: [{
    action: status === 'draft' ? 'Draft saved' : 'Application submitted',
    note: status === 'draft' ? 'Breeder saved the application as a draft.' : 'Breeder submitted the application for review.'
  }]
});

// @route   POST /api/breeder-licenses/documents
// @desc    Upload breeder application documents
// @access  Private
router.post('/documents', authMiddleware, upload.array('documents', 8), (req, res) => {
  const type = req.body.type;
  const allowedDocumentTypes = ['idProof', 'facilityImage', 'certificate'];

  if (!allowedDocumentTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid document type' });
  }

  const documents = req.files.map(file => ({
    type,
    name: file.originalname,
    url: `/uploads/breeder-documents/${file.filename}`,
    mimeType: file.mimetype
  }));

  res.status(201).json({ documents });
});

// @route   GET /api/breeder-licenses/dashboard
// @desc    Breeder dashboard summary
// @access  Private
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const licenses = await BreederLicense.find({ breeder: req.user._id }).sort({ createdAt: -1 });
    const petsCount = await Pet.countDocuments({ owner: req.user._id });
    const latestLicense = licenses.find(license => license.status === 'approved') || licenses[0] || null;

    const complianceRecords = licenses.flatMap(license => license.complianceRecords || []);
    const nonCompliantCount = complianceRecords.filter(record => record.status === 'non_compliant').length;
    const needsReviewCount = complianceRecords.filter(record => record.status === 'needs_review').length;
    const complianceStatus = nonCompliantCount > 0 ? 'Needs Action' : needsReviewCount > 0 ? 'Under Review' : 'Compliant';

    const recentActivity = licenses
      .flatMap(license => (license.activity || []).map(item => ({
        applicationId: license.applicationId,
        action: item.action,
        note: item.note,
        createdAt: item.createdAt
      })))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      summary: {
        totalRegisteredAnimals: petsCount,
        totalApplications: licenses.length,
        complianceStatus,
        latestLicense,
        expiryState: getExpiryState(latestLicense),
        recentActivity
      }
    });
  } catch (error) {
    console.error('Breeder dashboard error:', error);
    res.status(500).json({ message: 'Failed to load breeder dashboard' });
  }
});

// @route   GET /api/breeder-licenses
// @desc    Current breeder applications
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const licenses = await BreederLicense.find({ breeder: req.user._id }).sort({ createdAt: -1 });
    res.json({ licenses });
  } catch (error) {
    console.error('Get breeder licenses error:', error);
    res.status(500).json({ message: 'Failed to load applications' });
  }
});

// @route   POST /api/breeder-licenses
// @desc    Create new breeder application or draft
// @access  Private
router.post('/', authMiddleware, licenseValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const status = req.body.saveAsDraft ? 'draft' : 'pending';
    const license = new BreederLicense(buildLicensePayload(req, status));
    await license.save();

    res.status(201).json({
      message: status === 'draft' ? 'Draft saved successfully' : 'Application submitted successfully',
      license
    });
  } catch (error) {
    console.error('Create breeder license error:', error);
    res.status(500).json({ message: 'Failed to save application' });
  }
});

// @route   GET /api/breeder-licenses/current
// @desc    Get latest approved or pending license
// @access  Private
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const license = await BreederLicense.findOne({
      breeder: req.user._id,
      status: { $in: ['approved', 'pending', 'expired'] }
    }).sort({ createdAt: -1 });

    res.json({ license, expiryState: getExpiryState(license) });
  } catch (error) {
    console.error('Get current breeder license error:', error);
    res.status(500).json({ message: 'Failed to load current license' });
  }
});

// @route   POST /api/breeder-licenses/:id/renew
// @desc    Submit a renewal application
// @access  Private
router.post('/:id/renew', authMiddleware, licenseValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentLicense = await BreederLicense.findOne({ _id: req.params.id, breeder: req.user._id });
    if (!currentLicense) {
      return res.status(404).json({ message: 'License not found' });
    }

    const renewal = new BreederLicense({
      ...buildLicensePayload(req, 'pending'),
      applicationType: 'renewal',
      remarks: `Renewal request for ${currentLicense.licenseId || currentLicense.applicationId}`,
      activity: [{
        action: 'Renewal submitted',
        note: `Breeder requested renewal for ${currentLicense.licenseId || currentLicense.applicationId}.`
      }]
    });

    await renewal.save();
    res.status(201).json({ message: 'Renewal submitted successfully', license: renewal });
  } catch (error) {
    console.error('Renew breeder license error:', error);
    res.status(500).json({ message: 'Failed to submit renewal' });
  }
});

// @route   GET /api/breeder-licenses/admin/all
// @desc    Authority list of breeder applications
// @access  Private/Admin
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const licenses = await BreederLicense.find()
      .populate('breeder', 'fullName email phone')
      .sort({ createdAt: -1 });

    res.json({ licenses });
  } catch (error) {
    console.error('Admin get breeder licenses error:', error);
    res.status(500).json({ message: 'Failed to load breeder applications' });
  }
});

// @route   PATCH /api/breeder-licenses/admin/:id/status
// @desc    Authority approve/reject/expire application
// @access  Private/Admin
router.patch('/admin/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, remarks, expiryDate } = req.body;
    const validStatuses = ['approved', 'rejected', 'expired', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const license = await BreederLicense.findById(req.params.id);
    if (!license) {
      return res.status(404).json({ message: 'Application not found' });
    }

    license.status = status;
    license.remarks = remarks || license.remarks;

    if (status === 'approved') {
      license.issueDate = license.issueDate || new Date();
      license.expiryDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      license.licenseId = license.licenseId || `BRL-${new Date().getFullYear()}-${String(license._id).slice(-6).toUpperCase()}`;
      license.complianceRecords = license.complianceRecords.length > 0 ? license.complianceRecords : [
        {
          title: 'Initial facility compliance',
          status: 'compliant',
          notes: 'License approved by authority.'
        }
      ];
    }

    license.activity.push({
      action: `Application ${status}`,
      note: remarks || `Authority changed status to ${status}.`
    });

    await license.save();
    res.json({ message: 'Application updated successfully', license });
  } catch (error) {
    console.error('Admin update breeder license error:', error);
    res.status(500).json({ message: 'Failed to update application' });
  }
});

module.exports = router;
