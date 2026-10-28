const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date },
  clinic: { type: String, trim: true },
  isVerified: { type: Boolean, default: false }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const adoptionListingSchema = new mongoose.Schema({
  petName: {
    type: String,
    required: true,
    trim: true
  },
  species: {
    type: String,
    enum: ['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'],
    required: true
  },
  breed: {
    type: String,
    trim: true,
    default: 'Mixed / Unknown'
  },
  age: {
    years: { type: Number, default: 0, min: 0 },
    months: { type: Number, default: 0, min: 0, max: 11 }
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Unknown'],
    default: 'Unknown'
  },
  photos: [{ type: String, trim: true }],
  description: {
    type: String,
    required: true,
    trim: true
  },
  healthRecords: [healthRecordSchema],
  isSpayedOrNeutered: {
    type: Boolean,
    default: false
  },
  isVaccinated: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: true
  },
  rehomingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  city: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  listedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Pending', 'Adopted', 'Cancelled'],
    default: 'Available'
  },
  applications: [applicationSchema],
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for common queries
adoptionListingSchema.index({ status: 1, createdAt: -1 });
adoptionListingSchema.index({ species: 1, status: 1 });
adoptionListingSchema.index({ city: 1, status: 1 });
adoptionListingSchema.index({ listedBy: 1 });

module.exports = mongoose.model('AdoptionListing', adoptionListingSchema);
