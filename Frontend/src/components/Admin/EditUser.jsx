import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';

const EditUser = () => {
  const { userId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nicNumber: '',
    street: '',
    city: '',
    province: '',
    postalCode: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const u = response.data.user;
      setFormData({
        fullName: u.fullName || '',
        email: u.email || '',
        phone: u.phone || '',
        nicNumber: u.nicNumber || '',
        street: u.address?.street || '',
        city: u.address?.city || '',
        province: u.address?.province || '',
        postalCode: u.address?.postalCode || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    if (token && userId) fetchUser();
  }, [token, userId, fetchUser]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        nicNumber: formData.nicNumber,
        address: {
          street: formData.street,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode
        }
      };

      const response = await axios.put(`/api/users/${userId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dashboard"><div className="loading">Loading user...</div></div>;

  return (
    <div className="dashboard">
      <h1>✏️ Edit User</h1>

      <div className="card">
        <h3>User Details</h3>
        <p style={{ color: '#666', marginBottom: '25px' }}>
          Modify any field below and save. Changing email or NIC will be checked for uniqueness.
        </p>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>NIC Number</label>
              <input type="text" name="nicNumber" value={formData.nicNumber} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Street</label>
              <input type="text" name="street" value={formData.street} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Province</label>
              <input type="text" name="province" value={formData.province} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Postal Code</label>
              <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto', minWidth: '180px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', minWidth: '120px' }} onClick={() => navigate('/admin/users')}>
              ← Back to Users
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;

