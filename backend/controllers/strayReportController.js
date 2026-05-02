const StrayReport = require('../models/StrayReport');

const allowedStatuses = ['pending', 'in-progress', 'resolved'];

const normalizeReport = (report) => ({
  ...report.toObject(),
  reportedBy: report.reportedBy
    ? {
        _id: report.reportedBy._id,
        fullName: report.reportedBy.fullName,
        email: report.reportedBy.email
      }
    : null
});

exports.createStrayReport = async (req, res) => {
  try {
    const { location, description, image, status, reportedBy, assignedTo, authorityNotes } = req.body;

    const strayReport = new StrayReport({
      location,
      description,
      image,
      status: allowedStatuses.includes(status) ? status : 'pending',
      reportedBy,
      assignedTo,
      authorityNotes
    });

    await strayReport.save();

    const savedReport = await StrayReport.findById(strayReport._id).populate('reportedBy', 'fullName email');

    return res.status(201).json({
      message: 'Stray report submitted successfully',
      report: normalizeReport(savedReport)
    });
  } catch (error) {
    console.error('Create stray report error:', error);
    return res.status(500).json({ message: 'Server error while creating stray report' });
  }
};

exports.getStrayReports = async (req, res) => {
  try {
    const reports = await StrayReport.find()
      .populate('reportedBy', 'fullName email')
      .sort({ reportedAt: -1 });

    return res.json({
      reports: reports.map(normalizeReport),
      count: reports.length
    });
  } catch (error) {
    console.error('Get stray reports error:', error);
    return res.status(500).json({ message: 'Server error while fetching stray reports' });
  }
};

exports.getStrayReportById = async (req, res) => {
  try {
    const report = await StrayReport.findById(req.params.id).populate('reportedBy', 'fullName email');

    if (!report) {
      return res.status(404).json({ message: 'Stray report not found' });
    }

    return res.json({ report: normalizeReport(report) });
  } catch (error) {
    console.error('Get stray report error:', error);
    return res.status(500).json({ message: 'Server error while fetching stray report' });
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
      return res.status(404).json({ message: 'Stray report not found' });
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

    const updatedReport = await StrayReport.findById(report._id).populate('reportedBy', 'fullName email');

    return res.json({
      message: 'Stray report status updated successfully',
      report: normalizeReport(updatedReport)
    });
  } catch (error) {
    console.error('Update stray report status error:', error);
    return res.status(500).json({ message: 'Server error while updating stray report status' });
  }
};
