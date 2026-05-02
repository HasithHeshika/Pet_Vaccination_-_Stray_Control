import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BreederIcon from '../Breeder/BreederIcons';
import './LandingPage.css';

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="landing-page" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '20px', right: '40px', display: 'flex', gap: '15px', zIndex: 100 }}>
        {!isAuthenticated ? (
          <>
            <Link to="/login" className="btn-modern" style={{ backgroundColor: 'transparent', color: '#000', border: '2px solid #000', padding: '6px 20px', borderRadius: '20px', fontWeight: 'bold' }}>
              Log In
            </Link>
            <Link to="/signup" className="btn-modern" style={{ backgroundColor: '#000', color: '#fff', border: '2px solid #000', padding: '6px 20px', borderRadius: '20px', fontWeight: 'bold' }}>
              Sign Up
            </Link>
          </>
        ) : (
          <Link to={user?.isAdmin ? '/admin/dashboard' : '/user/dashboard'} className="btn-modern" style={{ backgroundColor: '#000', color: '#fff', border: '2px solid #000', padding: '6px 20px', borderRadius: '20px', fontWeight: 'bold' }}>
            Go to Dashboard
          </Link>
        )}
      </div>

      <section className="modern-hero">
        <div className="hero-text-content">
          <h1 className="hero-title">
            Smart Pet Care & <br /> Municipal Stray Control
          </h1>
          <p className="hero-subtitle">
            A centralized system connecting pet owners, breeders, and municipal authorities.
            Register pets, track vaccinations securely via QR codes, apply for breeder licenses,
            and report stray animals to keep the community safe and healthy.
          </p>
          <div className="hero-buttons">
            <Link to="/report-stray" className="btn-modern btn-black">
              <BreederIcon name="alert" /> Report a Stray
            </Link>
            <Link to="/lost-and-found" className="btn-modern btn-outline">
              <BreederIcon name="search" /> Lost & Found
            </Link>
          </div>
        </div>

        <div className="hero-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=1200&q=80"
            alt="Happy dog"
            className="hero-cat-img"
          />
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Comprehensive Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-img-wrapper">
              <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop" alt="Vaccination tracking" />
            </div>
            <h3>Vaccination Tracking</h3>
            <p>Maintain accurate digital records of all pet vaccinations. Municipal admins can verify compliance instantly.</p>
          </div>

          <div className="feature-card">
            <div className="feature-img-wrapper">
              <img src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&h=300&fit=crop" alt="Breeder licensing" />
            </div>
            <h3>Breeder Licensing</h3>
            <p>Professional breeders can apply for and renew municipal licenses directly through a structured compliance portal.</p>
          </div>

          <div className="feature-card">
            <div className="feature-img-wrapper">
              <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop" alt="Lost and found registry" />
            </div>
            <h3>Lost & Found Registry</h3>
            <p>Create and browse public alerts that help reunite lost pets with their owners efficiently.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
