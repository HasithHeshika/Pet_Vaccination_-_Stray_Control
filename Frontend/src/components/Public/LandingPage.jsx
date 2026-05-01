import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Modern Hero Section */}
      <section className="modern-hero">
        <div className="hero-text-content">
          <h1 className="hero-title">
            [Your Main Heading Here]
          </h1>
          <p className="hero-subtitle">
            [Enter your detailed subtitle or description here to explain your system's purpose and value proposition.]
          </p>
          <div className="hero-buttons">
            <Link to="/report-stray" className="btn-modern btn-black">
              Report a Stray Animal
            </Link>
            <Link to="/lost-and-found" className="btn-modern btn-outline">
              <span className="play-icon">🔍</span> Lost & Found
            </Link>
          </div>
        </div>

        {/* Hero Image Container */}
        <div className="hero-image-wrapper">
          {/* Replace this src with your actual hero image URL */}
          <img 
            src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80" 
            alt="Hero image placeholder" 
            className="hero-cat-img"
          />
        </div>

        {/* Floating Glass Panel */}
        <div className="hero-glass-panel">
          <div className="glass-card left-glass-card">
            <div className="glass-text">
              <h4>[Glass Card Title]</h4>
              <p className="glass-sub">[Glass Card Subtitle or Details]</p>
              <p className="glass-highlight">[Highlight Text]</p>
            </div>
            <div className="glass-card-img">
              {/* Replace with actual small image */}
              <img src="https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=200&q=80" alt="Feature placeholder" />
            </div>
          </div>

          <div className="glass-card right-glass-card">
            <h4>[Second Card Title]</h4>
            <div className="expert-avatars">
              {/* Replace with your actual icons, avatars, or remove this section */}
              <div className="avatar placeholder-avatar"></div>
              <div className="avatar placeholder-avatar"></div>
              <div className="avatar placeholder-avatar"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Features Section */}
      <section className="features-section">
        <h2 className="section-title">[Features Section Title]</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-img-wrapper">
              {/* Replace with actual feature image */}
              <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop" alt="Feature 1" />
            </div>
            <h3>[Feature 1 Title]</h3>
            <p>[Detailed description for feature 1 goes here.]</p>
          </div>

          <div className="feature-card">
            <div className="feature-img-wrapper">
              {/* Replace with actual feature image */}
              <img src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&h=300&fit=crop" alt="Feature 2" />
            </div>
            <h3>[Feature 2 Title]</h3>
            <p>[Detailed description for feature 2 goes here.]</p>
          </div>

          <div className="feature-card">
            <div className="feature-img-wrapper">
              {/* Replace with actual feature image */}
              <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop" alt="Feature 3" />
            </div>
            <h3>[Feature 3 Title]</h3>
            <p>[Detailed description for feature 3 goes here.]</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
