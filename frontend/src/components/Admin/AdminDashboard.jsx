import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import DashboardSummaryCards from './StrayReports/DashboardSummaryCards';
import ReportsCharts from './StrayReports/ReportsCharts';
import RecentStrayReportsTable from './StrayReports/RecentStrayReportsTable';
import { mockStrayReports } from './StrayReports/mockStrayReports';
import './AdminDashboard.css';

const normalizeReports = (response) => {
  if (Array.isArray(response?.reports)) return response.reports;
  if (Array.isArray(response)) return response;
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
        if (isMounted) setLoading(false);
      }
    };

    loadReports();
    return () => { isMounted = false; };
  }, []);

  const sortedReports = useMemo(() => {
    return [...reports].sort(
      (a, b) => new Date(b.reportedAt) - new Date(a.reportedAt)
    );
  }, [reports]);

  const summary = useMemo(() => {
    return sortedReports.reduce(
      (acc, report) => {
        if (report.status === 'resolved') acc.resolved++;
        if (report.status === 'in-progress') acc.inProgress++;
        if (report.status === 'pending') acc.pending++;
        acc.total++;
        return acc;
      },
      { total: 0, pending: 0, inProgress: 0, resolved: 0 }
    );
  }, [sortedReports]);

  return (
    <div className="dashboard admin-dashboard">
      <h1>Stray Reporting Admin Dashboard</h1>

      <p className="dashboard-subtitle">
        Monitor stray animal cases, review municipal progress, and manage reports.
      </p>

      <div className="dashboard-toolbar">
        <span className="dashboard-chip">
          Data source: {loading ? 'loading...' : source}
        </span>

        <Link to="/admin/users" className="btn btn-secondary btn-small">
          View Users
        </Link>

        <Link to="/admin/pets" className="btn btn-primary btn-small">
          View Pets
        </Link>
      </div>

      <DashboardSummaryCards {...summary} />

      <ReportsCharts statusCounts={summary} />

      {sortedReports.length > 0 ? (
        <RecentStrayReportsTable reports={sortedReports} />
      ) : (
        <div className="card empty-state">
          No stray reports are available yet.
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;