const nodemailer = require('nodemailer');
const { formatDate } = require('../utils/dateFormatter');
const { getFrontendUrl } = require('../utils/frontendUrl');
const { isAcsConfigured, sendAcsEmail } = require('./acsEmail');

const isSmtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

// Email can go out through Azure Communication Services or any SMTP server
const isEmailConfigured = () => isAcsConfigured() || isSmtpConfigured();

// Email transporter configuration
const createTransporter = () => {
  // Real SMTP when configured (any environment)
  if (isSmtpConfigured()) {
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

// Sends mail and reports whether it was actually handed to an email service
const deliver = async (mailOptions) => {
  if (isAcsConfigured()) {
    const { messageId } = await sendAcsEmail(mailOptions);
    return { success: true, messageId };
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail(mailOptions);

  if (!isSmtpConfigured()) {
    console.log(`[EMAIL NOT SENT - email not configured] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
    return { success: false, simulated: true, error: 'Email is not configured' };
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

// Lost & Found: tell an owner or a finder that the authority has confirmed a possible match.
// `role` is 'owner' (their lost pet may have been found) or 'finder' (the pet they found may have an owner).
const sendPetMatchEmail = async (to, { role, name, petDescription, otherContact, foundLocation, foundDate, reviewNote, link }) => {
  try {
    const isOwner = role === 'owner';
    const subject = isOwner
      ? 'Good news: a pet matching yours has been found'
      : 'The pet you found may have been identified';
    const intro = isOwner
      ? `A municipal officer has reviewed a "found" report and believes it may be your pet (${petDescription}).`
      : `A municipal officer has reviewed your "found" report (${petDescription}) and believes the owner may have been identified.`;
    const contactLine = otherContact
      ? (isOwner ? `The finder can be reached at: ${otherContact}` : `The owner can be reached at: ${otherContact}`)
      : (isOwner ? '' : 'The owner has been given your contact details and will get in touch with you.');

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Management System" <noreply@petmanagement.com>',
      to,
      subject,
      text: `Dear ${name},

${intro}
${foundLocation ? `\nFound at: ${foundLocation}${foundDate ? ` on ${foundDate}` : ''}` : ''}
${reviewNote ? `\nNote from the officer: ${reviewNote}` : ''}
${contactLine ? `\n${contactLine}` : ''}

Please check carefully that it is the same animal before arranging a hand-over.
See the details here: ${link}

---
Pet Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${escapeHtml(subject)}</h2>
          <p>Dear ${escapeHtml(name)},</p>
          <p>${escapeHtml(intro)}</p>
          ${foundLocation ? `<p><strong>Found at:</strong> ${escapeHtml(foundLocation)}${foundDate ? ` on ${escapeHtml(foundDate)}` : ''}</p>` : ''}
          ${reviewNote ? `<p><strong>Note from the officer:</strong> ${escapeHtml(reviewNote)}</p>` : ''}
          ${contactLine ? `<p><strong>${escapeHtml(contactLine)}</strong></p>` : ''}
          <p>Please check carefully that it is the same animal before arranging a hand-over.</p>
          <p><a href="${link}" style="display: inline-block; background: #667eea; color: #fff; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View the match</a></p>
        </div>
      `
    };

    return await deliver(mailOptions);
  } catch (error) {
    console.error('Error sending pet match email:', error);
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

const INCIDENT_TYPE_LABELS = {
  violence: 'Violence / abuse / cruelty',
  sick_injured: 'Sick or injured animal in a public place',
  stray: 'Stray animal sighting',
  other: 'Other incident'
};

// Alert the authority about an urgent or emergency animal incident report
const sendIncidentAlertEmail = async (to, report) => {
  try {
    const typeLabel = report.incidentType === 'other' && report.otherIncidentType
      ? `Other: ${report.otherIncidentType}`
      : INCIDENT_TYPE_LABELS[report.incidentType] || 'Animal incident';
    const urgencyLabel = String(report.urgency || 'normal').toUpperCase();
    const mapLink = report.coordinates?.lat !== undefined && report.coordinates?.lng !== undefined
      ? `https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`
      : '';
    const dashboardLink = `${getFrontendUrl()}/admin/authority`;
    const reporter = [report.reporterName, report.reporterContact].filter(Boolean).join(' - ') || 'Anonymous';
    const photoCount = (report.images || []).length;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Management System" <noreply@petmanagement.com>',
      to,
      subject: `[${urgencyLabel}] Animal incident reported: ${typeLabel}`,
      text: `A new ${urgencyLabel.toLowerCase()} animal incident has been reported.

Type: ${typeLabel}
Urgency: ${urgencyLabel}
Location: ${report.location}${mapLink ? `\nMap: ${mapLink}` : ''}
Description: ${report.description}
Reported by: ${reporter}
Photos attached to the report: ${photoCount}

Review and update the report on the authority dashboard:
${dashboardLink}

---
This is an automated alert from Pet Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #b42318; margin-bottom: 4px;">${escapeHtml(urgencyLabel)} animal incident reported</h2>
          <p style="margin-top: 0; color: #555;">${escapeHtml(typeLabel)}</p>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Location</td><td>${escapeHtml(report.location)}${mapLink ? ` (<a href="${mapLink}">open map</a>)` : ''}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Description</td><td>${escapeHtml(report.description)}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Reported by</td><td>${escapeHtml(reporter)}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Photos</td><td>${photoCount}</td></tr>
          </table>
          <p><a href="${dashboardLink}" style="display: inline-block; background: #667eea; color: #fff; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Open authority dashboard</a></p>
        </div>
      `
    };

    return await deliver(mailOptions);
  } catch (error) {
    console.error('Error sending incident alert:', error);
    return { success: false, error: error.message };
  }
};

// Password reset link (requested by the user on the login page, or sent by an administrator)
const sendPasswordResetEmail = async (to, name, resetLink, { expiresInMinutes, requestedByAdmin }) => {
  try {
    const intro = requestedByAdmin
      ? 'An administrator of Pet Management System has sent you a link to set a new password for your account.'
      : 'We received a request to reset the password for your Pet Management System account.';

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Pet Management System" <noreply@petmanagement.com>',
      to,
      subject: 'Reset your Pet Management System password',
      text: `Dear ${name},

${intro}

Set a new password here (the link works once and expires in ${expiresInMinutes} minutes):
${resetLink}

If you did not ask for this, you can ignore this email; your password will not change.

---
Pet Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>Dear ${escapeHtml(name)},</p>
          <p>${escapeHtml(intro)}</p>
          <p><a href="${resetLink}" style="display: inline-block; background: #667eea; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none;">Set a new password</a></p>
          <p style="color: #555; font-size: 0.9em;">The link works once and expires in ${expiresInMinutes} minutes.</p>
          <p style="color: #555; font-size: 0.9em;">If you did not ask for this, you can ignore this email; your password will not change.</p>
        </div>
      `
    };

    return await deliver(mailOptions);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  isEmailConfigured,
  sendIncidentAlertEmail,
  sendPasswordResetEmail,
  sendPetMatchEmail,
  sendVaccinationReminderEmail,
  sendOverdueVaccinationEmail,
  sendFinderContactEmail,
  sendVaccinationReminderSMS
};
