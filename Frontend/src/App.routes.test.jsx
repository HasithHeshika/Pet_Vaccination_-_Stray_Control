import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./api/axios', () => {
  const ok = () => Promise.resolve({ data: {} });
  return { __esModule: true, default: { get: jest.fn(ok), post: jest.fn(ok), put: jest.fn(ok), patch: jest.fn(ok), delete: jest.fn(ok), defaults: { headers: { common: {} } } } };
});

let mockAuth;
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockAuth
}));

const visitor = { isAuthenticated: false, isAdmin: false, isVet: false, loading: false, user: null, logout: jest.fn() };
const owner = { isAuthenticated: true, isAdmin: false, isVet: false, loading: false, user: { id: 'u1', fullName: 'Nimal', role: 'user' }, token: 't', logout: jest.fn() };
const admin = { isAuthenticated: true, isAdmin: true, isVet: true, loading: false, user: { id: 'a1', fullName: 'Admin', role: 'admin', isAdmin: true }, token: 't', logout: jest.fn() };

const visit = (path, auth) => {
  mockAuth = auth;
  window.history.pushState({}, '', path);
  return render(<App />);
};

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test('visitors are sent to login from private pages', async () => {
  visit('/user/my-pets', visitor);
  await waitFor(() => expect(window.location.pathname).toBe('/login'));
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
});

test('visitors are sent to login from admin pages and from reporting a lost pet', async () => {
  visit('/admin/matches', visitor);
  await waitFor(() => expect(window.location.pathname).toBe('/login'));
  visit('/lost-and-found/report?type=found', visitor);
  await waitFor(() => expect(window.location.pathname).toBe('/login'));
});

test('pet owners cannot open admin pages', async () => {
  visit('/admin/authority', owner);
  await waitFor(() => expect(window.location.pathname).toBe('/user/dashboard'));
});

test('pet owners cannot open the vet portal', async () => {
  visit('/vet/dashboard', owner);
  await waitFor(() => expect(window.location.pathname).toBe('/user/dashboard'));
});

test('logged-in admins are redirected away from the login page', async () => {
  visit('/login', admin);
  await waitFor(() => expect(window.location.pathname).toBe('/admin/dashboard'));
});

test('public pages work without logging in', async () => {
  visit('/report-incident', visitor);
  expect(window.location.pathname).toBe('/report-incident');
  visit('/lost-and-found', visitor);
  await waitFor(() => expect(window.location.pathname).toBe('/lost-and-found'));
});

test('unknown addresses go to the landing page', async () => {
  visit('/does-not-exist', visitor);
  await waitFor(() => expect(window.location.pathname).toBe('/'));
});

test('a loading session shows a loading message instead of redirecting', () => {
  visit('/user/dashboard', { ...visitor, loading: true });
  expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);
  expect(window.location.pathname).toBe('/user/dashboard');
});
