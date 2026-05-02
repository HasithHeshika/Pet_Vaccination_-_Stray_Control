const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  fileType: {
    type: String,
    trim: true,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  previewUrl: {
    type: String,
    default: ''
  }
}, { _id: false });

const breederLicenseSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    unique: true,
    index: true
  },
  licenseId: {
    type: String,
    index: true,
    sparse: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  applicationType: {
    type: String,
    enum: ['New', 'Renewal'],
    default: 'New'
  },
  renewalOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BreederLicense'
  },
  breederName: {
    type: String,
    required: true,
    trim: true
  },
  nicOrBusinessRegNo: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  animalTypes: [{
    type: String,
    enum: ['Dog', 'Cat', 'Other']
  }],
  otherAnimalType: {
    type: String,
    trim: true,
    default: ''
  },
  numberOfAnimals: {
    type: Number,
    required: true,
    min: 0
  },
  facilityDescription: {
    type: String,
    required: true,
    trim: true
  },
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },
  documents: {
    idProof: documentSchema,
    facilityImages: [documentSchema],
    certificates: [documentSchema]
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Expired'],
    default: 'Pending',
    index: true
  },
  remarks: {
    type: String,
    default: ''
  },
  issueDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true
});

breederLicenseSchema.pre('validate', async function assignIds(next) {
  if (!this.applicationId) {
    this.applicationId = `BLA-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  if (this.status === 'Approved' && !this.licenseId) {
    this.licenseId = `BRL-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
  }

  next();
});

module.exports = mongoose.model('BreederLicense', breederLicenseSchema);
