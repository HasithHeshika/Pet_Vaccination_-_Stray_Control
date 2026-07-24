import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BreederIcon from './Breeder/BreederIcons';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={`navbar ${user?.isAdmin ? 'navbar-admin' : ''}`}>
      <div className="navbar-container">
        <Link to={isAuthenticated ? '/welcome' : '/'} className="navbar-logo">
          <BreederIcon name="shield" size={20} /> Pet Management System
        </Link>

        <div className="navbar-menu">
          <Link to="/lost-and-found" className="navbar-link">
            Lost & Found
          </Link>

          {isAuthenticated ? (
            <>
              {user?.role === 'veterinarian' ? (
                <Link to="/vet/dashboard" className="navbar-link" style={{ fontWeight: 'bold', color: '#0d9488' }}>
                  🩺 Vet Portal
                </Link>
              ) : user?.isAdmin ? (
                <>
                  <Link to="/admin/dashboard" className="navbar-link" style={{ fontWeight: 'bold' }}>
                    Admin Dashboard
                  </Link>
                  <Link to="/vet/dashboard" className="navbar-link">
                    Vet Portal
                  </Link>
                  <Link to="/admin/licenses" className="navbar-link">
                    Breeder Licenses
                  </Link>
                  <Link to="/admin/veterinarian" className="navbar-link">
                    Veterinarian
                  </Link>
                  <Link to="/admin/authority" className="navbar-link">
                    Authority
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/user/dashboard" className="navbar-link" style={{ fontWeight: 'bold' }}>
                    My Dashboard
                  </Link>
                  <Link to="/breeder/dashboard" className="navbar-link">
                    Breeder Licensing
                  </Link>
                </>
              )}
              <span className="navbar-user">
                Welcome, {user?.fullName} {user?.role === 'veterinarian' ? '(Vet)' : user?.isAdmin ? '(Admin)' : ''}
              </span>
              <button onClick={handleLogout} className="btn btn-danger btn-small">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-small">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-small">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
