const QRCode = require('qrcode');

const generateQRCode = async (petData) => {
  try {
    // Create a data object with all pet details
    const qrData = {
      petId: petData.petId,
      petName: petData.petName,
      petType: petData.petType,
      breed: petData.breed,
      age: `${petData.age.years} years ${petData.age.months} months`,
      gender: petData.gender,
      color: petData.color,
      microchipNumber: petData.microchipNumber || 'N/A',
      ownerName: petData.ownerName,
      ownerPhone: petData.ownerPhone,
      ownerEmail: petData.ownerEmail,
      registrationDate: petData.registrationDate,
      profileUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${petData.petId}`
    };

    // Convert to JSON string
    const qrContent = JSON.stringify(qrData);

    // Generate QR code as Data URL (base64 image)
    const qrCodeDataURL = await QRCode.toDataURL(qrContent, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = { generateQRCode };