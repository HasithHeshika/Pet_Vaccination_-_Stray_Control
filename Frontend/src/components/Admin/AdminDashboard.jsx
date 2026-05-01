import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
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
  const { token } = useAuth();

  const loadReports = useCallback(async (isMounted = true) => {
    try {
      const [strayRes, lostRes] = await Promise.all([
        apiRequest('/api/stray-reports', { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
        apiRequest('/api/lost-and-found', { headers: { Authorization: `Bearer ${token}` } }).catch(() => [])
      ]);

      const liveReports = normalizeReports(strayRes);
      const liveLostReports = Array.isArray(lostRes) ? lostRes : [];

      if (isMounted) {
        setReports(liveReports);
        setLostReports(liveLostReports);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    loadReports(isMounted);
    return () => { isMounted = false; };
  }, [loadReports]);

  const handleUpdateStrayStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/api/stray-reports/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh reports after update
      loadReports(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update stray report status');
    }
  };

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

        <Link to="/report-stray" className="btn btn-small" style={{ backgroundColor: '#000', color: '#fff', border: 'none' }}>
          🚨 Report a Stray
        </Link>

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
        <RecentStrayReportsTable 
          reports={sortedReports} 
          onUpdateStatus={handleUpdateStrayStatus} 
        />
      )}

      {lostReports.length > 0 && (
        <RecentLostReportsTable reports={lostReports} />
      )}
    </div>
  );
};

export default AdminDashboard;