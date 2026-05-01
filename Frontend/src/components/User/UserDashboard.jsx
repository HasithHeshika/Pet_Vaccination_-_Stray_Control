import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UserDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.fullName}!</h1>
      
      <div className="card account-card">
        <div className="account-header">
          <div className="avatar-chip">{(user?.fullName || 'U').slice(0, 1)}</div>
          <div>
            <p className="eyebrow">My Account</p>
            <h3>{user?.fullName}</h3>
            <p className="muted">Stay on top of your info and keep vaccinations aligned.</p>
          </div>
          <div className="status-badge">Verified</div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <p className="label">Email</p>
            <p className="value">{user?.email}</p>
          </div>
          <div className="detail-item">
            <p className="label">Phone</p>
            <p className="value">{user?.phone}</p>
          </div>
          <div className="detail-item">
            <p className="label">NIC</p>
            <p className="value">{user?.nicNumber}</p>
          </div>
          <div className="detail-item">
            <p className="label">Address</p>
            <p className="value">{user?.address?.street}, {user?.address?.city}, {user?.address?.province}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <Link to="/user/my-pets" className="btn btn-primary" style={{ width: 'auto', minWidth: '150px' }}>
            View My Pets
          </Link>
          <Link to="/user/vaccinations" className="btn btn-secondary" style={{ width: 'auto', minWidth: '150px' }}>
            💉 Vaccination Schedule
          </Link>
          <Link to="/report-stray" className="btn" style={{ width: 'auto', minWidth: '150px', backgroundColor: '#000', color: '#fff', border: 'none' }}>
            🚨 Report a Stray
          </Link>
          <Link to="/user/edit-profile" className="btn btn-success" style={{ width: 'auto', minWidth: '150px' }}>
            ⚙️ Edit Profile
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>Information</h3>
        <p>Your pet registration will be handled by the administrator. Once your pet is registered, you'll be able to view and download the QR code from the "My Pets" section.</p>
      </div>
    </div>
  );
};

export default UserDashboard;