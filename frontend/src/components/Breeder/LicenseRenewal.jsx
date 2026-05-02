import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import BreederLayout from './BreederLayout';
import LicenseApplicationForm from './LicenseApplicationForm';
import { emptyApplication, formatDate, statusClass } from './licenseUtils';
import { useAuth } from '../../context/AuthContext';

const LicenseRenewal = () => {
  const { user } = useAuth();
  const [license, setLicense] = useState(null);
  const [expiryState, setExpiryState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCurrentLicense = async () => {
      try {
        const response = await axios.get('/api/breeder-licenses/current');
        setLicense(response.data.license);
        setExpiryState(response.data.expiryState);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load current license');
      } finally {
        setLoading(false);
      }
    };

    loadCurrentLicense();
  }, []);

  if (loading) return <div className="loading">Loading renewal details...</div>;

  if (showForm) {
    const renewalData = license ? {
      personalDetails: license.personalDetails,
      breedingDetails: {
        ...license.breedingDetails,
        numberOfAnimals: String(license.breedingDetails.numberOfAnimals),
        yearsOfExperience: String(license.breedingDetails.yearsOfExperience)
      },
      documents: license.documents || []
    } : emptyApplication(user);

    return <LicenseApplicationForm mode="renewal" currentLicense={{ ...renewalData, _id: license?._id }} />;
  }

  return (
    <BreederLayout
      title="License Renewal"
      subtitle="Review your current license details and renew before expiration."
      actions={<button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowForm(true)} disabled={!license}>Renew License</button>}
    >
      {error && <div className="error-message">{error}</div>}
      {!license ? (
        <section className="module-panel">
          <h3>No current license found</h3>
          <p>You need an existing approved, pending, or expired license before submitting a renewal.</p>
        </section>
      ) : (
        <section className="module-panel">
          <h3>Current License Details</h3>
          <div className="module-grid">
            <div>
              <p><strong>License ID:</strong> {license.licenseId || license.applicationId}</p>
              <p><strong>Status:</strong> <span className={statusClass(license.status)}>{license.status}</span></p>
            </div>
            <div>
              <p><strong>Issue Date:</strong> {formatDate(license.issueDate)}</p>
              <p><strong>Expiry Date:</strong> {formatDate(license.expiryDate)}</p>
            </div>
          </div>
          {expiryState?.isExpired && <div className="license-alert">This license is expired. Renewal is required before continued breeding operations.</div>}
          {expiryState?.isExpiringSoon && <div className="license-alert">This license expires in {expiryState.daysRemaining} days.</div>}
        </section>
      )}
    </BreederLayout>
  );
};

export default LicenseRenewal;
