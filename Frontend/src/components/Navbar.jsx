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
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <BreederIcon name="shield" size={20} /> Pet Management System
        </Link>

        <div className="navbar-menu">
          <Link to="/lost-and-found" className="navbar-link">
            Lost & Found
          </Link>

          {isAuthenticated ? (
            <>
              <Link to={user?.isAdmin ? '/admin/dashboard' : '/user/dashboard'} className="navbar-link" style={{ fontWeight: 'bold' }}>
                My Dashboard
              </Link>
              {!user?.isAdmin && (
                <Link to="/breeder/dashboard" className="navbar-link">
                  Breeder Licensing
                </Link>
              )}
              <span className="navbar-user">
                Welcome, {user?.fullName} {user?.isAdmin && '(Admin)'}
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
