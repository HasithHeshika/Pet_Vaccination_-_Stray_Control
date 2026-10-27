import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LostFoundFeed from './LostFoundFeed';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() }
}));

let mockAuth;
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }));

const reports = [
  { _id: 'r1', reportType: 'lost', status: 'Lost', petName: 'Rexy', species: 'Dog', breed: 'German Shepherd', color: 'Black and tan', lastSeenLocation: 'Galle Fort', lastSeenDate: '2026-10-20', contactInfo: '0771111111', reportedBy: { _id: 'u1' }, images: ['data:image/jpeg;base64,AAAA'], imageCount: 2 },
  // eslint-disable-next-line no-script-url -- checks that javascript: links are blocked
  { _id: 'r2', reportType: 'found', status: 'Found', petName: 'Unknown', species: 'Other', speciesOther: 'Tortoise', breed: 'Unknown', color: 'Brown', lastSeenLocation: 'Matara', lastSeenDate: '2026-10-21', contactInfo: '0772222222', reportedBy: { _id: 'u2' }, images: ['javascript:alert(1)'] },
  // Legacy report with no reportType that is now being handled
  { _id: 'r3', status: 'In Progress', petName: 'Kitty', species: 'Cat', breed: 'Persian', color: 'White', lastSeenLocation: 'Colombo', lastSeenDate: '2026-10-19', contactInfo: '0773333333', reportedBy: 'u1' }
];

const renderFeed = (path = '/lost-and-found') => render(
  <MemoryRouter initialEntries={[path]}>
    <LostFoundFeed />
  </MemoryRouter>
);

const cardTitles = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);

beforeEach(() => {
  axios.get.mockReset();
  axios.patch.mockReset();
  axios.delete.mockReset();
  axios.get.mockImplementation((url) => (url === '/api/matches/mine'
    ? Promise.resolve({ data: { matches: [] } })
    : Promise.resolve({ data: reports })));
  mockAuth = { user: null, isAdmin: false, token: null };
});

test('visitors see all reports with lost/found badges and in-progress status', async () => {
  renderFeed();
  await waitFor(() => expect(cardTitles()).toEqual(['Rexy', 'Unknown name', 'Kitty']));
  expect(screen.getAllByText('Lost')).not.toHaveLength(0);
  expect(screen.getByText('In Progress')).toBeInTheDocument();
  expect(screen.getByText('Tortoise')).toBeInTheDocument();
  expect(screen.getByText('2 photos')).toBeInTheDocument();
  // Visitors cannot edit, delete or see personal tabs
  expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  expect(screen.queryByText('My Reports')).not.toBeInTheDocument();
});

test('unsafe image links are never rendered as images', async () => {
  renderFeed();
  await waitFor(() => expect(cardTitles()).toHaveLength(3));
  const sources = screen.getAllByRole('img').map((img) => img.getAttribute('src'));
  expect(sources).toEqual(['data:image/jpeg;base64,AAAA']);
});

test('Lost and Found tabs filter by report type (legacy reports count as lost)', async () => {
  renderFeed();
  await waitFor(() => expect(cardTitles()).toHaveLength(3));
  fireEvent.click(screen.getByRole('button', { name: 'Found' }));
  expect(cardTitles()).toEqual(['Unknown name']);
  fireEvent.click(screen.getByRole('button', { name: 'Lost' }));
  expect(cardTitles()).toEqual(['Rexy', 'Kitty']);
});

test('My Reports shows only my reports with edit and resolve actions', async () => {
  mockAuth = { user: { id: 'u1', fullName: 'Nimal' }, isAdmin: false, token: 't' };
  renderFeed('/lost-and-found?tab=My');
  await waitFor(() => expect(cardTitles()).toEqual(['Rexy', 'Kitty']));
  expect(screen.getAllByText('Edit')).toHaveLength(2);
  expect(screen.queryByText('Mark In Progress')).not.toBeInTheDocument();

  axios.patch.mockResolvedValue({ data: {} });
  fireEvent.click(screen.getAllByRole('button', { name: 'Mark Resolved' })[0]);
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    '/api/lost-and-found/r1/status', { status: 'Resolved' }, expect.anything()
  ));
});

test('deleting asks for confirmation first', async () => {
  mockAuth = { user: { id: 'u1' }, isAdmin: false, token: 't' };
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  axios.delete.mockResolvedValue({});
  renderFeed('/lost-and-found?tab=My');
  await waitFor(() => expect(cardTitles()).toHaveLength(2));
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
  expect(axios.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
  await waitFor(() => expect(axios.delete).toHaveBeenCalledWith('/api/lost-and-found/r1', expect.anything()));
  confirmSpy.mockRestore();
});

test('admins can mark any open report In Progress and see the match review link', async () => {
  mockAuth = { user: { id: 'admin', isAdmin: true }, isAdmin: true, token: 't' };
  renderFeed();
  await waitFor(() => expect(cardTitles()).toHaveLength(3));
  expect(screen.getByRole('link', { name: 'Review Possible Matches' })).toHaveAttribute('href', '/admin/matches');
  // Rexy and the found report are open; Kitty is already In Progress
  expect(screen.getAllByRole('button', { name: 'Mark In Progress' })).toHaveLength(2);
  expect(screen.queryByText('My Matches')).not.toBeInTheDocument();
});

test('My Matches lists confirmed matches with the other side\'s contact', async () => {
  mockAuth = { user: { id: 'u1' }, isAdmin: false, token: 't' };
  axios.get.mockImplementation((url) => (url === '/api/matches/mine'
    ? Promise.resolve({ data: { matches: [
      { _id: 'm1', role: 'owner', myReport: { petName: 'Rexy' }, reviewNote: 'Same collar',
        other: { species: 'Dog', breed: 'German Shepherd', color: 'Black', location: 'Unawatuna', date: '2026-10-22', contactInfo: 'Finder 0779999999', images: [] } },
      { _id: 'm2', role: 'finder', other: { species: 'Cat', ownerNotified: true } }
    ] } })
    : Promise.resolve({ data: reports })));
  renderFeed('/lost-and-found?tab=matches');
  expect(await screen.findByText(/may be Rexy/)).toBeInTheDocument();
  expect(screen.getByText(/Finder 0779999999/)).toBeInTheDocument();
  expect(screen.getByText('Same collar')).toBeInTheDocument();
  const finderCard = screen.getByText('The pet you found may have an owner').closest('.match-card');
  expect(within(finderCard).getByText(/owner has been given your contact details/i)).toBeInTheDocument();
});

test('shows an empty message for My Matches and an error when the feed fails', async () => {
  mockAuth = { user: { id: 'u1' }, isAdmin: false, token: 't' };
  renderFeed('/lost-and-found?tab=matches');
  expect(await screen.findByText(/No confirmed matches yet/)).toBeInTheDocument();
});

test('shows an error when the feed cannot be loaded', async () => {
  axios.get.mockRejectedValue(new Error('network'));
  renderFeed();
  expect(await screen.findByText('Could not load Lost & Found reports')).toBeInTheDocument();
});
