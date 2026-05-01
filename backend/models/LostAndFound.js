const mongoose = require('mongoose');

const LostAndFoundSchema = new mongoose.Schema(
  {
    // Post Details
    postType: {
      type: String,
      enum: ['lost', 'found'],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    
    // Pet Information
    petDetails: {
      species: {
        type: String,
        enum: ['dog', 'cat', 'other'],
        required: true
      },
      breed: String,
      color: String,
      size: {
        type: String,
        enum: ['small', 'medium', 'large', 'unknown']
      },
      age: String,
      distinguishingFeatures: String, // scars, marks, collar color, etc.
      photos: [String] // URLs to uploaded photos
    },
    
    // Location Information
    location: {
      address: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true,
        index: true
      },
      latitude: Number,
      longitude: Number,
      area: String // neighborhood/ward
    },
    
    // Timeline
    dateOfIncident: {
      type: Date,
      required: true
    },
    lastSeenTime: String,
    
    // Contact Information
    postedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: String,
      phone: {
        type: String,
        required: true
      },
      email: {
        type: String,
        match: /.+\@.+\..+/
      }
    },
    
    // Status & Engagement
    status: {
      type: String,
      enum: ['active', 'resolved', 'archived'],
      default: 'active',
      index: true
    },
    views: {
      type: Number,
      default: 0
    },
    matches: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      matchedPostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LostAndFound'
      },
      similarity: String, // description of why they match
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Responses & Comments
    responses: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      message: String,
      contact: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Resolution
    resolvedWith: {
      matchedPostId: mongoose.Schema.Types.ObjectId,
      resolvedDate: Date,
      notes: String
    },
    
    // Metadata
    tags: [String], // e.g., ['urgent', 'microchip', 'vaccinated']
    reward: {
      amount: Number,
      currency: String,
      offered: Boolean
    },
    
    // Flags & Moderation
    isFlagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for search functionality
LostAndFoundSchema.index({ title: 'text', description: 'text', 'petDetails.breed': 'text' });
LostAndFoundSchema.index({ 'location.city': 1, status: 1 });
LostAndFoundSchema.index({ postType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LostAndFound', LostAndFoundSchema);
