import { useState } from 'react';

// "Use my current location" for report forms. Coordinates are rounded to 6 decimals (~10 cm).
export const useCurrentLocation = (initial = null) => {
  const [coordinates, setCoordinates] = useState(initial);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser cannot share your location. Please describe the location instead.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        });
        setLocating(false);
      },
      () => {
        setLocationError('Could not get your location. Please allow location access or describe the location instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return { coordinates, setCoordinates, locating, locationError, requestLocation };
};
