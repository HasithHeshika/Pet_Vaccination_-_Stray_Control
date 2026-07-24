import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import ProfileAvatar from '../ProfileAvatar';

const EditProfile = () => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const pictureInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postalCode: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [profilePicture, setProfilePicture] = useState(null);
  const [picPreview, setPicPreview] = useState('');
  const [picLoading, setPicLoading] = useState(false);
  const [picMessage, setPicMessage] = useState('');
  const [picError, setPicError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        street: user.address?.street || '',
        city: user.address?.city || '',
        province: user.address?.province || '',
        postalCode: user.address?.postalCode || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode
        }
      };

      const response = await axios.put('/api/users/profile', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setMessage(response.data.message);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwMessage('');
    setPwError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwError('New passwords do not match');
      setPwLoading(false);
      return;
    }

    try {
      const response = await axios.put('/api/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setPwMessage(response.data.message);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        setProfilePicture(null);
        setPicPreview('');
        setPicError('Please choose a JPEG, PNG, or WebP image');
        e.target.value = '';
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setProfilePicture(null);
        setPicPreview('');
        setPicError('Profile picture must be 2 MB or smaller');
        e.target.value = '';
        return;
      }

      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setPicError('');
    }
  };

  const handlePictureSubmit = async (e) => {
    e.preventDefault();
    if (!profilePicture) {
      setPicError('Please select a picture first');
      return;
    }

    setPicLoading(true);
    setPicMessage('');
    setPicError('');

    try {
      const response = await axios.put('/api/users/profile-picture', {
        profilePicture: picPreview
      });

      setPicMessage(response.data.message);
      await refreshUser();
      setProfilePicture(null);
      setPicPreview('');
      if (pictureInputRef.current) pictureInputRef.current.value = '';
    } catch (err) {
      setPicError(err.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setPicLoading(false);
    }
  };

  const handlePictureRemove = async () => {
    setPicLoading(true);
    setPicMessage('');
    setPicError('');

    try {
      const response = await axios.delete('/api/users/profile-picture');
      setPicMessage(response.data.message);
      setProfilePicture(null);
      setPicPreview('');
      if (pictureInputRef.current) pictureInputRef.current.value = '';
      await refreshUser();
    } catch (err) {
      setPicError(err.response?.data?.message || 'Failed to remove profile picture');
    } finally {
      setPicLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h1>Profile Settings</h1>

      {/* Profile header */}
      <div className="card account-card" style={{ marginBottom: '25px' }}>
        <div className="account-header">
          <ProfileAvatar user={user} />
          <div>
            <p className="eyebrow">Editing Profile</p>
            <h3 style={{ margin: '4px 0 0 0' }}>{user?.fullName}</h3>
            <p className="muted">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Personal Info
        </button>
        <button
          className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
        <button
          className={`profile-tab ${activeTab === 'picture' ? 'active' : ''}`}
          onClick={() => setActiveTab('picture')}
        >
          Profile Picture
        </button>
      </div>

      {/* Profile details tab */}
      {activeTab === 'profile' && (
        <div className="card" style={{ animation: 'fadeIn 0.4s ease-in-out' }}>
          <h3>Personal Information</h3>
          <p style={{ color: '#666', marginBottom: '25px' }}>
            Update your name, phone, and address. Email and NIC cannot be changed here.
          </p>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleProfileSubmit}>
            <div className="profile-form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Street</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Province</label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', minWidth: '180px' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', minWidth: '120px' }} onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password tab */}
      {activeTab === 'password' && (
        <div className="card" style={{ animation: 'fadeIn 0.4s ease-in-out' }}>
          <h3>Change Password</h3>
          <p style={{ color: '#666', marginBottom: '25px' }}>
            Enter your current password and choose a new one (min 6 characters).
          </p>

          {pwMessage && <div className="success-message">{pwMessage}</div>}
          {pwError && <div className="error-message">{pwError}</div>}

          <form onSubmit={handlePasswordSubmit} style={{ maxWidth: '450px' }}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: 'auto', minWidth: '200px', marginTop: '10px' }} disabled={pwLoading}>
              {pwLoading ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Profile Picture tab */}
      {activeTab === 'picture' && (
        <div className="card" style={{ animation: 'fadeIn 0.4s ease-in-out' }}>
          <h3>Profile Picture</h3>
          <p style={{ color: '#666', marginBottom: '25px' }}>
            Upload a profile picture up to 2 MB. Supported formats are JPEG, PNG, and WebP.
          </p>

          {picMessage && <div className="success-message">{picMessage}</div>}
          {picError && <div className="error-message">{picError}</div>}

          <div style={{ maxWidth: '500px' }}>
            <div className="profile-picture-editor">
              <ProfileAvatar
                user={user}
                source={picPreview}
                className="profile-picture-preview"
                alt={picPreview ? 'Selected profile picture preview' : undefined}
              />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#555', marginBottom: '15px', fontSize: '14px' }}>
                  The saved picture appears in your navigation bar and account area. Selecting a new image shows a preview before it is saved.
                </p>
                <form onSubmit={handlePictureSubmit}>
                  <div className="form-group">
                    <label>Choose Picture</label>
                    <input
                      ref={pictureInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePictureChange}
                      style={{ padding: '10px' }}
                    />
                  </div>
                  <div className="profile-picture-actions">
                    <button type="submit" className="btn btn-primary" disabled={picLoading || !profilePicture || !picPreview}>
                      {picLoading ? 'Saving...' : user?.profilePicture ? 'Replace Picture' : 'Save Picture'}
                    </button>
                    {user?.profilePicture && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handlePictureRemove}
                        disabled={picLoading}
                      >
                        Remove Picture
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfile;

