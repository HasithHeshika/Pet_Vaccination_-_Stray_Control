import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import DashboardSummaryCards from './StrayReports/DashboardSummaryCards';
import ReportsCharts from './StrayReports/ReportsCharts';
import RecentStrayReportsTable from './StrayReports/RecentStrayReportsTable';
import RecentLostReportsTable from './StrayReports/RecentLostReportsTable';
import './AdminDashboard.css';

const normalizeReports = (response) => {
  if (Array.isArray(response?.reports)) return response.reports;
  if (Array.isArray(response)) return response;
  return [];
};

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [lostReports, setLostReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      try {
        const [strayRes, lostRes] = await Promise.all([
          apiRequest('/api/stray-reports').catch(() => []),
          apiRequest('/api/lost-and-found').catch(() => [])
        ]);

        const liveReports = normalizeReports(strayRes);
        const liveLostReports = Array.isArray(lostRes) ? lostRes : [];

        if (isMounted) {
          setReports(liveReports);
          setLostReports(liveLostReports);
        }
      } catch (error) {
        console.error('Failed to load stray reports:', error);
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
    const straySummary = sortedReports.reduce(
      (acc, report) => {
        if (report.status === 'resolved') acc.resolved++;
        if (report.status === 'in-progress') acc.inProgress++;
        if (report.status === 'pending') acc.pending++;
        acc.total++;
        return acc;
      },
      { total: 0, pending: 0, inProgress: 0, resolved: 0 }
    );

    return lostReports.reduce(
      (acc, report) => {
        if (report.status === 'Found') acc.resolved++;
        if (report.status === 'Lost') acc.pending++;
        acc.total++;
        return acc;
      },
      straySummary
    );
  }, [sortedReports, lostReports]);

  return (
    <div className="dashboard admin-dashboard">
      <h1>Stray Reporting Admin Dashboard</h1>

      <p className="dashboard-subtitle">
        Monitor stray animal cases, review municipal progress, and manage reports.
      </p>

      <div className="dashboard-toolbar">
        <span className="dashboard-chip">
          Stray Reports Status
        </span>

        <Link to="/admin/users" className="btn btn-secondary btn-small">
          View Users
        </Link>

        <Link to="/admin/pets" className="btn btn-primary btn-small">
          View Pets
        </Link>
      </div>

      <DashboardSummaryCards {...summary} />

      {summary.total > 0 && <ReportsCharts statusCounts={summary} />}

      {sortedReports.length > 0 && (
        <RecentStrayReportsTable reports={sortedReports} />
      )}

      {lostReports.length > 0 && (
        <RecentLostReportsTable reports={lostReports} />
      )}
    </div>
  );
};

export default AdminDashboard;