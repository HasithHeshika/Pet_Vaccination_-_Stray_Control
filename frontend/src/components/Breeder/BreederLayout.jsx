import React from 'react';
import { NavLink } from 'react-router-dom';
import './BreederModule.css';

const BreederLayout = ({ title, subtitle, actions, children }) => {
  return (
    <div className="module-shell">
      <aside className="module-sidebar">
        <div className="module-brand">
          <h2>Breeder Licensing</h2>
          <p>Applications, renewals, compliance records, and authority status updates.</p>
        </div>
        <nav className="module-nav">
          <NavLink to="/breeder/dashboard">Dashboard</NavLink>
          <NavLink to="/breeder/apply">Apply for License</NavLink>
          <NavLink to="/breeder/renew">Renew License</NavLink>
          <NavLink to="/breeder/applications">Application Status</NavLink>
        </nav>
      </aside>

      <main className="module-main">
        <header className="module-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="module-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="module-header-actions">{actions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
};

export default BreederLayout;
