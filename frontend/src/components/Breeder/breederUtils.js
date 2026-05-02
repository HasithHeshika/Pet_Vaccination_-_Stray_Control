export const emptyApplication = {
  breederName: '',
  nicOrBusinessRegNo: '',
  contactNumber: '',
  email: '',
  address: '',
  animalTypes: [],
  otherAnimalType: '',
  numberOfAnimals: '',
  facilityDescription: '',
  yearsOfExperience: '',
  documents: {
    idProof: null,
    facilityImages: [],
    certificates: []
  }
};

export const statusClass = (status = '') => `status-pill ${status.toLowerCase()}`;

export const formatDate = (date) => {
  if (!date) return 'Not available';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const applicationFromUser = (user) => ({
  ...emptyApplication,
  breederName: user?.fullName || '',
  nicOrBusinessRegNo: user?.nicNumber || '',
  contactNumber: user?.phone || '',
  email: user?.email || '',
  address: [
    user?.address?.street,
    user?.address?.city,
    user?.address?.province,
    user?.address?.postalCode
  ].filter(Boolean).join(', ')
});

export const validateStep = (step, formData) => {
  const errors = {};

  if (step === 1) {
    if (!formData.breederName.trim()) errors.breederName = 'Breeder name is required';
    if (!formData.nicOrBusinessRegNo.trim()) errors.nicOrBusinessRegNo = 'NIC or business registration number is required';
    if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact number is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
  }

  if (step === 2) {
    if (!formData.animalTypes.length) errors.animalTypes = 'Select at least one animal type';
    if (!formData.numberOfAnimals || Number(formData.numberOfAnimals) < 1) errors.numberOfAnimals = 'Enter a valid number of animals';
    if (!formData.facilityDescription.trim()) errors.facilityDescription = 'Facility description is required';
    if (formData.yearsOfExperience === '' || Number(formData.yearsOfExperience) < 0) errors.yearsOfExperience = 'Enter years of experience';
  }

  return errors;
};
