import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import BreederLayout from './BreederLayout';
import BreederIcon from './BreederIcons';
import { formatDate, statusClass } from './breederUtils';

const ApplicationStatus = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = useCallback(async () => {
    try {
      const response = await axios.get('/api/licenses/my-licenses');
      setApplications(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load submitted applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  return (
    <BreederLayout title="Application Status" subtitle="Track submitted applications, review decisions, and open detailed records.">
      <section className="breeder-card">
        <div className="card-title-row">
          <h3>Submitted Applications</h3>
          <Link to="/breeder/apply" className="btn btn-primary btn-small"><BreederIcon name="document" /> New Application</Link>
        </div>

        {loading && <div className="loading">Loading applications...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && applications.length === 0 && (
          <p className="empty-state">No applications have been submitted yet.</p>
        )}

        {!loading && applications.length > 0 && (
          <div className="table-container breeder-table-wrap">
            <table className="data-table breeder-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Submission date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application._id}>
                    <td><strong>{application.applicationId}</strong></td>
                    <td>{formatDate(application.submittedAt || application.createdAt)}</td>
                    <td>{application.applicationType}</td>
                    <td><span className={statusClass(application.status)}>{application.status}</span></td>
                    <td>{application.status === 'Rejected' ? (application.remarks || 'No remarks provided') : (application.remarks || 'None')}</td>
                    <td>
                      <Link className="btn btn-secondary btn-small" to={`/breeder/applications/${application._id}`}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </BreederLayout>
  );
};

export default ApplicationStatus;
