import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePetPDF = (pet) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Pet Identification Document', 105, 20, { align: 'center' });
  
  // Add a line under title
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 25, 190, 25);
  
  // Pet ID - prominently displayed
  doc.setFontSize(14);
  doc.setTextColor(102, 126, 234);
  doc.text(`Pet ID: ${pet.petId}`, 105, 35, { align: 'center' });
  
  let yPosition = 50;
  
  // Pet Information Section
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Pet Information', 20, yPosition);
  yPosition += 5;
  
  const petData = [
    ['Pet Name', pet.petName || 'N/A'],
    ['Type', pet.petType === 'Other' ? pet.petTypeOther : pet.petType || 'N/A'],
    ['Breed', pet.breed === 'Other' ? pet.breedOther : pet.breed || 'N/A'],
    ['Age', `${pet.age?.years || 0} years, ${pet.age?.months || 0} months`],
    ['Gender', pet.gender || 'N/A'],
    ['Color', pet.color || 'N/A'],
    ['Weight', pet.weight ? `${pet.weight} kg` : 'N/A'],
  ];
  
  if (pet.microchipNumber) {
    petData.push(['Microchip Number', pet.microchipNumber]);
  }
  
  petData.push(['Registration Date', pet.registrationDate ? new Date(pet.registrationDate).toLocaleDateString() : 'N/A']);
  
  doc.autoTable({
    startY: yPosition,
    head: [['Field', 'Value']],
    body: petData,
    theme: 'striped',
    headStyles: { fillColor: [102, 126, 234], textColor: 255 },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 11 },
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  // Owner Information Section
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Owner Information', 20, yPosition);
  yPosition += 5;
  
  const ownerData = [
    ['Owner Name', pet.owner?.fullName || 'N/A'],
    ['Email', pet.owner?.email || 'N/A'],
    ['Phone', pet.owner?.phone || 'N/A'],
  ];
  
  doc.autoTable({
    startY: yPosition,
    head: [['Field', 'Value']],
    body: ownerData,
    theme: 'striped',
    headStyles: { fillColor: [102, 126, 234], textColor: 255 },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 11 },
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  // Medical History Section (if available)
  const hasMedicalHistory = pet.medicalHistory?.allergies || 
                           pet.medicalHistory?.existingConditions || 
                           pet.medicalHistory?.specialNotes;
  
  if (hasMedicalHistory && yPosition < 250) {
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Medical History', 20, yPosition);
    yPosition += 5;
    
    const medicalData = [];
    
    if (pet.medicalHistory?.allergies) {
      medicalData.push(['Allergies', pet.medicalHistory.allergies]);
    }
    
    if (pet.medicalHistory?.existingConditions) {
      medicalData.push(['Existing Conditions', pet.medicalHistory.existingConditions]);
    }
    
    if (pet.medicalHistory?.specialNotes) {
      medicalData.push(['Special Notes', pet.medicalHistory.specialNotes]);
    }
    
    doc.autoTable({
      startY: yPosition,
      head: [['Field', 'Information']],
      body: medicalData,
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234], textColor: 255 },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        1: { cellWidth: 'auto' }
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Add QR Code if available
  if (pet.qrCode && yPosition < 250) {
    try {
      yPosition += 10;
      doc.setFontSize(16);
      doc.text('QR Code', 20, yPosition);
      yPosition += 5;
      
      // Add QR code image
      const qrSize = 50;
      const qrX = (doc.internal.pageSize.width - qrSize) / 2;
      doc.addImage(pet.qrCode, 'PNG', qrX, yPosition, qrSize, qrSize);
      yPosition += qrSize + 5;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Scan this QR code to access pet information online', 105, yPosition, { align: 'center' });
    } catch (error) {
      console.error('Error adding QR code to PDF:', error);
    }
  }
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      'Pet Management System - Official Document',
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  const fileName = `${pet.petName}_${pet.petId}_Details.pdf`;
  doc.save(fileName);
};
