import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';

const mockLogin = jest.fn();
const mockSignup = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, signup: mockSignup })
}));

const renderAt = (path, state) => render(
  <MemoryRouter initialEntries={[{ pathname: path, state }]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<div>Home page</div>} />
      <Route path="/user/dashboard" element={<div>User dashboard</div>} />
      <Route path="/vet/dashboard" element={<div>Vet dashboard</div>} />
    </Routes>
  </MemoryRouter>
);

const fillSignup = (overrides = {}) => {
  const values = {
    'Full Name *': 'Kamal Perera',
    'Email *': 'kamal@example.com',
    'Password * (min 6 characters)': 'secret1',
    'Confirm Password *': 'secret1',
    'Phone Number *': '0771234567',
    'NIC Number *': '901234567V',
    'Street Address *': '1 Main St',
    'City *': 'Galle',
    'Postal Code *': '80000',
    ...overrides
  };
  Object.entries(values).forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
  fireEvent.change(screen.getByLabelText('Province *'), { target: { value: 'Southern' } });
};

beforeEach(() => {
  mockLogin.mockReset();
  mockSignup.mockReset();
});

describe('Login', () => {
  test('email and password are required and linked to their labels', () => {
    renderAt('/login');
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
  });

  test('shows the server message when login fails and stays on the page', async () => {
    mockLogin.mockResolvedValue({ success: false, message: 'Invalid email or password' });
    renderAt('/login');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'bad');
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  test('goes home after a successful login', async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderAt('/login');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'good' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  test('shows the registration message passed from signup', () => {
    renderAt('/login', { registrationMessage: 'Account created; awaiting verification' });
    expect(screen.getByText('Account created; awaiting verification')).toBeInTheDocument();
  });
});

describe('Signup', () => {
  test('veterinarian fields appear only for the veterinarian account type', () => {
    renderAt('/signup');
    expect(screen.queryByLabelText(/veterinary license number/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Account Type *'), { target: { value: 'veterinarian' } });
    expect(screen.getByLabelText(/veterinary license number/i)).toBeRequired();
    expect(screen.getByLabelText(/clinic \/ hospital name/i)).toBeRequired();
  });

  test('rejects mismatched passwords without calling the API', async () => {
    renderAt('/signup');
    fillSignup({ 'Confirm Password *': 'different' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('rejects passwords shorter than 6 characters', async () => {
    renderAt('/signup');
    fillSignup({ 'Password * (min 6 characters)': '123', 'Confirm Password *': '123' });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign Up' }).closest('form'));
    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('sends the form without confirmPassword and opens the user dashboard', async () => {
    mockSignup.mockResolvedValue({ success: true, user: { role: 'user' } });
    renderAt('/signup');
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
    const sent = mockSignup.mock.calls[0][0];
    expect(sent).not.toHaveProperty('confirmPassword');
    expect(sent).toMatchObject({
      fullName: 'Kamal Perera', email: 'kamal@example.com', role: 'user',
      address: { street: '1 Main St', city: 'Galle', province: 'Southern', postalCode: '80000' }
    });
  });

  test('vets awaiting verification are sent to login with the server message', async () => {
    mockSignup.mockResolvedValue({ success: true, requiresVerification: true, message: 'An administrator will verify your licence', user: { role: 'veterinarian' } });
    renderAt('/signup');
    fireEvent.change(screen.getByLabelText('Account Type *'), { target: { value: 'veterinarian' } });
    fireEvent.change(screen.getByLabelText(/veterinary license number/i), { target: { value: 'VET-1' } });
    fireEvent.change(screen.getByLabelText(/clinic \/ hospital name/i), { target: { value: 'City Clinic' } });
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(await screen.findByText('An administrator will verify your licence')).toBeInTheDocument();
  });

  test('shows the server error when signup fails', async () => {
    mockSignup.mockResolvedValue({ success: false, message: 'Email already registered' });
    renderAt('/signup');
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
  });
});
