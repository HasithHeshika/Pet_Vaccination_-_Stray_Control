const QRCode = require('qrcode');

const generateQRCode = async (petData) => {
  try {
    // Generate a user-friendly URL that points to the pet profile page
    // When scanned, this will open a beautiful web page with all pet details
    const profileUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet-profile/${petData.petId}`;

    // Generate QR code as Data URL (base64 image)
    const qrCodeDataURL = await QRCode.toDataURL(profileUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // High error correction for better scanning
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = { generateQRCode };