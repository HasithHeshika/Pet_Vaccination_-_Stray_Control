import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { formatDate } from '../../utils/dateFormat';
import '../Breeder/Breeder.css';

const AdminBreederLicenses = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: 'Approved',
    notes: '',
    expiryDate: ''
  });

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/licenses');
      setLicenses(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch breeder license applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleOpenStatusModal = (license) => {
    setSelectedLicense(license);
    // Set default expiry 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    setStatusForm({
      status: license.status === 'Pending' ? 'Approved' : license.status,
      notes: license.notes || '',
      expiryDate: license.expiryDate ? new Date(license.expiryDate).toISOString().split('T')[0] : nextYear.toISOString().split('T')[0]
    });
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedLicense) return;

    try {
      await axios.put(`/api/licenses/${selectedLicense._id}/status`, statusForm);
      alert(`License status updated to ${statusForm.status}!`);
      setSelectedLicense(null);
      fetchLicenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update license status.');
    }
  };

  return (
    <div className="breeder-page-container">
      <div className="breeder-header">
        <h2>🏛️ Municipal Breeder Licensing Management</h2>
        <p className="subtitle">Review applications, grant official licenses, enforce compliance, and handle renewals.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading breeder applications...</div>
      ) : licenses.length === 0 ? (
        <div className="breeder-card text-center" style={{ padding: '30px' }}>
          <p>No breeder applications found.</p>
        </div>
      ) : (
        <div className="table-responsive breeder-card" style={{ padding: 0 }}>
          <table className="vet-history-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Business Name</th>
                <th>Facility Address</th>
                <th>Status</th>
                <th>Applied On</th>
                <th>Expiry Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => (
                <tr key={lic._id}>
                  <td>
                    <strong>{lic.applicantId?.fullName || 'N/A'}</strong>
                    <br />
                    <small style={{ color: '#6b7280' }}>{lic.applicantId?.email} | {lic.applicantId?.phone}</small>
                  </td>
                  <td><strong>{lic.businessName}</strong></td>
                  <td style={{ maxWidth: '250px' }}>{lic.facilityAddress}</td>
                  <td>
                    <span className={`status-pill status-${lic.status.toLowerCase()}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td>{formatDate(lic.createdAt)}</td>
                  <td>{formatDate(lic.expiryDate)}</td>
                  <td>
                    <button
                      onClick={() => handleOpenStatusModal(lic)}
                      className="btn btn-secondary btn-small"
                    >
                      ⚙️ Review / Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedLicense && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="breeder-card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <h3>Review License Application</h3>
            <p><strong>Business Name:</strong> {selectedLicense.businessName}</p>
            <p><strong>Applicant:</strong> {selectedLicense.applicantId?.fullName}</p>
            
            {selectedLicense.documentsUrl && (
              <p style={{ margin: '10px 0' }}>
                <a href={selectedLicense.documentsUrl} target="_blank" rel="noopener noreferrer" className="link">
                  🔗 View Uploaded Application Documents
                </a>
              </p>
            )}

            <form onSubmit={handleUpdateStatus} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>License Status *</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  required
                >
                  <option value="Approved">Approve License</option>
                  <option value="Pending">Keep Pending</option>
                  <option value="Rejected">Reject License</option>
                  <option value="Expired">Mark Expired</option>
                </select>
              </div>

              {statusForm.status === 'Approved' && (
                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    value={statusForm.expiryDate}
                    onChange={(e) => setStatusForm({ ...statusForm, expiryDate: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Authority Notes / Decision Comments</label>
                <textarea
                  rows="3"
                  placeholder="Reason for approval/rejection or compliance notes..."
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Decision
                </button>
                <button type="button" onClick={() => setSelectedLicense(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBreederLicenses;
