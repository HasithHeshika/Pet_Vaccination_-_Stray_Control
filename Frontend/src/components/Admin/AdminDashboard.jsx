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
    </div>
  );
};

export default AdminDashboard;
