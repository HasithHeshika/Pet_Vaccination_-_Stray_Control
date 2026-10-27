import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyPets from './MyPets';
import VaccinationSchedule from './VaccinationSchedule';
import axios from '../../api/axios';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() }
}));
jest.mock('../../utils/pdfGenerator', () => ({ generatePetPDF: jest.fn() }));
// A stable object, like the real AuthContext
const mockAuthValue = { user: { id: 'u1', fullName: 'Nimal' }, token: 't' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

const pet = {
  _id: 'p1', petId: 'PET-001', petName: 'Rexy', petType: 'Dog', breed: 'Other', breedOther: 'Mixed',
  age: { years: 3, months: 2 }, gender: 'Male', color: 'Black', weight: 20, qrCode: 'data:image/png;base64,QR',
  photoUrls: ['data:image/png;base64,P1']
};

const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();

beforeEach(() => {
  axios.get.mockReset();
  axios.put.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('MyPets', () => {
  test('lists my pets with their details', async () => {
    axios.get.mockResolvedValue({ data: { pets: [pet] } });
    render(<MyPets />);
    expect(await screen.findByText('Rexy')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/users/u1/pets', expect.anything());
    expect(screen.getByText('PET-001')).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText('3 years 2 months')).toBeInTheDocument();
  });

  test('tells owners with no pets how to register one', async () => {
    axios.get.mockResolvedValue({ data: { pets: [] } });
    render(<MyPets />);
    expect(await screen.findByText(/contact the administrator to register your pet/i)).toBeInTheDocument();
  });

  test('shows the server error when pets cannot be loaded', async () => {
    axios.get.mockRejectedValue({ response: { data: { message: 'Not authorized' } } });
    render(<MyPets />);
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
  });

  test('removing a photo saves the remaining photos', async () => {
    axios.get.mockResolvedValue({ data: { pets: [pet] } });
    axios.put.mockResolvedValue({ data: { pet: { ...pet, photoUrls: [] } } });
    render(<MyPets />);
    fireEvent.click(await screen.findByRole('button', { name: /view details/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    await waitFor(() => expect(axios.put).toHaveBeenCalledWith('/api/pets/p1/photos', { photoUrls: [] }, expect.anything()));
    expect(await screen.findByText('No pet images uploaded yet.')).toBeInTheDocument();
  });
});

describe('VaccinationSchedule', () => {
  const routeGet = (vaccinations) => (url) => {
    if (url === '/api/users/u1/pets') return Promise.resolve({ data: { pets: [pet, { ...pet, _id: 'p2', petName: 'Mimi', petType: 'Cat' }] } });
    if (url === '/api/vaccinations/user/upcoming') return Promise.resolve({ data: { vaccinations } });
    return Promise.resolve({ data: { vaccinations: [] } });
  };

  test('keeps showing "Loading" until the schedule has arrived', async () => {
    let resolveUpcoming;
    axios.get.mockImplementation((url) => (url === '/api/vaccinations/user/upcoming'
      ? new Promise((resolve) => { resolveUpcoming = resolve; })
      : Promise.resolve({ data: { pets: [], vaccinations: [] } })));
    render(<VaccinationSchedule />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('All your pets are up to date.')).not.toBeInTheDocument();
    resolveUpcoming({ data: { vaccinations: [] } });
    expect(await screen.findByText('All your pets are up to date.')).toBeInTheDocument();
  });

  test('shows due and overdue labels and filters by pet', async () => {
    axios.get.mockImplementation(routeGet([
      { _id: 'v1', pet: { _id: 'p1', petName: 'Rexy', petType: 'Dog', breed: 'Mixed' }, vaccineName: 'Rabies', vaccineType: 'Core', nextDueDate: daysFromNow(-3), veterinarianName: 'Dr Silva' },
      { _id: 'v2', pet: { _id: 'p2', petName: 'Mimi', petType: 'Cat', breed: 'Persian' }, vaccineName: 'FVRCP', vaccineType: 'Core', nextDueDate: daysFromNow(5.5), veterinarianName: 'Dr Silva' }
    ]));
    render(<VaccinationSchedule />);
    expect(await screen.findByText('Overdue by 3 days')).toBeInTheDocument();
    expect(screen.getByText('Due in 6 days')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by Pet:'), { target: { value: 'p2' } });
    expect(screen.queryByText('Rabies')).not.toBeInTheDocument();
    expect(screen.getByText('FVRCP')).toBeInTheDocument();
  });
});
