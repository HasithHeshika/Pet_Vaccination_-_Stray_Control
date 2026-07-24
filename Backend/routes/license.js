const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const BreederLicense = require('../models/BreederLicense');
const Pet = require('../models/Pet');

const licenseSelect = '-documents.idProof.previewUrl -documents.facilityImages.previewUrl -documents.certificates.previewUrl';

const getExpiryState = (expiryDate) => {
  if (!expiryDate) return { label: 'Not issued', daysRemaining: null, expiringSoon: false, expired: false };

  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  return {
    label: daysRemaining < 0 ? 'Expired' : `${daysRemaining} days remaining`,
    daysRemaining,
    expiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
    expired: daysRemaining < 0
  };
};

const normalizeStatus = (license) => {
  if (!license || license.status !== 'Approved' || !license.expiryDate) return license;
  if (new Date(license.expiryDate) < new Date()) {
    license.status = 'Expired';
  }
  return license;
};

const buildLicensePayload = (body, user, fallback = {}) => ({
  breederName: body.breederName ?? fallback.breederName ?? user.fullName,
  nicOrBusinessRegNo: body.nicOrBusinessRegNo ?? fallback.nicOrBusinessRegNo ?? user.nicNumber,
  contactNumber: body.contactNumber ?? fallback.contactNumber ?? user.phone,
  email: body.email ?? fallback.email ?? user.email,
  address: body.address ?? fallback.address ?? [
    user.address?.street,
    user.address?.city,
    user.address?.province,
    user.address?.postalCode
  ].filter(Boolean).join(', '),
  animalTypes: body.animalTypes ?? fallback.animalTypes ?? [],
  otherAnimalType: body.otherAnimalType ?? fallback.otherAnimalType ?? '',
  numberOfAnimals: Number(body.numberOfAnimals ?? fallback.numberOfAnimals ?? 0),
  facilityDescription: body.facilityDescription ?? fallback.facilityDescription ?? '',
  yearsOfExperience: Number(body.yearsOfExperience ?? fallback.yearsOfExperience ?? 0),
  documents: body.documents ?? fallback.documents ?? {}
});

const validateApplication = (payload) => {
  const required = [
    'breederName',
    'nicOrBusinessRegNo',
    'contactNumber',
    'email',
    'address',
    'facilityDescription'
  ];
  const missing = required.filter((field) => !payload[field]);

  if (!payload.animalTypes || payload.animalTypes.length === 0) missing.push('animalTypes');
  if (Number.isNaN(payload.numberOfAnimals) || payload.numberOfAnimals < 1) missing.push('numberOfAnimals');
  if (Number.isNaN(payload.yearsOfExperience) || payload.yearsOfExperience < 0) missing.push('yearsOfExperience');

  return missing;
};

// @route   GET /api/licenses/dashboard
// @desc    Get breeder dashboard summary for current user
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [licenses, totalAnimals] = await Promise.all([
      BreederLicense.find({ applicantId: req.user._id }).sort({ createdAt: -1 }).select(licenseSelect),
      Pet.countDocuments({ owner: req.user._id })
    ]);

    const normalized = licenses.map((license) => normalizeStatus(license));
    await Promise.all(normalized.filter((license) => license.isModified && license.isModified('status')).map((license) => license.save()));

    const activeLicense = normalized.find((license) => license.status === 'Approved' || license.status === 'Expired') || normalized[0] || null;
    const pendingCount = normalized.filter((license) => license.status === 'Pending').length;
    const rejectedCount = normalized.filter((license) => license.status === 'Rejected').length;

    res.json({
      breederName: req.user.fullName,
      activeLicense,
      expiryState: getExpiryState(activeLicense?.expiryDate),
      totalRegisteredAnimals: totalAnimals,
      complianceStatus: activeLicense?.status === 'Approved' ? 'Compliant' : 'Action Required',
      pendingApplications: pendingCount,
      rejectedApplications: rejectedCount,
      recentActivity: normalized.slice(0, 5)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to load breeder dashboard' });
  }
});

// @route   POST /api/licenses/apply
// @desc    Submit or save a new breeder license application
// @access  Private
router.post('/apply', auth, async (req, res) => {
  try {
    const payload = buildLicensePayload(req.body, req.user);
    const saveAsDraft = req.body.saveAsDraft === true;
    const missing = validateApplication(payload);

    if (!saveAsDraft && missing.length > 0) {
      return res.status(400).json({ message: 'Required fields are missing', fields: missing });
    }

    const newLicense = new BreederLicense({
      applicantId: req.user._id,
      applicationType: 'New',
      ...payload,
      status: saveAsDraft ? 'Draft' : 'Pending',
      submittedAt: saveAsDraft ? undefined : new Date()
    });

    const savedLicense = await newLicense.save();
    res.status(201).json(savedLicense);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to submit license application' });
  }
});

// @route   GET /api/licenses/my-licenses
// @desc    Get current user's applications/licenses
// @access  Private
router.get('/my-licenses', auth, async (req, res) => {
  try {
    const licenses = await BreederLicense.find({ applicantId: req.user._id })
      .sort({ createdAt: -1 })
      .select(licenseSelect);

    const normalized = licenses.map((license) => normalizeStatus(license));
    await Promise.all(normalized.filter((license) => license.isModified && license.isModified('status')).map((license) => license.save()));

    res.json(normalized);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to load license applications' });
  }
});

// @route   GET /api/licenses/:id
// @desc    Get license/application details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const license = await BreederLicense.findById(req.params.id).populate('applicantId', ['fullName', 'email', 'phone']);
    if (!license) return res.status(404).json({ message: 'License application not found' });

    const ownsLicense = license.applicantId._id.toString() === req.user._id.toString();
    if (!ownsLicense && !req.user.isAdmin) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    normalizeStatus(license);
    if (license.isModified('status')) await license.save();

    res.json(license);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to load license application' });
  }
});

// @route   GET /api/licenses
// @desc    Get all breeder licenses
// @access  Private/Admin
router.get('/', auth, admin, async (req, res) => {
  try {
    const licenses = await BreederLicense.find()
      .populate('applicantId', ['fullName', 'email', 'phone'])
      .sort({ createdAt: -1 })
      .select(licenseSelect);

    res.json(licenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to load breeder licenses' });
  }
});

// @route   PUT /api/licenses/:id/status
// @desc    Update license status
// @access  Private/Admin
router.put('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status, remarks, issueDate, expiryDate } = req.body;
    const allowedStatuses = ['Pending', 'Approved', 'Rejected', 'Expired'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid license status' });
    }

    const license = await BreederLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ message: 'License application not found' });

    license.status = status;
    license.remarks = remarks ?? license.remarks;

    if (status === 'Approved') {
      license.issueDate = issueDate ? new Date(issueDate) : new Date();
      if (expiryDate) {
        license.expiryDate = new Date(expiryDate);
      } else {
        const nextYear = new Date(license.issueDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        license.expiryDate = nextYear;
      }
    }

    await license.save();
    res.json(license);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to update license status' });
  }
});

// @route   POST /api/licenses/:id/renew
// @desc    Create a renewal application from an existing license
// @access  Private
router.post('/:id/renew', auth, async (req, res) => {
  try {
    const license = await BreederLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ message: 'License application not found' });

    if (license.applicantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    const payload = buildLicensePayload(req.body, req.user, license.toObject());
    const missing = validateApplication(payload);
    if (missing.length > 0) {
      return res.status(400).json({ message: 'Required fields are missing', fields: missing });
    }

    const renewal = new BreederLicense({
      applicantId: req.user._id,
      applicationType: 'Renewal',
      renewalOf: license._id,
      ...payload,
      status: 'Pending',
      remarks: 'Renewal application submitted',
      submittedAt: new Date()
    });

    const savedRenewal = await renewal.save();
    res.status(201).json(savedRenewal);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to submit renewal application' });
  }
});

module.exports = router;
