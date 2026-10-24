const LostReport = require('../models/LostReport');

// Fields a reporter is allowed to set or edit (never reportedBy or createdAt)
const EDITABLE_FIELDS = ['petName', 'breed', 'color', 'lastSeenLocation', 'lastSeenDate', 'description', 'contactInfo', 'imageUrl', 'status'];

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

exports.createLostReport = async (req, res) => {
  try {
    // reportedBy comes from auth middleware, never from the request body
    const reportData = { ...pickEditable(req.body), reportedBy: req.user._id };
    if (reportData.status === 'In Progress' && !req.user.isAdmin) {
      delete reportData.status;
    }
    const report = new LostReport(reportData);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    sendValidationOr500(res, error, 'Create report error:');
  }
};

exports.getLostReports = async (req, res) => {
  try {
    // Public feed: show the reporter's name only; the reporter chooses what goes in contactInfo
    const reports = await LostReport.find().sort({ createdAt: -1 }).populate('reportedBy', 'fullName');
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

    Object.assign(report, updates);
    await report.save();
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
    res.status(200).json(report);
  } catch (error) {
    sendValidationOr500(res, error, 'Update status error:');
  }
};
