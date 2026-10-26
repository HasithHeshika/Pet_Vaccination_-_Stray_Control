import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../../api/axios';

// Set a new password from the emailed reset link (/reset-password/:token)
const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add('auth-bg-override');
    return () => document.body.classList.remove('auth-bg-override');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/reset-password', { token, password });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>Set a New Password</h2>
        {message ? (
          <>
            <div className="success-message">{message}</div>
            <Link to="/login" className="btn btn-primary">Go to login</Link>
          </>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password">New password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Set new password'}
              </button>
            </form>
            <Link to="/forgot-password" className="link">Need a new reset link?</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
