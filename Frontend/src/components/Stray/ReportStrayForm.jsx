import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import '../LostAndFound/LostFound.css'; // Reusing similar styles

const ReportStrayForm = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    location: '',
    description: '',
    image: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const submitData = { ...formData };
      if (user) {
        submitData.reportedBy = user.id;
      }
      
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.post('/api/stray-reports', submitData, { headers });
      setLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/'); 
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to submit stray report. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="report-lost-container" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Thank You!</h2>
        <p>Your stray animal report has been successfully submitted to the municipality.</p>
        <p>Redirecting you to the home page...</p>
      </div>
    );
  }

  return (
    <div className="report-lost-container">
      <h2>Report a Stray Animal</h2>
      <p>Help the municipal council locate and assist stray animals in your area.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-group">
          <label>Location (Required)</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="e.g., Street name, near landmark"
          />
        </div>

        <div className="form-group">
          <label>Description (Required)</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            className="form-control"
            placeholder="Describe the animal (color, size, breed if known, injured?)"
          ></textarea>
        </div>

        <div className="form-group">
          <label>Photo URL (Optional)</label>
          <input
            type="text"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className="form-control"
            placeholder="https://images.unsplash.com/... (Direct Image Link)"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Stray Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportStrayForm;
