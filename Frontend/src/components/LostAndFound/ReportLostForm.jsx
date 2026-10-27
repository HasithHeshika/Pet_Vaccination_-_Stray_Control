import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import './LostFound.css';

const ReportLostForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    petName: '',
    breed: '',
    color: '',
    lastSeenLocation: '',
    lastSeenDate: '',
    description: '',
    contactInfo: '',
    imageUrl: '',
    status: 'Lost', // only relevant if editing, but good to have
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      const fetchReport = async () => {
        try {
          const res = await axios.get(`/api/lost-and-found/${id}`);
          const data = res.data;
          
          // Format the date for the input type="date"
          const formattedDate = data.lastSeenDate ? new Date(data.lastSeenDate).toISOString().split('T')[0] : '';
          
          setFormData({
            petName: data.petName || '',
            breed: data.breed || '',
            color: data.color || '',
            lastSeenLocation: data.lastSeenLocation || '',
            lastSeenDate: formattedDate,
            description: data.description || '',
            contactInfo: data.contactInfo || '',
            imageUrl: data.imageUrl || '',
            status: data.status || 'Lost',
          });
        } catch (err) {
          setError('Failed to fetch the report for editing.');
        }
      };
      fetchReport();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditMode) {
        await axios.put(`/api/lost-and-found/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/lost-and-found', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setLoading(false);
      navigate('/lost-and-found');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'submit'} report. Please try again.`);
      setLoading(false);
    }
  };

  return (
    <div className="report-lost-container">
      <h2>{isEditMode ? 'Edit Missing Pet Report' : 'Report a Missing Pet'}</h2>
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

        {isEditMode && (
          <div className="form-group">
            <label>Report Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-control"
            >
              <option value="Lost">Lost (Still Missing)</option>
              <option value="In Progress">In Progress</option>
              <option value="Found">Found</option>
              <option value="Resolved">Resolved (Reunited!)</option>
            </select>
          </div>
        )}

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
          <label>Photo URL (Optional)</label>
          <input
            type="text"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            className="form-control"
            placeholder="https://example.com/pet-image.jpg"
          />
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
