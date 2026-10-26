const StrayReport = require('../models/StrayReport');
const User = require('../models/User');
const { sendIncidentAlertEmail } = require('../services/notificationService');

const { DEFAULT_URGENCY } = StrayReport;
const allowedStatuses = ['pending', 'in-progress', 'resolved'];

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
      reporterContact
    } = req.body;

    // Status, assignment and notes are set by the authority; the reporter account comes from the login token
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
      // Only what the reporter typed; a logged-in report is still linked to the account via reportedBy
      reporterName,
      reporterContact,
      status: 'pending',
      reportedBy: req.user?._id
    });

    await strayReport.save();

    if (strayReport.urgency === 'emergency' || strayReport.urgency === 'urgent') {
      // Don't make the reporter wait for email delivery
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

exports.getStrayReports = async (req, res) => {
  try {
    // Open reports first, then most urgent, then newest
    const reports = await StrayReport.find()
      .select(LIST_EXCLUDE)
      .populate('reportedBy', 'fullName email')
      .sort(StrayReport.QUEUE_SORT);

    return res.json({
      reports: reports.map(normalizeReport),
      count: reports.length
    });
  } catch (error) {
    console.error('Get stray reports error:', error);
    return res.status(500).json({ message: 'Server error while fetching reports' });
  }
};

exports.getStrayReportById = async (req, res) => {
  try {
    const report = await StrayReport.findById(req.params.id).populate('reportedBy', 'fullName email');

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
