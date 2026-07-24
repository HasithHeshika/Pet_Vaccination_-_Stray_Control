const mongoose = require('mongoose');

const lostReportSchema = new mongoose.Schema({
  petName: { type: String, required: true },
  breed: { type: String, required: true },
  color: { type: String, required: true },
  lastSeenLocation: { type: String, required: true },
  lastSeenDate: { type: Date, required: true },
  description: { type: String },
  contactInfo: { type: String, required: true },
  status: { type: String, enum: ['Lost', 'Found', 'Resolved'], default: 'Lost' },
  imageUrl: { type: String }, // To align with LostFoundFeed.jsx expected props
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LostReport', lostReportSchema);
