import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { readPetImageFiles, MAX_PET_IMAGES } from '../../utils/petImages';
import { INCIDENT_TYPES, URGENCY_LEVELS, mapLink } from '../../utils/incidents';
import '../LostAndFound/LostFound.css'; // Reusing similar styles
import './ReportIncident.css';

// Public form for reporting any animal incident: violence or abuse, a sick or injured
// animal in a public place, a stray animal, or anything else.
const ReportStrayForm = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [formData, setFormData] = useState({
    // No type is pre-selected, so nobody files an urgent violence report by accident
    incidentType: '',
    otherIncidentType: '',
    urgency: 'normal',
    location: '',
    description: '',
    reporterName: user?.fullName || '',
    reporterContact: ''
  });
  const [coordinates, setCoordinates] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTypeChange = (type) => {
    // Violence and injuries default to Urgent; the reporter can still change it
    setFormData({ ...formData, incidentType: type.value, urgency: type.defaultUrgency });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser cannot share your location. Please describe the location instead.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        });
        setLocating(false);
      },
      () => {
        setLocationError('Could not get your location. Please allow location access or describe the location instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handlePhotoChange = async (e) => {
    setPhotoError('');
    try {
      const newPhotos = await readPetImageFiles(e.target.files, photos.length);
      setPhotos([...photos, ...newPhotos]);
    } catch (readError) {
      setPhotoError(readError.message);
    } finally {
      e.target.value = '';
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, photoIndex) => photoIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.incidentType) {
      setError('Please choose what happened.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // The server identifies a logged-in reporter from the login token (if any)
      const submitData = {
        ...formData,
        otherIncidentType: formData.incidentType === 'other' ? formData.otherIncidentType : undefined,
        coordinates: coordinates || undefined,
        images: photos
      };

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post('/api/stray-reports', submitData, { headers });
      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to submit the report. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="report-lost-container" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Thank You!</h2>
        <p>Your report has been sent to the municipal authority.</p>
        {(formData.urgency === 'emergency' || formData.urgency === 'urgent') && (
          <p>Urgent reports are flagged to the authority straight away.</p>
        )}
        <p>Redirecting you to the home page...</p>
      </div>
    );
  }

  const selectedLink = mapLink(coordinates);

  return (
    <div className="report-lost-container incident-form-container">
      <h2>Report an Animal Incident</h2>
      <p>Tell the municipal authority about an animal that is being harmed, is sick or injured in a public place, is a stray, or needs help for any other reason.</p>

      <div className="incident-emergency-note" role="note">
        If someone is in danger or an animal is being attacked right now, also call the police or your local emergency number.
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        <fieldset className="form-group incident-type-group">
          <legend>What happened? (Required)</legend>
          <div className="incident-type-options">
            {INCIDENT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`incident-type-option ${formData.incidentType === type.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="incidentType"
                  value={type.value}
                  checked={formData.incidentType === type.value}
                  onChange={() => handleTypeChange(type)}
                  required
                />
                <span className="incident-type-label">{type.label}</span>
                <span className="incident-type-hint">{type.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {formData.incidentType === 'other' && (
          <div className="form-group">
            <label htmlFor="otherIncidentType">Type of incident (Required)</label>
            <input
              id="otherIncidentType"
              type="text"
              name="otherIncidentType"
              value={formData.otherIncidentType}
              onChange={handleChange}
              required
              maxLength={100}
              className="form-control"
              placeholder="e.g., dead animal on the road, aggressive dog, abandoned puppies"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="urgency">How urgent is it?</label>
          <select id="urgency" name="urgency" value={formData.urgency} onChange={handleChange} className="form-control">
            {URGENCY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>{level.label} - {level.hint}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location">Location (Required)</label>
          <input
            id="location"
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            maxLength={300}
            className="form-control"
            placeholder="e.g., Street name, near landmark, town"
          />
          <div className="incident-location-actions">
            <button type="button" className="btn btn-secondary btn-small" onClick={handleUseMyLocation} disabled={locating}>
              {locating ? 'Getting location...' : coordinates ? 'Update my location' : 'Use my current location'}
            </button>
            {coordinates && (
              <>
                <a href={selectedLink} target="_blank" rel="noopener noreferrer">
                  Location attached ({coordinates.lat}, {coordinates.lng}) - view on map
                </a>
                <button type="button" className="link-button" onClick={() => setCoordinates(null)}>Remove</button>
              </>
            )}
          </div>
          {locationError && <p className="incident-field-error" role="alert">{locationError}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Required)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            maxLength={2000}
            rows="4"
            className="form-control"
            placeholder="What did you see? Describe the animal (type, colour, size), its condition, and anyone involved."
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="photos">Photos (Optional, up to {MAX_PET_IMAGES})</label>
          <input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoChange}
            disabled={photos.length >= MAX_PET_IMAGES}
            className="form-control"
          />
          <p className="incident-field-hint">JPEG, PNG or WebP, 2 MB or smaller each.</p>
          {photoError && <p className="incident-field-error" role="alert">{photoError}</p>}
          {photos.length > 0 && (
            <div className="incident-photo-previews">
              {photos.map((photo, index) => (
                <div key={index} className="incident-photo-preview">
                  <img src={photo} alt={`Attached ${index + 1}`} />
                  <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <fieldset className="form-group incident-contact-group">
          <legend>Your contact details (Optional)</legend>
          <p className="incident-field-hint">
            Only the municipal authority can see these, so an officer can follow up.
            {token
              ? ' You are logged in, so this report is also linked to your account.'
              : ' Leave them blank to report anonymously.'}
          </p>
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="reporterName">Name</label>
              <input id="reporterName" type="text" name="reporterName" value={formData.reporterName} onChange={handleChange} maxLength={100} className="form-control" autoComplete="name" />
            </div>
            <div className="form-group half">
              <label htmlFor="reporterContact">Phone or email</label>
              <input id="reporterContact" type="text" name="reporterContact" value={formData.reporterContact} onChange={handleChange} maxLength={150} className="form-control" autoComplete="tel" />
            </div>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
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

export default ReportStrayForm;
