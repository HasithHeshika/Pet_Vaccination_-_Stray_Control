import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BreederIcon from './Breeder/BreederIcons';
import ProfileAvatar from './ProfileAvatar';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const navLinkClass = ({ isActive }) => (
    `navbar-link${isActive ? ' navbar-link-active' : ''}`
  );

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
          <NavLink to="/lost-and-found" className={navLinkClass}>
            Lost & Found
          </NavLink>

          {isAuthenticated ? (
            <>
              {user?.role === 'veterinarian' ? (
                <NavLink to="/vet/dashboard" className={navLinkClass}>
                  🩺 Vet Portal
                </NavLink>
              ) : user?.isAdmin ? (
                <>
                  <NavLink to="/admin/dashboard" className={navLinkClass}>
                    Admin Dashboard
                  </NavLink>
                  <NavLink to="/vet/dashboard" className={navLinkClass}>
                    Vet Portal
                  </NavLink>
                  <NavLink to="/admin/licenses" className={navLinkClass}>
                    Breeder Licenses
                  </NavLink>
                  <NavLink to="/admin/veterinarian" className={navLinkClass}>
                    Veterinarian
                  </NavLink>
                  <NavLink to="/admin/authority" className={navLinkClass}>
                    Authority
                  </NavLink>
                  <NavLink to="/admin/profile" className={navLinkClass}>
                    Profile
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/user/dashboard" className={navLinkClass}>
                    My Dashboard
                  </NavLink>
                  <NavLink to="/breeder/dashboard" className={navLinkClass}>
                    Breeder Licensing
                  </NavLink>
                  <NavLink to="/user/edit-profile" className={navLinkClass}>
                    Profile
                  </NavLink>
                </>
              )}
              <span className="navbar-user">
                <ProfileAvatar user={user} className="navbar-avatar" />
                <span>
                  Welcome, {user?.fullName} {user?.role === 'veterinarian' ? '(Vet)' : user?.isAdmin ? '(Admin)' : ''}
                </span>
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
