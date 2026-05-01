import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="landing-page" style={{ position: 'relative' }}>
      {/* Floating Top Right Auth Buttons */}
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
          <Link to={user?.isAdmin ? "/admin/dashboard" : "/user/dashboard"} className="btn-modern" style={{ backgroundColor: '#000', color: '#fff', border: '2px solid #000', padding: '6px 20px', borderRadius: '20px', fontWeight: 'bold' }}>
            Go to Dashboard
          </Link>
        )}
      </div>

      {/* Modern Hero Section */}
      <section className="modern-hero">
        <div className="hero-text-content">
          <h1 className="hero-title">
            Smart Pet Care & <br /> Municipal Stray Control
          </h1>
          <p className="hero-subtitle">
            A centralized system connecting pet owners, breeders, and municipal authorities. 
            Register pets, track vaccinations securely via QR codes, and report stray animals 
            to keep our community safe and healthy.
          </p>
          <div className="hero-buttons">
            <Link to="/report-stray" className="btn-modern btn-black">
              🚨 Report a Stray
            </Link>
            <Link to="/lost-and-found" className="btn-modern btn-outline">
              <span className="play-icon">🔍</span> Lost & Found
            </Link>
          </div>
        </div>

        {/* Hero Image Container */}
        <div className="hero-image-wrapper">
          <img 
            src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=1200&q=80" 
            alt="Happy Dog" 
            className="hero-cat-img"
          />
        </div>

      </section>

      {/* Modern Features Section */}
      <section className="features-section">
        <h2 className="section-title">Comprehensive Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-img-wrapper">
              <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop" alt="Vaccination Tracking" />
            </div>
            <h3>Vaccination Tracking</h3>
            <p>Maintain accurate digital records of all pet vaccinations. Municipal admins can verify compliance instantly, ensuring the community remains rabies-free.</p>
          </div>

          <div className="feature-card">
            <div className="feature-img-wrapper">
              <img src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&h=300&fit=crop" alt="Breeder Licensing" />
            </div>
            <h3>Breeder Licensing</h3>
            <p>Professional breeders can apply for and renew municipal licenses directly through our portal, streamlining regulatory compliance and paperwork.</p>
          </div>

          <div className="feature-card">
            <div className="feature-img-wrapper">
              <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop" alt="Lost & Found" />
            </div>
            <h3>Lost & Found Registry</h3>
            <p>Did your furry friend go missing? Create an alert instantly. Our public directory helps reunite lost pets with their worried owners efficiently.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
