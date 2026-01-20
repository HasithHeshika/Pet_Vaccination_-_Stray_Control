import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axios';
import { generatePetPDF } from '../../utils/pdfGenerator';
import './PetProfile.css';

const PetProfile = () => {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPetDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/pets/${petId}`);
        setPet(response.data.pet);
        setError('');
      } catch (err) {
        console.error('Error fetching pet details:', err);
        setError(err.response?.data?.message || 'Failed to load pet details');
      } finally {
        setLoading(false);
      }
    };

    fetchPetDetails();
  }, [petId]);

  const handleDownloadPDF = () => {
    if (pet) {
      generatePetPDF(pet);
    }
  };

  if (loading) {
    return (
      <div className="pet-profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading pet details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pet-profile-container">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h2>Pet Not Found</h2>
          <p>{error}</p>
          <p className="error-help">Please check the QR code and try again.</p>
        </div>
      </div>
    );
  }

  if (!pet) {
    return null;
  }

  const formatAge = () => {
    const years = pet.age.years;
    const months = pet.age.months;
    if (years === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else if (months === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    } else {
      return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="pet-profile-container">
      <div className="pet-profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="header-icon">🐾</div>
          <h1>Pet Registration Certificate</h1>
          <p className="subtitle">Official Pet Vaccination & Stray Control System</p>
        </div>

        {/* Pet Photo */}
        {pet.photoUrl && (
          <div className="pet-photo-section">
            <img src={pet.photoUrl} alt={pet.petName} className="pet-photo" />
          </div>
        )}

        {/* Pet ID Badge */}
        <div className="pet-id-badge">
          <span className="id-label">Pet ID:</span>
          <span className="id-value">{pet.petId}</span>
        </div>

        {/* Pet Information */}
        <div className="info-section">
          <h2 className="section-title">Pet Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value">{pet.petName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Type</span>
              <span className="info-value">
                {pet.petType === 'Other' ? pet.petTypeOther : pet.petType}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Breed</span>
              <span className="info-value">
                {pet.breed === 'Other' ? pet.breedOther : pet.breed}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">{formatAge()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Gender</span>
              <span className="info-value">{pet.gender}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Color</span>
              <span className="info-value">{pet.color}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Weight</span>
              <span className="info-value">{pet.weight} kg</span>
            </div>
            {pet.microchipNumber && (
              <div className="info-item">
                <span className="info-label">Microchip</span>
                <span className="info-value">{pet.microchipNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Owner Information */}
        <div className="info-section">
          <h2 className="section-title">Owner Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value">{pet.owner.fullName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{pet.owner.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">{pet.owner.phone}</span>
            </div>
          </div>
        </div>

        {/* Medical History */}
        {(pet.medicalHistory?.allergies || pet.medicalHistory?.existingConditions || pet.medicalHistory?.specialNotes) && (
          <div className="info-section medical-section">
            <h2 className="section-title">Medical Information</h2>
            <div className="medical-grid">
              {pet.medicalHistory.allergies && (
                <div className="medical-item">
                  <span className="medical-label">⚠️ Allergies</span>
                  <span className="medical-value">{pet.medicalHistory.allergies}</span>
                </div>
              )}
              {pet.medicalHistory.existingConditions && (
                <div className="medical-item">
                  <span className="medical-label">🏥 Existing Conditions</span>
                  <span className="medical-value">{pet.medicalHistory.existingConditions}</span>
                </div>
              )}
              {pet.medicalHistory.specialNotes && (
                <div className="medical-item">
                  <span className="medical-label">📝 Special Notes</span>
                  <span className="medical-value">{pet.medicalHistory.specialNotes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Registration Date */}
        <div className="registration-footer">
          <div className="registration-stamp">
            <span className="stamp-icon">✓</span>
            <div className="stamp-text">
              <span className="stamp-label">Registered</span>
              <span className="stamp-date">{formatDate(pet.registrationDate)}</span>
            </div>
          </div>
        </div>

        {/* Download PDF Button */}
        <div className="pdf-download-section">
          <button onClick={handleDownloadPDF} className="btn-download-pdf">
            📄 Download as PDF
          </button>
          <p className="download-hint">Save or print this pet's information for offline access</p>
        </div>

        {/* Emergency Contact Notice */}
        <div className="emergency-notice">
          <p>
            <strong>Lost Pet?</strong> If you found this pet, please contact the owner 
            at the phone number or email listed above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PetProfile;
