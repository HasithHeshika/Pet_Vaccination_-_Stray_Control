const mongoose = require('mongoose');

const strayReportSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: String,
    trim: true
  },
  authorityNotes: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

strayReportSchema.index({ status: 1, reportedAt: -1 });
strayReportSchema.index({ reportedAt: -1 });

module.exports = mongoose.model('StrayReport', strayReportSchema);
