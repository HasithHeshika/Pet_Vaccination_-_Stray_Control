const nodemailer = require('nodemailer');
const { formatDate } = require('../utils/dateFormatter');
const { getFrontendUrl } = require('../utils/frontendUrl');

const isEmailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

// Email transporter configuration
const createTransporter = () => {
  // Real SMTP when configured (any environment)
  if (isEmailConfigured()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // No SMTP configured: render the message as JSON and log it instead of sending
  return nodemailer.createTransport({ jsonTransport: true });
};

// Sends mail and reports whether it was actually delivered to an SMTP server
const deliver = async (mailOptions) => {
  const transporter = createTransporter();
  const info = await transporter.sendMail(mailOptions);

  if (!isEmailConfigured()) {
    console.log(`[EMAIL NOT SENT - SMTP not configured] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
    return { success: false, simulated: true, error: 'SMTP is not configured' };
  }

  return { success: true, messageId: info.messageId };
};

// Send vaccination reminder email
const sendVaccinationReminderEmail = async (vaccination, ownerEmail, ownerName, petName) => {
  try {
    const dueDate = formatDate(vaccination.nextDueDate);
    const daysDiff = Math.ceil((new Date(vaccination.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Management System" <noreply@petmanagement.com>',
      to: ownerEmail,
      subject: `Vaccination Reminder: ${petName} - ${vaccination.vaccineName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
            .info-row { display: flex; margin: 10px 0; }
            .info-label { font-weight: bold; min-width: 150px; color: #555; }
            .info-value { color: #333; }
            .urgent { color: #dc3545; font-weight: bold; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🐾 Vaccination Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${ownerName},</p>
              
              <p>This is a friendly reminder that <strong>${petName}</strong> has an upcoming vaccination due ${daysDiff > 0 ? `in ${daysDiff} day${daysDiff > 1 ? 's' : ''}` : 'today'}.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">Vaccination Details</h3>
                <div class="info-row">
                  <span class="info-label">Pet Name:</span>
                  <span class="info-value">${petName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vaccine Type:</span>
                  <span class="info-value">${vaccination.vaccineType}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vaccine Name:</span>
                  <span class="info-value">${vaccination.vaccineName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Due Date:</span>
                  <span class="info-value ${daysDiff <= 3 ? 'urgent' : ''}">${dueDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Veterinarian:</span>
                  <span class="info-value">${vaccination.veterinarianName}</span>
                </div>
                ${vaccination.clinicName ? `
                <div class="info-row">
                  <span class="info-label">Clinic:</span>
                  <span class="info-value">${vaccination.clinicName}</span>
                </div>
                ` : ''}
              </div>

              ${daysDiff <= 3 ? '<p class="urgent">⚠️ This vaccination is due soon! Please schedule an appointment as soon as possible.</p>' : ''}

              <p><strong>Important:</strong> Timely vaccinations are crucial for your pet's health and well-being. Please contact your veterinarian to schedule an appointment.</p>

              <div style="text-align: center;">
                <a href="${getFrontendUrl()}/user/vaccinations" class="button">View Vaccination Schedule</a>
              </div>

              <div class="footer">
                <p>This is an automated reminder from Pet Management System</p>
                <p>If you have any questions, please contact your veterinarian</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Vaccination Reminder for ${petName}

Dear ${ownerName},

This is a friendly reminder that ${petName} has an upcoming vaccination due ${daysDiff > 0 ? `in ${daysDiff} day${daysDiff > 1 ? 's' : ''}` : 'today'}.

Vaccination Details:
- Pet Name: ${petName}
- Vaccine Type: ${vaccination.vaccineType}
- Vaccine Name: ${vaccination.vaccineName}
- Due Date: ${dueDate}
- Veterinarian: ${vaccination.veterinarianName}
${vaccination.clinicName ? `- Clinic: ${vaccination.clinicName}` : ''}

${daysDiff <= 3 ? 'This vaccination is due soon! Please schedule an appointment as soon as possible.' : ''}

Timely vaccinations are crucial for your pet's health and well-being. Please contact your veterinarian to schedule an appointment.

---
This is an automated reminder from Pet Management System
      `
    };

    const result = await deliver(mailOptions);
    if (result.success) {
      console.log('Email sent:', result.messageId);
    }
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send overdue vaccination alert email
const sendOverdueVaccinationEmail = async (vaccination, ownerEmail, ownerName, petName) => {
  try {
    const dueDate = formatDate(vaccination.nextDueDate);
    const daysOverdue = Math.ceil((new Date() - new Date(vaccination.nextDueDate)) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Management System" <noreply@petmanagement.com>',
      to: ownerEmail,
      subject: `⚠️ OVERDUE: Vaccination for ${petName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545; border-radius: 5px; }
            .info-row { display: flex; margin: 10px 0; }
            .info-label { font-weight: bold; min-width: 150px; color: #555; }
            .info-value { color: #333; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Overdue Vaccination Alert</h1>
            </div>
            <div class="content">
              <p>Dear ${ownerName},</p>
              
              <div class="alert-box">
                <h3 style="margin-top: 0; color: #856404;">⚠️ URGENT: Overdue Vaccination</h3>
                <p><strong>${petName}'s vaccination is now ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue!</strong></p>
                <p>Please schedule an appointment with your veterinarian immediately to protect your pet's health.</p>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #dc3545;">Vaccination Details</h3>
                <div class="info-row">
                  <span class="info-label">Pet Name:</span>
                  <span class="info-value">${petName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vaccine Type:</span>
                  <span class="info-value">${vaccination.vaccineType}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vaccine Name:</span>
                  <span class="info-value">${vaccination.vaccineName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Was Due:</span>
                  <span class="info-value" style="color: #dc3545; font-weight: bold;">${dueDate} (${daysOverdue} days ago)</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Veterinarian:</span>
                  <span class="info-value">${vaccination.veterinarianName}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${getFrontendUrl()}/user/vaccinations" class="button">View Vaccination Schedule</a>
              </div>

              <div class="footer">
                <p>This is an automated alert from Pet Management System</p>
                <p>Please contact your veterinarian immediately</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await deliver(mailOptions);
    if (result.success) {
      console.log('Overdue alert sent:', result.messageId);
    }
    return result;
  } catch (error) {
    console.error('Error sending overdue alert:', error);
    return { success: false, error: error.message };
  }
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Relay a message from someone who scanned a pet's QR code to the owner,
// so the owner's email and phone are never shown publicly
const sendFinderContactEmail = async ({ ownerEmail, ownerName, petName, petId, finderName, finderContact, message }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Management System" <noreply@petmanagement.com>',
      to: ownerEmail,
      subject: `Someone scanned ${petName}'s QR tag`,
      text: `Dear ${ownerName},

Someone has scanned the QR tag of your pet ${petName} (Pet ID: ${petId}) and sent you this message:

"${message}"

Their name: ${finderName}
How to reach them: ${finderContact}

Your contact details were not shared with them. Please reply to them directly.

---
This message was relayed by Pet Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Someone scanned ${escapeHtml(petName)}'s QR tag</h2>
          <p>Dear ${escapeHtml(ownerName)},</p>
          <p>Someone has scanned the QR tag of <strong>${escapeHtml(petName)}</strong> (Pet ID: ${escapeHtml(petId)}) and sent you this message:</p>
          <blockquote style="border-left: 4px solid #667eea; margin: 16px 0; padding: 8px 16px; background: #f9f9f9;">${escapeHtml(message)}</blockquote>
          <p><strong>Their name:</strong> ${escapeHtml(finderName)}<br/>
          <strong>How to reach them:</strong> ${escapeHtml(finderContact)}</p>
          <p>Your contact details were not shared with them. Please reply to them directly.</p>
        </div>
      `
    };

    return await deliver(mailOptions);
  } catch (error) {
    console.error('Error relaying finder message:', error);
    return { success: false, error: error.message };
  }
};

// SMS notification placeholder (requires Twilio or similar service)
const sendVaccinationReminderSMS = async (vaccination, phoneNumber, petName) => {
  // TODO: Implement SMS using Twilio
  // Requires: npm install twilio
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  console.log('SMS notification not yet implemented');
  console.log(`Would send SMS to ${phoneNumber} for ${petName}`);
  
  return { success: false, message: 'SMS service not configured' };
};

module.exports = {
  isEmailConfigured,
  sendVaccinationReminderEmail,
  sendOverdueVaccinationEmail,
  sendFinderContactEmail,
  sendVaccinationReminderSMS
};
