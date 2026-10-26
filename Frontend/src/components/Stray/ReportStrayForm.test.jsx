import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportStrayForm from './ReportStrayForm';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ token: null, user: null }) }));

const renderForm = () => render(
  <MemoryRouter>
    <ReportStrayForm />
  </MemoryRouter>
);

test('offers every incident type and sets a sensible default urgency', () => {
  renderForm();

  // Nothing is pre-selected, so nobody files an urgent report by accident
  expect(screen.getByLabelText(/violence or abuse/i)).not.toBeChecked();
  expect(screen.getByLabelText(/how urgent/i)).toHaveValue('normal');

  fireEvent.click(screen.getByLabelText(/violence or abuse/i));
  expect(screen.getByLabelText(/how urgent/i)).toHaveValue('urgent');

  fireEvent.click(screen.getByLabelText(/stray animal/i));
  expect(screen.getByLabelText(/how urgent/i)).toHaveValue('normal');

  fireEvent.click(screen.getByLabelText(/sick or injured/i));
  expect(screen.getByLabelText(/how urgent/i)).toHaveValue('urgent');
});

test('asks for the incident type when "Other" is chosen', () => {
  renderForm();
  expect(screen.queryByLabelText(/type of incident/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText(/other incident/i));
  expect(screen.getByLabelText(/type of incident/i)).toBeRequired();
});

test('submits the incident details to the API', async () => {
  axios.post.mockResolvedValue({ data: {} });
  renderForm();

  fireEvent.click(screen.getByLabelText(/sick or injured/i));
  fireEvent.change(screen.getByLabelText(/^location/i), { target: { value: 'Galle bus stand' } });
  fireEvent.change(screen.getByLabelText(/^description/i), { target: { value: 'Dog with a hurt leg' } });
  fireEvent.change(screen.getByLabelText(/phone or email/i), { target: { value: '0771234567' } });
  fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

  await waitFor(() => expect(screen.getByText(/thank you/i)).toBeInTheDocument());
  expect(axios.post).toHaveBeenCalledWith(
    '/api/stray-reports',
    expect.objectContaining({
      incidentType: 'sick_injured',
      urgency: 'urgent',
      location: 'Galle bus stand',
      description: 'Dog with a hurt leg',
      reporterContact: '0771234567',
      images: []
    }),
    expect.anything()
  );
});
