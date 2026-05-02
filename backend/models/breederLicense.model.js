const mongoose = require('mongoose');

const breederLicenseSchema = new mongoose.Schema({
    breederName: { type: String, required: true },
    licenseType: { type: String, enum: ['new', 'renewal'], required: true },
    applicationDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    authorityComments: { type: String },
    isCompliant: { type: Boolean, default: true }
});

module.exports = mongoose.model('BreederLicense', breederLicenseSchema);
