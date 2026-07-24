import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../../api/axios';
import BreederLayout from './BreederLayout';
import { formatDate, statusClass } from './breederUtils';

const ApplicationDetail = () => {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplication = useCallback(async () => {
    try {
      const response = await axios.get(`/api/licenses/${id}`);
      setApplication(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const docs = application?.documents;

  return (
    <BreederLayout title="Application Details" subtitle="Review the complete breeder license application record.">
      {loading && <div className="loading">Loading application details...</div>}
      {error && <div className="error-message">{error}</div>}

      {application && (
        <section className="breeder-card">
          <div className="card-title-row">
            <div>
              <p className="breeder-eyebrow">{application.applicationId}</p>
              <h3>{application.applicationType} Application</h3>
            </div>
            <span className={statusClass(application.status)}>{application.status}</span>
          </div>

          <div className="review-grid detail-review">
            {[
              ['License ID', application.licenseId || 'Not issued'],
              ['Submission date', formatDate(application.submittedAt || application.createdAt)],
              ['Issue date', formatDate(application.issueDate)],
              ['Expiry date', formatDate(application.expiryDate)],
              ['Breeder name', application.breederName],
              ['NIC / Business registration', application.nicOrBusinessRegNo],
              ['Contact number', application.contactNumber],
              ['Email', application.email],
              ['Address', application.address],
              ['Animal types', application.animalTypes?.join(', ')],
              ['Number of animals', application.numberOfAnimals],
              ['Years of experience', application.yearsOfExperience],
              ['Facility description', application.facilityDescription],
              ['Remarks', application.remarks || 'No remarks provided']
            ].map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </div>

          <h3 className="section-subheading">Documents</h3>
          <div className="preview-grid">
            {docs?.idProof && <div className="file-preview"><strong>{docs.idProof.fileName}</strong><span>ID proof</span></div>}
            {docs?.facilityImages?.map((doc) => <div className="file-preview" key={doc.fileName}><strong>{doc.fileName}</strong><span>Facility image</span></div>)}
            {docs?.certificates?.map((doc) => <div className="file-preview" key={doc.fileName}><strong>{doc.fileName}</strong><span>Certificate</span></div>)}
          </div>

          <div className="wizard-actions">
            <Link to="/breeder/applications" className="btn btn-secondary">Back to Applications</Link>
            {['Approved', 'Expired'].includes(application.status) && (
              <Link to="/breeder/renew" className="btn btn-primary">Renew License</Link>
            )}
          </div>
        </section>
      )}
    </BreederLayout>
  );
};

export default ApplicationDetail;
