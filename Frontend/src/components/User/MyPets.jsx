import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { generatePetPDF } from '../../utils/pdfGenerator';

const MyPets = () => {
  const { user, token } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);

  const fetchMyPets = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${user.id}/pets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPets(response.data.pets);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pets:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch pets');
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      fetchMyPets();
    }
  }, [user, token, fetchMyPets]);

  const handleDownloadQR = (pet) => {
    const link = document.createElement('a');
    link.href = pet.qrCode;
    link.download = `${pet.petName}_QRCode.png`;
    link.click();
  };

  const handleDownloadPDF = (pet) => {
    if (pet) {
      generatePetPDF(pet);
    }
  };

  const handleViewDetails = (pet) => {
    setSelectedPet(pet);
  };

  const handleCloseDetails = () => {
    setSelectedPet(null);
  };

  if (loading) {
    return <div className="loading">Loading your pets...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>My Pets</h1>
      
      {pets.length === 0 ? (
        <div className="card">
          <p>You don't have any registered pets yet. Please contact the administrator to register your pet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {pets.map((pet) => (
            <div key={pet._id} className="card">
              <h3>{pet.petName}</h3>
              <p><strong>Pet ID:</strong> {pet.petId}</p>
              <p><strong>Type:</strong> {pet.petType === 'Other' ? pet.petTypeOther : pet.petType}</p>
              <p><strong>Breed:</strong> {pet.breed === 'Other' ? pet.breedOther : pet.breed}</p>
              <p><strong>Age:</strong> {pet.age.years} years {pet.age.months} months</p>
              <p><strong>Gender:</strong> {pet.gender}</p>
              <p><strong>Color:</strong> {pet.color}</p>
              
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleViewDetails(pet)} 
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '14px' }}
                >
                  View Details
                </button>
                <button 
                  onClick={() => handleDownloadQR(pet)} 
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '14px' }}
                >
                  Download QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pet Details Modal */}
      {selectedPet && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={handleCloseDetails}
        >
          <div 
            className="card" 
            style={{ 
              maxWidth: '600px', 
              maxHeight: '90vh', 
              overflow: 'auto',
              margin: 0 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{selectedPet.petName}</h2>
            
            <div style={{ marginTop: '20px' }}>
              <h3>Basic Information</h3>
              <p><strong>Pet ID:</strong> {selectedPet.petId}</p>
              <p><strong>Type:</strong> {selectedPet.petType === 'Other' ? selectedPet.petTypeOther : selectedPet.petType}</p>
              <p><strong>Breed:</strong> {selectedPet.breed === 'Other' ? selectedPet.breedOther : selectedPet.breed}</p>
              <p><strong>Age:</strong> {selectedPet.age.years} years {selectedPet.age.months} months</p>
              <p><strong>Gender:</strong> {selectedPet.gender}</p>
              <p><strong>Color:</strong> {selectedPet.color}</p>
              <p><strong>Weight:</strong> {selectedPet.weight} kg</p>
              {selectedPet.microchipNumber && (
                <p><strong>Microchip Number:</strong> {selectedPet.microchipNumber}</p>
              )}
            </div>

            {(selectedPet.medicalHistory.allergies || 
              selectedPet.medicalHistory.existingConditions || 
              selectedPet.medicalHistory.specialNotes) && (
              <div style={{ marginTop: '20px' }}>
                <h3>Medical History</h3>
                {selectedPet.medicalHistory.allergies && (
                  <p><strong>Allergies:</strong> {selectedPet.medicalHistory.allergies}</p>
                )}
                {selectedPet.medicalHistory.existingConditions && (
                  <p><strong>Existing Conditions:</strong> {selectedPet.medicalHistory.existingConditions}</p>
                )}
                {selectedPet.medicalHistory.specialNotes && (
                  <p><strong>Special Notes:</strong> {selectedPet.medicalHistory.specialNotes}</p>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <h3>QR Code</h3>
              <img 
                src={selectedPet.qrCode} 
                alt="Pet QR Code" 
                style={{ maxWidth: '250px', border: '2px solid #ddd', padding: '10px' }}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => handleDownloadQR(selectedPet)} className="btn btn-primary">
                Download QR Code
              </button>
              <button onClick={() => handleDownloadPDF(selectedPet)} className="btn btn-primary">
                📄 Download PDF
              </button>
              <button onClick={handleCloseDetails} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPets;