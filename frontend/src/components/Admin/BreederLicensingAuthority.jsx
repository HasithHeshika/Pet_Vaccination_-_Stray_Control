import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { formatDate, statusClass } from '../Breeder/licenseUtils';
import '../Breeder/BreederModule.css';

const BreederLicensingAuthority = () => {
  const [licenses, setLicenses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    try {
      const response = await axios.get('/api/breeder-licenses/admin/all');
      setLicenses(response.data.licenses);
      setSelected(prev => prev ? response.data.licenses.find(item => item._id === prev._id) || null : response.data.licenses[0] || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load breeder applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const updateStatus = async (status) => {
    if (!selected) return;

    try {
      setError('');
      setSuccess('');
      await axios.patch(`/api/breeder-licenses/admin/${selected._id}/status`, { status, remarks });
      setSuccess(`Application ${status} successfully`);
      setRemarks('');
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update application');
    }
  };

  if (loading) return <div className="loading">Loading breeder licensing authority...</div>;

  return (
    <div className="dashboard">
      <div className="module-header">
        <div>
          <h1>Breeder Licensing Authority</h1>
          <p className="module-subtitle">Review applications, approve licenses, reject incomplete submissions, and monitor compliance.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="authority-layout">
        <section className="module-panel">
          <h3>Submitted Applications</h3>
          {licenses.length === 0 ? (
            <p>No breeder applications submitted yet.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Breeder</th>
                    <th>Type</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map(license => (
                    <tr key={license._id}>
                      <td><strong>{license.applicationId}</strong></td>
                      <td>{license.personalDetails.breederName}</td>
                      <td>{license.applicationType}</td>
                      <td>{formatDate(license.createdAt)}</td>
                      <td><span className={statusClass(license.status)}>{license.status}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-small" onClick={() => setSelected(license)}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="authority-detail">
          {selected ? (
            <>
              <h3>{selected.applicationId}</h3>
              <p><strong>Status:</strong> <span className={statusClass(selected.status)}>{selected.status}</span></p>
              <p><strong>Breeder:</strong> {selected.personalDetails.breederName}</p>
              <p><strong>Registration:</strong> {selected.personalDetails.registrationNumber}</p>
              <p><strong>Animals:</strong> {selected.breedingDetails.animalTypes.join(', ')}</p>
              <p><strong>Animal Count:</strong> {selected.breedingDetails.numberOfAnimals}</p>
              <p><strong>Facility:</strong> {selected.breedingDetails.facilityDescription}</p>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Authority Remarks</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks for approval or rejection" />
              </div>

              <div className="table-actions">
                <button className="btn btn-secondary" onClick={() => updateStatus('rejected')}>Reject</button>
                <button className="btn btn-secondary" onClick={() => updateStatus('expired')}>Mark Expired</button>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => updateStatus('approved')}>Approve</button>
              </div>
            </>
          ) : (
            <p>Select an application to review.</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default BreederLicensingAuthority;
