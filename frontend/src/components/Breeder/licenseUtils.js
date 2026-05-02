export const statusClass = (status = '') => `status-badge status-${status || 'pending'}`;

export const formatDate = (date) => {
  if (!date) return 'Not issued';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const emptyApplication = (user) => ({
  personalDetails: {
    breederName: user?.fullName || '',
    registrationNumber: user?.nicNumber || '',
    contactNumber: user?.phone || '',
    email: user?.email || '',
    address: user?.address
      ? `${user.address.street}, ${user.address.city}, ${user.address.province}`
      : ''
  },
  breedingDetails: {
    animalTypes: [],
    numberOfAnimals: '',
    facilityDescription: '',
    yearsOfExperience: ''
  },
  documents: []
});
