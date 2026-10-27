import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import axios from '../api/axios';

jest.mock('../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), defaults: { headers: { common: {} } } }
}));

let auth;
const Probe = () => {
  auth = useAuth();
  return <div>{auth.loading ? 'loading' : auth.isAuthenticated ? `in:${auth.user.fullName}` : 'out'}</div>;
};

const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(() => {
  localStorage.clear();
  axios.get.mockReset();
  axios.post.mockReset();
  axios.defaults.headers.common = {};
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => console.error.mockRestore());

test('useAuth outside the provider throws a clear error', () => {
  const Broken = () => { useAuth(); return null; };
  expect(() => render(<Broken />)).toThrow('useAuth must be used within an AuthProvider');
});

test('starts logged out when there is no stored token', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByText('out')).toBeInTheDocument());
  expect(axios.get).not.toHaveBeenCalled();
});

test('restores the session from a stored token', async () => {
  localStorage.setItem('token', 'stored');
  axios.get.mockResolvedValue({ data: { user: { fullName: 'Amal', role: 'user' } } });
  renderProvider();
  await waitFor(() => expect(screen.getByText('in:Amal')).toBeInTheDocument());
  expect(axios.get).toHaveBeenCalledWith('/api/auth/me');
  expect(axios.defaults.headers.common.Authorization).toBe('Bearer stored');
});

test('an invalid stored token logs the user out and clears storage', async () => {
  localStorage.setItem('token', 'expired');
  axios.get.mockRejectedValue(new Error('401'));
  renderProvider();
  await waitFor(() => expect(screen.getByText('out')).toBeInTheDocument());
  expect(localStorage.getItem('token')).toBeNull();
});

test('login stores the token and returns the server error on failure', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByText('out')).toBeInTheDocument());

  axios.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } });
  let result;
  await act(async () => { result = await auth.login('a@b.com', 'wrong'); });
  expect(result).toEqual({ success: false, message: 'Invalid credentials' });
  expect(localStorage.getItem('token')).toBeNull();

  axios.post.mockResolvedValueOnce({ data: { token: 'tok', user: { fullName: 'Admin', isAdmin: true, role: 'admin' } } });
  axios.get.mockResolvedValue({ data: { user: { fullName: 'Admin', isAdmin: true, role: 'admin' } } });
  await act(async () => { result = await auth.login('admin@x.com', 'right'); });
  expect(result.success).toBe(true);
  expect(localStorage.getItem('token')).toBe('tok');
  await waitFor(() => expect(screen.getByText('in:Admin')).toBeInTheDocument());
  expect(auth.isAdmin).toBe(true);
  expect(auth.isVet).toBe(true);
});

test('signup that needs verification does not log the user in', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByText('out')).toBeInTheDocument());
  axios.post.mockResolvedValueOnce({ data: { user: { fullName: 'Vet' }, message: 'Wait for approval', requiresVerification: true } });
  let result;
  await act(async () => { result = await auth.signup({ email: 'v@x.com' }); });
  expect(result).toMatchObject({ success: true, requiresVerification: true, message: 'Wait for approval' });
  expect(localStorage.getItem('token')).toBeNull();
  expect(screen.getByText('out')).toBeInTheDocument();
});

test('role flags: veterinarians are vets but not admins; logout clears everything', async () => {
  localStorage.setItem('token', 't');
  axios.get.mockResolvedValue({ data: { user: { fullName: 'Dr Silva', role: 'veterinarian' } } });
  renderProvider();
  await waitFor(() => expect(screen.getByText('in:Dr Silva')).toBeInTheDocument());
  expect(auth.isVet).toBe(true);
  expect(auth.isAdmin).toBe(false);
  expect(auth.role).toBe('veterinarian');

  act(() => auth.logout());
  expect(screen.getByText('out')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
  expect(axios.defaults.headers.common.Authorization).toBeUndefined();
});
