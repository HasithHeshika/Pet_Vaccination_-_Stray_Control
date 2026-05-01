import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import './LostFound.css';

const LostFoundFeed = () => {
  const { user, isAdmin, token } = useAuth();
  const [lostPets, setLostPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  const fetchLostPets = async () => {
    try {
      const res = await axios.get('/api/lost-and-found');
      setLostPets(res.data);
      setLoading(false);
    } catch (err) {
      setError('No Lost & Found reports yet');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLostPets();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await axios.delete(`/api/lost-and-found/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchLostPets(); // Refresh list after deletion
      } catch (err) {
        alert('Failed to delete report.');
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.patch(`/api/lost-and-found/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLostPets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading) return <div className="loading">Loading lost pets...</div>;

  const filteredPets = activeTab === 'My' && user 
    ? lostPets.filter(pet => pet.reportedBy?._id === user.id || pet.reportedBy === user.id)
    : lostPets;

  return (
    <div className="lost-found-container">
      <div className="lost-found-header">
        <h2>Lost & Found Pets</h2>
        <p>Help us reunite these pets with their loving families.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
          {user && !isAdmin && (
            <div className="filter-tabs" style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`btn ${activeTab === 'All' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('All')}
              >
                All Reports
              </button>
              <button 
                className={`btn ${activeTab === 'My' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('My')}
              >
                My Reports
              </button>
            </div>
          )}
          <Link to="/lost-and-found/report" className="btn btn-primary">
            Report a Missing Pet
          </Link>
        </div>
      </div>

      {error ? (
        <div className="error-message" style={{ textAlign: 'center', marginTop: '24px' }}>
          {error}
        </div>
      ) : (
        <div className="lost-pets-grid">
          {filteredPets.length === 0 ? (
            <p className="no-pets">
              {activeTab === 'My' ? "You haven't submitted any reports yet." : "No lost pets reported recently. That's good news!"}
            </p>
          ) : (
          filteredPets.map(pet => (
            <div key={pet._id} className="lost-pet-card">
              <div className="pet-image-container">
                {pet.imageUrl ? (
                  <img 
                    src={pet.imageUrl} 
                    alt={pet.petName} 
                    className="pet-image" 
                    onError={(e) => e.target.style.display = 'none'}
                  />
                ) : (
                  <div className="pet-image-placeholder">No Image</div>
                )}
                <span className={`lost-found-badge ${pet.status.toLowerCase()}`}>
                  {pet.status}
                </span>
              </div>
              <div className="pet-info">
                <h3>{pet.petName}</h3>
                <p><strong>Breed:</strong> {pet.breed}</p>
                <p><strong>Color:</strong> {pet.color}</p>
                <p><strong>Last Seen:</strong> {pet.lastSeenLocation}</p>
                <p><strong>Date:</strong> {new Date(pet.lastSeenDate).toLocaleDateString()}</p>
                <p className="pet-description">{pet.description}</p>
                <div className="contact-info">
                  <strong>Contact:</strong> {pet.contactInfo}
                </div>
                
                {/* Status Quick Actions */}
                {user && pet.status !== 'Resolved' && (
                  <div className="status-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {isAdmin && pet.status !== 'In Progress' && (
                      <button 
                        onClick={() => handleStatusUpdate(pet._id, 'In Progress')}
                        className="btn btn-small"
                        style={{ flex: 1, padding: '6px', fontSize: '12px', backgroundColor: '#F59E0B', color: '#fff', border: 'none' }}
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button 
                      onClick={() => handleStatusUpdate(pet._id, 'Resolved')}
                      className="btn btn-success btn-small"
                      style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
                {user && (user.id === pet.reportedBy?._id || user.id === pet.reportedBy || isAdmin) && (
                  <div className="report-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <Link to={`/lost-and-found/edit/${pet._id}`} className="btn btn-secondary btn-small" style={{ flex: 1, textAlign: 'center', padding: '8px' }}>
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(pet._id)} 
                      className="btn btn-primary btn-small" 
                      style={{ flex: 1, padding: '8px', backgroundColor: '#e74c3c' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      )}
    </div>
  );
};

export default LostFoundFeed;
