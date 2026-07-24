import React from 'react';

const ProfileAvatar = ({ user, source, className = '', alt }) => {
  const imageSource = source || user?.profilePicture;
  const initial = (user?.fullName || 'U').trim().slice(0, 1).toUpperCase();

  return (
    <span className={`avatar-chip ${className}`.trim()} aria-label={alt || `${user?.fullName || 'User'} profile picture`}>
      {imageSource ? (
        <img src={imageSource} alt={alt || `${user?.fullName || 'User'} profile`} />
      ) : (
        initial
      )}
    </span>
  );
};

export default ProfileAvatar;
