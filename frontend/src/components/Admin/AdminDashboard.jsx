import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
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
      </div>
    </div>
  );
};

export default AdminDashboard;