import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { readPetImageFiles, resizeImageDataUrl, getPetImages, MAX_PET_IMAGES } from '../../utils/petImages';
import { useCurrentLocation } from '../../utils/geolocation';
import { mapLink } from '../../utils/incidents';
import { SPECIES } from '../../utils/lostFound';
import './LostFound.css';
import '../Stray/ReportIncident.css';

const today = () => new Date().toISOString().split('T')[0];

// Lost or found pet report (create and edit). Photos, species, location and dates feed the
// matching system, which suggests possible matches for an administrator to review.
const ReportLostForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const isEditMode = Boolean(id);

  const [reportType, setReportType] = useState(searchParams.get('type') === 'found' ? 'found' : 'lost');
  const [formData, setFormData] = useState({
    petName: '',
    species: '',
    speciesOther: '',
    breed: '',
    color: '',
    lastSeenLocation: '',
    lastSeenDate: '',
    description: '',
    contactInfo: '',
    tagPetId: '',
    status: 'Lost'
  });
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [myPets, setMyPets] = useState([]);
  const [linkedPet, setLinkedPet] = useState('');
  const { coordinates, setCoordinates, locating, locationError, requestLocation } = useCurrentLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFound = reportType === 'found';

  useEffect(() => {
    if (!isEditMode) return;
    const fetchReport = async () => {
      try {
        const res = await axios.get(`/api/lost-and-found/${id}`);
        const data = res.data;
        setReportType(data.reportType || 'lost');
        setFormData({
          petName: data.petName || '',
          species: data.species || '',
          speciesOther: data.speciesOther || '',
          breed: data.breed || '',
          color: data.color || '',
          lastSeenLocation: data.lastSeenLocation || '',
          lastSeenDate: data.lastSeenDate ? new Date(data.lastSeenDate).toISOString().split('T')[0] : '',
          description: data.description || '',
          contactInfo: data.contactInfo || '',
          tagPetId: data.tagPetId || '',
          status: data.status || 'Lost'
        });
        setPhotos(data.images || []);
        if (data.coordinates?.lat !== undefined) setCoordinates(data.coordinates);
      } catch (err) {
        setError('Failed to fetch the report for editing.');
      }
    };
    fetchReport();
  }, [id, isEditMode, setCoordinates]);

  // Owners can pick one of their registered pets when reporting it lost
  useEffect(() => {
    if (isEditMode || !user?.id) return;
    axios.get(`/api/users/${user.id}/pets`)
      .then((res) => setMyPets(res.data.pets || []))
      .catch(() => setMyPets([]));
  }, [isEditMode, user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePickPet = (petId) => {
    setLinkedPet(petId);
    const pet = myPets.find((p) => p._id === petId);
    if (!pet) return;
    setFormData((current) => ({
      ...current,
      petName: pet.petName,
      species: pet.petType,
      speciesOther: pet.petType === 'Other' ? pet.petTypeOther || '' : '',
      breed: pet.breed === 'Other' ? pet.breedOther || '' : pet.breed,
      color: pet.color
    }));
    if (photos.length === 0) {
      setPhotos(getPetImages(pet).filter((p) => p.startsWith('data:image/')).slice(0, MAX_PET_IMAGES));
    }
  };

  const handlePhotoChange = async (e) => {
    setPhotoError('');
    try {
      const newPhotos = await readPetImageFiles(e.target.files, photos.length);
      // Smaller photos keep the public feed fast
      const resized = await Promise.all(newPhotos.map((p) => resizeImageDataUrl(p)));
      setPhotos([...photos, ...resized]);
    } catch (readError) {
      setPhotoError(readError.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      species: formData.species || undefined,
      speciesOther: formData.species === 'Other' ? formData.speciesOther : undefined,
      tagPetId: isFound ? formData.tagPetId : undefined,
      coordinates: coordinates || undefined,
      images: photos
    };
    if (!isEditMode) {
      payload.reportType = reportType;
      delete payload.status;
      if (!isFound && linkedPet) payload.linkedPet = linkedPet;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (isEditMode) {
        await axios.put(`/api/lost-and-found/${id}`, payload, { headers });
      } else {
        await axios.post('/api/lost-and-found', payload, { headers });
      }
      setLoading(false);
      navigate(`/lost-and-found?tab=${isEditMode ? 'My' : reportType}`);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'submit'} report. Please try again.`);
      setLoading(false);
    }
  };

  const title = isEditMode
    ? `Edit ${isFound ? 'Found' : 'Missing'} Pet Report`
    : (isFound ? 'Report a Found Pet' : 'Report a Missing Pet');

  return (
    <div className="report-lost-container incident-form-container">
      <h2>{title}</h2>
      <p>
        {isFound
          ? 'Thank you for helping. Describe the animal you found; the authority will check it against missing pets and registered pets.'
          : 'Please provide as much detail as possible to help identify your pet.'}
      </p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        {!isEditMode && (
          <fieldset className="form-group incident-type-group">
            <legend>What happened?</legend>
            <div className="incident-type-options">
              {[
                { value: 'lost', label: 'I lost a pet', hint: 'My pet is missing' },
                { value: 'found', label: 'I found a pet', hint: 'I have found or seen an animal that seems lost' }
              ].map((option) => (
                <label key={option.value} className={`incident-type-option ${reportType === option.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={reportType === option.value}
                    onChange={() => setReportType(option.value)}
                  />
                  <span className="incident-type-label">{option.label}</span>
                  <span className="incident-type-hint">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {!isEditMode && !isFound && myPets.length > 0 && (
          <div className="form-group">
            <label htmlFor="linkedPet">Which of your registered pets is missing? (Optional)</label>
            <select id="linkedPet" value={linkedPet} onChange={(e) => handlePickPet(e.target.value)} className="form-control">
              <option value="">Not a registered pet / choose…</option>
              {myPets.map((pet) => (
                <option key={pet._id} value={pet._id}>{pet.petName} ({pet.petType}, {pet.petId})</option>
              ))}
            </select>
            <p className="incident-field-hint">Choosing your pet fills in its details and photos and helps the authority match it.</p>
          </div>
        )}

        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="species">Species</label>
            <select id="species" name="species" value={formData.species} onChange={handleChange} className="form-control" required>
              <option value="">Choose…</option>
              {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {formData.species === 'Other' && (
            <div className="form-group half">
              <label htmlFor="speciesOther">What kind of animal?</label>
              <input id="speciesOther" name="speciesOther" value={formData.speciesOther} onChange={handleChange} className="form-control" maxLength={60} required />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="petName">{isFound ? 'Name on collar (if any)' : 'Pet name'}</label>
          <input
            id="petName"
            type="text"
            name="petName"
            value={formData.petName}
            onChange={handleChange}
            required={!isFound}
            className="form-control"
            placeholder={isFound ? 'Leave blank if unknown' : ''}
          />
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="breed">Breed{isFound ? ' (if you can tell)' : ''}</label>
            <input id="breed" type="text" name="breed" value={formData.breed} onChange={handleChange} required={!isFound} className="form-control" />
          </div>
          <div className="form-group half">
            <label htmlFor="color">Colour / markings</label>
            <input id="color" type="text" name="color" value={formData.color} onChange={handleChange} required className="form-control" placeholder="e.g., brown with white chest" />
          </div>
        </div>

        {isFound && (
          <div className="form-group">
            <label htmlFor="tagPetId">Pet ID on the QR tag (if any)</label>
            <input id="tagPetId" type="text" name="tagPetId" value={formData.tagPetId} onChange={handleChange} className="form-control" maxLength={40} placeholder="e.g., PETMH3K2ABC123" />
            <p className="incident-field-hint">If the animal wears a QR tag, its Pet ID lets the authority identify the owner straight away.</p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="lastSeenLocation">{isFound ? 'Where did you find it?' : 'Last seen location'}</label>
          <input
            id="lastSeenLocation"
            type="text"
            name="lastSeenLocation"
            value={formData.lastSeenLocation}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="e.g., Main Street near the bus stand, Galle"
          />
          <div className="incident-location-actions">
            <button type="button" className="btn btn-secondary btn-small" onClick={requestLocation} disabled={locating}>
              {locating ? 'Getting location...' : coordinates ? 'Update my location' : 'Use my current location'}
            </button>
            {coordinates && (
              <>
                <a href={mapLink(coordinates)} target="_blank" rel="noopener noreferrer">
                  Location attached ({coordinates.lat}, {coordinates.lng})
                </a>
                <button type="button" className="link-button" onClick={() => setCoordinates(null)}>Remove</button>
              </>
            )}
          </div>
          {locationError && <p className="incident-field-error" role="alert">{locationError}</p>}
          <p className="incident-field-hint">A GPS location helps match lost and found pets nearby.</p>
        </div>

        <div className="form-group">
          <label htmlFor="lastSeenDate">{isFound ? 'Date found' : 'Last seen date'}</label>
          <input
            id="lastSeenDate"
            type="date"
            name="lastSeenDate"
            value={formData.lastSeenDate}
            onChange={handleChange}
            required
            className="form-control"
            max={today()}
          />
        </div>

        {isEditMode && (
          <div className="form-group">
            <label htmlFor="status">Report status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} className="form-control">
              <option value={isFound ? 'Found' : 'Lost'}>{isFound ? 'Found (looking for the owner)' : 'Lost (still missing)'}</option>
              <option value="In Progress" disabled={formData.status !== 'In Progress'}>In Progress (set by the authority)</option>
              <option value="Resolved">Resolved (reunited)</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description">Additional description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="form-control"
            placeholder="Collar, tags, injuries, behaviour, distinctive marks..."
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="photos">Photos (up to {MAX_PET_IMAGES})</label>
          <input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoChange}
            disabled={photos.length >= MAX_PET_IMAGES}
            className="form-control"
          />
          <p className="incident-field-hint">Clear photos of the face and any markings give the best matches. JPEG, PNG or WebP, 2 MB or smaller.</p>
          {photoError && <p className="incident-field-error" role="alert">{photoError}</p>}
          {photos.length > 0 && (
            <div className="incident-photo-previews">
              {photos.map((photo, index) => (
                <div key={index} className="incident-photo-preview">
                  <img src={photo} alt={`Attached ${index + 1}`} />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="contactInfo">Contact information</label>
          <input
            id="contactInfo"
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="Phone number or email"
          />
          <p className="incident-field-hint">Shown on the public Lost &amp; Found feed and shared with the other person when a match is confirmed.</p>
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
