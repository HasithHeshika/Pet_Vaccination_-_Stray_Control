import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import BreederLayout from './BreederLayout';
import BreederIcon from './BreederIcons';
import { applicationFromUser, emptyApplication, validateStep } from './breederUtils';

const steps = ['Personal / Business Details', 'Breeding Details', 'Document Upload', 'Review and Submit'];

const fileToDocument = (label, file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve({
    label,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    previewUrl: reader.result
  });
  reader.readAsDataURL(file);
});

const FieldError = ({ message }) => message ? <span className="field-error">{message}</span> : null;

const ApplyLicense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyApplication);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFormData(applicationFromUser(user));
  }, [user]);

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAnimalType = (type) => {
    setFormData((prev) => ({
      ...prev,
      animalTypes: prev.animalTypes.includes(type)
        ? prev.animalTypes.filter((item) => item !== type)
        : [...prev.animalTypes, type]
    }));
  };

  const handleFileChange = async (name, files) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;

    if (name === 'idProof') {
      const doc = await fileToDocument('ID proof', fileList[0]);
      setFormData((prev) => ({ ...prev, documents: { ...prev.documents, idProof: doc } }));
      return;
    }

    const label = name === 'facilityImages' ? 'Facility image' : 'Supporting certificate';
    const docs = await Promise.all(fileList.map((file) => fileToDocument(label, file)));
    setFormData((prev) => ({ ...prev, documents: { ...prev.documents, [name]: docs } }));
  };

  const goNext = () => {
    const stepErrors = validateStep(step, formData);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep((current) => Math.min(current + 1, 4));
  };

  const submitApplication = async (saveAsDraft = false) => {
    const allErrors = {
      ...validateStep(1, formData),
      ...validateStep(2, formData)
    };
    setErrors(allErrors);
    if (!saveAsDraft && Object.keys(allErrors).length > 0) {
      setMessage('Please complete the required fields before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await axios.post('/api/licenses/apply', { ...formData, saveAsDraft });
      navigate('/breeder/applications');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDocumentPreview = (doc) => {
    if (!doc) return null;
    const isImage = doc.fileType?.startsWith('image/');
    return (
      <div className="file-preview" key={doc.fileName}>
        {isImage ? <img src={doc.previewUrl} alt={doc.fileName} /> : <BreederIcon name="document" size={28} />}
        <div>
          <strong>{doc.fileName}</strong>
          <span>{Math.round((doc.fileSize || 0) / 1024)} KB</span>
        </div>
      </div>
    );
  };

  return (
    <BreederLayout title="Apply for License" subtitle="Complete the four-step application wizard and submit for review.">
      <section className="breeder-card">
        <div className="wizard-progress" aria-label="Application progress">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={step === index + 1 ? 'active' : step > index + 1 ? 'complete' : ''}
              onClick={() => setStep(index + 1)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        {message && <div className="error-message">{message}</div>}

        {step === 1 && (
          <div className="form-panel">
            <h3>Personal / Business Details</h3>
            <div className="breeder-form-grid">
              <label>Breeder name<input value={formData.breederName} onChange={(e) => updateField('breederName', e.target.value)} /><FieldError message={errors.breederName} /></label>
              <label>NIC or Business Registration Number<input value={formData.nicOrBusinessRegNo} onChange={(e) => updateField('nicOrBusinessRegNo', e.target.value)} /><FieldError message={errors.nicOrBusinessRegNo} /></label>
              <label>Contact number<input value={formData.contactNumber} onChange={(e) => updateField('contactNumber', e.target.value)} /><FieldError message={errors.contactNumber} /></label>
              <label>Email<input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} /><FieldError message={errors.email} /></label>
              <label className="full-span">Address<textarea value={formData.address} onChange={(e) => updateField('address', e.target.value)} /><FieldError message={errors.address} /></label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-panel">
            <h3>Breeding Details</h3>
            <div className="animal-options">
              {['Dog', 'Cat', 'Other'].map((type) => (
                <button key={type} type="button" className={formData.animalTypes.includes(type) ? 'selected' : ''} onClick={() => toggleAnimalType(type)}>
                  {type}
                </button>
              ))}
            </div>
            <FieldError message={errors.animalTypes} />
            <div className="breeder-form-grid">
              {formData.animalTypes.includes('Other') && (
                <label>Other animal type<input value={formData.otherAnimalType} onChange={(e) => updateField('otherAnimalType', e.target.value)} /></label>
              )}
              <label>Number of animals<input type="number" min="1" value={formData.numberOfAnimals} onChange={(e) => updateField('numberOfAnimals', e.target.value)} /><FieldError message={errors.numberOfAnimals} /></label>
              <label>Years of experience<input type="number" min="0" value={formData.yearsOfExperience} onChange={(e) => updateField('yearsOfExperience', e.target.value)} /><FieldError message={errors.yearsOfExperience} /></label>
              <label className="full-span">Facility description<textarea value={formData.facilityDescription} onChange={(e) => updateField('facilityDescription', e.target.value)} /><FieldError message={errors.facilityDescription} /></label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-panel">
            <h3>Document Upload</h3>
            <div className="upload-grid">
              <label className="upload-box"><BreederIcon name="upload" /> Upload ID proof<input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange('idProof', e.target.files)} /></label>
              <label className="upload-box"><BreederIcon name="upload" /> Upload facility images<input type="file" accept="image/*" multiple onChange={(e) => handleFileChange('facilityImages', e.target.files)} /></label>
              <label className="upload-box"><BreederIcon name="upload" /> Upload supporting certificates<input type="file" accept="image/*,.pdf" multiple onChange={(e) => handleFileChange('certificates', e.target.files)} /></label>
            </div>
            <div className="preview-grid">
              {renderDocumentPreview(formData.documents.idProof)}
              {formData.documents.facilityImages.map(renderDocumentPreview)}
              {formData.documents.certificates.map(renderDocumentPreview)}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-panel">
            <h3>Review and Submit</h3>
            <div className="review-grid">
              {[
                ['Breeder name', formData.breederName],
                ['NIC / Business registration', formData.nicOrBusinessRegNo],
                ['Contact number', formData.contactNumber],
                ['Email', formData.email],
                ['Address', formData.address],
                ['Animal types', formData.animalTypes.join(', ')],
                ['Number of animals', formData.numberOfAnimals],
                ['Years of experience', formData.yearsOfExperience],
                ['Facility description', formData.facilityDescription]
              ].map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>
              ))}
            </div>
          </div>
        )}

        <div className="wizard-actions">
          <button type="button" className="btn btn-secondary" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Back</button>
          {step < 4 ? (
            <button type="button" className="btn btn-primary" onClick={goNext}>Continue</button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Edit</button>
              <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => submitApplication(true)}>Save as Draft</button>
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => submitApplication(false)}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </>
          )}
        </div>
      </section>
    </BreederLayout>
  );
};

export default ApplyLicense;
