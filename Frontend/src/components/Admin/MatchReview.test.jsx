import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MatchReview from './MatchReview';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), post: jest.fn() }
}));

const suggested = {
  _id: 'm1',
  status: 'suggested',
  candidateType: 'lost_report',
  score: 82,
  createdAt: '2026-10-22',
  breakdown: { species: 25, breed: 25, colour: 12, distance: 11, time: 9, distanceKm: 3.2, daysApart: 2 },
  ai: { provider: 'none', verdict: null, reasons: ['AI matching is not configured yet'] },
  found: { _id: 'f1', reportType: 'found', petName: 'Unknown', species: 'Dog', breed: 'Labrador', color: 'Yellow', location: 'Galle', date: '2026-10-22', coordinates: { lat: 6.03, lng: 80.21 }, contactInfo: '0771', images: ['data:image/png;base64,AA'], imageCount: 2 },
  lost: { _id: 'l1', reportType: 'lost', petName: 'Goldie', species: 'Dog', breed: 'Labrador', color: 'Golden', location: 'Unawatuna', date: '2026-10-20', reporterName: 'Kamal', contactInfo: '0772', images: [] }
};

const tagMatch = {
  _id: 'm2', status: 'suggested', candidateType: 'registered_pet', score: 100, createdAt: '2026-10-22',
  breakdown: { tagMatch: true },
  found: { _id: 'f2', reportType: 'found', species: 'Cat', images: [] },
  pet: { _id: 'p1', petId: 'PET-001', petName: 'Mimi', species: 'Cat', ownerName: 'Sunil', images: [] }
};

const renderPage = () => render(<MemoryRouter><MatchReview /></MemoryRouter>);

beforeEach(() => {
  axios.get.mockReset();
  axios.patch.mockReset();
  axios.post.mockReset();
  axios.get.mockImplementation((url, config) => {
    if (url === '/api/matches') {
      return Promise.resolve({ data: config.params.status === 'suggested'
        ? { matches: [suggested, tagMatch], counts: { suggested: 2, confirmed: 1 } }
        : { matches: [], counts: { suggested: 2, confirmed: 1 } } });
    }
    return Promise.resolve({ data: { match: { ...suggested, found: { ...suggested.found, images: ['data:image/png;base64,AA', 'data:image/png;base64,BB'] } } } });
  });
});

afterEach(() => jest.restoreAllMocks());

test('lists suggestions with scores, both sides, breakdown and the AI placeholder', async () => {
  renderPage();
  expect(await screen.findByText('82% match')).toBeInTheDocument();
  expect(screen.getByText('To review (2)')).toBeInTheDocument();
  expect(screen.getByText('Confirmed (1)')).toBeInTheDocument();
  expect(screen.getByText('Goldie')).toBeInTheDocument();
  expect(screen.getByText('3.2 km apart')).toBeInTheDocument();
  expect(screen.getByText('Colour 12/20')).toBeInTheDocument();
  expect(screen.getAllByText(/not configured yet/)).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'map' })).toHaveAttribute('href', 'https://www.google.com/maps?q=6.03,80.21');
});

test('a QR tag match shows the registered pet and the tag message', async () => {
  renderPage();
  expect(await screen.findByText('100% match')).toBeInTheDocument();
  expect(screen.getByText('Found pet vs registered pet')).toBeInTheDocument();
  expect(screen.getByText('PET-001')).toBeInTheDocument();
  expect(screen.getByText(/QR tag Pet ID matches/)).toBeInTheDocument();
});

test('confirming sends the decision and note, then shows the server message', async () => {
  jest.spyOn(window, 'prompt').mockReturnValue('Same white patch');
  axios.patch.mockResolvedValue({ data: { message: 'Match confirmed; the owner and finder have been emailed' } });
  renderPage();
  await screen.findByText('82% match');
  fireEvent.click(screen.getAllByRole('button', { name: 'Confirm & notify' })[0]);
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('/api/matches/m1', { decision: 'confirm', note: 'Same white patch' }));
  expect(await screen.findByText(/owner and finder have been emailed/)).toBeInTheDocument();
});

test('cancelling the prompt does not reject the match', async () => {
  jest.spyOn(window, 'prompt').mockReturnValue(null);
  renderPage();
  await screen.findByText('82% match');
  fireEvent.click(screen.getAllByRole('button', { name: 'Not the same pet' })[0]);
  expect(axios.patch).not.toHaveBeenCalled();
});

test('server errors on a decision are shown', async () => {
  jest.spyOn(window, 'prompt').mockReturnValue('');
  axios.patch.mockRejectedValue({ response: { data: { message: 'This match has already been confirmed' } } });
  renderPage();
  await screen.findByText('82% match');
  fireEvent.click(screen.getAllByRole('button', { name: 'Not the same pet' })[0]);
  expect(await screen.findByText('This match has already been confirmed')).toBeInTheDocument();
});

test('re-run and show-all-photos call the right endpoints', async () => {
  axios.post.mockResolvedValue({ data: { message: 'Matching re-run: 1 suggestion(s)' } });
  renderPage();
  await screen.findByText('82% match');
  fireEvent.click(screen.getAllByRole('button', { name: 'Re-run matching' })[0]);
  expect(await screen.findByText('Matching re-run: 1 suggestion(s)')).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith('/api/matches/rerun/f1');

  fireEvent.click(screen.getByRole('button', { name: 'Show all photos' }));
  await waitFor(() => expect(screen.getAllByAltText(/Found pet/)).toHaveLength(2));
  expect(axios.get).toHaveBeenCalledWith('/api/matches/m1');
});

test('other status tabs load their own list', async () => {
  renderPage();
  await screen.findByText('82% match');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmed (1)' }));
  expect(await screen.findByText('No confirmed matches.')).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith('/api/matches', { params: { status: 'confirmed' } });
});
