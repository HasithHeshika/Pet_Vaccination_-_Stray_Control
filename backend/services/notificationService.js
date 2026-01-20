const nodemailer = require('nodemailer');

// Email transporter configuration
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'test123'
      }
    });
  }
};

// Format date for display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Send vaccination reminder email
const sendVaccinationReminderEmail = async (vaccination, ownerEmail, ownerName, petName) => {
  try {
    const transporter = createTransporter();

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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/vaccinations" class="button">View Vaccination Schedule</a>
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

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', info.messageId);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send overdue vaccination alert email
const sendOverdueVaccinationEmail = async (vaccination, ownerEmail, ownerName, petName) => {
  try {
    const transporter = createTransporter();

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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/vaccinations" class="button">View Vaccination Schedule</a>
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

    const info = await transporter.sendMail(mailOptions);
    console.log('Overdue alert sent:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending overdue alert:', error);
    return { success: false, error: error.message };
  }
};

// SMS notification placeholder.
const sendVaccinationReminderSMS = async (vaccination, phoneNumber, petName) => {
  console.log('SMS notification not yet implemented');
  console.log(`Would send SMS to ${phoneNumber} for ${petName}`);
  
  return { success: false, message: 'SMS service not configured' };
};

module.exports = {
  sendVaccinationReminderEmail,
  sendOverdueVaccinationEmail,
  sendVaccinationReminderSMS
};

