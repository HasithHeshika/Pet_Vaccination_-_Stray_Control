import { renderHook, act } from '@testing-library/react';
import { useCurrentLocation } from './geolocation';

const setGeolocation = (value) => {
  Object.defineProperty(global.navigator, 'geolocation', { value, configurable: true });
};

afterEach(() => setGeolocation(undefined));

test('reports an error when the browser has no geolocation', () => {
  setGeolocation(undefined);
  const { result } = renderHook(() => useCurrentLocation());
  act(() => result.current.requestLocation());
  expect(result.current.locationError).toMatch(/cannot share your location/i);
  expect(result.current.coordinates).toBeNull();
});

test('stores coordinates rounded to 6 decimals on success', () => {
  setGeolocation({
    getCurrentPosition: (success) => success({ coords: { latitude: 6.12345678, longitude: 80.98765432 } })
  });
  const { result } = renderHook(() => useCurrentLocation());
  act(() => result.current.requestLocation());
  expect(result.current.coordinates).toEqual({ lat: 6.123457, lng: 80.987654 });
  expect(result.current.locating).toBe(false);
  expect(result.current.locationError).toBe('');
});

test('shows a helpful message when permission is denied', () => {
  setGeolocation({ getCurrentPosition: (_success, failure) => failure({ code: 1 }) });
  const { result } = renderHook(() => useCurrentLocation({ lat: 1, lng: 2 }));
  act(() => result.current.requestLocation());
  expect(result.current.locationError).toMatch(/allow location access/i);
  expect(result.current.locating).toBe(false);
  // Previously chosen coordinates are kept
  expect(result.current.coordinates).toEqual({ lat: 1, lng: 2 });
});
