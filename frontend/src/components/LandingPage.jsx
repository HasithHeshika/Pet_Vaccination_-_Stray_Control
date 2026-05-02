import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-kicker">Community pet care platform</p>
            <h1 className="hero-title">
              Pet Ownership, Vaccination & Stray Control System
            </h1>
            <p className="hero-subtitle">
              A warm, reliable digital home for pet registrations, vaccination
              schedules, QR identification, and stray animal reporting.
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary btn-large">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary btn-large">
                Login
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=900&h=760&fit=crop"
              alt="A happy dog and cat sitting together"
              className="hero-img"
            />
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Care Tools For Every Pet</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=640&h=420&fit=crop"
                alt="Dog sitting outdoors"
                className="feature-img"
              />
            </div>
            <h3>Pet Registration</h3>
            <ul className="feature-list">
              <li>Secure owner-pet record creation</li>
              <li>QR code-based identification</li>
              <li>Lost-and-found pet tracking</li>
              <li>Digital pet profiles</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <img
                src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=640&h=420&fit=crop"
                alt="Dog receiving gentle veterinary care"
                className="feature-img"
              />
            </div>
            <h3>Vaccination Management</h3>
            <ul className="feature-list">
              <li>Automated vaccination reminders</li>
              <li>Complete vaccination history</li>
              <li>Veterinarian access for updates</li>
              <li>Reduce rabies risk through tracking</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <img
                src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=640&h=420&fit=crop"
                alt="Cat resting comfortably"
                className="feature-img"
              />
            </div>
            <h3>Stray Animal Reporting</h3>
            <ul className="feature-list">
              <li>Easy stray sighting reporting</li>
              <li>Municipal dashboards for monitoring</li>
              <li>Track stray populations effectively</li>
              <li>Community safety enhancement</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="problem-solution-section">
        <div className="content-wrapper">
          <div className="problem-side">
            <h2>The Problem</h2>
            <div className="problem-list">
              <div className="problem-item">
                <span className="problem-icon">Risk</span>
                <p>Low registration rates leading to ineffective tracking</p>
              </div>
              <div className="problem-item">
                <span className="problem-icon">Risk</span>
                <p>Increased risk of rabies due to missed vaccinations</p>
              </div>
              <div className="problem-item">
                <span className="problem-icon">Risk</span>
                <p>Difficulty monitoring stray animal populations</p>
              </div>
              <div className="problem-item">
                <span className="problem-icon">Risk</span>
                <p>Poor communication between owners, vets, and authorities</p>
              </div>
            </div>
          </div>

          <div className="solution-side">
            <h2>Our Solution</h2>
            <div className="solution-list">
              <div className="solution-item">
                <span className="solution-icon">Fix</span>
                <p>Centralized digital registration system</p>
              </div>
              <div className="solution-item">
                <span className="solution-icon">Fix</span>
                <p>Automated reminders and vaccination tracking</p>
              </div>
              <div className="solution-item">
                <span className="solution-icon">Fix</span>
                <p>Real-time stray animal monitoring dashboards</p>
              </div>
              <div className="solution-item">
                <span className="solution-icon">Fix</span>
                <p>Integrated platform for all stakeholders</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="benefits-section">
        <h2 className="section-title">Who Benefits?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-photo owners-photo" aria-hidden="true"></div>
            <h3>Pet Owners</h3>
            <p>
              Easy registration, vaccination reminders, digital health records,
              and lost pet tracking.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-photo vets-photo" aria-hidden="true"></div>
            <h3>Veterinarians</h3>
            <p>
              Direct access to update pet health records and vaccination status
              in real time.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-photo authority-photo" aria-hidden="true"></div>
            <h3>Authorities</h3>
            <p>
              Comprehensive dashboards for tracking compliance and managing
              stray populations.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-photo breeders-photo" aria-hidden="true"></div>
            <h3>Breeders</h3>
            <p>
              Licensing management, compliance monitoring, and breeder
              registration support.
            </p>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-number">QR</h3>
            <p className="stat-label">Secure QR-Based Identification</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-number">24/7</h3>
            <p className="stat-label">User-Friendly Mobile Access</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-number">Auto</h3>
            <p className="stat-label">Automated Reminders</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-number">Live</h3>
            <p className="stat-label">Real-Time Dashboards</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>
            Join us in promoting responsible pet ownership and community safety.
            Register your pet and stay ahead of vaccination schedules.
          </p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn btn-primary btn-large">
              Create Account
            </Link>
            <Link to="/login" className="btn btn-outline btn-large">
              Already have an account? Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
