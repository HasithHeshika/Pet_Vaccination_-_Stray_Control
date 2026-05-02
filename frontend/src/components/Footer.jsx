import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section footer-brand">
          <h3 className="footer-title">Pet Care Registry</h3>
          <p className="footer-description">
            A comprehensive platform for pet ownership records, vaccination tracking,
            and stray animal reporting.
          </p>
          <div className="footer-social" aria-label="Contact channels">
            <span className="social-icon">Email</span>
            <span className="social-icon">Phone</span>
            <span className="social-icon">Web</span>
          </div>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Features</h4>
          <ul className="footer-links">
            <li>Pet Registration</li>
            <li>Vaccination Management</li>
            <li>Stray Animal Reporting</li>
            <li>QR Code Tracking</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <ul className="footer-links">
            <li>info@petmanagement.com</li>
            <li>+1 (555) 123-4567</li>
            <li>123 Pet Street, City</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Copyright 2026 Pet Ownership, Vaccination & Stray Control System. All rights reserved.</p>
        <p className="footer-tagline">Ensuring responsible pet ownership and community safety.</p>
      </div>
    </footer>
  );
};

export default Footer;
