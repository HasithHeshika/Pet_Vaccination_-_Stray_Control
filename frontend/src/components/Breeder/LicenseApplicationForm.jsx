import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import BreederLayout from './BreederLayout';
import { emptyApplication } from './licenseUtils';

const steps = ['Personal Details', 'Breeding Details', 'Documents', 'Review'];
const animalTypes = ['Dogs', 'Cats', 'Birds', 'Rabbits', 'Other'];

const getDocumentPreviewUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http')) return url;
  return `${axios.defaults.baseURL}${url}`;
};

const LicenseApplicationForm = ({ mode = 'new', currentLicense = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(() => currentLicense || emptyApplication(user));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingType, setUploadingType] = useState('');

  const title = mode === 'renewal' ? 'Renew License' : 'Apply for License';
  const subtitle = mode === 'renewal'
    ? 'Update breeder and facility information before submitting your renewal.'
    : 'Complete the four-step application wizard for a new breeder license.';

  const documentsByType = useMemo(() => {
    return {
      idProof: formData.documents.filter(doc => doc.type === 'idProof'),
      facilityImage: formData.documents.filter(doc => doc.type === 'facilityImage'),
      certificate: formData.documents.filter(doc => doc.type === 'certificate')
    };
  }, [formData.documents]);

  const updatePersonal = (field, value) => {
    setFormData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [field]: value }
    }));
  };

  const updateBreeding = (field, value) => {
    setFormData(prev => ({
      ...prev,
      breedingDetails: { ...prev.breedingDetails, [field]: value }
    }));
  };

  const toggleAnimalType = (type) => {
    setFormData(prev => {
      const selected = prev.breedingDetails.animalTypes;
      return {
        ...prev,
        breedingDetails: {
          ...prev.breedingDetails,
          animalTypes: selected.includes(type)
            ? selected.filter(item => item !== type)
            : [...selected, type]
        }
      };
    });
  };

  const handleFiles = async (type, files) => {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    const previewDocuments = selectedFiles.map(file => ({
      type,
      name: file.name,
      url: URL.createObjectURL(file),
      previewOnly: true
    }));

    setFormData(prev => ({
      ...prev,
      documents: [
        ...prev.documents.filter(doc => doc.type !== type),
        ...previewDocuments
      ]
    }));

    try {
      setUploadingType(type);
      setMessage('');
      const payload = new FormData();
      payload.append('type', type);
      selectedFiles.forEach(file => payload.append('documents', file));

      const response = await axios.post('/api/breeder-licenses/documents', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormData(prev => ({
        ...prev,
        documents: [
          ...prev.documents.filter(doc => doc.type !== type),
          ...response.data.documents
        ]
      }));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to upload documents');
      setFormData(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => !(doc.type === type && doc.previewOnly))
      }));
    } finally {
      setUploadingType('');
    }
  };

  const validateStep = (targetStep = step) => {
    const nextErrors = {};
    const { personalDetails, breedingDetails, documents } = formData;

    if (targetStep === 0) {
      ['breederName', 'registrationNumber', 'contactNumber', 'email', 'address'].forEach(field => {
        if (!personalDetails[field]) nextErrors[field] = 'This field is required';
      });
    }

    if (targetStep === 1) {
      if (!breedingDetails.animalTypes.length) nextErrors.animalTypes = 'Select at least one animal type';
      if (breedingDetails.numberOfAnimals === '') nextErrors.numberOfAnimals = 'Number of animals is required';
      if (!breedingDetails.facilityDescription) nextErrors.facilityDescription = 'Facility description is required';
      if (breedingDetails.yearsOfExperience === '') nextErrors.yearsOfExperience = 'Years of experience is required';
    }

    if (targetStep === 2 && !documents.some(doc => doc.type === 'idProof')) {
      nextErrors.documents = 'Upload at least one ID proof document';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const buildPayload = (saveAsDraft = false) => ({
    ...formData,
    applicationType: mode === 'renewal' ? 'renewal' : 'new',
    saveAsDraft,
    breedingDetails: {
      ...formData.breedingDetails,
      numberOfAnimals: Number(formData.breedingDetails.numberOfAnimals),
      yearsOfExperience: Number(formData.breedingDetails.yearsOfExperience)
    },
    documents: formData.documents.map(({ type, name, url }) => ({ type, name, url }))
  });

  const submitApplication = async (saveAsDraft = false) => {
    if (!saveAsDraft) {
      for (let index = 0; index < 3; index += 1) {
        if (!validateStep(index)) {
          setStep(index);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setMessage('');

      if (mode === 'renewal' && currentLicense?._id) {
        await axios.post(`/api/breeder-licenses/${currentLicense._id}/renew`, buildPayload(false));
      } else {
        await axios.post('/api/breeder-licenses', buildPayload(saveAsDraft));
      }

      navigate('/breeder/applications');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setMessage(apiErrors?.[0]?.msg || err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const renderValidation = (field) => errors[field] && <div className="validation-message">{errors[field]}</div>;

  return (
    <BreederLayout title={title} subtitle={subtitle}>
      {message && <div className="error-message">{message}</div>}
      <section className="wizard-panel">
        <div className="wizard-steps">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`wizard-step ${step === index ? 'active' : ''}`}
              onClick={() => setStep(index)}
            >
              Step {index + 1}<br />{label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="form-grid">
            <div className="form-group">
              <label>Breeder Name *</label>
              <input value={formData.personalDetails.breederName} onChange={(e) => updatePersonal('breederName', e.target.value)} />
              {renderValidation('breederName')}
            </div>
            <div className="form-group">
              <label>NIC or Business Registration Number *</label>
              <input value={formData.personalDetails.registrationNumber} onChange={(e) => updatePersonal('registrationNumber', e.target.value)} />
              {renderValidation('registrationNumber')}
            </div>
            <div className="form-group">
              <label>Contact Number *</label>
              <input value={formData.personalDetails.contactNumber} onChange={(e) => updatePersonal('contactNumber', e.target.value)} />
              {renderValidation('contactNumber')}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={formData.personalDetails.email} onChange={(e) => updatePersonal('email', e.target.value)} />
              {renderValidation('email')}
            </div>
            <div className="form-group full-width">
              <label>Address *</label>
              <textarea value={formData.personalDetails.address} onChange={(e) => updatePersonal('address', e.target.value)} />
              {renderValidation('address')}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Type of Animals *</label>
              <div className="checkbox-group">
                {animalTypes.map(type => (
                  <label className="checkbox-tile" key={type}>
                    <input
                      type="checkbox"
                      checked={formData.breedingDetails.animalTypes.includes(type)}
                      onChange={() => toggleAnimalType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
              {renderValidation('animalTypes')}
            </div>
            <div className="form-group">
              <label>Number of Animals *</label>
              <input type="number" min="0" value={formData.breedingDetails.numberOfAnimals} onChange={(e) => updateBreeding('numberOfAnimals', e.target.value)} />
              {renderValidation('numberOfAnimals')}
            </div>
            <div className="form-group">
              <label>Years of Experience *</label>
              <input type="number" min="0" value={formData.breedingDetails.yearsOfExperience} onChange={(e) => updateBreeding('yearsOfExperience', e.target.value)} />
              {renderValidation('yearsOfExperience')}
            </div>
            <div className="form-group full-width">
              <label>Facility Description *</label>
              <textarea value={formData.breedingDetails.facilityDescription} onChange={(e) => updateBreeding('facilityDescription', e.target.value)} />
              {renderValidation('facilityDescription')}
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="upload-grid">
              {[
                ['idProof', 'Upload ID Proof *'],
                ['facilityImage', 'Upload Facility Images'],
                ['certificate', 'Upload Supporting Certificates']
              ].map(([type, label]) => (
                <div className="upload-card" key={type}>
                  <div className="form-group">
                    <label>{label}</label>
                    <input type="file" multiple onChange={(e) => handleFiles(type, e.target.files)} />
                    {uploadingType === type && <div className="validation-message">Uploading files...</div>}
                  </div>
                  <div className="preview-list">
                    {documentsByType[type].map(doc => (
                      <div className="preview-item" key={`${type}-${doc.name}`}>
                        {doc.url && doc.url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                          <img src={getDocumentPreviewUrl(doc.url)} alt={doc.name} className="document-preview-image" />
                        ) : null}
                        <span>{doc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {renderValidation('documents')}
          </>
        )}

        {step === 3 && (
          <div className="review-grid">
            <div className="review-card">
              <h3>Personal / Business Details</h3>
              <p><strong>Name:</strong> {formData.personalDetails.breederName}</p>
              <p><strong>Registration:</strong> {formData.personalDetails.registrationNumber}</p>
              <p><strong>Contact:</strong> {formData.personalDetails.contactNumber}</p>
              <p><strong>Email:</strong> {formData.personalDetails.email}</p>
              <p><strong>Address:</strong> {formData.personalDetails.address}</p>
            </div>
            <div className="review-card">
              <h3>Breeding Details</h3>
              <p><strong>Animals:</strong> {formData.breedingDetails.animalTypes.join(', ') || 'None selected'}</p>
              <p><strong>Number of Animals:</strong> {formData.breedingDetails.numberOfAnimals}</p>
              <p><strong>Experience:</strong> {formData.breedingDetails.yearsOfExperience} years</p>
              <p><strong>Facility:</strong> {formData.breedingDetails.facilityDescription}</p>
            </div>
            <div className="review-card">
              <h3>Documents</h3>
              {formData.documents.length ? (
                <ul className="document-list">
                  {formData.documents.map(doc => <li key={`${doc.type}-${doc.name}`}>{doc.name}</li>)}
                </ul>
              ) : (
                <p>No documents added.</p>
              )}
            </div>
          </div>
        )}

        <div className="wizard-actions">
          {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(prev => prev - 1)}>Back</button>}
          {step < steps.length - 1 && <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={nextStep}>Next</button>}
          {step === steps.length - 1 && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>Edit</button>
              {mode !== 'renewal' && <button type="button" className="btn btn-secondary" onClick={() => submitApplication(true)} disabled={submitting}>Save as Draft</button>}
              <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => submitApplication(false)} disabled={submitting}>
                {submitting ? 'Submitting...' : mode === 'renewal' ? 'Renew License' : 'Submit Application'}
              </button>
            </>
          )}
        </div>
      </section>
    </BreederLayout>
  );
};

export default LicenseApplicationForm;
