import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { formatDate } from '../../utils/dateFormat';
import './Breeder.css';

const MyBreederLicenses = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyLicenses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/licenses/my-licenses');
      setLicenses(res.data || []);
    } catch (err) {
      setError('Failed to fetch breeder license applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLicenses();
  }, []);

  const handleRenew = async (id) => {
    if (!window.confirm('Request license renewal from municipal authorities?')) return;
    try {
      await axios.post(`/api/licenses/${id}/renew`);
      alert('Renewal request submitted successfully!');
      fetchMyLicenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit renewal request.');
    }
  };

  return (
    <div className="breeder-page-container">
      <div className="breeder-header flex-between">
        <div>
          <h2>📜 My Breeder Licenses</h2>
          <p className="subtitle">Track your official breeder applications, status, and renewal requests.</p>
        </div>
        <Link to="/breeder/apply" className="btn btn-primary">
          ➕ Apply for New License
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading breeder licenses...</div>
      ) : licenses.length === 0 ? (
        <div className="breeder-card text-center" style={{ padding: '40px' }}>
          <h3>No Breeder Licenses Registered</h3>
          <p style={{ color: '#6b7280', margin: '15px 0 25px 0' }}>
            You have not submitted any breeder license applications yet.
          </p>
          <Link to="/breeder/apply" className="btn btn-primary">
            Apply Now
          </Link>
        </div>
      ) : (
        <div className="licenses-grid">
          {licenses.map((lic) => (
            <div key={lic._id} className="breeder-card license-item">
              <div className="license-card-header">
                <h3>{lic.businessName}</h3>
                <span className={`status-pill status-${lic.status.toLowerCase()}`}>
                  {lic.status}
                </span>
              </div>

              <div className="license-details">
                <p><strong>Facility Address:</strong> {lic.facilityAddress}</p>
                <p><strong>Issue Date:</strong> {formatDate(lic.issueDate, 'Pending Approval')}</p>
                <p><strong>Expiry Date:</strong> {formatDate(lic.expiryDate)}</p>
                {lic.notes && <p><strong>Authority Notes:</strong> {lic.notes}</p>}
                {lic.documentsUrl && (
                  <p>
                    <strong>Documents:</strong>{' '}
                    <a href={lic.documentsUrl} target="_blank" rel="noopener noreferrer" className="link">
                      View Application Documents 🔗
                    </a>
                  </p>
                )}
              </div>

              <div className="license-card-footer">
                {(lic.status === 'Approved' || lic.status === 'Expired') && (
                  <button onClick={() => handleRenew(lic._id)} className="btn btn-secondary btn-small">
                    🔄 Request Renewal
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBreederLicenses;
