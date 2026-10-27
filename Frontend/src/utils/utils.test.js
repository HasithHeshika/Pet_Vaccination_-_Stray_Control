import { reportTypeOf, speciesLabel, firstPhoto, isSafeImageSrc, SPECIES } from './lostFound';
import { formatDate } from './dateFormat';
import { incidentTypeLabel, urgencyLabel, mapLink, INCIDENT_TYPES } from './incidents';
import { getPetImages, readPetImageFiles, resizeImageDataUrl, MAX_PET_IMAGE_BYTES } from './petImages';
import { validateStep, applicationFromUser, emptyApplication, statusClass } from '../components/Breeder/breederUtils';

describe('lostFound helpers', () => {
  test('species list matches the backend enum', () => {
    expect(SPECIES).toEqual(['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other']);
  });

  test('reportTypeOf prefers reportType and falls back to the legacy status', () => {
    expect(reportTypeOf({ reportType: 'found', status: 'Lost' })).toBe('found');
    expect(reportTypeOf({ status: 'Found' })).toBe('found');
    expect(reportTypeOf({ status: 'In Progress' })).toBe('lost');
    expect(reportTypeOf(undefined)).toBe('lost');
  });

  test('speciesLabel shows the free-text species for "Other"', () => {
    expect(speciesLabel({ species: 'Other', speciesOther: 'Tortoise' })).toBe('Tortoise');
    expect(speciesLabel({ species: 'Other' })).toBe('Other');
    expect(speciesLabel({ species: 'Cat' })).toBe('Cat');
    expect(speciesLabel({})).toBe('');
  });

  test('firstPhoto uses uploaded images before the legacy image link', () => {
    expect(firstPhoto({ images: ['data:image/png;base64,AA'], imageUrl: 'https://x/y.png' })).toBe('data:image/png;base64,AA');
    expect(firstPhoto({ images: [], imageUrl: 'https://x/y.png' })).toBe('https://x/y.png');
    expect(firstPhoto(null)).toBe('');
  });

  test('isSafeImageSrc only allows http(s) and raster data URLs', () => {
    expect(isSafeImageSrc('https://example.com/a.jpg')).toBe(true);
    expect(isSafeImageSrc('data:image/jpeg;base64,AAAA')).toBe(true);
    // eslint-disable-next-line no-script-url -- checks that javascript: links are blocked
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeImageSrc('data:text/html;base64,AAAA')).toBe(false);
    expect(isSafeImageSrc(42)).toBe(false);
  });
});

describe('formatDate', () => {
  test('formats valid dates as YYYY/MM/DD', () => {
    expect(formatDate('2026-10-20T10:00:00Z')).toBe('2026/10/20');
  });

  test('returns the fallback for empty or invalid values', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate('not a date')).toBe('N/A');
    expect(formatDate('', 'Never')).toBe('Never');
  });
});

describe('incident helpers', () => {
  test('violence and sick/injured default to urgent', () => {
    const urgentTypes = INCIDENT_TYPES.filter((t) => t.defaultUrgency === 'urgent').map((t) => t.value);
    expect(urgentTypes).toEqual(['violence', 'sick_injured']);
  });

  test('incidentTypeLabel handles other, missing and unknown types', () => {
    expect(incidentTypeLabel({ incidentType: 'other', otherIncidentType: 'Snake in house' })).toBe('Other: Snake in house');
    expect(incidentTypeLabel({})).toBe('Stray animal');
    expect(incidentTypeLabel({ incidentType: 'unknown' })).toBe('Animal incident');
  });

  test('urgencyLabel falls back to Normal', () => {
    expect(urgencyLabel('emergency')).toBe('Emergency');
    expect(urgencyLabel('bogus')).toBe('Normal');
  });

  test('mapLink only builds a link for finite coordinates', () => {
    expect(mapLink({ lat: 6.9271, lng: 79.8612 })).toBe('https://www.google.com/maps?q=6.9271,79.8612');
    expect(mapLink({ lat: 'x', lng: 1 })).toBe('');
    expect(mapLink(null)).toBe('');
  });
});

describe('pet image helpers', () => {
  test('getPetImages prefers photoUrls, then photoUrl', () => {
    expect(getPetImages({ photoUrls: ['a', 'b'], photoUrl: 'c' })).toEqual(['a', 'b']);
    expect(getPetImages({ photoUrls: [], photoUrl: 'c' })).toEqual(['c']);
    expect(getPetImages({})).toEqual([]);
  });

  test('readPetImageFiles rejects more than two images in total', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await expect(readPetImageFiles([file], 2)).rejects.toThrow('maximum of two images');
  });

  test('readPetImageFiles rejects unsupported types and oversized files', async () => {
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' });
    await expect(readPetImageFiles([gif])).rejects.toThrow('JPEG, PNG, or WebP');

    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: MAX_PET_IMAGE_BYTES + 1 });
    await expect(readPetImageFiles([big])).rejects.toThrow('2 MB or smaller');
  });

  test('readPetImageFiles returns data URLs for valid files', async () => {
    const file = new File(['hello'], 'a.png', { type: 'image/png' });
    const [dataUrl] = await readPetImageFiles([file]);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  test('resizeImageDataUrl returns the original when the image cannot be decoded', async () => {
    const original = 'data:image/png;base64,broken';
    const OriginalImage = global.Image;
    global.Image = class {
      set src(_) { setTimeout(() => this.onerror()); }
    };
    try {
      await expect(resizeImageDataUrl(original)).resolves.toBe(original);
    } finally {
      global.Image = OriginalImage;
    }
  });

  test('resizeImageDataUrl keeps small images unchanged', async () => {
    const original = 'data:image/png;base64,AAAA';
    const OriginalImage = global.Image;
    global.Image = class {
      width = 200;
      height = 100;
      set src(_) { setTimeout(() => this.onload()); }
    };
    try {
      await expect(resizeImageDataUrl(original)).resolves.toBe(original);
    } finally {
      global.Image = OriginalImage;
    }
  });
});

describe('breeder licence helpers', () => {
  const complete = {
    ...emptyApplication,
    breederName: 'Kamal',
    nicOrBusinessRegNo: '901234567V',
    contactNumber: '0771234567',
    email: 'k@example.com',
    address: 'Galle',
    animalTypes: ['Dogs'],
    numberOfAnimals: '3',
    facilityDescription: 'Kennels',
    yearsOfExperience: '0'
  };

  test('step 1 requires all personal details', () => {
    expect(Object.keys(validateStep(1, emptyApplication)).sort()).toEqual(
      ['address', 'breederName', 'contactNumber', 'email', 'nicOrBusinessRegNo']
    );
    expect(validateStep(1, complete)).toEqual({});
  });

  test('step 2 validates animal types, counts and experience', () => {
    expect(validateStep(2, complete)).toEqual({});
    const errors = validateStep(2, { ...complete, animalTypes: [], numberOfAnimals: '0', yearsOfExperience: '-1', facilityDescription: ' ' });
    expect(Object.keys(errors).sort()).toEqual(['animalTypes', 'facilityDescription', 'numberOfAnimals', 'yearsOfExperience']);
  });

  test('applicationFromUser prefills from the profile and joins the address', () => {
    const app = applicationFromUser({
      fullName: 'Nimal', nicNumber: '123V', phone: '077', email: 'n@x.com',
      address: { street: '1 Main St', city: 'Galle', province: '', postalCode: '80000' }
    });
    expect(app).toMatchObject({ breederName: 'Nimal', nicOrBusinessRegNo: '123V', contactNumber: '077', email: 'n@x.com', address: '1 Main St, Galle, 80000' });
    expect(applicationFromUser(null).breederName).toBe('');
  });

  test('statusClass lower-cases the status', () => {
    expect(statusClass('Approved')).toBe('status-pill approved');
    expect(statusClass()).toBe('status-pill ');
  });
});
