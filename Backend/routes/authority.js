const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Pet = require('../models/Pet');
const Vaccination = require('../models/Vaccination');
const StrayReport = require('../models/StrayReport');
const LostReport = require('../models/LostReport');
const BreederLicense = require('../models/BreederLicense');

const licenseSelect = '-documents.idProof.previewUrl -documents.facilityImages.previewUrl -documents.certificates.previewUrl';

const calculateVaccinationCompliance = async () => {
  const totalPets = await Pet.countDocuments();
  if (totalPets === 0) {
    return { totalPets: 0, compliantPets: 0, complianceRate: 0 };
  }

  const now = new Date();
  const compliantPetIds = await Vaccination.distinct('pet', {
    status: { $in: ['administered', 'scheduled'] },
    nextDueDate: { $gte: now }
  });

  return {
    totalPets,
    compliantPets: compliantPetIds.length,
    complianceRate: Math.round((compliantPetIds.length / totalPets) * 100)
  };
};

const normalizeLostReport = (report, foundReports = []) => {
  const reportObject = report.toObject ? report.toObject() : report;
  const possibleMatches = reportObject.status === 'Lost'
    ? foundReports
      .filter((found) => {
        const sameBreed = found.breed?.toLowerCase() === reportObject.breed?.toLowerCase();
        const sameColor = found.color?.toLowerCase() === reportObject.color?.toLowerCase();
        return sameBreed || sameColor;
      })
      .slice(0, 3)
      .map((found) => ({
        _id: found._id,
        petName: found.petName,
        location: found.lastSeenLocation,
        breed: found.breed,
        color: found.color
      }))
    : [];

  return {
    _id: reportObject._id,
    petName: reportObject.petName,
    breed: reportObject.breed,
    color: reportObject.color,
    imageUrl: reportObject.imageUrl,
    location: reportObject.lastSeenLocation,
    status: reportObject.status,
    reportedBy: reportObject.reportedBy,
    createdAt: reportObject.createdAt,
    possibleMatches
  };
};

// @route   GET /api/authority/dashboard
// @desc    Authority dashboard summary for municipal officers
// @access  Private/Admin
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    const [
      vaccinationCompliance,
      totalBreeders,
      pendingLicenseRequests,
      licenses,
      pets,
      lostFoundReports,
      strayReportsCount,
      strayReports
    ] = await Promise.all([
      calculateVaccinationCompliance(),
      BreederLicense.distinct('applicantId').then((ids) => ids.length),
      BreederLicense.countDocuments({ status: 'Pending' }),
      BreederLicense.find()
        .populate('applicantId', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(20)
        .select(licenseSelect),
      Pet.find()
        .populate('owner', 'fullName email phone')
        .sort({ registrationDate: -1 })
        .limit(12),
      LostReport.find()
        .populate('reportedBy', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(30),
      StrayReport.countDocuments(),
      StrayReport.find()
        .populate('reportedBy', 'fullName email phone')
        .sort({ reportedAt: -1 })
        .limit(12)
    ]);

    const foundReports = lostFoundReports.filter((report) => report.status === 'Found');
    const lostFound = lostFoundReports.map((report) => normalizeLostReport(report, foundReports));

    res.json({
      metrics: {
        totalRegisteredPets: vaccinationCompliance.totalPets,
        totalBreeders,
        pendingLicenseRequests,
        vaccinationComplianceRate: vaccinationCompliance.complianceRate,
        compliantPets: vaccinationCompliance.compliantPets,
        strayReportsCount
      },
      licenses,
      pets,
      lostFound,
      strayReports
    });
  } catch (error) {
    console.error('Authority dashboard error:', error);
    res.status(500).json({ message: 'Failed to load authority dashboard' });
  }
});

module.exports = router;
