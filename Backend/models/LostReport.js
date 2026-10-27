const mongoose = require('mongoose');
const { makeThumbnail } = require('../utils/thumbnail');

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
  // Small WebP preview of the first photo, sent by lists instead of the full photo
  thumbnail: { type: String },
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

lostReportSchema.pre('save', async function syncThumbnail() {
  if (this.isModified('images') || this.isNew) {
    this.thumbnail = (await makeThumbnail((this.images || [])[0])) || undefined;
  }
});

lostReportSchema.index({ reportType: 1, status: 1, lastSeenDate: -1 });
lostReportSchema.index({ createdAt: -1 });

const LostReport = mongoose.model('LostReport', lostReportSchema);

// Lists (feed, dashboards): newest first, each with only its preview photo as images[0].
// The full photos never leave the database here; reports without a preview yet send their first photo.
LostReport.findForList = async (filter = {}, { limit, populate } = {}) => {
  const reports = await LostReport.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    ...(limit ? [{ $limit: limit }] : []),
    {
      $addFields: {
        images: {
          $cond: [
            { $ifNull: ['$thumbnail', false] },
            ['$thumbnail'],
            { $slice: [{ $ifNull: ['$images', []] }, 1] }
          ]
        }
      }
    },
    { $project: { thumbnail: 0 } }
  ]);
  return populate ? LostReport.populate(reports, populate) : reports;
};

module.exports = LostReport;
module.exports.REPORT_TYPES = REPORT_TYPES;
module.exports.SPECIES = SPECIES;
module.exports.OPEN_STATUS = OPEN_STATUS;
