import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import './LostFound.css';

const ReportLostForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    petName: '',
    breed: '',
    color: '',
    lastSeenLocation: '',
    lastSeenDate: '',
    description: '',
    contactInfo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock API post for Sprint 4 frontend phase
      console.log('Submitted:', formData);
      setTimeout(() => {
        setLoading(false);
        navigate('/lost-and-found');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="report-lost-container">
      <h2>Report a Missing Pet</h2>
      <p>Please provide as much detail as possible to help identify your pet.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-group">
          <label>Pet Name (or "Unknown" if found)</label>
          <input
            type="text"
            name="petName"
            value={formData.petName}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group half">
            <label>Breed / Type</label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
          <div className="form-group half">
            <label>Color / Markings</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Last Seen Location</label>
          <input
            type="text"
            name="lastSeenLocation"
            value={formData.lastSeenLocation}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="e.g., Central Park near 72nd St entrance"
          />
        </div>

        <div className="form-group">
          <label>Last Seen Date</label>
          <input
            type="date"
            name="lastSeenDate"
            value={formData.lastSeenDate}
            onChange={handleChange}
            required
            className="form-control"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label>Additional Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="form-control"
            placeholder="Describe any collar, tags, behaviors, etc."
          ></textarea>
        </div>

        <div className="form-group">
          <label>Contact Information</label>
          <input
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Phone number or email"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/lost-and-found')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportLostForm;
