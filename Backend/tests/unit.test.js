// Unit tests for pure helpers (no database or server needed). Run with:  npm run test:unit
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { scoreAgainstLost, scoreAgainstPet, haversineKm, imagesOfReport, imagesOfPet } = require('../services/matching/matchService');
const { validateImage, validateUploadedImage, MAX_IMAGE_SIZE } = require('../utils/imageValidation');
const { formatDate } = require('../utils/dateFormatter');
const { getFrontendUrl } = require('../utils/frontendUrl');
const rateLimit = require('../middleware/rateLimit');
const { getProvider } = require('../services/matching/aiProviders');

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const day = (offset) => new Date(Date.UTC(2026, 9, 20 + offset));
const report = (overrides = {}) => ({
  species: 'Dog', breed: 'Labrador', color: 'Golden brown',
  lastSeenDate: day(0), coordinates: { lat: 6.0535, lng: 80.2210 }, // Galle
  ...overrides
});

describe('match scoring: found report vs lost report', () => {
  test('identical animal seen at the same place and day scores 100', () => {
    const { score, breakdown } = scoreAgainstLost(report(), report());
    assert.equal(score, 100);
    assert.deepEqual(
      [breakdown.species, breakdown.breed, breakdown.colour, breakdown.distance, breakdown.time],
      [25, 25, 20, 15, 15]
    );
    assert.equal(breakdown.distanceKm, 0);
    assert.equal(breakdown.tagMatch, false);
  });

  test('different species gets no species points', () => {
    const { breakdown } = scoreAgainstLost(report(), report({ species: 'Cat' }));
    assert.equal(breakdown.species, 0);
  });

  test('species and breed comparisons ignore case and spacing', () => {
    const { breakdown } = scoreAgainstLost(report({ species: 'dog', breed: ' labrador ' }), report());
    assert.equal(breakdown.species, 25);
    assert.equal(breakdown.breed, 25);
  });

  test('"Other" species and breed use the free-text values', () => {
    const found = report({ species: 'Other', speciesOther: 'Tortoise', breed: 'Other', breedOther: 'Star' });
    const lost = report({ species: 'Other', speciesOther: 'tortoise', breed: 'Other', breedOther: 'star' });
    const { breakdown } = scoreAgainstLost(found, lost);
    assert.equal(breakdown.species, 25);
    assert.equal(breakdown.breed, 25);
  });

  test('partial breed names score partially; unknown breeds are neutral', () => {
    assert.equal(scoreAgainstLost(report({ breed: 'Labrador Retriever' }), report()).breakdown.breed, 18);
    assert.equal(scoreAgainstLost(report({ breed: 'Unknown' }), report()).breakdown.breed, 8);
    assert.equal(scoreAgainstLost(report({ breed: 'Poodle' }), report()).breakdown.breed, 0);
  });

  test('breed text with no letters counts as unknown, not as a partial match of every breed', () => {
    // "123" cleans to an empty string, and "" is contained in every string
    assert.equal(scoreAgainstLost(report({ breed: '123' }), report()).breakdown.breed, 8);
    // Fragments shorter than 3 letters are not partial matches either
    assert.equal(scoreAgainstLost(report({ breed: 'La' }), report()).breakdown.breed, 0);
  });

  test('colour score is the share of colour words in common', () => {
    assert.equal(scoreAgainstLost(report({ color: 'black and white' }), report({ color: 'white' })).breakdown.colour, 10);
    assert.equal(scoreAgainstLost(report({ color: 'Black' }), report({ color: 'brown' })).breakdown.colour, 0);
    assert.equal(scoreAgainstLost(report({ color: 'not sure' }), report()).breakdown.colour, 5);
  });

  test('distance bands: <=1, <=5, <=10 and further', () => {
    const at = (lat, lng) => report({ coordinates: { lat, lng } });
    const base = at(6.0535, 80.2210);
    assert.equal(scoreAgainstLost(base, at(6.0580, 80.2210)).breakdown.distance, 15); // ~0.5 km
    assert.equal(scoreAgainstLost(base, at(6.0835, 80.2210)).breakdown.distance, 11); // ~3.3 km
    assert.equal(scoreAgainstLost(base, at(6.1235, 80.2210)).breakdown.distance, 7); //  ~7.8 km
    assert.equal(scoreAgainstLost(base, at(6.1835, 80.2210)).breakdown.distance, 3); // ~14.5 km
  });

  test('missing coordinates give a neutral distance score', () => {
    const { breakdown } = scoreAgainstLost(report({ coordinates: undefined }), report());
    assert.equal(breakdown.distance, 5);
    assert.equal(breakdown.distanceKm, null);
  });

  test('time bands use whole days between the two dates', () => {
    const time = (offset) => scoreAgainstLost(report({ lastSeenDate: day(offset) }), report()).breakdown.time;
    assert.deepEqual([time(1), time(3), time(7), time(14), time(20)], [15, 12, 9, 6, 3]);
  });
});

describe('match scoring: found report vs registered pet', () => {
  const pet = { petId: 'PET-ABC123', petType: 'Dog', breed: 'Labrador', color: 'Golden brown' };

  test('a matching collar-tag Pet ID is a certain match (100), whatever the description', () => {
    const { score, breakdown } = scoreAgainstPet(report({ tagPetId: 'pet-abc123', species: 'Cat' }), pet);
    assert.equal(score, 100);
    assert.equal(breakdown.tagMatch, true);
  });

  test('without a tag, location and time are unknown and score neutrally', () => {
    const { score, breakdown } = scoreAgainstPet(report(), pet);
    assert.equal(breakdown.distance, 5);
    assert.equal(breakdown.time, 5);
    assert.equal(score, 25 + 25 + 20 + 5 + 5);
  });

  test('a different tag Pet ID is not a tag match', () => {
    assert.equal(scoreAgainstPet(report({ tagPetId: 'PET-OTHER' }), pet).breakdown.tagMatch, false);
  });
});

describe('match helpers', () => {
  test('haversine distance Galle to Colombo is about 105 km', () => {
    const km = haversineKm({ lat: 6.0535, lng: 80.2210 }, { lat: 6.9271, lng: 79.8612 });
    assert.ok(km > 100 && km < 110, `got ${km}`);
    assert.equal(haversineKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }), 0);
  });

  test('report and pet photo lists include legacy single-photo fields', () => {
    assert.deepEqual(imagesOfReport({ images: ['a'], imageUrl: 'b' }), ['a', 'b']);
    assert.deepEqual(imagesOfReport({}), []);
    assert.deepEqual(imagesOfPet({ photoUrls: ['x', 'y'], photoUrl: 'z' }), ['x', 'y']);
    assert.deepEqual(imagesOfPet({ photoUrl: 'z' }), ['z']);
    assert.deepEqual(imagesOfPet({}), []);
  });

  test('the default AI provider is "none" and gives no verdict', async () => {
    const provider = getProvider();
    assert.equal(provider.name, 'none');
    const result = await provider.compare({ found: {}, candidate: {}, candidateType: 'lost_report' });
    assert.equal(result.verdict, null);
    assert.equal(result.score, null);
  });
});

describe('image validation', () => {
  test('accepts JPEG/PNG/WebP data URLs and http(s) links', () => {
    assert.equal(validateImage(PNG_1PX), true);
    assert.equal(validateImage('https://example.com/dog.jpg'), true);
  });

  test('rejects other types, scripts and non-strings', () => {
    assert.throws(() => validateImage('data:image/svg+xml;base64,PHN2Zz4='), /JPEG, PNG, or WebP/);
    assert.throws(() => validateImage('javascript:alert(1)'), /JPEG, PNG, or WebP/);
    assert.throws(() => validateImage({ url: PNG_1PX }), /JPEG, PNG, or WebP/);
    assert.throws(() => validateImage(null), /JPEG, PNG, or WebP/);
  });

  test('rejects images over 2 MB', () => {
    const big = `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_IMAGE_SIZE + 10) / 3) * 4)}`;
    assert.throws(() => validateImage(big), /2 MB or smaller/);
  });

  test('public uploads must be files, not links', () => {
    assert.throws(() => validateUploadedImage('https://example.com/dog.jpg'), /files rather than links/);
    assert.equal(validateUploadedImage(PNG_1PX), true);
  });
});

describe('preview photos for list views', () => {
  const { makeThumbnail } = require('../utils/thumbnail');
  const sharp = require('sharp');

  test('a large photo becomes a WebP of at most 320 px and a few KB', async () => {
    const big = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 200, g: 120, b: 40 } } })
      .jpeg({ quality: 90 }).toBuffer();
    const thumb = await makeThumbnail(`data:image/jpeg;base64,${big.toString('base64')}`);
    assert.match(thumb, /^data:image\/webp;base64,/);
    const meta = await sharp(Buffer.from(thumb.split(',')[1], 'base64')).metadata();
    assert.equal(meta.width, 320);
    assert.equal(meta.height, 240);
    assert.ok(thumb.length < 20 * 1024, `thumbnail is ${thumb.length} bytes`);
  });

  test('small photos are not enlarged', async () => {
    const meta = await sharp(Buffer.from((await makeThumbnail(PNG_1PX)).split(',')[1], 'base64')).metadata();
    assert.equal(meta.width, 1);
  });

  test('links, missing photos and corrupt data give no preview (lists fall back to the photo)', async () => {
    assert.equal(await makeThumbnail('https://example.com/dog.jpg'), null);
    assert.equal(await makeThumbnail(undefined), null);
    assert.equal(await makeThumbnail('data:image/png;base64,AAAA'), null);
  });
});

describe('formatting and configuration helpers', () => {
  test('formatDate gives YYYY/MM/DD and a fallback for missing or invalid dates', () => {
    assert.equal(formatDate('2026-10-27T10:00:00Z'), '2026/10/27');
    assert.equal(formatDate(null), 'N/A');
    assert.equal(formatDate('not a date', '-'), '-');
  });

  test('frontend URL comes from FRONTEND_URL without a trailing slash', () => {
    const saved = process.env.FRONTEND_URL;
    try {
      process.env.FRONTEND_URL = 'http://localhost:3000///';
      assert.equal(getFrontendUrl(), 'http://localhost:3000');
      delete process.env.FRONTEND_URL;
      assert.match(getFrontendUrl(), /^https:\/\/.+azurestaticapps\.net$/);
    } finally {
      if (saved === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = saved;
    }
  });
});

describe('rate limiter', () => {
  const fakeRes = () => {
    const listeners = {};
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      on(event, fn) { listeners[event] = fn; },
      finish() { listeners.finish?.(); }
    };
    return res;
  };
  const hit = (limiter, ip = '203.0.113.5', status = 200) => {
    const res = fakeRes();
    let passed = false;
    limiter({ ip, socket: {} }, res, () => { passed = true; });
    res.statusCode = passed ? status : res.statusCode;
    res.finish();
    return { passed, res };
  };

  test('blocks after the limit with 429 and Retry-After', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2, message: 'slow down' });
    assert.equal(hit(limiter).passed, true);
    assert.equal(hit(limiter).passed, true);
    const third = hit(limiter);
    assert.equal(third.passed, false);
    assert.equal(third.res.statusCode, 429);
    assert.equal(third.res.body.message, 'slow down');
    assert.ok(Number(third.res.headers['Retry-After']) > 0);
  });

  test('limits are per client, and an address with a port counts as the same client', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1 });
    assert.equal(hit(limiter, '203.0.113.5').passed, true);
    assert.equal(hit(limiter, '203.0.113.5:4444').passed, false);
    assert.equal(hit(limiter, '198.51.100.7').passed, true);
  });

  test('with skipSuccessfulRequests only failures count', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2, skipSuccessfulRequests: true });
    for (let i = 0; i < 5; i += 1) assert.equal(hit(limiter, '192.0.2.1', 200).passed, true);
    assert.equal(hit(limiter, '192.0.2.1', 400).passed, true);
    assert.equal(hit(limiter, '192.0.2.1', 400).passed, true);
    assert.equal(hit(limiter, '192.0.2.1', 400).passed, false);
  });
});
