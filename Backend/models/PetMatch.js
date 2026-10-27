const mongoose = require('mongoose');

// A possible match between a "found" report and either a "lost" report or a registered pet.
// Created by services/matching; an administrator confirms or rejects it before anyone is notified.
const petMatchSchema = new mongoose.Schema({
  foundReport: { type: mongoose.Schema.Types.ObjectId, ref: 'LostReport', required: true },
  candidateType: { type: String, enum: ['lost_report', 'registered_pet'], required: true },
  lostReport: { type: mongoose.Schema.Types.ObjectId, ref: 'LostReport', default: null },
  registeredPet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },

  // Rule-based score (0-100) and what it was made of
  score: { type: Number, required: true, min: 0, max: 100 },
  breakdown: {
    species: Number,
    breed: Number,
    colour: Number,
    distance: Number,
    time: Number,
    distanceKm: Number,
    daysApart: Number,
    tagMatch: Boolean
  },

  // Filled by an AI provider once one is configured (services/matching/aiProviders)
  ai: {
    provider: String,
    model: String,
    verdict: { type: String, enum: ['high', 'possible', 'unlikely', null], default: null },
    score: Number,
    reasons: [String],
    checkedAt: Date,
    error: String
  },

  status: { type: String, enum: ['suggested', 'confirmed', 'rejected'], default: 'suggested' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNote: { type: String, trim: true, maxlength: 500 },
  notifiedAt: Date
}, { timestamps: true });

// Re-running matching updates the same record instead of creating duplicates
petMatchSchema.index({ foundReport: 1, lostReport: 1, registeredPet: 1 }, { unique: true });
petMatchSchema.index({ status: 1, score: -1 });

module.exports = mongoose.model('PetMatch', petMatchSchema);
