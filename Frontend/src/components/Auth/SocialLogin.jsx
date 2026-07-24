import React from 'react';
import './SocialLogin.css';

const SocialLogin = () => (
  <div className="social-login social-login-under-construction">
    <div className="auth-divider">
      <span>or continue as a pet owner</span>
    </div>

    <div className="social-login-buttons" aria-disabled="true">
      <button type="button" className="social-button google-placeholder" disabled>
        <span className="google-mark">G</span>
        Continue with Google
      </button>

      <button type="button" className="social-button apple-button" disabled>
        Continue with Apple
      </button>
    </div>

    <p className="social-construction-label">Under the construction</p>
    <p className="social-login-note">
      Google and Apple login will be available only for standard user accounts.
    </p>
  </div>
);

export default SocialLogin;
