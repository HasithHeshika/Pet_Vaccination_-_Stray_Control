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
    if (days < 0) return '#dc3545'; // Overdue - red
    if (days <= 7) return '#ffc107'; // Due soon - yellow
    if (days <= 30) return '#17a2b8'; // Upcoming - blue
    return '#28a745'; // Future - green
  };

  const getStatusText = (nextDueDate) => {
    const days = getDaysDifference(nextDueDate);
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''}`;
    if (days === 0) return 'Due Today';
    if (days <= 7) return `Due in ${days} day${days > 1 ? 's' : ''}`;
    if (days <= 30) return `Due in ${days} days`;
    return `Due in ${days} days`;
  };

  const getPetEmoji = (petType) => {
    const emojis = {
      'Dog': '🐕',
      'Cat': '🐈',
      'Bird': '🦜',
      'Rabbit': '🐰',
      'Hamster': '🐹',
      'Other': '🐾'
    };
    return emojis[petType] || '🐾';
  };

  const filteredVaccinations = selectedPetId === 'all' 
    ? upcomingVaccinations 
    : upcomingVaccinations.filter(v => v.pet._id === selectedPetId);

  if (loading) return <div className="dashboard"><div className="loading">Loading...</div></div>;

  return (
    <div className="dashboard">
      <h1>💉 My Pets' Vaccination Schedule</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Upcoming Vaccinations Section */}
      <div className="card">
        <h3>📅 Upcoming Vaccinations (Next Year)</h3>
        
        {pets.length > 1 && (
          <div style={{ marginBottom: '20px', animation: 'fadeIn 0.6s ease-in-out' }}>
            <label style={{ marginRight: '15px', fontWeight: '700', fontSize: '16px', color: '#333' }}>Filter by Pet:</label>
            <select 
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              style={{
                padding: '12px 15px',
                borderRadius: '10px',
                border: '2px solid #4FC3F7',
                fontSize: '15px',
                fontWeight: '600',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(79, 195, 247, 0.2)'
              }}
            >
              <option value="all">🐾 All Pets</option>
              {pets.map(pet => (
                <option key={pet._id} value={pet._id}>{getPetEmoji(pet.petType)} {pet.petName}</option>
              ))}
            </select>
          </div>
        )}

        {filteredVaccinations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px', animation: 'fadeIn 0.6s ease-in-out' }}>
            <p style={{ fontSize: '28px', marginBottom: '15px' }}>✓ No upcoming vaccinations</p>
            <p style={{ fontSize: '16px', color: '#999' }}>All your pets are up to date! 🎉</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px', animation: 'fadeIn 0.6s ease-in-out' }}>
            {filteredVaccinations.map((vacc, index) => (
              <div 
                key={vacc._id} 
                style={{
                  background: 'white',
                  border: `3px solid ${getStatusColor(vacc.nextDueDate)}`,
                  borderRadius: '15px',
                  padding: '25px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  animation: `fadeIn 0.6s ease-in-out ${index * 0.1}s both`,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.12)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${getStatusColor(vacc.nextDueDate)}, transparent)`,
                  opacity: 0.5
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getPetEmoji(vacc.pet.petType)} {vacc.pet.petName}
                    </h4>
                    <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '14px' }}>
                      {vacc.pet.petType} • {vacc.pet.breed}
                    </p>
                  </div>
                  <div 
                    style={{
                      background: getStatusColor(vacc.nextDueDate),
                      color: 'white',
                      padding: '12px 20px',
                      borderRadius: '25px',
                      fontWeight: '700',
                      fontSize: '13px',
                      textAlign: 'center',
                      minWidth: '140px',
                      boxShadow: `0 5px 15px ${getStatusColor(vacc.nextDueDate)}40`,
                      animation: 'bounce 2s ease-in-out infinite'
                    }}
                  >
                    {getStatusText(vacc.nextDueDate)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <strong style={{ color: '#4FC3F7', fontSize: '12px', textTransform: 'uppercase' }}>Vaccine:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '15px' }}>{vacc.vaccineName}</p>
                  </div>
                  <div>
                    <strong style={{ color: '#4FC3F7', fontSize: '12px', textTransform: 'uppercase' }}>Type:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '15px' }}>{vacc.vaccineType}</p>
                  </div>
                  <div>
                    <strong style={{ color: '#4FC3F7', fontSize: '12px', textTransform: 'uppercase' }}>Due Date:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '15px', fontWeight: '600' }}>{formatDate(vacc.nextDueDate)}</p>
                  </div>
                  <div>
                    <strong style={{ color: '#4FC3F7', fontSize: '12px', textTransform: 'uppercase' }}>Veterinarian:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '15px' }}>{vacc.veterinarianName}</p>
                  </div>
                  {vacc.clinicName && (
                    <div>
                      <strong style={{ color: '#4FC3F7', fontSize: '12px', textTransform: 'uppercase' }}>Clinic:</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '15px' }}>{vacc.clinicName}</p>
                    </div>
                  )}
                </div>

                {vacc.notes && (
                  <div style={{ marginTop: '15px', padding: '15px', background: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)', borderRadius: '10px', borderLeft: '4px solid #4FC3F7' }}>
                    <strong style={{ color: '#4FC3F7' }}>📝 Notes:</strong>
                    <p style={{ margin: '8px 0 0 0', color: '#555' }}>{vacc.notes}</p>
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
            <h3>{getPetEmoji(pet.petType)} {pet.petName}'s Complete Vaccination History</h3>

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
                            background: vacc.status === 'administered' ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'linear-gradient(135deg, #007bff 0%, #0dcaf0 100%)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            textTransform: 'capitalize',
                            display: 'inline-block'
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
