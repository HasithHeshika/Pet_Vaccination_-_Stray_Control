import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import BreederLayout from './BreederLayout';
import { formatDate, statusClass } from './breederUtils';

const RenewLicense = () => {
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [formData, setFormData] = useState({
    numberOfAnimals: '',
    facilityDescription: '',
    yearsOfExperience: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadLicenses = useCallback(async () => {
    try {
      const response = await axios.get('/api/licenses/my-licenses');
      setLicenses(response.data);
      const current = response.data.find((item) => ['Approved', 'Expired'].includes(item.status)) || response.data[0];
      if (current) {
        setSelectedId(current._id);
        setFormData({
          numberOfAnimals: current.numberOfAnimals || '',
          facilityDescription: current.facilityDescription || '',
          yearsOfExperience: current.yearsOfExperience || ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load license details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  const selectedLicense = useMemo(
    () => licenses.find((license) => license._id === selectedId),
    [licenses, selectedId]
  );

  const isExpired = selectedLicense?.expiryDate && new Date(selectedLicense.expiryDate) < new Date();
  const daysRemaining = selectedLicense?.expiryDate
    ? Math.ceil((new Date(selectedLicense.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const submitRenewal = async (event) => {
    event.preventDefault();
    if (!selectedLicense) return;

    setSubmitting(true);
    setError('');

    try {
      await axios.post(`/api/licenses/${selectedLicense._id}/renew`, {
        ...selectedLicense,
        ...formData,
        numberOfAnimals: Number(formData.numberOfAnimals),
        yearsOfExperience: Number(formData.yearsOfExperience)
      });
      navigate('/breeder/applications');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit renewal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BreederLayout title="License Renewal" subtitle="Review your current license and submit updated renewal details.">
      {loading && <div className="loading">Loading license details...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && licenses.length === 0 && (
        <section className="breeder-card empty-state">
          No license applications were found. Submit a new breeder license application before requesting renewal.
        </section>
      )}

      {!loading && selectedLicense && (
        <div className="renewal-layout">
          <section className="breeder-card">
            <div className="card-title-row">
              <h3>Current License Details</h3>
              <span className={statusClass(selectedLicense.status)}>{selectedLicense.status}</span>
            </div>

            <label className="select-license">
              Select license
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {licenses.map((license) => (
                  <option key={license._id} value={license._id}>
                    {license.licenseId || license.applicationId} - {license.status}
                  </option>
                ))}
              </select>
            </label>

            <dl className="breeder-details two-column">
              <div><dt>License ID</dt><dd>{selectedLicense.licenseId || 'Not issued'}</dd></div>
              <div><dt>Status</dt><dd>{selectedLicense.status}</dd></div>
              <div><dt>Issue date</dt><dd>{formatDate(selectedLicense.issueDate)}</dd></div>
              <div><dt>Expiry date</dt><dd>{formatDate(selectedLicense.expiryDate)}</dd></div>
            </dl>

            {isExpired && <p className="breeder-alert danger">This license is expired.</p>}
            {!isExpired && daysRemaining !== null && daysRemaining <= 30 && (
              <p className="breeder-alert">This license expires in {daysRemaining} days.</p>
            )}
          </section>

          <form className="breeder-card renewal-form" onSubmit={submitRenewal}>
            <h3>Renewal Form</h3>
            <label>
              Number of animals
              <input
                type="number"
                min="1"
                value={formData.numberOfAnimals}
                onChange={(e) => setFormData((prev) => ({ ...prev, numberOfAnimals: e.target.value }))}
                required
              />
            </label>
            <label>
              Years of experience
              <input
                type="number"
                min="0"
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData((prev) => ({ ...prev, yearsOfExperience: e.target.value }))}
                required
              />
            </label>
            <label>
              Facility description
              <textarea
                value={formData.facilityDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, facilityDescription: e.target.value }))}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Renew License'}
            </button>
          </form>
        </div>
      )}
    </BreederLayout>
  );
};

export default RenewLicense;
