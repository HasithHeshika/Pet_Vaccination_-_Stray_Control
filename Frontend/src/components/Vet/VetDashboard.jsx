import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import './VetDashboard.css';

const VetDashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state for adding new vaccination record
  const [vacForm, setVacForm] = useState({
    vaccineType: 'Rabies',
    vaccineName: '',
    dateAdministered: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    batchNumber: '',
    notes: ''
  });

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSearchResult(null);
    setVaccinations([]);

    try {
      // Try searching by System Pet ID first
      let res;
      try {
        res = await axios.get(`/api/pets/petid/${searchQuery.trim()}`);
      } catch (err) {
        // Fallback: search all pets and match by ID or petName
        const allPetsRes = await axios.get('/api/pets');
        const found = allPetsRes.data.pets.find(
          p => p.petId.toLowerCase() === searchQuery.trim().toLowerCase() ||
               p.petName.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
        if (found) {
          res = { data: { pet: found } };
        } else {
          throw err;
        }
      }

      const pet = res.data.pet || res.data;
      setSearchResult(pet);

      // Fetch pet's vaccination history
      const vacRes = await axios.get(`/api/vaccinations/pet/${pet._id}`);
      setVaccinations(vacRes.data.vaccinations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Pet record not found. Please verify the Pet ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogVaccination = async (e) => {
    e.preventDefault();
    if (!searchResult) return;

    setError('');
    setSuccessMessage('');

    try {
      await axios.post('/api/vaccinations', {
        petId: searchResult._id,
        vaccineType: vacForm.vaccineType,
        vaccineName: vacForm.vaccineName,
        dateAdministered: vacForm.dateAdministered,
        nextDueDate: vacForm.nextDueDate,
        batchNumber: vacForm.batchNumber,
        notes: vacForm.notes,
        veterinarianName: user?.fullName,
        clinicName: user?.clinicName || 'Veterinary Hospital',
        status: 'administered'
      });

      setSuccessMessage(`Vaccination record for ${vacForm.vaccineName} logged successfully!`);
      
      // Reset form
      setVacForm({
        vaccineType: 'Rabies',
        vaccineName: '',
        dateAdministered: new Date().toISOString().split('T')[0],
        nextDueDate: '',
        batchNumber: '',
        notes: ''
      });

      // Refresh vaccination list
      const vacRes = await axios.get(`/api/vaccinations/pet/${searchResult._id}`);
      setVaccinations(vacRes.data.vaccinations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log vaccination record.');
    }
  };

  const handleSendReminder = async (vacId) => {
    try {
      await axios.post(`/api/vaccinations/${vacId}/send-reminder`);
      alert('Vaccination reminder email sent to pet owner successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reminder email.');
    }
  };

  return (
    <div className="vet-dashboard-container">
      <div className="vet-header-banner">
        <div>
          <h2>🩺 Veterinarian Portal</h2>
          <p className="vet-subtitle">
            Welcome, <strong>Dr. {user?.fullName}</strong> {user?.clinicName && `(${user.clinicName})`}
          </p>
        </div>
        {user?.vetLicenseNumber && (
          <div className="vet-license-badge">
            <span className="badge-label">License Number:</span>
            <span className="badge-value">{user.vetLicenseNumber}</span>
          </div>
        )}
      </div>

      {/* Patient Search */}
      <div className="vet-card">
        <h3>🔍 Patient Lookup</h3>
        <p className="card-desc">Enter the unique System Pet ID or Pet Name to retrieve medical history and update vaccinations.</p>
        
        <form onSubmit={handleSearch} className="vet-search-form">
          <input
            type="text"
            className="vet-search-input"
            placeholder="e.g. PET-12345 or Pet Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Lookup Patient'}
          </button>
        </form>

        {error && <div className="error-message" style={{ marginTop: '15px' }}>{error}</div>}
      </div>

      {/* Patient Details & Log Form */}
      {searchResult && (
        <div className="vet-patient-grid">
          {/* Patient Overview */}
          <div className="vet-card">
            <h3>🐾 Patient Overview</h3>
            <div className="patient-info-list">
              <p><strong>Pet ID:</strong> <span className="highlight-text">{searchResult.petId}</span></p>
              <p><strong>Name:</strong> {searchResult.petName}</p>
              <p><strong>Species / Breed:</strong> {searchResult.petType || searchResult.species} ({searchResult.breed})</p>
              <p><strong>Age / Gender:</strong> {searchResult.age} years | {searchResult.gender}</p>
              <p><strong>Owner Name:</strong> {searchResult.owner?.fullName || searchResult.ownerName}</p>
              <p><strong>Owner Phone:</strong> {searchResult.owner?.phone || 'N/A'}</p>
              <p><strong>Owner Email:</strong> {searchResult.owner?.email || 'N/A'}</p>
            </div>

            {searchResult.qrCodeUrl && (
              <div className="qr-preview">
                <h4>QR Code Identifier</h4>
                <img src={searchResult.qrCodeUrl} alt="Pet QR Code" style={{ width: '130px', height: '130px' }} />
              </div>
            )}
          </div>

          {/* Add Vaccination Record */}
          <div className="vet-card">
            <h3>💉 Log New Vaccination / Treatment</h3>
            {successMessage && <div className="success-message" style={{ padding: '10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '15px' }}>{successMessage}</div>}
            
            <form onSubmit={handleLogVaccination}>
              <div className="form-group">
                <label>Vaccine Type *</label>
                <select
                  value={vacForm.vaccineType}
                  onChange={(e) => setVacForm({ ...vacForm, vaccineType: e.target.value })}
                  required
                >
                  <option value="Rabies">Rabies</option>
                  <option value="DHPP">DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)</option>
                  <option value="FVRCP">FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)</option>
                  <option value="Bordetella">Bordetella</option>
                  <option value="Lyme">Lyme Disease</option>
                  <option value="Other">Other Medical Treatment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Vaccine Name / Details *</label>
                <input
                  type="text"
                  placeholder="e.g. Nobivac Rabies 1-Year"
                  value={vacForm.vaccineName}
                  onChange={(e) => setVacForm({ ...vacForm, vaccineName: e.target.value })}
                  required
                />
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date Administered *</label>
                  <input
                    type="date"
                    value={vacForm.dateAdministered}
                    onChange={(e) => setVacForm({ ...vacForm, dateAdministered: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Next Booster Due Date *</label>
                  <input
                    type="date"
                    value={vacForm.nextDueDate}
                    onChange={(e) => setVacForm({ ...vacForm, nextDueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Batch / Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. LOT-2024-X99"
                  value={vacForm.batchNumber}
                  onChange={(e) => setVacForm({ ...vacForm, batchNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Veterinary Clinical Notes</label>
                <textarea
                  rows="2"
                  placeholder="Health condition, weight, dosage, or special observations..."
                  value={vacForm.notes}
                  onChange={(e) => setVacForm({ ...vacForm, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                ➕ Record Vaccination
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Medical History */}
      {searchResult && (
        <div className="vet-card" style={{ marginTop: '25px' }}>
          <h3>📋 Vaccination & Health History ({vaccinations.length})</h3>
          
          {vaccinations.length === 0 ? (
            <p className="no-data">No previous vaccination records found for this patient.</p>
          ) : (
            <div className="table-responsive">
              <table className="vet-history-table">
                <thead>
                  <tr>
                    <th>Vaccine</th>
                    <th>Type</th>
                    <th>Date Administered</th>
                    <th>Next Due Date</th>
                    <th>Batch #</th>
                    <th>Vet / Clinic</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccinations.map((v) => (
                    <tr key={v._id}>
                      <td><strong>{v.vaccineName}</strong></td>
                      <td><span className="badge-type">{v.vaccineType}</span></td>
                      <td>{new Date(v.dateAdministered).toLocaleDateString()}</td>
                      <td>
                        <span className={`date-due ${new Date(v.nextDueDate) < new Date() ? 'overdue' : ''}`}>
                          {new Date(v.nextDueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td>{v.batchNumber || 'N/A'}</td>
                      <td>{v.veterinarianName} ({v.clinicName || 'Clinic'})</td>
                      <td>
                        <button
                          onClick={() => handleSendReminder(v._id)}
                          className="btn btn-secondary btn-small"
                          title="Send Email Reminder to Owner"
                        >
                          📧 Remind
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VetDashboard;
