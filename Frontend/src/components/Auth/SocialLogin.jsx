import React from 'react';
import './SocialLogin.css';

// Google / Apple sign-in buttons are hidden until the frontend OAuth flow is finished
// (the backend /api/auth/oauth/:provider route already exists). Set
// REACT_APP_ENABLE_SOCIAL_LOGIN=true to show the preview again during development.
const SocialLogin = () => {
  if (process.env.REACT_APP_ENABLE_SOCIAL_LOGIN !== 'true') {
    return null;
  }

  return (
    <div className="social-login">
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

      <p className="social-login-note">
        Google and Apple sign-in is coming soon for standard user accounts.
      </p>
    </div>
  );
};

export default SocialLogin;
