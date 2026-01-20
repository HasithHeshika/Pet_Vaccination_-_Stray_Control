import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';

const VaccinationManagement = () => {
  const { petId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [pet, setPet] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    vaccineType: '',
    vaccineName: '',
    dateAdministered: '',
    nextDueDate: '',
    veterinarianName: '',
    clinicName: '',
    batchNumber: '',
    notes: '',
    status: 'administered',
    emailNotification: true,
    smsNotification: false
  });

  const vaccineTypes = [
    'Rabies',
    'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
    'Bordetella (Kennel Cough)',
    'Leptospirosis',
    'Lyme Disease',
    'Canine Influenza',
    'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
    'FeLV (Feline Leukemia)',
    'FIV (Feline Immunodeficiency Virus)',
    'Other'
  ];

  const fetchPetAndVaccinations = useCallback(async () => {
    try {
      setLoading(true);
      
      const petResponse = await axios.get(`/api/pets/${petId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPet(petResponse.data.pet);

      const vaccResponse = await axios.get(`/api/vaccinations/pet/${petResponse.data.pet._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setVaccinations(vaccResponse.data.vaccinations);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      setLoading(false);
    }
  }, [petId, token]);

  useEffect(() => {
    if (token && petId) {
      fetchPetAndVaccinations();
    }
  }, [token, petId, fetchPetAndVaccinations]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/vaccinations', {
        petId: pet._id,
        ...formData,
        notificationPreference: {
          email: formData.emailNotification,
          sms: formData.smsNotification
        }
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSuccess('Vaccination record added successfully!');
      setShowForm(false);
      setFormData({
        vaccineType: '',
        vaccineName: '',
        dateAdministered: '',
        nextDueDate: '',
        veterinarianName: '',
        clinicName: '',
        batchNumber: '',
        notes: '',
        status: 'administered',
        emailNotification: true,
        smsNotification: false
      });
      
      // Refresh vaccinations list
      fetchPetAndVaccinations();
    } catch (err) {
      console.error('Error adding vaccination:', err);
      setError(err.response?.data?.message || 'Failed to add vaccination record');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      administered: { background: '#28a745', color: 'white' },
      scheduled: { background: '#007bff', color: 'white' },
      overdue: { background: '#dc3545', color: 'white' },
      cancelled: { background: '#6c757d', color: 'white' }
    };

    return (
      <span style={{
        ...styles[status],
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  if (loading) return <div className="dashboard"><div className="loading">Loading...</div></div>;

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Vaccination Management</h1>
        <button onClick={() => navigate('/admin/pets')} className="btn btn-secondary">
          Back to Pets
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {pet && (
        <div className="card">
          <h3>Pet Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
            <div>
              <strong>Pet ID:</strong> {pet.petId}
            </div>
            <div>
              <strong>Name:</strong> {pet.petName}
            </div>
            <div>
              <strong>Type:</strong> {pet.petType}
            </div>
            <div>
              <strong>Breed:</strong> {pet.breed}
            </div>
            <div>
              <strong>Owner:</strong> {pet.owner?.fullName}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Vaccination Records ({vaccinations.length})</h3>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Vaccination'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>Add New Vaccination Record</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div className="form-group">
                <label>Vaccine Type *</label>
                <select
                  name="vaccineType"
                  value={formData.vaccineType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Vaccine Type</option>
                  {vaccineTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Vaccine Name *</label>
                <input
                  type="text"
                  name="vaccineName"
                  value={formData.vaccineName}
                  onChange={handleInputChange}
                  placeholder="e.g., Nobivac Rabies"
                  required
                />
              </div>

              <div className="form-group">
                <label>Date Administered *</label>
                <input
                  type="date"
                  name="dateAdministered"
                  value={formData.dateAdministered}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Next Due Date *</label>
                <input
                  type="date"
                  name="nextDueDate"
                  value={formData.nextDueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Veterinarian Name *</label>
                <input
                  type="text"
                  name="veterinarianName"
                  value={formData.veterinarianName}
                  onChange={handleInputChange}
                  placeholder="Dr. John Smith"
                  required
                />
              </div>

              <div className="form-group">
                <label>Clinic Name</label>
                <input
                  type="text"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleInputChange}
                  placeholder="Pet Care Clinic"
                />
              </div>

              <div className="form-group">
                <label>Batch Number</label>
                <input
                  type="text"
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., LOT123456"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="administered">Administered</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes or observations..."
                rows="3"
              />
            </div>

            <div style={{ marginTop: '15px', display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="emailNotification"
                  checked={formData.emailNotification}
                  onChange={handleInputChange}
                />
                Send Email Reminder
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="smsNotification"
                  checked={formData.smsNotification}
                  onChange={handleInputChange}
                />
                Send SMS Reminder
              </label>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                Save Vaccination Record
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {vaccinations.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No vaccination records found. Click "Add Vaccination" to create the first record.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vaccine Type</th>
                  <th>Vaccine Name</th>
                  <th>Date Administered</th>
                  <th>Next Due Date</th>
                  <th>Veterinarian</th>
                  <th>Status</th>
                  <th>Reminder Sent</th>
                </tr>
              </thead>
              <tbody>
                {vaccinations.map(vacc => (
                  <tr key={vacc._id}>
                    <td>{vacc.vaccineType}</td>
                    <td>{vacc.vaccineName}</td>
                    <td>{formatDate(vacc.dateAdministered)}</td>
                    <td>{formatDate(vacc.nextDueDate)}</td>
                    <td>{vacc.veterinarianName}</td>
                    <td>{getStatusBadge(vacc.status)}</td>
                    <td>
                      {vacc.reminderSent ? (
                        <span style={{ color: '#28a745' }}>✓ Sent</span>
                      ) : (
                        <span style={{ color: '#6c757d' }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaccinationManagement;
