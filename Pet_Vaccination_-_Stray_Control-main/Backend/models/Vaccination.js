const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  vaccineType: {
    type: String,
    required: true,
    enum: [
      'Rabies',
      'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
      'Bordetella (Kennel Cough)',
      'Leptospirosis',
      'Lyme Disease',
      'Canine Influenza',
      'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
      'FeLV (Feline Leukemia)',
      'FIV (Feline Immunodeficiency Virus)',
      'Other'
    ]
  },
  vaccineName: {
    type: String,
    required: true
  },
  dateAdministered: {
    type: Date,
    required: true
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  veterinarianName: {
    type: String,
    required: true
  },
  clinicName: {
    type: String
  },
  batchNumber: {
    type: String
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'administered', 'overdue', 'cancelled'],
    default: 'administered'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentDate: {
    type: Date
  },
  notificationPreference: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
vaccinationSchema.index({ pet: 1, nextDueDate: 1 });
vaccinationSchema.index({ nextDueDate: 1, status: 1 });
vaccinationSchema.index({ reminderSent: 1, nextDueDate: 1 });

// Virtual to check if vaccination is overdue
vaccinationSchema.virtual('isOverdue').get(function() {
  return this.status !== 'administered' && new Date() > this.nextDueDate;
});

// Virtual to check if reminder should be sent (7 days before)
vaccinationSchema.virtual('shouldSendReminder').get(function() {
  const now = new Date();
  const dueDate = new Date(this.nextDueDate);
  const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  return daysDiff <= 7 && daysDiff >= 0 && !this.reminderSent;
});

// Method to mark reminder as sent
vaccinationSchema.methods.markReminderSent = function() {
  this.reminderSent = true;
  this.reminderSentDate = new Date();
  return this.save();
};

// Static method to find upcoming vaccinations
vaccinationSchema.statics.findUpcoming = function(daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return this.find({
    nextDueDate: { $gte: now, $lte: futureDate },
    status: { $in: ['scheduled', 'administered'] }
  }).populate('pet');
};

// Static method to find overdue vaccinations
vaccinationSchema.statics.findOverdue = function() {
  const now = new Date();
  
  return this.find({
    nextDueDate: { $lt: now },
    status: { $ne: 'administered' }
  }).populate('pet');
};

// Static method to find vaccinations needing reminders
vaccinationSchema.statics.findNeedingReminders = function() {
  const now = new Date();
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 7);
  
  return this.find({
    nextDueDate: { $lte: reminderDate, $gte: now },
    reminderSent: false,
    status: { $in: ['scheduled', 'administered'] }
  }).populate({
    path: 'pet',
    populate: { path: 'owner' }
  });
};

module.exports = mongoose.model('Vaccination', vaccinationSchema);
