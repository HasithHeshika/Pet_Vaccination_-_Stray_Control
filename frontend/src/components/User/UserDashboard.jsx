import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UserDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.fullName}!</h1>
      
      <div className="card">
        <h3>My Account</h3>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Phone:</strong> {user?.phone}</p>
        <p><strong>NIC:</strong> {user?.nicNumber}</p>
        <p><strong>Address:</strong> {user?.address?.street}, {user?.address?.city}, {user?.address?.province}</p>
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