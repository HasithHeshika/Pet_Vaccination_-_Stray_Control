const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Vaccination = require('../models/Vaccination');
const Pet = require('../models/Pet');
const User = require('../models/User');

// Create email transporter
const createTransporter = () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Fallback Ethereal test account or console logger transporter for local dev
  return {
    sendMail: async (opts) => {
      console.log(`[VACCINATION REMINDER SIMULATION] To: ${opts.to} | Subject: ${opts.subject}`);
      console.log(`Body:\n${opts.text}`);
      return { messageId: 'simulated-' + Date.now() };
    }
  };
};

const transporter = createTransporter();

// Function to send reminder email for a specific vaccination
const sendVaccinationReminderEmail = async (vaccinationId) => {
  try {
    const vaccination = await Vaccination.findById(vaccinationId)
      .populate({
        path: 'petId',
        populate: { path: 'ownerId', select: 'fullName email phone' }
      })
      .populate('administeredBy', 'fullName clinicName');

    if (!vaccination || !vaccination.petId || !vaccination.petId.ownerId) {
      throw new Error('Vaccination or Pet Owner record not found');
    }

    const pet = vaccination.petId;
    const owner = pet.ownerId;

    const formattedDate = new Date(vaccination.nextDueDate || vaccination.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Care & Vaccination System" <notifications@petcare.org>',
      to: owner.email,
      subject: `🐾 Vaccination Reminder for ${pet.name} (${vaccination.vaccineName})`,
      text: `Hello ${owner.fullName},\n\nThis is an automated reminder that your pet ${pet.name} (${pet.species} - ${pet.breed}) is due for their "${vaccination.vaccineName}" vaccination on ${formattedDate}.\n\nPlease ensure your pet receives this vaccination on schedule to maintain optimal health and rabies prevention.\n\nPet System ID: ${pet.petId}\nVeterinarian Notes: ${vaccination.notes || 'None'}\n\nThank you,\nPet Vaccination & Stray Control Authority`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">🐾 Pet Vaccination Reminder</h2>
          <p>Dear <strong>${owner.fullName}</strong>,</p>
          <p>This is an automated notification that your pet <strong>${pet.name}</strong> is due for a vaccination soon.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Pet Name:</strong> ${pet.name} (${pet.species} - ${pet.breed})</p>
            <p style="margin: 5px 0;"><strong>Vaccine:</strong> ${vaccination.vaccineName}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> <span style="color: #dc2626; font-weight: bold;">${formattedDate}</span></p>
            <p style="margin: 5px 0;"><strong>Pet ID:</strong> ${pet.petId}</p>
          </div>

          <p>Please contact your veterinarian to schedule an appointment or log the update.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 0.85em; color: #6b7280;">This is an automated message from the Pet Vaccination & Stray Control System.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    vaccination.reminderSent = true;
    vaccination.lastReminderDate = new Date();
    await vaccination.save();

    return { success: true, result };
  } catch (error) {
    console.error('Error sending vaccination reminder:', error);
    throw error;
  }
};

// Check for upcoming vaccinations due in next 7 days
const checkAndSendDueReminders = async () => {
  console.log('[REMINDER SERVICE] Running scheduled check for upcoming vaccinations...');
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Find scheduled vaccinations due within 7 days
    const pendingVaccinations = await Vaccination.find({
      status: { $in: ['scheduled', 'overdue'] },
      $or: [
        { nextDueDate: { $gte: today, $lte: nextWeek } },
        { dueDate: { $gte: today, $lte: nextWeek } }
      ]
    });

    console.log(`[REMINDER SERVICE] Found ${pendingVaccinations.length} due vaccinations.`);
    
    for (const vac of pendingVaccinations) {
      try {
        await sendVaccinationReminderEmail(vac._id);
      } catch (err) {
        console.error(`Failed to send reminder for vaccination ${vac._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[REMINDER SERVICE] Error in checkAndSendDueReminders:', err);
  }
};

// Initialize Cron Schedule (Every day at 8:00 AM)
const initReminderCron = () => {
  cron.schedule('0 8 * * *', () => {
    checkAndSendDueReminders();
  });
  console.log('[REMINDER SERVICE] Scheduled daily vaccination reminder cron job (8:00 AM).');
};

module.exports = {
  initReminderCron,
  checkAndSendDueReminders,
  sendVaccinationReminderEmail
};
