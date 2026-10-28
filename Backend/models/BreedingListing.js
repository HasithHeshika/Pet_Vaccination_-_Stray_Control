const mongoose = require('mongoose');

const healthClearanceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  result: { type: String, trim: true },
  clinic: { type: String, trim: true },
  date: { type: Date }
}, { _id: false });

const contactInquirySchema = new mongoose.Schema({
  inquirer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  petName: { type: String, trim: true },
  petBreed: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const breedingListingSchema = new mongoose.Schema({
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
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  age: {
    years: { type: Number, default: 0, min: 0 },
    months: { type: Number, default: 0, min: 0, max: 11 }
  },
  photos: [{ type: String, trim: true }],
  pedigreeDetails: {
    type: String,
    trim: true,
    default: ''
  },
  // Optional link to owner's approved breeder license
  breederLicense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BreederLicense',
    default: null
  },
  healthClearances: [healthClearanceSchema],
  studTerms: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Mated', 'Paused'],
    default: 'Active'
  },
  inquiries: [contactInquirySchema],
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for common queries
breedingListingSchema.index({ status: 1, createdAt: -1 });
breedingListingSchema.index({ species: 1, breed: 1, status: 1 });
breedingListingSchema.index({ gender: 1, status: 1 });
breedingListingSchema.index({ city: 1, status: 1 });
breedingListingSchema.index({ owner: 1 });

module.exports = mongoose.model('BreedingListing', breedingListingSchema);
