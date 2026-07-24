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
            vaccination tracking, breeder licensing, and stray animal reporting.
          </p>
          <div className="footer-social" aria-label="Contact channels">
            <span className="social-icon"><BreederIcon name="mail" /></span>
            <span className="social-icon"><BreederIcon name="phone" /></span>
            <span className="social-icon"><BreederIcon name="home" /></span>
          </div>
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
          <h4>Features</h4>
          <ul className="footer-links">
            <li>Pet Registration</li>
            <li>Vaccination Management</li>
            <li>Breeder License Management</li>
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
        <p>© 2026 Pet Ownership, Vaccination & Stray Control System. All rights reserved.</p>
        <p className="footer-tagline">Ensuring responsible pet ownership and community safety.</p>
      </div>
    </footer>
  );
};

export default Footer;
