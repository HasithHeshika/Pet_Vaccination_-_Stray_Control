import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generatePetPDF } from '../../utils/pdfGenerator';
import { getPetImages, readPetImageFiles } from '../../utils/petImages';
import { formatDate } from '../../utils/dateFormat';
import axios from '../../api/axios';

const AllPets = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [savingPhotos, setSavingPhotos] = useState(false);

  const fetchAllPets = useCallback(async () => {
    try {
      const response = await axios.get('/api/pets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPets(response.data.pets);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setError(error.response?.data?.message || 'Failed to fetch pets');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAllPets();
    }
  }, [token, fetchAllPets]);

  const handleViewDetails = (pet) => {
    setSelectedPet(pet);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPet(null);
    setPhotoError('');
  };

  const updatePetPhotos = async (photoUrls) => {
    setSavingPhotos(true);
    setPhotoError('');

    try {
      const response = await axios.put(
        `/api/pets/${selectedPet._id}/photos`,
        { photoUrls },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedPet = response.data.pet;
      setSelectedPet(updatedPet);
      setPets((currentPets) => currentPets.map((pet) => (
        pet._id === updatedPet._id ? updatedPet : pet
      )));
    } catch (updateError) {
      setPhotoError(updateError.response?.data?.message || 'Failed to update pet images');
    } finally {
      setSavingPhotos(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const currentPhotos = getPetImages(selectedPet);

    try {
      const newPhotos = await readPetImageFiles(e.target.files, currentPhotos.length);
      await updatePetPhotos([...currentPhotos, ...newPhotos]);
    } catch (uploadError) {
      setPhotoError(uploadError.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (index) => {
    await updatePetPhotos(
      getPetImages(selectedPet).filter((_, photoIndex) => photoIndex !== index)
    );
  };

  const handleDownloadQR = (pet) => {
    if (pet.qrCode) {
      const link = document.createElement('a');
      link.href = pet.qrCode;
      link.download = `${pet.petName}_QRCode.png`;
      link.click();
    }
  };

  const handleDownloadPDF = (pet) => {
    if (pet) {
      generatePetPDF(pet);
    }
  };

  if (loading) {
    return <div className="loading">Loading pets...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>All Registered Pets</h1>
      
      {pets.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '20px' }}>No pets registered yet.</p>
        </div>
      ) : (
        <div className="card">
          <p style={{ marginBottom: '15px' }}>
            <strong>Total Pets:</strong> {pets.length}
          </p>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pet ID</th>
                  <th>Pet Name</th>
                  <th>Type</th>
                  <th>Breed</th>
                  <th>Owner Name</th>
                  <th>Owner Contact</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pets.map((pet) => (
                  <tr key={pet._id}>
                    <td><strong>{pet.petId}</strong></td>
                    <td>{pet.petName}</td>
                    <td>{pet.petType === 'Other' ? pet.petTypeOther : pet.petType}</td>
                    <td>{pet.breed === 'Other' ? pet.breedOther : pet.breed}</td>
                    <td>{pet.owner?.fullName || 'N/A'}</td>
                    <td>{pet.owner?.phone || 'N/A'}</td>
                    <td>{formatDate(pet.registrationDate)}</td>
                    <td>
                      <button 
                        onClick={() => handleViewDetails(pet)}
                        className="btn btn-primary btn-small"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for detailed view */}
      {showModal && selectedPet && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Pet Details</h2>
              <button onClick={handleCloseModal} className="modal-close">&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Pet Photo Section */}
              <div className="detail-section">
                <h3>Pet Images</h3>
                {photoError && <div className="error-message">{photoError}</div>}
                {getPetImages(selectedPet).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '15px' }}>
                    {getPetImages(selectedPet).map((photo, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img
                          src={photo}
                          alt={`${selectedPet.petName} ${index + 1}`}
                          style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => handleRemovePhoto(index)}
                          disabled={savingPhotos}
                          style={{ position: 'absolute', top: '8px', right: '8px' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {getPetImages(selectedPet).length < 2 && (
                  <label className="btn btn-secondary" style={{ display: 'inline-block', cursor: savingPhotos ? 'not-allowed' : 'pointer' }}>
                    {savingPhotos ? 'Saving Images...' : 'Upload Pet Images'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handlePhotoUpload}
                      disabled={savingPhotos}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
                <p style={{ marginTop: '8px', fontSize: '13px' }}>
                  Maximum 2 images. JPEG, PNG, or WebP; up to 2 MB each.
                </p>
                {getPetImages(selectedPet).length === 0 && <p>No pet images uploaded yet.</p>}
              </div>

              {/* Pet Information Section */}
              <div className="detail-section">
                <h3>Pet Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Pet ID:</strong>
                    <span>{selectedPet.petId}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Pet Name:</strong>
                    <span>{selectedPet.petName}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Type:</strong>
                    <span>{selectedPet.petType === 'Other' ? selectedPet.petTypeOther : selectedPet.petType}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Breed:</strong>
                    <span>{selectedPet.breed === 'Other' ? selectedPet.breedOther : selectedPet.breed}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Age:</strong>
                    <span>{selectedPet.age.years} years, {selectedPet.age.months} months</span>
                  </div>
                  <div className="detail-item">
                    <strong>Gender:</strong>
                    <span>{selectedPet.gender}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Color:</strong>
                    <span>{selectedPet.color}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Weight:</strong>
                    <span>{selectedPet.weight} kg</span>
                  </div>
                  {selectedPet.microchipNumber && (
                    <div className="detail-item">
                      <strong>Microchip Number:</strong>
                      <span>{selectedPet.microchipNumber}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <strong>Registration Date:</strong>
                    <span>{formatDate(selectedPet.registrationDate)}</span>
                  </div>
                </div>
              </div>

              {/* Owner Information Section */}
              <div className="detail-section">
                <h3>Owner Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Owner Name:</strong>
                    <span>{selectedPet.owner?.fullName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong>
                    <span>{selectedPet.owner?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong>
                    <span>{selectedPet.owner?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Medical History Section */}
              {(selectedPet.medicalHistory?.allergies || 
                selectedPet.medicalHistory?.existingConditions || 
                selectedPet.medicalHistory?.specialNotes) && (
                <div className="detail-section">
                  <h3>Medical History</h3>
                  <div className="detail-grid">
                    {selectedPet.medicalHistory?.allergies && (
                      <div className="detail-item full-width">
                        <strong>Allergies:</strong>
                        <span>{selectedPet.medicalHistory.allergies}</span>
                      </div>
                    )}
                    {selectedPet.medicalHistory?.existingConditions && (
                      <div className="detail-item full-width">
                        <strong>Existing Conditions:</strong>
                        <span>{selectedPet.medicalHistory.existingConditions}</span>
                      </div>
                    )}
                    {selectedPet.medicalHistory?.specialNotes && (
                      <div className="detail-item full-width">
                        <strong>Special Notes:</strong>
                        <span>{selectedPet.medicalHistory.specialNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              <div className="detail-section">
                <h3>QR Code</h3>
                {selectedPet.qrCode ? (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={selectedPet.qrCode} 
                      alt="Pet QR Code" 
                      style={{ maxWidth: '250px', border: '2px solid var(--pet-golden-amber)', padding: '10px', borderRadius: '5px', background: 'var(--pet-soft-honey-cream)' }}
                    />
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleDownloadQR(selectedPet)}
                        className="btn btn-primary"
                      >
                        Download QR Code
                      </button>
                      <button 
                        onClick={() => handleDownloadPDF(selectedPet)}
                        className="btn btn-primary"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>No QR code available</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => navigate(`/admin/vaccinations/${selectedPet._id}`)}
                className="btn btn-primary"
              >
                Manage Vaccinations
              </button>
              <button onClick={handleCloseModal} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .data-table th,
        .data-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid rgba(37, 99, 235, 0.18);
        }

        .data-table th {
          background-color: var(--pet-soft-honey-cream);
          color: var(--pet-ember-espresso);
          font-weight: 600;
          white-space: nowrap;
          border-bottom: 2px solid var(--pet-golden-amber);
        }

        .data-table tbody tr:hover {
          background-color: rgba(147, 197, 253, 0.18);
        }

        .data-table tbody tr:last-child td {
          border-bottom: none;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
        }

        .modal-content {
          background: #f8fbff;
          border-radius: 10px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(15, 59, 105, 0.28);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 2px solid rgba(37, 99, 235, 0.16);
          background-color: var(--pet-soft-honey-cream);
          color: var(--pet-ember-espresso);
          border-radius: 10px 10px 0 0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 24px;
          color: var(--pet-ember-espresso);
        }

        .modal-close {
          background: transparent;
          border: none;
          color: var(--pet-ember-espresso);
          font-size: 32px;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          opacity: 0.8;
        }

        .modal-body {
          padding: 25px;
        }

        .modal-footer {
          padding: 15px 25px;
          border-top: 2px solid rgba(37, 99, 235, 0.16);
          display: flex;
          justify-content: flex-end;
        }

        .detail-section {
          margin-bottom: 25px;
          padding: 20px;
          background: rgba(219, 234, 254, 0.48);
          border-radius: 8px;
          border-left: 4px solid var(--pet-rustic-apricot);
        }

        .detail-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: var(--pet-ember-espresso);
          font-size: 18px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .detail-item strong {
          color: #405a75;
          font-size: 14px;
        }

        .detail-item span {
          color: var(--pet-ember-espresso);
          font-size: 15px;
          word-wrap: break-word;
        }

        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .data-table {
            font-size: 14px;
          }

          .data-table th,
          .data-table td {
            padding: 8px 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default AllPets;
