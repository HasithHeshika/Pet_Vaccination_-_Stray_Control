// Re-issues every pet's QR code so it points at the current FRONTEND_URL.
// Run once after deploying (pets registered earlier may point at http://localhost:3000):
//   cd Backend && node scripts/regenerate-qr-codes.js
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const Pet = require('../models/Pet');
const { generateQRCode } = require('../utils/qrGenerator');
const { getFrontendUrl } = require('../utils/frontendUrl');

const run = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_management';
  await mongoose.connect(mongoUri);
  console.log(`Regenerating QR codes to point at ${getFrontendUrl()}/pet-profile/<petId>`);

  const pets = await Pet.find({}, 'petId');
  let updated = 0;

  for (const pet of pets) {
    const qrCode = await generateQRCode({ petId: pet.petId });
    await Pet.updateOne({ _id: pet._id }, { $set: { qrCode } });
    updated += 1;
  }

  console.log(`Updated ${updated} of ${pets.length} pets`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('QR regeneration failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
