import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import BreederIcon from '../Breeder/BreederIcons';
import './AdminDashboard.css';

const formatDate = (date) => {
  if (!date) return 'Not available';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const statusClass = (status = '') => `authority-status ${status.toLowerCase().replace(/\s+/g, '-')}`;

const MetricCard = ({ label, value, helper, icon }) => (
  <article className="authority-metric">
    <div className="authority-metric-icon"><BreederIcon name={icon} /></div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <p>{helper}</p>}
    </div>
  </article>
);

const AuthorityDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [licenseActionId, setLicenseActionId] = useState('');
  const [lostFoundFilter, setLostFoundFilter] = useState('All');

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      const response = await axios.get('/api/authority/dashboard');
      setDashboard(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load authority dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const updateLicenseStatus = async (licenseId, status) => {
    const remarks = status === 'Rejected'
      ? window.prompt('Enter rejection remarks for the breeder application:')
      : 'Reviewed and approved by authority';

    if (status === 'Rejected' && !remarks) return;

    try {
      setLicenseActionId(licenseId);
      await axios.put(`/api/licenses/${licenseId}/status`, { status, remarks });
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update license status');
    } finally {
      setLicenseActionId('');
    }
  };

  const filteredLostFound = useMemo(() => {
    const reports = dashboard?.lostFound || [];
    if (lostFoundFilter === 'All') return reports;
    return reports.filter((report) => report.status === lostFoundFilter);
  }, [dashboard, lostFoundFilter]);

  const metrics = dashboard?.metrics || {};
  const pendingLicenses = (dashboard?.licenses || []).filter((license) => license.status === 'Pending');

  return (
    <div className="dashboard authority-dashboard">
      <section className="authority-hero">
        <div>
          <p className="authority-eyebrow">Municipal Control Center</p>
          <h1>Authority Dashboard</h1>
          <p>Review breeder licensing, monitor pet registrations, verify vaccination compliance, and manage animal reports.</p>
        </div>
        <div className="authority-hero-actions">
          <Link to="/admin/pets" className="btn btn-primary"><BreederIcon name="animals" /> Registered Pets</Link>
          <Link to="/admin/users" className="btn btn-secondary"><BreederIcon name="user" /> Users</Link>
        </div>
      </section>

      {loading && <div className="loading">Loading authority dashboard...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && dashboard && (
        <>
          <section className="authority-metrics-grid">
            <MetricCard label="Total Registered Pets" value={metrics.totalRegisteredPets || 0} helper="All pets in the registry" icon="animals" />
            <MetricCard label="Total Breeders" value={metrics.totalBreeders || 0} helper="Breeders with license records" icon="shield" />
            <MetricCard label="Pending License Requests" value={metrics.pendingLicenseRequests || 0} helper="Awaiting authority decision" icon="document" />
            <MetricCard label="Vaccination Compliance Rate" value={`${metrics.vaccinationComplianceRate || 0}%`} helper={`${metrics.compliantPets || 0} pets compliant`} icon="check" />
            <MetricCard label="Stray Reports Count" value={metrics.strayReportsCount || 0} helper="Municipal stray reports" icon="alert" />
          </section>

          <section className="authority-grid two-columns">
            <article className="authority-card">
              <div className="authority-section-header">
                <div>
                  <p className="authority-eyebrow">Breeder Licensing</p>
                  <h2>Pending License Requests</h2>
                </div>
                <span className="authority-count">{pendingLicenses.length}</span>
              </div>

              {pendingLicenses.length === 0 ? (
                <p className="authority-empty">No pending breeder license requests.</p>
              ) : (
                <div className="authority-list">
                  {pendingLicenses.map((license) => (
                    <div key={license._id} className="license-review-card">
                      <div>
                        <strong>{license.breederName}</strong>
                        <span>{license.applicationId} · {license.applicationType}</span>
                        <p>{license.animalTypes?.join(', ') || 'Animal type not specified'} · {license.numberOfAnimals} animals</p>
                      </div>
                      <div className="license-actions">
                        <button className="btn btn-primary btn-small" disabled={licenseActionId === license._id} onClick={() => updateLicenseStatus(license._id, 'Approved')}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-small" disabled={licenseActionId === license._id} onClick={() => updateLicenseStatus(license._id, 'Rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="authority-card">
              <div className="authority-section-header">
                <div>
                  <p className="authority-eyebrow">Breeder Monitoring</p>
                  <h2>Recent Breeder License Records</h2>
                </div>
              </div>
              <div className="authority-table-wrap">
                <table className="authority-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Breeder</th>
                      <th>Status</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.licenses || []).slice(0, 8).map((license) => (
                      <tr key={license._id}>
                        <td>{license.applicationId}</td>
                        <td>{license.breederName}</td>
                        <td><span className={statusClass(license.status)}>{license.status}</span></td>
                        <td>{formatDate(license.expiryDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="authority-card">
            <div className="authority-section-header">
              <div>
                <p className="authority-eyebrow">Lost & Found Monitoring</p>
                <h2>Animal Reports and Potential Matches</h2>
              </div>
              <div className="authority-filter">
                {['All', 'Lost', 'Found', 'Resolved'].map((status) => (
                  <button key={status} type="button" className={lostFoundFilter === status ? 'active' : ''} onClick={() => setLostFoundFilter(status)}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="report-card-grid">
              {filteredLostFound.length === 0 ? (
                <p className="authority-empty">No lost or found reports available.</p>
              ) : filteredLostFound.map((report) => (
                <article key={report._id} className="animal-report-card">
                  <div className="animal-report-image">
                    {report.imageUrl ? <img src={report.imageUrl} alt={report.petName} /> : <BreederIcon name="search" size={34} />}
                  </div>
                  <div className="animal-report-body">
                    <div className="animal-report-title">
                      <strong>{report.petName}</strong>
                      <span className={statusClass(report.status)}>{report.status}</span>
                    </div>
                    <p><strong>Location:</strong> {report.location}</p>
                    <p><strong>Reported by:</strong> {report.reportedBy?.fullName || 'Unknown user'}</p>
                    <p><strong>Breed / Color:</strong> {report.breed} / {report.color}</p>
                    {report.possibleMatches?.length > 0 && (
                      <div className="match-box">
                        <strong>Possible matches</strong>
                        {report.possibleMatches.map((match) => (
                          <span key={match._id}>{match.petName} · {match.location}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="authority-grid two-columns">
            <article className="authority-card">
              <div className="authority-section-header">
                <div>
                  <p className="authority-eyebrow">Pet Registry</p>
                  <h2>Recent Pet Registrations</h2>
                </div>
                <Link to="/admin/pets" className="text-link">View all</Link>
              </div>
              <div className="authority-table-wrap">
                <table className="authority-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Type</th>
                      <th>Owner</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.pets || []).map((pet) => (
                      <tr key={pet._id}>
                        <td>{pet.petName}</td>
                        <td>{pet.petType === 'Other' ? pet.petTypeOther : pet.petType}</td>
                        <td>{pet.owner?.fullName || 'Unknown'}</td>
                        <td>{formatDate(pet.registrationDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="authority-card">
              <div className="authority-section-header">
                <div>
                  <p className="authority-eyebrow">Stray Monitoring</p>
                  <h2>Recent Stray Reports</h2>
                </div>
              </div>
              <div className="authority-list compact">
                {(dashboard.strayReports || []).length === 0 ? (
                  <p className="authority-empty">No stray reports available.</p>
                ) : dashboard.strayReports.map((report) => (
                  <div key={report._id} className="stray-row">
                    <div>
                      <strong>{report.location}</strong>
                      <span>{report.description}</span>
                    </div>
                    <span className={statusClass(report.status)}>{report.status}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
};

export default AuthorityDashboard;
