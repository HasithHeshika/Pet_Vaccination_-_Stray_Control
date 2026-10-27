const LostReport = require('../models/LostReport');
const Pet = require('../models/Pet');
const PetMatch = require('../models/PetMatch');
const { queueMatchingForReport } = require('../services/matching/matchService');

const { OPEN_STATUS, REPORT_TYPES } = LostReport;

// Fields a reporter is allowed to set or edit (never reportedBy, reportType or createdAt)
const EDITABLE_FIELDS = [
  'petName', 'breed', 'color', 'lastSeenLocation', 'lastSeenDate', 'description', 'contactInfo',
  'imageUrl', 'status', 'species', 'speciesOther', 'images', 'coordinates', 'tagPetId'
];

const pickEditable = (body = {}) => EDITABLE_FIELDS.reduce((data, key) => {
  if (body[key] !== undefined) data[key] = body[key];
  return data;
}, {});

const isOwnerOrAdmin = (report, user) =>
  user.isAdmin || report.reportedBy.toString() === user._id.toString();

const sendValidationOr500 = (res, error, logLabel) => {
  if (error.name === 'ValidationError') {
    const firstError = Object.values(error.errors)[0];
    return res.status(400).json({ message: firstError?.message || 'Invalid report details' });
  }
  console.error(logLabel, error);
  return res.status(500).json({ message: 'Server error' });
};

// Feed and lists send only the first photo; GET /:id returns all of them
const LIST_PROJECTION = { images: { $slice: 1 } };

exports.createLostReport = async (req, res) => {
  try {
    // The mobile app historically sent `type`; accept it as an alias
    const requestedType = String(req.body.reportType || req.body.type || 'lost').toLowerCase();
    const reportType = REPORT_TYPES.includes(requestedType) ? requestedType : 'lost';

    // reportedBy comes from auth middleware, never from the request body
    const reportData = { ...pickEditable(req.body), reportType, reportedBy: req.user._id };
    // A new report always starts open; status changes go through the status endpoint
    reportData.status = OPEN_STATUS[reportType];

    if (reportType === 'lost') {
      delete reportData.tagPetId;
      if (req.body.linkedPet) {
        const pet = await Pet.findById(req.body.linkedPet);
        if (!pet || pet.owner.toString() !== req.user._id.toString()) {
          return res.status(400).json({ message: 'You can only link one of your own registered pets' });
        }
        reportData.linkedPet = pet._id;
        // Fill gaps from the registered pet so the match has the best data
        reportData.petName = reportData.petName || pet.petName;
        reportData.species = reportData.species || pet.petType;
        if (pet.petType === 'Other' && !reportData.speciesOther) reportData.speciesOther = pet.petTypeOther;
        reportData.breed = reportData.breed || (pet.breed === 'Other' ? pet.breedOther : pet.breed);
        reportData.color = reportData.color || pet.color;
        if (!reportData.images || reportData.images.length === 0) {
          reportData.images = (pet.photoUrls || []).filter((p) => p.startsWith('data:image/')).slice(0, 2);
        }
      }
    } else {
      // Finders often don't know the name or breed
      reportData.petName = reportData.petName || 'Unknown';
      reportData.breed = reportData.breed || 'Unknown';
    }

    const report = new LostReport(reportData);
    await report.save();
    queueMatchingForReport(report);
    res.status(201).json(report);
  } catch (error) {
    sendValidationOr500(res, error, 'Create report error:');
  }
};

exports.getLostReports = async (req, res) => {
  try {
    const filter = {};
    if (REPORT_TYPES.includes(req.query.type)) filter.reportType = req.query.type;
    // Public feed: show the reporter's name only; the reporter chooses what goes in contactInfo
    const reports = await LostReport.find(filter, LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'fullName');
    res.status(200).json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLostReportById = async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.id).populate('reportedBy', 'fullName');
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLostReport = async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user is creator or admin
    if (!isOwnerOrAdmin(report, req.user)) {
      return res.status(403).json({ message: 'Not authorized to update this report' });
    }

    const updates = pickEditable(req.body);
    if (updates.status === 'In Progress' && report.status !== 'In Progress' && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can set status to In Progress' });
    }
    if (report.reportType === 'lost') delete updates.tagPetId;

    Object.assign(report, updates);
    await report.save();
    queueMatchingForReport(report);
    res.status(200).json(report);
  } catch (error) {
    sendValidationOr500(res, error, 'Update report error:');
  }
};

exports.deleteLostReport = async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user is creator or admin
    if (!isOwnerOrAdmin(report, req.user)) {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    await report.deleteOne();
    await PetMatch.deleteMany({ $or: [{ foundReport: report._id }, { lostReport: report._id }] });
    res.status(200).json({ message: 'Report removed successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLostReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const report = await LostReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (status === 'In Progress' && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can set status to In Progress' });
    }

    // Every other status change (including Resolved) is limited to the reporter or an admin
    if (!isOwnerOrAdmin(report, req.user)) {
      return res.status(403).json({ message: 'Not authorized to update this status' });
    }

    report.status = status;
    await report.save();
    queueMatchingForReport(report);
    res.status(200).json(report);
  } catch (error) {
    sendValidationOr500(res, error, 'Update status error:');
  }
};
