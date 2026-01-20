import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';

const VaccinationSchedule = () => {
  const { token, user } = useAuth();
  const [upcomingVaccinations, setUpcomingVaccinations] = useState([]);
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState('all');
  const [petVaccinations, setPetVaccinations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserPets = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${user.id}/pets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPets(response.data.pets);
    } catch (err) {
      console.error('Error fetching pets:', err);
      setError('Failed to load your pets');
    }
  }, [user, token]);

  const fetchUpcomingVaccinations = useCallback(async () => {
    try {
      const response = await axios.get('/api/vaccinations/user/upcoming', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUpcomingVaccinations(response.data.vaccinations);
    } catch (err) {
      console.error('Error fetching upcoming vaccinations:', err);
    }
  }, [token]);

  const fetchPetVaccinations = useCallback(async (petMongoId) => {
    try {
      const response = await axios.get(`/api/vaccinations/pet/${petMongoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPetVaccinations(prev => ({
        ...prev,
        [petMongoId]: response.data.vaccinations
      }));
    } catch (err) {
      console.error('Error fetching pet vaccinations:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      setLoading(true);
      fetchUserPets();
      fetchUpcomingVaccinations();
      setLoading(false);
    }
  }, [token, user, fetchUserPets, fetchUpcomingVaccinations]);

  useEffect(() => {
    if (pets.length > 0) {
      pets.forEach(pet => {
        if (!petVaccinations[pet._id]) {
          fetchPetVaccinations(pet._id);
        }
      });
    }
  }, [pets, petVaccinations, fetchPetVaccinations]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysDifference = (date) => {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (nextDueDate) => {
    const days = getDaysDifference(nextDueDate);
    if (days < 0) return '#dc3545'; // Overdue- red
    if (days <= 7) return '#ffc107'; // Due soon- yellow
    if (days <= 30) return '#17a2b8'; // Upcoming- blue
    return '#28a745'; // Future- green
  };

  const getStatusText = (nextDueDate) => {
    const days = getDaysDifference(nextDueDate);
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''}`;
    if (days === 0) return 'Due Today';
    if (days <= 7) return `Due in ${days} day${days > 1 ? 's' : ''}`;
    if (days <= 30) return `Due in ${days} days`;
    return `Due in ${days} days`;
  };

  const filteredVaccinations = selectedPetId === 'all' 
    ? upcomingVaccinations 
    : upcomingVaccinations.filter(v => v.pet._id === selectedPetId);

  if (loading) return <div className="dashboard"><div className="loading">Loading...</div></div>;

  return (
    <div className="dashboard">
      <h1>My Pets' Vaccination Schedule</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Upcoming Vaccinations Section */}
      <div className="card">
        <h3>Upcoming Vaccinations (Next 30 Days)</h3>
        
        {pets.length > 1 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '10px', fontWeight: '600' }}>Filter by Pet:</label>
            <select 
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              style={{ padding: '8px 15px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="all">All Pets</option>
              {pets.map(pet => (
                <option key={pet._id} value={pet._id}>{pet.petName}</option>
              ))}
            </select>
          </div>
        )}

        {filteredVaccinations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>✓ No upcoming vaccinations</p>
            <p style={{ fontSize: '14px', color: '#999' }}>All your pets are up to date!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredVaccinations.map(vacc => (
              <div 
                key={vacc._id} 
                style={{
                  background: 'white',
                  border: `3px solid ${getStatusColor(vacc.nextDueDate)}`,
                  borderRadius: '10px',
                  padding: '20px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '20px' }}>
                      {vacc.pet.petName}
                    </h4>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                      {vacc.pet.petType} • {vacc.pet.breed}
                    </p>
                  </div>
                  <div 
                    style={{
                      background: getStatusColor(vacc.nextDueDate),
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    {getStatusText(vacc.nextDueDate)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <strong>Vaccine:</strong> {vacc.vaccineName}
                  </div>
                  <div>
                    <strong>Type:</strong> {vacc.vaccineType}
                  </div>
                  <div>
                    <strong>Due Date:</strong> {formatDate(vacc.nextDueDate)}
                  </div>
                  <div>
                    <strong>Veterinarian:</strong> {vacc.veterinarianName}
                  </div>
                  {vacc.clinicName && (
                    <div>
                      <strong>Clinic:</strong> {vacc.clinicName}
                    </div>
                  )}
                </div>

                {vacc.notes && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}>
                    <strong>Notes:</strong> {vacc.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Vaccination History */}
      {pets.map(pet => {
        const vaccinations = petVaccinations[pet._id] || [];
        
        return (
          <div key={pet._id} className="card" style={{ marginTop: '20px' }}>
            <h3>{pet.petName}'s Complete Vaccination History</h3>

            {vaccinations.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No vaccination records found for {pet.petName}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vaccine Type</th>
                      <th>Vaccine Name</th>
                      <th>Date Given</th>
                      <th>Next Due</th>
                      <th>Veterinarian</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.map(vacc => (
                      <tr key={vacc._id}>
                        <td>{vacc.vaccineType}</td>
                        <td>{vacc.vaccineName}</td>
                        <td>{formatDate(vacc.dateAdministered)}</td>
                        <td>
                          <span style={{ color: getStatusColor(vacc.nextDueDate), fontWeight: '600' }}>
                            {formatDate(vacc.nextDueDate)}
                          </span>
                        </td>
                        <td>{vacc.veterinarianName}</td>
                        <td>
                          <span style={{
                            background: vacc.status === 'administered' ? '#28a745' : '#007bff',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}>
                            {vacc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VaccinationSchedule;

