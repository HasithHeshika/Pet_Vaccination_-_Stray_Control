const cron = require('node-cron');
const Vaccination = require('../models/Vaccination');
const { sendVaccinationReminderEmail, sendOverdueVaccinationEmail } = require('./notificationService');

// Run vaccination reminder check daily at 9:00 AM
const scheduleVaccinationReminders = () => {
  // Cron expression: '0 9 * * *' means 9:00 AM every day
  // For testing, you can use '*/5 * * * *' to run every 5 minutes
  const cronExpression = process.env.REMINDER_CRON || '0 9 * * *';

  cron.schedule(cronExpression, async () => {
    console.log('Running vaccination reminder check...');
    await checkAndSendReminders();
  });

  console.log(`Vaccination reminder scheduler started (${cronExpression})`);
};

// Check for vaccinations needing reminders and send notifications
const checkAndSendReminders = async () => {
  try {
    // Find vaccinations that need reminders (7 days before due date)
    const vaccinations = await Vaccination.findNeedingReminders();

    console.log(`Found ${vaccinations.length} vaccination(s) needing reminders`);

    for (const vaccination of vaccinations) {
      try {
        const pet = vaccination.pet;
        const owner = pet.owner;

        if (!owner) {
          console.error(`No owner found for pet ${pet.petId}`);
          continue;
        }

        // Send email if preference is enabled
        if (vaccination.notificationPreference?.email !== false && owner.email) {
          const emailResult = await sendVaccinationReminderEmail(
            vaccination,
            owner.email,
            owner.fullName,
            pet.petName
          );

          if (emailResult.success) {
            console.log(`Email reminder sent to ${owner.email} for ${pet.petName}`);
          } else {
            console.error(`Failed to send email to ${owner.email}:`, emailResult.error);
          }
        }

        // Send SMS if preference is enabled (placeholder for now)
        if (vaccination.notificationPreference?.sms && owner.phone) {
          // SMS functionality to be implemented
          console.log(`SMS reminder queued for ${owner.phone} for ${pet.petName}`);
        }

        // Mark reminder as sent
        await vaccination.markReminderSent();
        console.log(`Marked reminder as sent for vaccination ${vaccination._id}`);
      } catch (error) {
        console.error(`Error processing vaccination ${vaccination._id}:`, error);
      }
    }

    // Check for overdue vaccinations
    await checkAndAlertOverdue();

    return { success: true, processed: vaccinations.length };
  } catch (error) {
    console.error('Error in checkAndSendReminders:', error);
    return { success: false, error: error.message };
  }
};

// Check for overdue vaccinations and send urgent alerts
const checkAndAlertOverdue = async () => {
  try {
    const overdueVaccinations = await Vaccination.findOverdue();

    console.log(`Found ${overdueVaccinations.length} overdue vaccination(s)`);

    for (const vaccination of overdueVaccinations) {
      try {
        const pet = vaccination.pet;
        const owner = pet.owner;

        if (!owner || !owner.email) {
          continue;
        }

        // Update status to overdue
        vaccination.status = 'overdue';
        await vaccination.save();

        // Send overdue alert (only if not already sent recently)
        const daysSinceReminder = vaccination.reminderSentDate 
          ? Math.ceil((new Date() - new Date(vaccination.reminderSentDate)) / (1000 * 60 * 60 * 24))
          : Infinity;

        // Send overdue alert every 7 days
        if (daysSinceReminder >= 7) {
          const emailResult = await sendOverdueVaccinationEmail(
            vaccination,
            owner.email,
            owner.fullName,
            pet.petName
          );

          if (emailResult.success) {
            console.log(`Overdue alert sent to ${owner.email} for ${pet.petName}`);
            vaccination.reminderSentDate = new Date();
            await vaccination.save();
          }
        }
      } catch (error) {
        console.error(`Error processing overdue vaccination ${vaccination._id}:`, error);
      }
    }

    return { success: true, processed: overdueVaccinations.length };
  } catch (error) {
    console.error('Error in checkAndAlertOverdue:', error);
    return { success: false, error: error.message };
  }
};

// Manual trigger for testing
const triggerRemindersNow = async () => {
  console.log('Manually triggering reminder check...');
  return await checkAndSendReminders();
};

module.exports = {
  scheduleVaccinationReminders,
  checkAndSendReminders,
  triggerRemindersNow
};
