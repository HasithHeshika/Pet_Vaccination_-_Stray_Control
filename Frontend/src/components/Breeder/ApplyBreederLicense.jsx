import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import './Breeder.css';

const ApplyBreederLicense = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    facilityAddress: '',
    documentsUrl: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/licenses/apply', formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/breeder/my-licenses');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit breeder license application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="breeder-page-container">
      <div className="form-container" style={{ maxWidth: '650px' }}>
        <h2>📜 Apply for Breeder License</h2>
        <p className="form-subtitle">
          Submit your official breeder registration application to municipal authorities for verification and approval.
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message" style={{ padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '20px' }}>
            ✅ License application submitted successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="businessName">Breeding Facility / Kennel Business Name *</label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              placeholder="e.g. Royal Golden Kennels"
              value={formData.businessName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="facilityAddress">Full Breeding Facility Address *</label>
            <textarea
              id="facilityAddress"
              name="facilityAddress"
              rows="3"
              placeholder="Full physical address of the breeding establishment..."
              value={formData.facilityAddress}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="documentsUrl">Supporting Documentation URL (Optional)</label>
            <input
              type="url"
              id="documentsUrl"
              name="documentsUrl"
              placeholder="https://drive.google.com/your-license-docs or Cloud link"
              value={formData.documentsUrl}
              onChange={handleChange}
            />
            <small style={{ color: '#6b7280' }}>Provide a link to veterinary inspection certificates, registration documents, or facilities proof.</small>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Additional Information / Notes for Authorities</label>
            <textarea
              id="notes"
              name="notes"
              rows="2"
              placeholder="Mention species bred (e.g., German Shepherds, Persian Cats), annual capacity, etc."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Submitting Application...' : 'Submit License Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplyBreederLicense;
