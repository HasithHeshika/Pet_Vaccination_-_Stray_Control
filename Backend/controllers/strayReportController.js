const mongoose = require('mongoose');
const StrayReport = require('../models/StrayReport');
const User = require('../models/User');
const { sendIncidentAlertEmail } = require('../services/notificationService');

const { DEFAULT_URGENCY } = StrayReport;
const allowedStatuses = ['pending', 'in-progress', 'resolved'];
const allowedCategories = [
  'Aggressive Stray Alert',
  'Injured Animal in Need',
  'Stray Dog Pack',
  'Rabies Suspect & Welfare',
  'Noise Disturbance',
  'Animal Cruelty / Abuse',
  'Other'
];

// Photos are large (base64); lists only report how many there are, the detail view returns them
const LIST_EXCLUDE = '-images';

const normalizeReport = (report) => {
  const data = report.toObject();
  return {
    ...data,
    incidentType: data.incidentType || 'stray',
    urgency: data.urgency || 'normal',
    // Older reports only have the single legacy image link
    imageCount: Math.max(data.imageCount || 0, data.image ? 1 : 0),
    reportedBy: report.reportedBy
      ? {
          _id: report.reportedBy._id,
          fullName: report.reportedBy.fullName,
          email: report.reportedBy.email
        }
      : null
  };
};

// Who receives emails about urgent incidents: AUTHORITY_ALERT_EMAILS (comma separated),
// otherwise every administrator account.
const getAlertRecipients = async () => {
  const configured = (process.env.AUTHORITY_ALERT_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;

  const admins = await User.find({ $or: [{ isAdmin: true }, { role: 'admin' }] }).select('email');
  return admins.map((user) => user.email).filter(Boolean);
};

// Public reports can set their own urgency, so cap alert emails overall to stop
// anyone flooding the authority's inbox. Reports above the cap still appear on the dashboard.
const ALERT_WINDOW_MS = 60 * 60 * 1000;
const MAX_ALERTS_PER_WINDOW = Number(process.env.MAX_INCIDENT_ALERTS_PER_HOUR) || 20;
let alertWindow = { start: Date.now(), count: 0 };

const takeAlertSlot = () => {
  const now = Date.now();
  if (now - alertWindow.start >= ALERT_WINDOW_MS) {
    alertWindow = { start: now, count: 0 };
  }
  if (alertWindow.count >= MAX_ALERTS_PER_WINDOW) return false;
  alertWindow.count += 1;
  return true;
};

const alertAuthority = async (report) => {
  if (!takeAlertSlot()) {
    console.warn(`Incident alert email skipped (more than ${MAX_ALERTS_PER_WINDOW} alerts this hour) for report ${report._id}`);
    return;
  }
  try {
    const recipients = await getAlertRecipients();
    await Promise.all(recipients.map((to) => sendIncidentAlertEmail(to, report)));
  } catch (error) {
    console.error('Incident alert email error:', error);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Create Incident / Stray Report
// ────────────────────────────────────────────────────────────────────────────
exports.createStrayReport = async (req, res) => {
  try {
    const {
      incidentType = 'stray',
      otherIncidentType,
      urgency,
      location,
      coordinates,
      description,
      image,
      images = [],
      reporterName,
      reporterContact,
      category,
      status,
      assignedTo,
      authorityNotes
    } = req.body;

    // Parse category from request body or fall back to parsing from description
    let resolvedCategory = 'Other';
    if (category && allowedCategories.includes(category)) {
      resolvedCategory = category;
    } else if (description) {
      const match = description.match(/^\[([^\]]+)\]/);
      if (match && allowedCategories.includes(match[1])) {
        resolvedCategory = match[1];
      }
    }

    const strayReport = new StrayReport({
      incidentType,
      otherIncidentType: incidentType === 'other' ? otherIncidentType : undefined,
      urgency: urgency || DEFAULT_URGENCY[incidentType] || 'normal',
      location,
      coordinates: coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined
        ? { lat: Number(coordinates.lat), lng: Number(coordinates.lng) }
        : undefined,
      description,
      image,
      images,
      reporterName,
      reporterContact,
      status: req.user?.isAdmin && allowedStatuses.includes(status) ? status : 'pending',
      assignedTo,
      authorityNotes,
      category: resolvedCategory,
      reportedBy: req.user?._id
    });

    await strayReport.save();

    if (strayReport.urgency === 'emergency' || strayReport.urgency === 'urgent') {
      alertAuthority(strayReport);
    }

    const savedReport = await StrayReport.findById(strayReport._id)
      .select(LIST_EXCLUDE)
      .populate('reportedBy', 'fullName email');

    return res.status(201).json({
      message: 'Incident report submitted successfully',
      report: normalizeReport(savedReport)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({ message: firstError?.message || 'Invalid report details' });
    }
    console.error('Create stray report error:', error);
    return res.status(500).json({ message: 'Server error while creating the report' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Get Stray / Incident Reports (with filter & pagination)
// ────────────────────────────────────────────────────────────────────────────
exports.getStrayReports = async (req, res) => {
  try {
    const { category, status, isPublic, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category && allowedCategories.includes(category)) {
      query.category = category;
    }
    if (status && allowedStatuses.includes(status)) {
      query.status = status;
    }
    if (isPublic !== 'false') {
      query.isPublic = true;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await StrayReport.countDocuments(query);

    const reports = await StrayReport.find(query)
      .select(LIST_EXCLUDE)
      .populate('reportedBy', 'fullName email')
      .sort(StrayReport.QUEUE_SORT)
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      reports: reports.map(normalizeReport),
      count: reports.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get stray reports error:', error);
    return res.status(500).json({ message: 'Server error while fetching reports' });
  }
};

exports.getStrayReportById = async (req, res) => {
  try {
    const report = await StrayReport.findById(req.params.id)
      .populate('reportedBy', 'fullName email')
      .populate('supporters', 'fullName');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.json({ report: normalizeReport(report) });
  } catch (error) {
    console.error('Get stray report error:', error);
    return res.status(500).json({ message: 'Server error while fetching the report' });
  }
};

exports.updateStrayReportStatus = async (req, res) => {
  try {
    const { status, authorityNotes, assignedTo } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const report = await StrayReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;

    if (authorityNotes !== undefined) {
      report.authorityNotes = authorityNotes;
    }

    if (assignedTo !== undefined) {
      report.assignedTo = assignedTo;
    }

    report.resolvedAt = status === 'resolved' ? (report.resolvedAt || new Date()) : null;

    await report.save();

    const updatedReport = await StrayReport.findById(report._id)
      .select(LIST_EXCLUDE)
      .populate('reportedBy', 'fullName email');

    return res.json({
      message: 'Report status updated successfully',
      report: normalizeReport(updatedReport)
    });
  } catch (error) {
    console.error('Update stray report status error:', error);
    return res.status(500).json({ message: 'Server error while updating report status' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// NEW — Community engagement: Support (upvote) toggle
// @route   POST /api/stray-reports/:id/support
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.toggleSupport = async (req, res) => {
  try {
    const report = await StrayReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Stray report not found' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
    const alreadySupported = report.supporters.some(id => id.equals(userId));

    if (alreadySupported) {
      report.supporters = report.supporters.filter(id => !id.equals(userId));
      report.supportCount = Math.max(0, report.supportCount - 1);
    } else {
      report.supporters.push(userId);
      report.supportCount = report.supporters.length;
    }

    await report.save();

    return res.json({
      message: alreadySupported ? 'Support removed' : 'Support added',
      supported: !alreadySupported,
      supportCount: report.supportCount
    });
  } catch (error) {
    console.error('Toggle support error:', error);
    return res.status(500).json({ message: 'Server error while toggling support' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// NEW — Community engagement: Add a comment to a report
// @route   POST /api/stray-reports/:id/comments
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const report = await StrayReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Stray report not found' });
    }

    const comment = {
      author: req.user.id || req.user._id,
      authorName: req.user.fullName || req.user.email || 'Community Member',
      text: text.trim(),
      createdAt: new Date()
    };

    report.comments.push(comment);
    await report.save();

    const addedComment = report.comments[report.comments.length - 1];

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: addedComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ message: 'Server error while adding comment' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// NEW — Get all comments for a stray report
// @route   GET /api/stray-reports/:id/comments
// @access  Public
// ────────────────────────────────────────────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const report = await StrayReport.findById(req.params.id).select('comments');

    if (!report) {
      return res.status(404).json({ message: 'Stray report not found' });
    }

    return res.json({
      comments: report.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      count: report.comments.length
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({ message: 'Server error while fetching comments' });
  }
};
