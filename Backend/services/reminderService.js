const Vaccination = require('../models/Vaccination');
const notificationService = require('./notificationService');

// Manually send a reminder email for a specific vaccination (used by the vet/admin "Remind" button).
// The daily automatic reminders run from vaccinationScheduler.js.
const sendVaccinationReminderEmail = async (vaccinationId) => {
  const vaccination = await Vaccination.findById(vaccinationId)
    .populate({
      path: 'pet',
      populate: { path: 'owner', select: 'fullName email phone' }
    });

  if (!vaccination || !vaccination.pet || !vaccination.pet.owner) {
    const error = new Error('Vaccination or pet owner record not found');
    error.status = 404;
    throw error;
  }

  const pet = vaccination.pet;
  const owner = pet.owner;

  if (!owner.email) {
    const error = new Error('Pet owner has no email address on file');
    error.status = 400;
    throw error;
  }

  const result = await notificationService.sendVaccinationReminderEmail(
    vaccination,
    owner.email,
    owner.fullName,
    pet.petName
  );

  if (!result.success) {
    const error = new Error(result.simulated
      ? 'Email is not configured on the server (set ACS_EMAIL_* or SMTP_* settings)'
      : 'Failed to send reminder email');
    error.status = 503;
    throw error;
  }

  await vaccination.markReminderSent();
  return { success: true, sentTo: owner.email };
};

module.exports = {
  sendVaccinationReminderEmail
};
