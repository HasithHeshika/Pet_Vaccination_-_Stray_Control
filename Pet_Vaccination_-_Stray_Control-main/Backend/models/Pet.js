const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  petId: {
    type: String,
    required: true,
    unique: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  petName: {
    type: String,
    required: true,
    trim: true
  },
  petType: {
    type: String,
    required: true,
    enum: ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other']
  },
  petTypeOther: {
    type: String,
    trim: true
  },
  breed: {
    type: String,
    required: true,
    trim: true
  },
  breedOther: {
    type: String,
    trim: true
  },
  age: {
    years: { type: Number, required: true, min: 0 },
    months: { type: Number, required: true, min: 0, max: 11 }
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  microchipNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  medicalHistory: {
    allergies: { type: String, trim: true },
    existingConditions: { type: String, trim: true },
    specialNotes: { type: String, trim: true }
  },
  photoUrl: {
    type: String
  },
  qrCode: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Pet', petSchema);