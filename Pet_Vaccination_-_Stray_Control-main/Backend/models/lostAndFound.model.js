const mongoose = require('mongoose');

const lostAndFoundSchema = new mongoose.Schema({
    petName: { type: String, required: true },
    petType: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    dateReported: { type: Date, default: Date.now },
    contactInfo: { type: String, required: true },
    status: { type: String, enum: ['lost', 'found'], default: 'lost' },
    imageUrl: { type: String }
});

module.exports = mongoose.model('LostAndFound', lostAndFoundSchema);
