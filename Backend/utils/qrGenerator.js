const QRCode = require('qrcode');
const { getFrontendUrl } = require('./frontendUrl');

const generateQRCode = async (petData) => {
  try {
    // Generate a user-friendly URL that points to the public pet profile page
    const profileUrl = `${getFrontendUrl()}/pet-profile/${encodeURIComponent(petData.petId)}`;

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