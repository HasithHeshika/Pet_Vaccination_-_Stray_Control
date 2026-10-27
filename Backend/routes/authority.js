const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Pet = require('../models/Pet');
const Vaccination = require('../models/Vaccination');
const StrayReport = require('../models/StrayReport');
const LostReport = require('../models/LostReport');
const BreederLicense = require('../models/BreederLicense');
const PetMatch = require('../models/PetMatch');

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

// Lost & Found card for the dashboard (first photo only). Possible matches are reviewed on /admin/matches.
const normalizeLostReport = (report) => {
  const r = report.toObject ? report.toObject() : report;
  return {
    _id: r._id,
    reportType: r.reportType || 'lost',
    petName: r.petName,
    species: r.species === 'Other' ? r.speciesOther : r.species,
    breed: r.breed,
    color: r.color,
    imageUrl: (r.images && r.images[0]) || r.imageUrl,
    location: r.lastSeenLocation,
    status: r.status,
    reportedBy: r.reportedBy,
    createdAt: r.createdAt
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
      LostReport.find({}, { images: { $slice: 1 } })
        .populate('reportedBy', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(30),
      StrayReport.countDocuments(),
      // Open incidents first, most urgent first; photos are loaded separately per report
      StrayReport.find()
        .select('-images')
        .populate('reportedBy', 'fullName email phone')
        .sort(StrayReport.QUEUE_SORT)
        .limit(20)
    ]);
    const openUrgentIncidents = await StrayReport.countDocuments({
      status: { $ne: 'resolved' },
      urgency: { $in: ['emergency', 'urgent'] }
    });

    const lostFound = lostFoundReports.map((report) => normalizeLostReport(report));
    const pendingMatches = await PetMatch.countDocuments({ status: 'suggested' });

    res.json({
      metrics: {
        totalRegisteredPets: vaccinationCompliance.totalPets,
        totalBreeders,
        pendingLicenseRequests,
        vaccinationComplianceRate: vaccinationCompliance.complianceRate,
        compliantPets: vaccinationCompliance.compliantPets,
        strayReportsCount,
        openUrgentIncidents,
        pendingMatches
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
