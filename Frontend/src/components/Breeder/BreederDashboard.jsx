import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import BreederLayout from './BreederLayout';
import BreederIcon from './BreederIcons';
import { formatDate, statusClass } from './breederUtils';

const BreederDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const response = await axios.get('/api/licenses/dashboard');
      setSummary(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load breeder dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const license = summary?.activeLicense;
  const expiryState = summary?.expiryState;

  return (
    <BreederLayout
      title="Breeder Dashboard"
      subtitle="Manage license applications, renewals, and compliance records from one workspace."
    >
      {loading && <div className="loading">Loading breeder dashboard...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && summary && (
        <>
          <section className="breeder-welcome">
            <div>
              <p className="breeder-eyebrow">Welcome back</p>
              <h2>{summary.breederName}</h2>
              <p>Keep your breeder license current and maintain complete compliance records.</p>
            </div>
            <div className="breeder-actions">
              <Link to="/breeder/apply" className="btn btn-primary"><BreederIcon name="document" /> Apply for License</Link>
              <Link to="/breeder/renew" className="btn btn-secondary"><BreederIcon name="renew" /> Renew License</Link>
              <Link to="/breeder/applications" className="btn btn-secondary"><BreederIcon name="list" /> View Compliance Records</Link>
            </div>
          </section>

          <section className="breeder-grid">
            <article className="breeder-card license-card">
              <div className="card-title-row">
                <h3>License Status</h3>
                <BreederIcon name="shield" />
              </div>
              <span className={statusClass(license?.status || 'Pending')}>
                {license?.status || 'No Application'}
              </span>
              <dl className="breeder-details">
                <div><dt>License ID</dt><dd>{license?.licenseId || 'Not issued'}</dd></div>
                <div><dt>Expiry Date</dt><dd>{formatDate(license?.expiryDate)}</dd></div>
              </dl>
              {expiryState?.expiringSoon && <p className="breeder-alert">This license expires within 30 days.</p>}
              {expiryState?.expired && <p className="breeder-alert danger">This license has expired. Submit a renewal request.</p>}
            </article>

            <article className="breeder-card metric-card">
              <BreederIcon name="animals" />
              <span>{summary.totalRegisteredAnimals}</span>
              <p>Total registered animals</p>
            </article>

            <article className="breeder-card metric-card">
              <BreederIcon name="check" />
              <span>{summary.complianceStatus}</span>
              <p>Compliance status</p>
            </article>

            <article className="breeder-card metric-card">
              <BreederIcon name="document" />
              <span>{summary.pendingApplications}</span>
              <p>Pending applications</p>
            </article>
          </section>

          <section className="breeder-card">
            <div className="card-title-row">
              <h3>Recent Activity</h3>
              <Link to="/breeder/applications" className="text-link">View all</Link>
            </div>
            {summary.recentActivity.length === 0 ? (
              <p className="empty-state">No breeder license activity yet.</p>
            ) : (
              <div className="activity-list">
                {summary.recentActivity.map((item) => (
                  <div key={item._id} className="activity-item">
                    <div>
                      <strong>{item.applicationId}</strong>
                      <span>{item.applicationType} application submitted {formatDate(item.submittedAt || item.createdAt)}</span>
                    </div>
                    <span className={statusClass(item.status)}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </BreederLayout>
  );
};

export default BreederDashboard;
