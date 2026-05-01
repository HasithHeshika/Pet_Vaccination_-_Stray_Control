import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import './LostFound.css';

const LostFoundFeed = () => {
  const [lostPets, setLostPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Mocking the API fetch for now
    const fetchLostPets = async () => {
      try {
        // MOCK DATA for Sprint 4 Frontend phase
        setTimeout(() => {
          setLostPets([
            {
              _id: '1',
              petName: 'Buddy',
              breed: 'Golden Retriever',
              color: 'Golden',
              lastSeenLocation: 'Central Park, NY',
              lastSeenDate: '2023-10-15',
              description: 'Wearing a red collar with a bone-shaped tag.',
              contactInfo: '555-0123',
              imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&q=80',
              status: 'Lost'
            },
            {
              _id: '2',
              petName: 'Luna',
              breed: 'Siamese Cat',
              color: 'Cream/Brown',
              lastSeenLocation: 'Downtown 4th St',
              lastSeenDate: '2023-10-18',
              description: 'Very shy, blue eyes. No collar.',
              contactInfo: '555-0987',
              imageUrl: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500&q=80',
              status: 'Lost'
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to fetch lost pets');
        setLoading(false);
      }
    };
    fetchLostPets();
  }, []);

  if (loading) return <div className="loading">Loading lost pets...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="lost-found-container">
      <div className="lost-found-header">
        <h2>Lost & Found Pets</h2>
        <p>Help us reunite these pets with their loving families.</p>
        <Link to="/lost-and-found/report" className="btn btn-primary">
          Report a Missing Pet
        </Link>
      </div>

      <div className="lost-pets-grid">
        {lostPets.length === 0 ? (
          <p className="no-pets">No lost pets reported recently. That's good news!</p>
        ) : (
          lostPets.map(pet => (
            <div key={pet._id} className="lost-pet-card">
              <div className="pet-image-container">
                {pet.imageUrl ? (
                  <img src={pet.imageUrl} alt={pet.petName} className="pet-image" />
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LostFoundFeed;
