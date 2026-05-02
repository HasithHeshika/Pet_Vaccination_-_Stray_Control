const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['idProof', 'facilityImage', 'certificate'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const activitySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true
  },
  note: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const breederLicenseSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: true,
    unique: true
  },
  licenseId: {
    type: String,
    unique: true,
    sparse: true
  },
  breeder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicationType: {
    type: String,
    enum: ['new', 'renewal'],
    default: 'new'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'expired'],
    default: 'draft'
  },
  personalDetails: {
    breederName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true }
  },
  breedingDetails: {
    animalTypes: [{ type: String, trim: true }],
    numberOfAnimals: { type: Number, required: true, min: 0 },
    facilityDescription: { type: String, required: true, trim: true },
    yearsOfExperience: { type: Number, required: true, min: 0 }
  },
  documents: [documentSchema],
  issueDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  },
  complianceRecords: [{
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['compliant', 'needs_review', 'non_compliant'],
      default: 'needs_review'
    },
    notes: { type: String, trim: true },
    recordedAt: { type: Date, default: Date.now }
  }],
  activity: [activitySchema]
}, {
  timestamps: true
});

breederLicenseSchema.pre('validate', async function(next) {
  if (!this.applicationId) {
    const count = await mongoose.model('BreederLicense').countDocuments();
    this.applicationId = `BLA-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('BreederLicense', breederLicenseSchema);
