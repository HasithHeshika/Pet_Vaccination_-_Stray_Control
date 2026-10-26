const mongoose = require('mongoose');

// Animal incident reports from the public (originally "stray reports").
// Existing documents without an incidentType are treated as stray sightings.
const INCIDENT_TYPES = ['violence', 'sick_injured', 'stray', 'other'];
const URGENCY_LEVELS = ['emergency', 'urgent', 'normal'];
const URGENCY_RANK = { emergency: 0, urgent: 1, normal: 2 };
const STATUS_RANK = { pending: 0, 'in-progress': 1, resolved: 2 };

// Default urgency when the reporter does not choose one
const DEFAULT_URGENCY = {
  violence: 'urgent',
  sick_injured: 'urgent',
  stray: 'normal',
  other: 'normal'
};

const strayReportSchema = new mongoose.Schema({
  incidentType: {
    type: String,
    enum: INCIDENT_TYPES,
    default: 'stray'
  },
  otherIncidentType: {
    type: String,
    trim: true,
    maxlength: 100
  },
  urgency: {
    type: String,
    enum: URGENCY_LEVELS,
    default: 'normal'
  },
  // Stored so the authority queue can sort emergencies first
  urgencyRank: {
    type: Number,
    default: URGENCY_RANK.normal
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  // Legacy single image link (older reports)
  image: {
    type: String,
    trim: true
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (images) => images.length <= 2,
      message: 'A report can have a maximum of two images'
    }
  },
  // Kept in sync with images so list views can show it without loading the photos
  imageCount: {
    type: Number,
    default: 0
  },
  reporterName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  reporterContact: {
    type: String,
    trim: true,
    maxlength: 150
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  // Stored so queues can sort pending before in-progress before resolved
  statusRank: {
    type: Number,
    default: 0
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

strayReportSchema.pre('validate', function setUrgencyRank(next) {
  this.urgencyRank = URGENCY_RANK[this.urgency] ?? URGENCY_RANK.normal;
  this.statusRank = STATUS_RANK[this.status] ?? STATUS_RANK.pending;
  if (this.isModified('images') || this.isNew) {
    this.imageCount = (this.images || []).length + (this.image ? 1 : 0);
  }
  next();
});

strayReportSchema.index({ status: 1, reportedAt: -1 });
strayReportSchema.index({ reportedAt: -1 });
strayReportSchema.index({ statusRank: 1, urgencyRank: 1, reportedAt: -1 });

const StrayReport = mongoose.model('StrayReport', strayReportSchema);

module.exports = StrayReport;
module.exports.INCIDENT_TYPES = INCIDENT_TYPES;
module.exports.URGENCY_LEVELS = URGENCY_LEVELS;
module.exports.DEFAULT_URGENCY = DEFAULT_URGENCY;
module.exports.STATUS_RANK = STATUS_RANK;
// Open reports first, then most urgent, then newest
module.exports.QUEUE_SORT = { statusRank: 1, urgencyRank: 1, reportedAt: -1 };
