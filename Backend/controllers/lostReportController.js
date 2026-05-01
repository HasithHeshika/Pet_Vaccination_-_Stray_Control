const LostReport = require('../models/LostReport');

exports.createLostReport = async (req, res) => {
  try {
    // reportedBy comes from auth middleware
    const reportData = { ...req.body, reportedBy: req.user._id };
    const report = new LostReport(reportData);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLostReports = async (req, res) => {
  try {
    const reports = await LostReport.find().sort({ createdAt: -1 }).populate('reportedBy', 'fullName email');
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLostReportById = async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateLostReport = async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Check if user is creator or admin
    if (report.reportedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this report' });
    }

    const updatedReport = await LostReport.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteLostReport = async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user is creator or admin
    if (report.reportedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    await report.deleteOne();
    res.status(200).json({ message: 'Report removed successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    
    // If setting to anything other than Resolved or In Progress, check if owner or admin
    if (status !== 'Resolved' && status !== 'In Progress') {
      if (report.reportedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this status' });
      }
    }

    report.status = status;
    await report.save();
    res.status(200).json(report);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
