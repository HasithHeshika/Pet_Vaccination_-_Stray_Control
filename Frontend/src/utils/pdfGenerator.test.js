import { generatePetPDF } from './pdfGenerator';

// Real jsPDF, except save(): it is set on each document, so wrap the class to catch the document
jest.mock('jspdf', () => {
  const actual = jest.requireActual('jspdf');
  class RecordingPDF extends actual.jsPDF {
    constructor(...args) {
      super(...args);
      this.save = jest.fn(() => this);
      RecordingPDF.last = this;
    }
  }
  return { ...actual, jsPDF: RecordingPDF, default: RecordingPDF };
});
const { jsPDF } = require('jspdf');

const pet = {
  petId: 'PET-ABC123',
  petName: 'Rex',
  petType: 'Dog',
  breed: 'Labrador',
  age: { years: 2, months: 3 },
  gender: 'Male',
  color: 'Brown',
  weight: 20,
  registrationDate: '2026-10-01T00:00:00Z',
  owner: { fullName: 'Nimal Perera', email: 'owner@test.local', phone: '0771234567' },
  medicalHistory: { allergies: 'None', existingConditions: 'Healthy', specialNotes: 'Friendly' }
};

test('the pet certificate PDF is generated with its tables and named after the pet', () => {
  generatePetPDF(pet);
  const doc = jsPDF.last;
  expect(doc.save).toHaveBeenCalledWith('Rex_PET-ABC123_Details.pdf');
  // The tables were drawn (autoTable records where the last one ended)
  expect(doc.lastAutoTable.finalY).toBeGreaterThan(100);
  expect(doc.output().startsWith('%PDF-')).toBe(true);
});

test('a pet without medical history or QR code still produces a PDF', () => {
  generatePetPDF({ ...pet, medicalHistory: undefined, qrCode: undefined });
  expect(jsPDF.last.save).toHaveBeenCalledTimes(1);
  expect(jsPDF.last.output().startsWith('%PDF-')).toBe(true);
});
