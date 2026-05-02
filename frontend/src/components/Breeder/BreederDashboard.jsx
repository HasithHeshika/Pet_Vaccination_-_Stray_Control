import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import BreederLayout from './BreederLayout';
import { formatDate, statusClass } from './licenseUtils';

const BreederDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await axios.get('/api/breeder-licenses/dashboard');
        setSummary(response.data.summary);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load breeder dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <div className="loading">Loading breeder dashboard...</div>;

  const license = summary?.latestLicense;
  const expiryState = summary?.expiryState;

  return (
    <BreederLayout
      title={`Welcome, ${user?.fullName || 'Breeder'}`}
      subtitle="Manage licensing, renewals, and compliance from one structured workspace."
      actions={
        <>
          <Link to="/breeder/apply" className="btn btn-primary" style={{ width: 'auto' }}>Apply for License</Link>
          <Link to="/breeder/renew" className="btn btn-secondary">Renew License</Link>
        </>
      }
    >
      {error && <div className="error-message">{error}</div>}

      <div className="module-grid">
        <section className="module-card">
          <h3>License Status</h3>
          <span className={statusClass(license?.status || 'pending')}>
            {license?.status || 'No Application'}
          </span>
          <p style={{ marginTop: '14px' }}>
            Expiry date: <strong>{formatDate(license?.expiryDate)}</strong>
          </p>
          {expiryState?.isExpired && <div className="license-alert">This license is expired. Submit a renewal as soon as possible.</div>}
          {expiryState?.isExpiringSoon && <div className="license-alert">This license expires in {expiryState.daysRemaining} days.</div>}
        </section>

        <section className="module-card">
          <h3>Total Registered Animals</h3>
          <span className="metric-value">{summary?.totalRegisteredAnimals || 0}</span>
          <p>Animals connected to your account records.</p>
        </section>

        <section className="module-card">
          <h3>Compliance Status</h3>
          <span className={statusClass(summary?.complianceStatus === 'Compliant' ? 'compliant' : 'needs_review')}>
            {summary?.complianceStatus || 'Under Review'}
          </span>
          <p style={{ marginTop: '14px' }}>Current compliance assessment from submitted records.</p>
        </section>
      </div>

      <section className="module-panel" style={{ marginTop: '20px' }}>
        <h3>Quick Actions</h3>
        <div className="module-header-actions" style={{ justifyContent: 'flex-start' }}>
          <Link to="/breeder/apply" className="btn btn-primary" style={{ width: 'auto' }}>Apply for License</Link>
          <Link to="/breeder/renew" className="btn btn-secondary">Renew License</Link>
          <Link to="/breeder/applications" className="btn btn-secondary">View Compliance Records</Link>
        </div>
      </section>

      <section className="module-panel" style={{ marginTop: '20px' }}>
        <h3>Recent Activity</h3>
        {summary?.recentActivity?.length ? (
          <ul className="activity-list">
            {summary.recentActivity.map((item, index) => (
              <li key={`${item.applicationId}-${index}`}>
                <strong>{item.action}</strong>
                <p>{item.applicationId} - {item.note}</p>
                <small>{formatDate(item.createdAt)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent breeder licensing activity yet.</p>
        )}
      </section>
    </BreederLayout>
  );
};

export default BreederDashboard;
