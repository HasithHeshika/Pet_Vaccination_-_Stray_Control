const mongoose = require('mongoose');

// Lost & Found reports. A "lost" report is filed by an owner whose pet is missing;
// a "found" report by someone who has found a pet. Both feed the match-review system.
const REPORT_TYPES = ['lost', 'found'];
const SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other'];
// Status shown while a report is open, by type
const OPEN_STATUS = { lost: 'Lost', found: 'Found' };

const lostReportSchema = new mongoose.Schema({
  reportType: { type: String, enum: REPORT_TYPES, default: 'lost' },
  species: { type: String, enum: SPECIES },
  speciesOther: { type: String, trim: true, maxlength: 60 },
  petName: { type: String, required: true },
  breed: { type: String, required: true },
  color: { type: String, required: true },
  // Lost: where/when the pet was last seen. Found: where/when it was found.
  lastSeenLocation: { type: String, required: true },
  lastSeenDate: { type: Date, required: true },
  coordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  description: { type: String },
  contactInfo: { type: String, required: true },
  status: { type: String, enum: ['Lost', 'Found', 'In Progress', 'Resolved'], default: 'Lost' },
  imageUrl: { type: String }, // Legacy single photo link
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (images) => images.length <= 2,
      message: 'A report can have a maximum of two images'
    }
  },
  // Kept in sync with images so lists can show it without loading the photos
  imageCount: { type: Number, default: 0 },
  // Lost reports: the owner's registered pet this report is about
  linkedPet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
  // Found reports: Pet ID read from the animal's QR tag, if any
  tagPetId: { type: String, trim: true, uppercase: true, maxlength: 40 },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

lostReportSchema.pre('validate', function syncImageCount(next) {
  if (this.isModified('images') || this.isModified('imageUrl') || this.isNew) {
    this.imageCount = (this.images || []).length + (this.imageUrl ? 1 : 0);
  }
  next();
});

lostReportSchema.index({ reportType: 1, status: 1, lastSeenDate: -1 });

const LostReport = mongoose.model('LostReport', lostReportSchema);

module.exports = LostReport;
module.exports.REPORT_TYPES = REPORT_TYPES;
module.exports.SPECIES = SPECIES;
module.exports.OPEN_STATUS = OPEN_STATUS;
