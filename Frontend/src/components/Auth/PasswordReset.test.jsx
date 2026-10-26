import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({ __esModule: true, default: { post: jest.fn() } }));

beforeEach(() => axios.post.mockReset());

test('forgot password sends the email address and shows the server reply', async () => {
  axios.post.mockResolvedValue({ data: { message: 'If an account exists for that email, a password reset link has been sent.' } });
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

  await waitFor(() => expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument());
  expect(axios.post).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'owner@example.com' });
});

const renderReset = () => render(
  <MemoryRouter initialEntries={['/reset-password/abc123']}>
    <Routes>
      <Route path="/reset-password/:token" element={<ResetPassword />} />
    </Routes>
  </MemoryRouter>
);

test('reset password refuses mismatched passwords without calling the API', () => {
  renderReset();
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'secret123' } });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'secret124' } });
  fireEvent.click(screen.getByRole('button', { name: /set new password/i }));

  expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test('reset password sends the token from the link with the new password', async () => {
  axios.post.mockResolvedValue({ data: { message: 'Your password has been reset.' } });
  renderReset();
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'secret123' } });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /set new password/i }));

  await waitFor(() => expect(screen.getByText(/has been reset/i)).toBeInTheDocument());
  expect(axios.post).toHaveBeenCalledWith('/api/auth/reset-password', { token: 'abc123', password: 'secret123' });
  expect(screen.getByRole('link', { name: /go to login/i })).toHaveAttribute('href', '/login');
});
