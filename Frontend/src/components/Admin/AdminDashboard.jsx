import React from 'react';
import { Link } from 'react-router-dom';
import BreederIcon from '../Breeder/BreederIcons';
import './AdminDashboard.css';

const AdminDashboard = () => {
  return (
    <div className="dashboard admin-hub">
      <section className="admin-hub-hero">
        <p className="authority-eyebrow">Admin Portal</p>
        <h1>Select Your Work Area</h1>
        <p>Veterinarian operations and municipal authority operations are separate workspaces with different responsibilities.</p>
      </section>

      <section className="admin-part-grid">
        <article className="admin-part-card veterinarian">
          <div className="admin-part-icon"><BreederIcon name="calendar" size={30} /></div>
          <div>
            <p className="authority-eyebrow">Veterinarian</p>
            <h2>Pet & Vaccination Management</h2>
            <p>Use this workspace for pet registrations, owner records, vaccination schedules, overdue follow-ups, and clinical record management.</p>
          </div>
          <div className="admin-part-actions">
            <Link to="/admin/veterinarian" className="btn btn-primary">Open Veterinarian Dashboard</Link>
            <Link to="/admin/pets" className="btn btn-secondary">View Pets</Link>
          </div>
        </article>

<<<<<<< HEAD
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

        <Link to="/vet/dashboard" className="btn btn-secondary btn-small" style={{ backgroundColor: '#0d9488', color: '#fff', borderColor: '#0d9488' }}>
          🩺 Vet Portal
        </Link>

        <Link to="/admin/licenses" className="btn btn-secondary btn-small">
          📜 Breeder Licenses
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
=======
        <article className="admin-part-card authority">
          <div className="admin-part-icon"><BreederIcon name="shield" size={30} /></div>
          <div>
            <p className="authority-eyebrow">Authority</p>
            <h2>Licensing & Animal Control</h2>
            <p>Use this workspace for breeder license approval, breeder monitoring, stray reports, lost and found reports, and municipal compliance oversight.</p>
          </div>
          <div className="admin-part-actions">
            <Link to="/admin/authority" className="btn btn-primary">Open Authority Dashboard</Link>
            <Link to="/lost-and-found" className="btn btn-secondary">Lost & Found</Link>
          </div>
        </article>
      </section>
>>>>>>> a22b2074d9644e88d05288e050a9679dc7edf9d7
    </div>
  );
};

export default AdminDashboard;
