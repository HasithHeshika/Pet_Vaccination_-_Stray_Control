import React from 'react';

const statusLabelClass = {
  Lost: 'status-badge status-badge--pending',
  Found: 'status-badge status-badge--resolved'
};

const formatDate = (dateValue) => new Date(dateValue).toLocaleString('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const RecentLostReportsTable = ({ reports }) => {
  return (
    <div className="card table-card" style={{ marginTop: '20px' }}>
      <h3>Recent Lost & Found Reports</h3>
      <div className="table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Pet Name</th>
              <th>Breed / Color</th>
              <th>Status</th>
              <th>Reported By</th>
              <th>Reported At</th>
            </tr>
          </thead>
          <tbody>
            {reports.slice(0, 6).map((report) => (
              <tr key={report._id}>
                <td>{report.petName}</td>
                <td>{report.breed} / {report.color}</td>
                <td>
                  <span className={statusLabelClass[report.status] || 'status-badge'}>
                    {report.status}
                  </span>
                </td>
                <td>{report.reportedBy?.fullName || 'Anonymous'}</td>
                <td>{formatDate(report.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentLostReportsTable;
