const mongoose = require('mongoose');

const breederLicenseSchema = new mongoose.Schema({
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  facilityAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Expired'],
    default: 'Pending'
  },
  documentsUrl: {
    type: String,
    required: false // Optional for now, can be an S3 URL or local path
  },
  issueDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BreederLicense', breederLicenseSchema);
