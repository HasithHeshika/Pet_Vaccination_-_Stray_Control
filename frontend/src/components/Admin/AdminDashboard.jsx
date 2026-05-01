import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import DashboardSummaryCards from './StrayReports/DashboardSummaryCards';
import ReportsCharts from './StrayReports/ReportsCharts';
import RecentStrayReportsTable from './StrayReports/RecentStrayReportsTable';
import { mockStrayReports } from './StrayReports/mockStrayReports';
import './AdminDashboard.css';

const normalizeReports = (response) => {
  if (Array.isArray(response?.reports)) {
    return response.reports;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const AdminDashboard = () => {
  const [reports, setReports] = useState(mockStrayReports);
  const [source, setSource] = useState('mock');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      try {
        const response = await apiRequest('/api/stray-reports');
        const liveReports = normalizeReports(response);

        if (isMounted && liveReports.length > 0) {
          setReports(liveReports);
          setSource('live');
        } else if (isMounted) {
          setReports(mockStrayReports);
          setSource('mock');
        }
      } catch (error) {
        if (isMounted) {
          setReports(mockStrayReports);
          setSource('mock');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedReports = useMemo(
    () => [...reports].sort((left, right) => new Date(right.reportedAt) - new Date(left.reportedAt)),
    [reports]
  );

  const summary = useMemo(() => {
    const counts = sortedReports.reduce(
      (accumulator, report) => {
        if (report.status === 'resolved') accumulator.resolved += 1;
        if (report.status === 'in-progress') accumulator.inProgress += 1;
        if (report.status === 'pending') accumulator.pending += 1;
        accumulator.total += 1;
        return accumulator;
      },
      { total: 0, pending: 0, inProgress: 0, resolved: 0 }
    );

    return counts;
  }, [sortedReports]);

  return (
<<<<<<< Tharanga
    <div className="dashboard admin-dashboard">
      <h1>Stray Reporting Admin Dashboard</h1>
      <p className="dashboard-subtitle">
        Monitor stray animal cases, review municipal progress, and keep a clean handoff between the live backend
        and the mock dataset used during development.
      </p>

      <div className="dashboard-toolbar">
        <span className="dashboard-chip">Data source: {loading ? 'loading...' : source}</span>
        <Link to="/admin/users" className="btn btn-secondary btn-small" style={{ width: 'auto', textDecoration: 'none' }}>
          View Users
        </Link>
        <Link to="/admin/pets" className="btn btn-primary btn-small" style={{ width: 'auto', textDecoration: 'none' }}>
          View Pets
        </Link>
=======
    <div className="dashboard">
      <h1>🎯 Admin Dashboard</h1>
      
      <div className="card">
        <h3>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
          <Link to="/admin/users" className="btn btn-primary" style={{ width: 'auto', minWidth: '150px', textDecoration: 'none' }}>
            👥 View All Users
          </Link>
          <Link to="/admin/pets" className="btn btn-secondary" style={{ width: 'auto', minWidth: '150px', textDecoration: 'none' }}>
            🐾 View All Pets
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>ℹ️ System Information</h3>
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
          Welcome to the Pet Management System Admin Panel. Use the navigation above to manage users and register pets. 
          Track vaccinations, generate QR codes, and maintain comprehensive pet health records.
        </p>
>>>>>>> main
      </div>

      <DashboardSummaryCards
        total={summary.total}
        pending={summary.pending}
        inProgress={summary.inProgress}
        resolved={summary.resolved}
      />

      <ReportsCharts statusCounts={summary} />

      {sortedReports.length > 0 ? (
        <RecentStrayReportsTable reports={sortedReports} />
      ) : (
        <div className="card empty-state">No stray reports are available yet.</div>
      )}
    </div>
  );
};

export default AdminDashboard;