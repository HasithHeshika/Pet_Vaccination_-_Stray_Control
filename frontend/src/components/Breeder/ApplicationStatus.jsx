import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import BreederLayout from './BreederLayout';
import { formatDate, statusClass } from './licenseUtils';

const ApplicationStatus = () => {
  const [licenses, setLicenses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const response = await axios.get('/api/breeder-licenses');
        setLicenses(response.data.licenses);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, []);

  if (loading) return <div className="loading">Loading applications...</div>;

  return (
    <BreederLayout title="Application Status" subtitle="Track submitted breeder license applications and compliance records.">
      {error && <div className="error-message">{error}</div>}
      <section className="module-panel">
        {licenses.length === 0 ? (
          <p>No applications submitted yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(license => (
                  <tr key={license._id}>
                    <td><strong>{license.applicationId}</strong></td>
                    <td>{formatDate(license.createdAt)}</td>
                    <td><span className={statusClass(license.status)}>{license.status}</span></td>
                    <td>{license.remarks || 'No remarks'}</td>
                    <td>
                      <button className="btn btn-secondary btn-small" onClick={() => setSelected(license)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="module-panel" style={{ marginTop: '20px' }}>
          <h3>Application Details: {selected.applicationId}</h3>
          <div className="review-grid">
            <div className="review-card">
              <h3>Breeder</h3>
              <p>{selected.personalDetails.breederName}</p>
              <p>{selected.personalDetails.email}</p>
              <p>{selected.personalDetails.contactNumber}</p>
            </div>
            <div className="review-card">
              <h3>Compliance Records</h3>
              {selected.complianceRecords?.length ? (
                selected.complianceRecords.map(record => (
                  <p key={record._id || record.title}>
                    <span className={statusClass(record.status)}>{record.status}</span> {record.title}
                  </p>
                ))
              ) : (
                <p>No compliance records added yet.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </BreederLayout>
  );
};

export default ApplicationStatus;
