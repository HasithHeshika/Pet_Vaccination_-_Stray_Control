import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import ProfileAvatar from '../ProfileAvatar';

const EditProfile = () => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const pictureInputRef = useRef(null);
  const cropDragRef = useRef(null);

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
  const [pictureDimensions, setPictureDimensions] = useState({ width: 0, height: 0 });
  const [cropPosition, setCropPosition] = useState({ x: 50, y: 50 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [isEditingSavedPicture, setIsEditingSavedPicture] = useState(false);
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

  const resetPictureEditor = () => {
    setProfilePicture(null);
    setPicPreview('');
    setPictureDimensions({ width: 0, height: 0 });
    setCropPosition({ x: 50, y: 50 });
    setIsDraggingCrop(false);
    setIsEditingSavedPicture(false);
    cropDragRef.current = null;
    if (pictureInputRef.current) pictureInputRef.current.value = '';
  };

  const openPictureInCropEditor = (imageSource, selectedFile = null, editingSavedPicture = false) => {
    const image = new Image();

    image.onload = () => {
      setPictureDimensions({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
      setCropPosition({ x: 50, y: 50 });
      setProfilePicture(selectedFile);
      setIsEditingSavedPicture(editingSavedPicture);
      setPicPreview(imageSource);
    };

    image.onerror = () => {
      resetPictureEditor();
      setPicError('This image could not be opened. Please choose another file.');
    };

    image.src = imageSource;
  };

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        resetPictureEditor();
        setPicError('Please choose a JPEG, PNG, or WebP image');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        resetPictureEditor();
        setPicError('Profile picture must be 2 MB or smaller');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        openPictureInCropEditor(reader.result, file, false);
      };
      reader.onerror = () => {
        resetPictureEditor();
        setPicError('This image could not be read. Please choose another file.');
      };
      reader.readAsDataURL(file);
      setPicMessage('');
      setPicError('');
    }
  };

  const handleEditSavedPicture = () => {
    if (!user?.profilePicture) return;

    setPicMessage('');
    setPicError('');
    openPictureInCropEditor(user.profilePicture, null, true);
  };

  const clampCropPosition = (value) => Math.min(100, Math.max(0, value));

  const handleCropPointerDown = (e) => {
    if (!picPreview) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCropX: cropPosition.x,
      startCropY: cropPosition.y,
      frameWidth: e.currentTarget.clientWidth,
      frameHeight: e.currentTarget.clientHeight
    };
    setIsDraggingCrop(true);
  };

  const handleCropPointerMove = (e) => {
    const drag = cropDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const imageAspect = pictureDimensions.width / pictureDimensions.height;
    const frameAspect = drag.frameWidth / drag.frameHeight;
    let nextX = drag.startCropX;
    let nextY = drag.startCropY;

    if (imageAspect > frameAspect) {
      const displayedWidth = drag.frameHeight * imageAspect;
      const horizontalOverflow = displayedWidth - drag.frameWidth;
      if (horizontalOverflow > 0) {
        nextX = drag.startCropX - ((e.clientX - drag.startClientX) / horizontalOverflow) * 100;
      }
    } else if (imageAspect < frameAspect) {
      const displayedHeight = drag.frameWidth / imageAspect;
      const verticalOverflow = displayedHeight - drag.frameHeight;
      if (verticalOverflow > 0) {
        nextY = drag.startCropY - ((e.clientY - drag.startClientY) / verticalOverflow) * 100;
      }
    }

    setCropPosition({
      x: clampCropPosition(nextX),
      y: clampCropPosition(nextY)
    });
  };

  const handleCropPointerEnd = (e) => {
    if (cropDragRef.current?.pointerId === e.pointerId) {
      cropDragRef.current = null;
      setIsDraggingCrop(false);
    }
  };

  const createSquareProfilePicture = () => new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - cropSize) * (cropPosition.x / 100);
      const sourceY = (image.naturalHeight - cropSize) * (cropPosition.y / 100);
      const canvas = document.createElement('canvas');
      const outputSize = 512;

      canvas.width = outputSize;
      canvas.height = outputSize;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Unable to prepare the cropped image'));
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        outputSize,
        outputSize
      );

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    image.onerror = () => reject(new Error('Unable to crop the selected image'));
    image.src = picPreview;
  });

  const handlePictureSubmit = async (e) => {
    e.preventDefault();
    if ((!profilePicture && !isEditingSavedPicture) || !picPreview || !pictureDimensions.width) {
      setPicError('Please select a picture first');
      return;
    }

    setPicLoading(true);
    setPicMessage('');
    setPicError('');

    try {
      const croppedPicture = await createSquareProfilePicture();
      const response = await axios.put('/api/users/profile-picture', {
        profilePicture: croppedPicture
      });

      setPicMessage(response.data.message);
      await refreshUser();
      resetPictureEditor();
    } catch (err) {
      setPicError(err.response?.data?.message || err.message || 'Failed to update profile picture');
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
      resetPictureEditor();
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
            Upload a picture up to 2 MB, then position the square crop before saving. Supported formats are JPEG, PNG, and WebP.
          </p>

          {picMessage && <div className="success-message">{picMessage}</div>}
          {picError && <div className="error-message">{picError}</div>}

          <div style={{ maxWidth: '500px' }}>
            <div className="profile-picture-editor">
              <div className="profile-picture-preview-panel">
                {picPreview ? (
                  <>
                    <div
                      className={`profile-crop-frame${isDraggingCrop ? ' is-dragging' : ''}`}
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerEnd}
                      onPointerCancel={handleCropPointerEnd}
                      role="img"
                      aria-label="Square profile picture crop preview. Drag the image to reposition it."
                    >
                      <img
                        src={picPreview}
                        alt=""
                        draggable="false"
                        style={{ objectPosition: `${cropPosition.x}% ${cropPosition.y}%` }}
                      />
                      <span className="profile-crop-guide" aria-hidden="true" />
                    </div>
                    <p className="profile-crop-hint">Drag the picture to position the square crop.</p>
                  </>
                ) : (
                  <ProfileAvatar
                    user={user}
                    className="profile-picture-preview"
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#555', marginBottom: '15px', fontSize: '14px' }}>
                  The square preview shows exactly which area will be saved and displayed in your navigation bar.
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
                  {picPreview && (
                    <div className="profile-crop-controls">
                      {pictureDimensions.width > pictureDimensions.height && (
                        <div className="form-group">
                          <label htmlFor="profile-crop-horizontal">Horizontal position</label>
                          <input
                            id="profile-crop-horizontal"
                            type="range"
                            min="0"
                            max="100"
                            value={cropPosition.x}
                            onChange={(e) => setCropPosition((current) => ({
                              ...current,
                              x: Number(e.target.value)
                            }))}
                          />
                        </div>
                      )}
                      {pictureDimensions.height > pictureDimensions.width && (
                        <div className="form-group">
                          <label htmlFor="profile-crop-vertical">Vertical position</label>
                          <input
                            id="profile-crop-vertical"
                            type="range"
                            min="0"
                            max="100"
                            value={cropPosition.y}
                            onChange={(e) => setCropPosition((current) => ({
                              ...current,
                              y: Number(e.target.value)
                            }))}
                          />
                        </div>
                      )}
                      {pictureDimensions.width === pictureDimensions.height && (
                        <p className="profile-crop-square-note">This picture is already square.</p>
                      )}
                      <button
                        type="button"
                        className="profile-crop-reset"
                        onClick={() => setCropPosition({ x: 50, y: 50 })}
                      >
                        Reset crop position
                      </button>
                      {isEditingSavedPicture && (
                        <button
                          type="button"
                          className="profile-crop-reset"
                          onClick={resetPictureEditor}
                        >
                          Cancel editing
                        </button>
                      )}
                    </div>
                  )}
                  <div className="profile-picture-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={picLoading || (!profilePicture && !isEditingSavedPicture) || !picPreview || !pictureDimensions.width}
                    >
                      {picLoading ? 'Saving...' : isEditingSavedPicture ? 'Save Crop' : user?.profilePicture ? 'Replace Picture' : 'Save Picture'}
                    </button>
                    {user?.profilePicture && !picPreview && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleEditSavedPicture}
                        disabled={picLoading}
                      >
                        Edit Current Picture
                      </button>
                    )}
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

