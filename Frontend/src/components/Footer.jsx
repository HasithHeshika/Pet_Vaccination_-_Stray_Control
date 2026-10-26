import React from 'react';
import { Link } from 'react-router-dom';
import BreederIcon from './Breeder/BreederIcons';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title"><BreederIcon name="shield" size={22} /> Pet Management System</h3>
          <p className="footer-description">
            A comprehensive platform for managing pet ownership records,
            vaccination tracking, breeder licensing, and animal incident reporting.
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
            <li><Link to="/breeder/dashboard">Breeder Licensing</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Report an Animal</h4>
          <ul className="footer-links">
            <li><Link to="/report-incident">Report an Animal Incident</Link></li>
            <li><Link to="/lost-and-found">Lost &amp; Found Pets</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <ul className="footer-links">
            <li>For registration or vaccination queries, contact your local Municipal Council veterinary office.</li>
            <li>In an emergency involving an animal bite, seek medical care immediately.</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Pet Ownership, Vaccination & Stray Control System. All rights reserved.</p>
        <p className="footer-tagline">Ensuring responsible pet ownership and community safety.</p>
      </div>
    </footer>
  );
};

export default Footer;
