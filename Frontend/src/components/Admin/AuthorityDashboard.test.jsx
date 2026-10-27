import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthorityDashboard from './AuthorityDashboard';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), patch: jest.fn() }
}));

const dashboard = {
  metrics: {
    totalRegisteredPets: 42, totalBreeders: 5, pendingLicenseRequests: 1, vaccinationComplianceRate: 76,
    compliantPets: 32, strayReportsCount: 7, openUrgentIncidents: 2, pendingMatches: 3
  },
  licenses: [
    { _id: 'lic1', applicationId: 'BL-001', applicationType: 'New', breederName: 'Kamal Kennels', status: 'Pending', animalTypes: ['Dogs'], numberOfAnimals: 4 },
    { _id: 'lic2', applicationId: 'BL-002', applicationType: 'New', breederName: 'Cat House', status: 'Approved', expiryDate: '2027-10-01' }
  ],
  strayReports: [],
  lostFound: [
    { _id: 'r1', petName: 'Rexy', status: 'Lost', reportType: 'lost', species: 'Dog', location: 'Galle', breed: 'GSD', color: 'Black', reportedBy: { fullName: 'Nimal' }, imageUrl: 'data:image/png;base64,AA' },
    // eslint-disable-next-line no-script-url -- checks that javascript: links are blocked
    { _id: 'r2', petName: 'Unknown', status: 'Found', reportType: 'found', location: 'Matara', breed: '?', color: 'Brown', imageUrl: 'javascript:alert(1)' }
  ],
  pets: [{ _id: 'p1', petName: 'Mimi', petType: 'Other', petTypeOther: 'Rabbit', owner: { fullName: 'Sunil' }, registrationDate: '2026-10-01' }]
};

const renderPage = () => render(<MemoryRouter><AuthorityDashboard /></MemoryRouter>);

beforeEach(() => {
  axios.get.mockReset();
  axios.put.mockReset();
  axios.get.mockResolvedValue({ data: dashboard });
});

afterEach(() => jest.restoreAllMocks());

test('shows the municipal metrics, including possible matches to review', async () => {
  renderPage();
  expect(await screen.findByText('42')).toBeInTheDocument();
  expect(screen.getByText('76%')).toBeInTheDocument();
  expect(screen.getByText('2 open urgent or emergency')).toBeInTheDocument();
  expect(screen.getByText('Lost & Found Matches').closest('a')).toHaveAttribute('href', '/admin/matches');
  expect(screen.getByText('3 possible matches to review →')).toBeInTheDocument();
  expect(screen.getByText('Rabbit')).toBeInTheDocument();
});

test('lost & found filter buttons filter by status', async () => {
  renderPage();
  await screen.findByText('Rexy');
  fireEvent.click(screen.getByRole('button', { name: 'Found' }));
  expect(screen.queryByText('Rexy')).not.toBeInTheDocument();
  expect(screen.getByText('Found pet')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Resolved' }));
  expect(screen.getByText('No lost or found reports available.')).toBeInTheDocument();
});

test('only safe image sources are rendered for lost & found reports', async () => {
  renderPage();
  await screen.findByText('Rexy');
  const sources = screen.getAllByRole('img').map((img) => img.getAttribute('src'));
  // eslint-disable-next-line no-script-url -- checks that javascript: links are blocked
  expect(sources).not.toContain('javascript:alert(1)');
  expect(sources).toContain('data:image/png;base64,AA');
});

test('approving a pending licence calls the API and reloads', async () => {
  axios.put.mockResolvedValue({ data: {} });
  renderPage();
  await screen.findByRole('button', { name: 'Approve' });
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(axios.put).toHaveBeenCalledWith('/api/licenses/lic1/status', { status: 'Approved', remarks: 'Reviewed and approved by authority' }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
});

test('rejecting a licence requires remarks', async () => {
  jest.spyOn(window, 'prompt').mockReturnValueOnce('').mockReturnValueOnce('Facility not suitable');
  axios.put.mockResolvedValue({ data: {} });
  renderPage();
  await screen.findByRole('button', { name: 'Approve' });
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
  expect(axios.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
  await waitFor(() => expect(axios.put).toHaveBeenCalledWith('/api/licenses/lic1/status', { status: 'Rejected', remarks: 'Facility not suitable' }));
});

test('shows the server error when the dashboard cannot be loaded', async () => {
  axios.get.mockRejectedValue({ response: { data: { message: 'Access denied. Admin only.' } } });
  renderPage();
  expect(await screen.findByText('Access denied. Admin only.')).toBeInTheDocument();
});
