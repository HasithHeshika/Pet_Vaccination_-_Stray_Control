import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReportLostForm from './ReportLostForm';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn(), put: jest.fn() } }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ token: 't', user: null }) }));

const renderForm = (path = '/lost-and-found/report') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/lost-and-found/report" element={<ReportLostForm />} />
      <Route path="/lost-and-found" element={<div>Feed page</div>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  axios.post.mockReset();
  axios.get.mockReset();
});

test('lost reports need a name; found reports ask for the QR tag Pet ID instead', () => {
  renderForm();
  expect(screen.getByLabelText(/i lost a pet/i)).toBeChecked();
  expect(screen.getByLabelText(/^pet name/i)).toBeRequired();
  expect(screen.queryByLabelText(/pet id on the qr tag/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText(/i found a pet/i));
  expect(screen.getByLabelText(/name on collar/i)).not.toBeRequired();
  expect(screen.getByLabelText(/pet id on the qr tag/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/where did you find it/i)).toBeRequired();
});

test('opening the form with ?type=found preselects a found report and submits reportType', async () => {
  axios.post.mockResolvedValue({ data: {} });
  renderForm('/lost-and-found/report?type=found');

  expect(screen.getByLabelText(/i found a pet/i)).toBeChecked();
  fireEvent.change(screen.getByLabelText(/^species/i), { target: { value: 'Dog' } });
  fireEvent.change(screen.getByLabelText(/colour/i), { target: { value: 'black' } });
  fireEvent.change(screen.getByLabelText(/pet id on the qr tag/i), { target: { value: 'PET123' } });
  fireEvent.change(screen.getByLabelText(/where did you find it/i), { target: { value: 'Galle market' } });
  fireEvent.change(screen.getByLabelText(/date found/i), { target: { value: '2026-10-20' } });
  fireEvent.change(screen.getByLabelText(/contact information/i), { target: { value: '0771234567' } });
  fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

  await waitFor(() => expect(screen.getByText('Feed page')).toBeInTheDocument());
  expect(axios.post).toHaveBeenCalledWith(
    '/api/lost-and-found',
    expect.objectContaining({
      reportType: 'found',
      species: 'Dog',
      color: 'black',
      tagPetId: 'PET123',
      lastSeenLocation: 'Galle market',
      contactInfo: '0771234567',
      images: []
    }),
    expect.anything()
  );
  expect(axios.post.mock.calls[0][1].status).toBeUndefined();
});
