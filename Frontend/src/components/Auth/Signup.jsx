import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    nicNumber: '',
    address: { street: '', city: '', province: '', postalCode: '' }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('auth-bg-override');
    return () => document.body.classList.remove('auth-bg-override');
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({ ...prev, address: { ...prev.address, [addressField]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { confirmPassword, ...signupData } = formData;
    const result = await signup(signupData);

    if (result.success) navigate('/user/dashboard');
    else setError(result.message);

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="form-container" style={{ maxWidth: '600px' }}>
        <h2>Sign Up</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label htmlFor="fullName">Full Name *</label><input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
          <div className="form-group"><label htmlFor="email">Email *</label><input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required /></div>
          <div className="form-group"><label htmlFor="password">Password * (min 6 characters)</label><input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" /></div>
          <div className="form-group"><label htmlFor="confirmPassword">Confirm Password *</label><input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required /></div>
          <div className="form-group"><label htmlFor="phone">Phone Number *</label><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required /></div>
          <div className="form-group"><label htmlFor="nicNumber">NIC Number *</label><input type="text" id="nicNumber" name="nicNumber" value={formData.nicNumber} onChange={handleChange} required /></div>

          <h3 style={{ marginTop: '20px', marginBottom: '15px' }}>Address Information</h3>
          <div className="form-group"><label htmlFor="street">Street Address *</label><input type="text" id="street" name="address.street" value={formData.address.street} onChange={handleChange} required /></div>
          <div className="form-group"><label htmlFor="city">City *</label><input type="text" id="city" name="address.city" value={formData.address.city} onChange={handleChange} required /></div>
          <div className="form-group">
            <label htmlFor="province">Province *</label>
            <select id="province" name="address.province" value={formData.address.province} onChange={handleChange} required>
              <option value="">Select Province</option>
              {['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'].map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
          </div>
          <div className="form-group"><label htmlFor="postalCode">Postal Code *</label><input type="text" id="postalCode" name="address.postalCode" value={formData.address.postalCode} onChange={handleChange} required /></div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Signing up...' : 'Sign Up'}</button>
        </form>
        <Link to="/login" className="link">Already have an account? Login</Link>
      </div>
    </div>
  );
};

export default Signup;
