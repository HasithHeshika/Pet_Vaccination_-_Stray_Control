import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="card">
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
          <Link to="/admin/users" className="btn btn-primary">
            View All Users
          </Link>
          <Link to="/admin/pets" className="btn btn-secondary">
            View All Pets
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>System Information</h3>
        <p>Welcome to the Pet Management System Admin Panel. Use the navigation above to manage users and register pets.</p>
      </div>
    </div>
  );
};

export default AdminDashboard;