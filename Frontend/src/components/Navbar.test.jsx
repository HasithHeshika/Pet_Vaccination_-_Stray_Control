import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';

let mockAuth;
const mockLogout = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));

const renderNavbar = () => render(
  <MemoryRouter initialEntries={['/lost-and-found']}>
    <Navbar />
    <Routes>
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="*" element={null} />
    </Routes>
  </MemoryRouter>
);

const linkNames = () => screen.getAllByRole('link').map((l) => l.textContent.trim());

beforeEach(() => mockLogout.mockReset());

test('visitors see public links plus Login and Sign Up', () => {
  mockAuth = { user: null, isAuthenticated: false, logout: mockLogout };
  renderNavbar();
  expect(linkNames()).toEqual(expect.arrayContaining(['Lost & Found', 'Report Incident', 'Login', 'Sign Up']));
  expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
});

test('pet owners see their dashboard, breeder licensing and profile', () => {
  mockAuth = { user: { fullName: 'Nimal', role: 'user' }, isAuthenticated: true, logout: mockLogout };
  renderNavbar();
  expect(linkNames()).toEqual(expect.arrayContaining(['My Dashboard', 'Breeder Licensing', 'Profile', 'Report Incident']));
  expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  expect(screen.getByText(/Welcome, Nimal/)).toBeInTheDocument();
});

test('administrators get admin links and no Report Incident link', () => {
  mockAuth = { user: { fullName: 'Admin', role: 'admin', isAdmin: true }, isAuthenticated: true, logout: mockLogout };
  renderNavbar();
  const names = linkNames();
  expect(names).toEqual(expect.arrayContaining(['Admin Dashboard', 'Breeder Licenses', 'Veterinarian', 'Authority', 'Profile']));
  expect(names).not.toContain('Report Incident');
  expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/admin/profile');
  expect(screen.getByText(/\(Admin\)/)).toBeInTheDocument();
});

test('veterinarians get the Vet Portal only', () => {
  mockAuth = { user: { fullName: 'Dr Silva', role: 'veterinarian' }, isAuthenticated: true, logout: mockLogout };
  renderNavbar();
  expect(linkNames()).toEqual(expect.arrayContaining(['🩺 Vet Portal']));
  expect(screen.queryByText('My Dashboard')).not.toBeInTheDocument();
  expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
});

test('logout clears the session and opens the login page', () => {
  mockAuth = { user: { fullName: 'Nimal', role: 'user' }, isAuthenticated: true, logout: mockLogout };
  renderNavbar();
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(mockLogout).toHaveBeenCalled();
  expect(screen.getByText('Login page')).toBeInTheDocument();
});
