import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ApplyLicense from './ApplyLicense';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
// A stable object, like the real AuthContext (a new user object on every render would loop the prefill effect)
const mockAuthValue = {
  user: { fullName: 'Kamal Perera', nicNumber: '901234567V', phone: '0771234567', email: 'kamal@example.com', address: { street: '1 Main St', city: 'Galle' } }
};
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

const renderWizard = () => render(
  <MemoryRouter initialEntries={['/breeder/apply']}>
    <Routes>
      <Route path="/breeder/apply" element={<ApplyLicense />} />
      <Route path="/breeder/applications" element={<div>Applications page</div>} />
    </Routes>
  </MemoryRouter>
);

const continueButton = () => screen.getByRole('button', { name: 'Continue' });

beforeEach(() => axios.post.mockReset());

test('step 1 is prefilled from the profile and blocks empty required fields', () => {
  renderWizard();
  expect(screen.getByLabelText('Breeder name')).toHaveValue('Kamal Perera');
  expect(screen.getByLabelText('Address')).toHaveValue('1 Main St, Galle');

  fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: ' ' } });
  fireEvent.click(continueButton());
  expect(screen.getByText('Contact number is required')).toBeInTheDocument();
  expect(screen.getByLabelText('Breeder name')).toBeInTheDocument();
});

test('step 2 requires animal types, a positive count and a facility description', () => {
  renderWizard();
  fireEvent.click(continueButton());
  fireEvent.click(continueButton());
  expect(screen.getByText('Select at least one animal type')).toBeInTheDocument();
  expect(screen.getByText('Enter a valid number of animals')).toBeInTheDocument();
  expect(screen.getByText('Facility description is required')).toBeInTheDocument();
  expect(screen.getByText('Enter years of experience')).toBeInTheDocument();
});

test('a complete application is submitted and opens Application Status', async () => {
  axios.post.mockResolvedValue({ data: {} });
  renderWizard();
  fireEvent.click(continueButton());

  fireEvent.click(screen.getAllByRole('button').find((b) => /^dogs?$/i.test(b.textContent.trim())));
  fireEvent.change(screen.getByLabelText('Number of animals'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Facility description'), { target: { value: 'Clean kennels with runs' } });
  fireEvent.click(continueButton());
  fireEvent.click(continueButton());

  fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));
  expect(await screen.findByText('Applications page')).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith('/api/licenses/apply', expect.objectContaining({
    breederName: 'Kamal Perera', numberOfAnimals: '4', facilityDescription: 'Clean kennels with runs', saveAsDraft: false
  }));
  expect(axios.post.mock.calls[0][1].animalTypes).toHaveLength(1);
});

test('jumping straight to the review step still cannot submit an incomplete application', async () => {
  renderWizard();
  fireEvent.click(screen.getByRole('button', { name: /review and submit/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));
  expect(await screen.findByText('Please complete the required fields before submitting.')).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test('a draft can be saved even when incomplete, and server errors are shown', async () => {
  axios.post.mockRejectedValue({ response: { data: { message: 'You already have a pending application' } } });
  renderWizard();
  fireEvent.click(screen.getByRole('button', { name: /review and submit/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/licenses/apply', expect.objectContaining({ saveAsDraft: true })));
  expect(await screen.findByText('You already have a pending application')).toBeInTheDocument();
});
