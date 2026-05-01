import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { generatePetPDF } from '../../utils/pdfGenerator';
import axios from '../../api/axios';

const PetRegistration = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredPet, setRegisteredPet] = useState(null);

  const [formData, setFormData] = useState({
    petName: '',
    petType: '',
    petTypeOther: '',
    breed: '',
    breedOther: '',
    age: {
      years: 0,
      months: 0
    },
    gender: '',
    color: '',
    weight: '',
    microchipNumber: '',
    medicalHistory: {
      allergies: '',
      existingConditions: '',
      specialNotes: ''
    },
    photoUrl: ''
  });

  // Breed options for each pet type
  const breedOptions = {
    Dog: ['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle', 'Doberman', 'Husky', 'Beagle', 'Rottweiler', 'Other'],
    Cat: ['Persian', 'Siamese', 'Maine Coon', 'Bengal', 'British Shorthair', 'Ragdoll', 'Sphynx', 'Other'],
    Bird: ['Parrot', 'Canary', 'Cockatiel', 'Budgerigar', 'Finch', 'Other'],
    Rabbit: ['Dutch', 'Flemish Giant', 'Lionhead', 'Rex', 'Other'],
    Hamster: ['Syrian', 'Dwarf', 'Roborovski', 'Other']
  };

  const fetchOwner = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setOwner(response.data.user);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching owner:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch owner details');
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    if (token && userId) {
      fetchOwner();
    }
  }, [userId, token, fetchOwner]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('age.')) {
      const ageField = name.split('.')[1];
      setFormData({
        ...formData,
        age: {
          ...formData.age,
          [ageField]: parseInt(value) || 0
        }
      });
    } else if (name.startsWith('medicalHistory.')) {
      const medicalField = name.split('.')[1];
      setFormData({
        ...formData,
        medicalHistory: {
          ...formData.medicalHistory,
          [medicalField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
      
      // Reset breed when pet type changes
      if (name === 'petType') {
        setFormData(prev => ({
          ...prev,
          breed: '',
          breedOther: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const submitData = {
        ownerId: userId,
        ...formData,
        weight: parseFloat(formData.weight)
      };

      const response = await axios.post('/api/pets/register', submitData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setRegisteredPet(response.data.pet);
      setSuccess(true);
    } catch (error) {
      console.error('Error registering pet:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to register pet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadQR = () => {
    if (registeredPet && registeredPet.qrCode) {
      const link = document.createElement('a');
      link.href = registeredPet.qrCode;
      link.download = `${registeredPet.petName}_QRCode.png`;
      link.click();
    }
  };

  const handleDownloadPDF = () => {
    if (registeredPet) {
      generatePetPDF(registeredPet);
    }
  };

  const handleRegisterAnother = () => {
    setSuccess(false);
    setRegisteredPet(null);
    setFormData({
      petName: '',
      petType: '',
      petTypeOther: '',
      breed: '',
      breedOther: '',
      age: { years: 0, months: 0 },
      gender: '',
      color: '',
      weight: '',
      microchipNumber: '',
      medicalHistory: {
        allergies: '',
        existingConditions: '',
        specialNotes: ''
      },
      photoUrl: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading owner details...</div>;
  }

  if (!owner) {
    return <div className="error-message">Owner not found</div>;
  }

  if (success && registeredPet) {
    return (
      <div className="dashboard">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: '#4CAF50', textAlign: 'center' }}>✓ Pet Registered Successfully!</h2>
          
          <div style={{ marginTop: '20px' }}>
            <h3>Pet Details</h3>
            <p><strong>Pet ID:</strong> {registeredPet.petId}</p>
            <p><strong>Name:</strong> {registeredPet.petName}</p>
            <p><strong>Type:</strong> {registeredPet.petType === 'Other' ? registeredPet.petTypeOther : registeredPet.petType}</p>
            <p><strong>Breed:</strong> {registeredPet.breed === 'Other' ? registeredPet.breedOther : registeredPet.breed}</p>
            <p><strong>Owner:</strong> {owner.fullName}</p>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <h3>QR Code</h3>
            <img 
              src={registeredPet.qrCode} 
              alt="Pet QR Code" 
              style={{ maxWidth: '300px', border: '2px solid #ddd', padding: '10px' }}
            />
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleDownloadQR} className="btn btn-primary">
                Download QR Code
              </button>
              <button onClick={handleDownloadPDF} className="btn btn-primary">
                📄 Download PDF
              </button>
              <button onClick={handleRegisterAnother} className="btn btn-secondary">
                Register Another Pet
              </button>
              <button onClick={() => navigate('/admin/users')} className="btn btn-secondary">
                Back to Users
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="form-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2>Register Pet for {owner.fullName}</h2>
        
        <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h4>Owner Information</h4>
          <p><strong>Email:</strong> {owner.email}</p>
          <p><strong>Phone:</strong> {owner.phone}</p>
          <p><strong>Address:</strong> {owner.address.street}, {owner.address.city}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <h3>Pet Information</h3>

          <div className="form-group">
            <label htmlFor="petName">Pet Name *</label>
            <input
              type="text"
              id="petName"
              name="petName"
              value={formData.petName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="petType">Pet Type *</label>
            <select
              id="petType"
              name="petType"
              value={formData.petType}
              onChange={handleChange}
              required
            >
              <option value="">Select Pet Type</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Rabbit">Rabbit</option>
              <option value="Hamster">Hamster</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {formData.petType === 'Other' && (
            <div className="form-group">
              <label htmlFor="petTypeOther">Specify Pet Type *</label>
              <input
                type="text"
                id="petTypeOther"
                name="petTypeOther"
                value={formData.petTypeOther}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {formData.petType && formData.petType !== 'Other' && (
            <div className="form-group">
              <label htmlFor="breed">Breed *</label>
              <select
                id="breed"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                required
              >
                <option value="">Select Breed</option>
                {breedOptions[formData.petType]?.map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
            </div>
          )}

          {formData.petType === 'Other' && (
            <div className="form-group">
              <label htmlFor="breedOther">Breed/Type *</label>
              <input
                type="text"
                id="breedOther"
                name="breedOther"
                value={formData.breedOther}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {formData.breed === 'Other' && formData.petType !== 'Other' && (
            <div className="form-group">
              <label htmlFor="breedOther">Specify Breed *</label>
              <input
                type="text"
                id="breedOther"
                name="breedOther"
                value={formData.breedOther}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label htmlFor="ageYears">Age (Years) *</label>
              <input
                type="number"
                id="ageYears"
                name="age.years"
                value={formData.age.years}
                onChange={handleChange}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ageMonths">Age (Months) *</label>
              <input
                type="number"
                id="ageMonths"
                name="age.months"
                value={formData.age.months}
                onChange={handleChange}
                min="0"
                max="11"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender *</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="color">Color *</label>
            <input
              type="text"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="e.g., Brown, White, Black and White"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="weight">Weight (kg) *</label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              step="0.1"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="microchipNumber">Microchip Number (Optional)</label>
            <input
              type="text"
              id="microchipNumber"
              name="microchipNumber"
              value={formData.microchipNumber}
              onChange={handleChange}
              placeholder="e.g., 985112345678901"
            />
          </div>

          <h3 style={{ marginTop: '25px' }}>Medical History (Optional)</h3>

          <div className="form-group">
            <label htmlFor="allergies">Allergies</label>
            <textarea
              id="allergies"
              name="medicalHistory.allergies"
              value={formData.medicalHistory.allergies}
              onChange={handleChange}
              placeholder="List any known allergies"
            />
          </div>

          <div className="form-group">
            <label htmlFor="existingConditions">Existing Medical Conditions</label>
            <textarea
              id="existingConditions"
              name="medicalHistory.existingConditions"
              value={formData.medicalHistory.existingConditions}
              onChange={handleChange}
              placeholder="List any existing medical conditions"
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialNotes">Special Notes</label>
            <textarea
              id="specialNotes"
              name="medicalHistory.specialNotes"
              value={formData.medicalHistory.specialNotes}
              onChange={handleChange}
              placeholder="Any other important information"
            />
          </div>

          <div className="form-group">
            <label htmlFor="photoUrl">Pet Photo URL (Optional)</label>
            <input
              type="url"
              id="photoUrl"
              name="photoUrl"
              value={formData.photoUrl}
              onChange={handleChange}
              placeholder="https://example.com/pet-photo.jpg"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register Pet'}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate('/admin/users')} 
            className="btn btn-secondary"
            style={{ marginTop: '10px' }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default PetRegistration;