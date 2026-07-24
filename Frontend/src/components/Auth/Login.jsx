import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SocialLogin from './SocialLogin';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registrationMessage = location.state?.registrationMessage;

  useEffect(() => {
    document.body.classList.add('auth-bg-override');
    return () => document.body.classList.remove('auth-bg-override');
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    if (result.success) navigate('/');
    else setError(result.message);

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>Login</h2>
        {registrationMessage && <div className="success-message">{registrationMessage}</div>}
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" autoComplete="current-password" value={formData.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <SocialLogin />
        <Link to="/signup" className="link">Don't have an account? Sign up</Link>
      </div>
    </div>
  );
};

export default Login;
