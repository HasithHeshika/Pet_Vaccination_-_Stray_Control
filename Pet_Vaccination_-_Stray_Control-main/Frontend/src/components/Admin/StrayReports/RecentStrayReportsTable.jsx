import React from 'react';

const statusLabelClass = {
  pending: 'status-badge status-badge--pending',
  'in-progress': 'status-badge status-badge--progress',
  resolved: 'status-badge status-badge--resolved'
};

const formatDate = (dateValue) => new Date(dateValue).toLocaleString('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const RecentStrayReportsTable = ({ reports, onUpdateStatus }) => {
  return (
    <div className="card table-card">
      <h3>Recent Stray Reports</h3>
      <div className="table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Description</th>
              <th>Status</th>
              <th>Reported By</th>
              <th>Reported At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.slice(0, 6).map((report) => (
              <tr key={report._id}>
                <td>{report.location}</td>
                <td>{report.description}</td>
                <td>
                  <span className={statusLabelClass[report.status] || 'status-badge'}>
                    {report.status}
                  </span>
                </td>
                <td>{report.reportedBy?.fullName || 'Anonymous'}</td>
                <td>{formatDate(report.reportedAt)}</td>
                <td>
                  <select 
                    value={report.status} 
                    onChange={(e) => onUpdateStatus && onUpdateStatus(report._id, e.target.value)}
                    className="form-control"
                    style={{ padding: '4px', fontSize: '12px', width: 'auto' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentStrayReportsTable;
