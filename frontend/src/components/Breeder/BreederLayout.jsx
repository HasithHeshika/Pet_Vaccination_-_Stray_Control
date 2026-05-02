import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BreederIcon from './BreederIcons';
import './BreederLicensing.css';

const navItems = [
  { to: '/breeder/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/breeder/apply', label: 'Apply for License', icon: 'document' },
  { to: '/breeder/renew', label: 'Renew License', icon: 'renew' },
  { to: '/breeder/applications', label: 'Application Status', icon: 'list' }
];

const BreederLayout = ({ title, subtitle, children }) => {
  const { user } = useAuth();

  return (
    <div className="breeder-shell">
      <aside className="breeder-sidebar">
        <div className="breeder-brand">
          <span className="breeder-brand-icon"><BreederIcon name="shield" size={22} /></span>
          <div>
            <strong>Breeder Licensing</strong>
            <small>Regulatory Portal</small>
          </div>
        </div>

        <nav className="breeder-nav" aria-label="Breeder licensing">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `breeder-nav-link${isActive ? ' active' : ''}`}
            >
              <BreederIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="breeder-workspace">
        <header className="breeder-topbar">
          <div>
            <p className="breeder-eyebrow">Pet Management System</p>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="breeder-user-chip">
            <span>{(user?.fullName || 'B').slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user?.fullName}</strong>
              <small>Breeder account</small>
            </div>
          </div>
        </header>

        {children}
      </section>
    </div>
  );
};

export default BreederLayout;
