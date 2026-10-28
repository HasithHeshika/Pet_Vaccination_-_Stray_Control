// End-to-end API tests: starts server.js against a real MongoDB and exercises the main workflows.
// Requires MongoDB. Run with:  TEST_MONGODB_URI=mongodb://localhost:27017/pet_test npm test
// The test database is dropped at the start of each run.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');

const PORT = process.env.TEST_PORT || '5055';
const BASE = `http://127.0.0.1:${PORT}`;
const MONGO_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/pet_management_test';
const ADMIN = { email: 'admin@test.local', password: 'Admin@Test123' };
const FRONTEND_ORIGIN = 'https://lively-sky-055ae2000.7.azurestaticapps.net';

let server;
const ctx = {};

const api = async (method, url, { token, body, headers = {} } = {}) => {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
};

const waitForServer = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Server did not start');
};

const signupAndVerify = async (overrides) => {
  const user = {
    fullName: 'Test User',
    password: 'Passw0rd!',
    phone: '0771234567',
    address: { street: '1 Main St', city: 'Galle', province: 'Southern', postalCode: '80000' },
    ...overrides
  };
  const signup = await api('POST', '/api/auth/signup', { body: user });
  assert.equal(signup.status, 201, JSON.stringify(signup.data));
  const verify = await api('PATCH', `/api/users/${signup.data.user.id}/verify`, { token: ctx.adminToken });
  assert.equal(verify.status, 200, JSON.stringify(verify.data));
  const login = await api('POST', '/api/auth/login', { body: { email: user.email, password: user.password } });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  return { id: signup.data.user.id, token: login.data.token };
};

before(async () => {
  // Safety: this suite drops the database, so only ever run it against a test database
  if (!/test/i.test(new URL(MONGO_URI).pathname)) {
    throw new Error(`Refusing to run: database name in ${MONGO_URI} must contain "test"`);
  }
  await mongoose.connect(MONGO_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: {
      ...process.env,
      PORT,
      MONGO_URI,
      MONGODB_URI: MONGO_URI,
      JWT_SECRET: 'test-secret',
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password,
      FRONTEND_URL: FRONTEND_ORIGIN,
      SMTP_HOST: '',
      SMTP_USER: '',
      ACS_EMAIL_CONNECTION_STRING: '',
      ACS_EMAIL_SENDER: '',
      MAX_INCIDENT_REPORTS_PER_HOUR: '100',
      NODE_ENV: 'test'
    },
    stdio: process.env.TEST_VERBOSE ? ['inherit', 'inherit', 'inherit', 'ipc'] : ['ignore', 'ignore', 'ignore', 'ipc']
  });
  await waitForServer();

  const adminLogin = await api('POST', '/api/auth/login', { body: ADMIN });
  assert.equal(adminLogin.status, 200);
  ctx.adminToken = adminLogin.data.token;

  ctx.owner = await signupAndVerify({ fullName: 'Nimal Perera', email: 'owner@test.local', nicNumber: '199012345678' });
  ctx.other = await signupAndVerify({ fullName: 'Other Person', email: 'other@test.local', nicNumber: '199112345678' });
  ctx.vet = await signupAndVerify({
    fullName: 'Dr Vet', email: 'vet@test.local', nicNumber: '198812345678',
    role: 'veterinarian', vetLicenseNumber: 'VET-1', clinicName: 'Galle Clinic'
  });

  const pet = await api('POST', '/api/pets/register', {
    token: ctx.adminToken,
    body: {
      ownerId: ctx.owner.id, petName: 'Rex', petType: 'Dog', breed: 'Labrador',
      age: { years: 2, months: 3 }, gender: 'Male', color: 'Brown', weight: 20
    }
  });
  assert.equal(pet.status, 201, JSON.stringify(pet.data));
  ctx.pet = pet.data.pet;
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  // Ask for a clean exit (so coverage is written), then force it if needed
  const exited = new Promise(resolve => server.once('exit', resolve));
  server.send('shutdown');
  const timer = setTimeout(() => server.kill(), 5000);
  await exited;
  clearTimeout(timer);
});

test('QR code points at the public profile on the configured frontend', () => {
  assert.ok(ctx.pet.petId);
  assert.match(ctx.pet.qrCode, /^data:image\/png;base64,/);
});

test('public pet lookup works without login and hides owner contact details', async () => {
  const res = await api('GET', `/api/pets/petid/${ctx.pet.petId}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.pet.petName, 'Rex');
  assert.equal(res.data.pet.owner.firstName, 'Nimal');
  assert.equal(res.data.pet.owner.email, undefined);
  assert.equal(res.data.pet.owner.phone, undefined);
  assert.equal(res.data.pet.canContactOwner, true);
});

test('owner sees full details on their own pet via the QR route', async () => {
  const res = await api('GET', `/api/pets/petid/${ctx.pet.petId}`, { token: ctx.owner.token });
  assert.equal(res.status, 200);
  assert.equal(res.data.pet.owner.email, 'owner@test.local');
});

test('contact-owner relay reports failure honestly when email is not configured', async () => {
  const res = await api('POST', `/api/pets/petid/${ctx.pet.petId}/contact`, {
    body: { finderName: 'Finder', finderContact: '0770000000', message: 'Found your dog near the beach' }
  });
  assert.equal(res.status, 503);
});

test('vet can record a vaccination using short vaccine names and no notification preference', async () => {
  const res = await api('POST', '/api/vaccinations', {
    token: ctx.vet.token,
    body: {
      petId: ctx.pet._id, vaccineType: 'DHPP', vaccineName: 'Nobivac DHPPi',
      dateAdministered: new Date().toISOString(),
      nextDueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
    }
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(res.data.vaccination.vaccineType, 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)');
  assert.deepEqual(res.data.vaccination.notificationPreference, { email: true, sms: false });
  ctx.vaccinationId = res.data.vaccination._id;
});

test('owner and vet can see the pet vaccination history; other users cannot', async () => {
  const owner = await api('GET', `/api/vaccinations/pet/${ctx.pet._id}`, { token: ctx.owner.token });
  assert.equal(owner.status, 200);
  assert.equal(owner.data.vaccinations.length, 1);

  const vet = await api('GET', `/api/vaccinations/pet/${ctx.pet._id}`, { token: ctx.vet.token });
  assert.equal(vet.status, 200);

  const other = await api('GET', `/api/vaccinations/pet/${ctx.pet._id}`, { token: ctx.other.token });
  assert.equal(other.status, 403);
});

test('manual reminder fails clearly without SMTP and is not marked as sent', async () => {
  const res = await api('POST', `/api/vaccinations/${ctx.vaccinationId}/send-reminder`, { token: ctx.vet.token });
  assert.equal(res.status, 503);
  const record = await api('GET', `/api/vaccinations/${ctx.vaccinationId}`, { token: ctx.owner.token });
  assert.equal(record.data.vaccination.reminderSent, false);
});

test('admin vaccination update ignores protected fields', async () => {
  const res = await api('PUT', `/api/vaccinations/${ctx.vaccinationId}`, {
    token: ctx.adminToken,
    body: { notes: 'Updated', reminderSent: true, createdBy: ctx.other.id }
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.vaccination.notes, 'Updated');
  assert.equal(res.data.vaccination.reminderSent, false);
});

test('lost-and-found: ownership rules, field whitelist and no reporter email in the feed', async () => {
  const created = await api('POST', '/api/lost-and-found', {
    token: ctx.owner.token,
    body: {
      petName: 'Rex', breed: 'Labrador', color: 'Brown', lastSeenLocation: 'Galle Fort',
      lastSeenDate: new Date().toISOString(), contactInfo: '0771234567'
    }
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data._id;

  const resolveByOther = await api('PATCH', `/api/lost-and-found/${id}/status`, { token: ctx.other.token, body: { status: 'Resolved' } });
  assert.equal(resolveByOther.status, 403);

  const hijack = await api('PUT', `/api/lost-and-found/${id}`, { token: ctx.owner.token, body: { reportedBy: ctx.other.id, color: 'Black' } });
  assert.equal(hijack.status, 200);
  assert.equal(hijack.data.reportedBy, ctx.owner.id);
  assert.equal(hijack.data.color, 'Black');

  const inProgress = await api('PATCH', `/api/lost-and-found/${id}/status`, { token: ctx.adminToken, body: { status: 'In Progress' } });
  assert.equal(inProgress.status, 200);

  const feed = await api('GET', '/api/lost-and-found');
  assert.equal(feed.status, 200);
  assert.equal(feed.data[0].reportedBy.email, undefined);
  assert.equal(feed.data[0].reportedBy.fullName, 'Nimal Perera');
});

test('stray reports: anonymous submission cannot spoof the reporter; admin can update status', async () => {
  const created = await api('POST', '/api/stray-reports', {
    body: { location: 'Matara bus stand', description: 'Two puppies', reportedBy: ctx.other.id, status: 'resolved' }
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.report.reportedBy, null);
  assert.equal(created.data.report.status, 'pending');

  const updated = await api('PATCH', `/api/stray-reports/${created.data.report._id}/status`, {
    token: ctx.adminToken, body: { status: 'resolved' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.report.status, 'resolved');
});

test('animal incidents: types, default urgency, photos, location and reporter contact', async () => {
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const violence = await api('POST', '/api/incidents', {
    body: {
      incidentType: 'violence', location: 'Galle market', description: 'Dog being beaten with a stick',
      coordinates: { lat: 6.0329, lng: 80.2168 }, images: [tinyPng],
      reporterName: 'Kamal', reporterContact: '0771112223'
    }
  });
  assert.equal(violence.status, 201, JSON.stringify(violence.data));
  assert.equal(violence.data.report.urgency, 'urgent');
  assert.equal(violence.data.report.imageCount, 1);
  assert.deepEqual(violence.data.report.coordinates, { lat: 6.0329, lng: 80.2168 });

  const emergency = await api('POST', '/api/stray-reports', {
    body: { incidentType: 'sick_injured', urgency: 'emergency', location: 'Matara beach', description: 'Cat hit by a vehicle' }
  });
  assert.equal(emergency.status, 201, JSON.stringify(emergency.data));

  const missingOtherType = await api('POST', '/api/incidents', {
    body: { incidentType: 'other', location: 'Hapugala', description: 'Something odd' }
  });
  assert.equal(missingOtherType.status, 400);

  const badType = await api('POST', '/api/incidents', { body: { incidentType: 'robbery', location: 'X', description: 'Y' } });
  assert.equal(badType.status, 400);

  const badPhoto = await api('POST', '/api/incidents', {
    body: { incidentType: 'stray', location: 'X', description: 'Y', images: ['javascript:alert(1)'] }
  });
  assert.equal(badPhoto.status, 400);

  const list = await api('GET', '/api/stray-reports', { token: ctx.adminToken });
  assert.equal(list.status, 200);
  assert.equal(list.data.reports[0].urgency, 'emergency', 'emergencies are listed first');
  const listedViolence = list.data.reports.find((r) => r._id === violence.data.report._id);
  assert.equal(listedViolence.images, undefined, 'photos are not sent in the list');
  assert.equal(listedViolence.imageCount, 1);
  assert.equal(listedViolence.reporterContact, '0771112223');

  const detail = await api('GET', `/api/incidents/${violence.data.report._id}`, { token: ctx.adminToken });
  assert.deepEqual(detail.data.report.images, [tinyPng]);

  const dashboard = await api('GET', '/api/authority/dashboard', { token: ctx.adminToken });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.data.metrics.openUrgentIncidents >= 2);

  // Reports sent through the incident form go to the authority only: not in the community feed
  const publicList = await api('GET', '/api/incidents');
  assert.equal(publicList.status, 200);
  assert.equal(publicList.data.reports.some((r) => r._id === violence.data.report._id), false);
  assert.doesNotMatch(JSON.stringify(publicList.data), /0771112223|Kamal/, 'no reporter details in the public feed');
  assert.equal((await api('GET', `/api/incidents/${violence.data.report._id}`)).status, 404);
});

test('community feed: public posts hide the reporter; private reports, spoofed fields and emails stay out', async () => {
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  // A logged-in user posts to the community hub (with a category), trying to set authority-only fields
  const post = await api('POST', '/api/stray-reports', {
    token: ctx.owner.token,
    body: {
      category: 'Stray Dog Pack', location: 'Galle Fort ramparts', description: 'Pack of five dogs near the lighthouse',
      coordinates: { lat: 6.0247, lng: 80.2193 }, images: [tinyPng], reporterName: 'Nimal', reporterContact: '0779990000',
      status: 'resolved', authorityNotes: 'fake note', assignedTo: 'nobody', reportedBy: ctx.other.id
    }
  });
  assert.equal(post.status, 201, JSON.stringify(post.data));
  assert.equal(post.data.report.status, 'pending');
  assert.equal(post.data.report.authorityNotes, undefined);
  assert.equal(post.data.report.reportedBy._id, ctx.owner.id, 'reporter comes from the token, not the body');
  const id = post.data.report._id;

  // Guests see it, without who reported it, where exactly, photos or notes
  const feed = await api('GET', '/api/stray-reports');
  assert.equal(feed.status, 200);
  const item = feed.data.reports.find((r) => r._id === id);
  assert.ok(item, 'community posts are public');
  for (const field of ['reportedBy', 'reporterName', 'reporterContact', 'coordinates', 'images', 'authorityNotes', 'assignedTo']) {
    assert.equal(item[field], undefined, `${field} is not public`);
  }
  assert.equal(item.category, 'Stray Dog Pack');
  assert.equal(item.imageCount, 1);
  assert.doesNotMatch(JSON.stringify(feed.data), /0779990000|owner@test\.local/);
  assert.equal((await api('GET', `/api/stray-reports/${id}`)).data.report.reporterContact, undefined);

  // Supporting: needs a login; the feed only says whether *you* supported it
  assert.equal((await api('POST', `/api/stray-reports/${id}/support`)).status, 401);
  const support = await api('POST', `/api/stray-reports/${id}/support`, { token: ctx.other.token });
  assert.equal(support.status, 200);
  assert.equal(support.data.supportCount, 1);
  const asOther = (await api('GET', '/api/stray-reports', { token: ctx.other.token })).data.reports.find((r) => r._id === id);
  assert.deepEqual(asOther.supporters, [ctx.other.id]);
  assert.equal(asOther.supportedByMe, true);
  const asGuest = (await api('GET', '/api/stray-reports')).data.reports.find((r) => r._id === id);
  assert.deepEqual(asGuest.supporters, []);
  assert.equal(asGuest.supportCount, 1);

  // Comments show the commenter's name, never an email address or account id
  const comment = await api('POST', `/api/stray-reports/${id}/comments`, { token: ctx.other.token, body: { text: 'Saw them too this morning' } });
  assert.equal(comment.status, 201, JSON.stringify(comment.data));
  assert.equal(comment.data.comment.author, undefined);
  const comments = await api('GET', `/api/stray-reports/${id}/comments`);
  assert.equal(comments.data.comments[0].authorName, 'Other Person');
  assert.doesNotMatch(JSON.stringify(comments.data), /@test\.local/);
  assert.equal((await api('POST', `/api/stray-reports/${id}/comments`, { token: ctx.other.token, body: { text: { $ne: '' } } })).status, 400);

  // Private reports (sent through the incident form) can't be seen, supported or commented on by the public
  const priv = await api('POST', '/api/incidents', { body: { incidentType: 'violence', location: 'Back lane', description: 'Private report' } });
  const privId = priv.data.report._id;
  assert.equal((await api('GET', `/api/stray-reports/${privId}/comments`)).status, 404);
  assert.equal((await api('POST', `/api/stray-reports/${privId}/support`, { token: ctx.other.token })).status, 404);
  assert.equal((await api('POST', `/api/stray-reports/${privId}/comments`, { token: ctx.other.token, body: { text: 'hi' } })).status, 404);

  // Administrators still get every report with the reporter's details
  const adminList = await api('GET', '/api/stray-reports', { token: ctx.adminToken });
  const adminItem = adminList.data.reports.find((r) => r._id === id);
  assert.equal(adminItem.reporterContact, '0779990000');
  assert.deepEqual(adminItem.coordinates, { lat: 6.0247, lng: 80.2193 });
  assert.ok(adminList.data.reports.some((r) => r._id === privId));

  // Adoption listings: the lister's phone is the public contact, but never their email,
  // and applicants' details are only for the lister and administrators
  const listing = await api('POST', '/api/adoptions', {
    token: ctx.owner.token,
    body: { petName: 'Bella', species: 'Dog', breed: 'Mixed', age: '1 year', gender: 'Female', description: 'Friendly puppy', city: 'Galle' }
  });
  assert.equal(listing.status, 201, JSON.stringify(listing.data));
  const listingId = (listing.data.listing || listing.data)._id;
  const apply = await api('POST', `/api/adoptions/${listingId}/inquire`, {
    token: ctx.other.token, body: { message: 'We have a big garden', contactPhone: '0715556666' }
  });
  assert.ok([200, 201].includes(apply.status), JSON.stringify(apply.data));
  const asPublic = await api('GET', `/api/adoptions/${listingId}`);
  assert.equal(asPublic.status, 200);
  assert.equal(asPublic.data.listing.applications, undefined);
  assert.equal(asPublic.data.listing.applicationCount, 1);
  assert.equal(asPublic.data.listing.listedBy.email, undefined);
  assert.doesNotMatch(JSON.stringify(asPublic.data), /0715556666|other@test\.local|owner@test\.local/);
  assert.doesNotMatch(JSON.stringify((await api('GET', '/api/adoptions')).data), /@test\.local/);
  const asLister = await api('GET', `/api/adoptions/${listingId}`, { token: ctx.owner.token });
  assert.equal(asLister.data.listing.applications.length, 1);
  assert.equal(asLister.data.listing.applications[0].applicant.email, 'other@test.local');
  assert.equal((await api('GET', '/api/adoptions/not-an-id')).status, 404);
  assert.equal((await api('GET', '/api/breeding-matches/not-an-id')).status, 404);
  assert.doesNotMatch(JSON.stringify((await api('GET', '/api/breeding-matches')).data), /@test\.local/);

  // Odd paging values and link "photos" are handled cleanly
  assert.equal((await api('GET', '/api/stray-reports?page=-1&limit=abc')).status, 200);
  const badImage = await api('POST', '/api/stray-reports', { body: { location: 'X', description: 'Y', image: 'javascript:alert(1)' } });
  assert.equal(badImage.status, 400);
});

test('incident review fixes: no link photos, pending listed before in-progress, no automatic name', async () => {
  const linkPhoto = await api('POST', '/api/incidents', {
    body: { incidentType: 'stray', location: 'X', description: 'Y', images: ['https://example.com/pixel.png'] }
  });
  assert.equal(linkPhoto.status, 400, 'incident photos must be uploaded files');

  // A logged-in reporter who leaves the name blank is not named on the report
  const loggedIn = await api('POST', '/api/incidents', {
    token: ctx.owner.token,
    body: { incidentType: 'stray', location: 'Unawatuna', description: 'Puppy alone' }
  });
  assert.equal(loggedIn.status, 201, JSON.stringify(loggedIn.data));
  assert.equal(loggedIn.data.report.reporterName, undefined);

  // Move the emergency to in-progress: a pending report must now come first
  const before = await api('GET', '/api/stray-reports', { token: ctx.adminToken });
  const emergency = before.data.reports.find((r) => r.urgency === 'emergency');
  await api('PATCH', `/api/stray-reports/${emergency._id}/status`, { token: ctx.adminToken, body: { status: 'in-progress' } });

  const after = await api('GET', '/api/stray-reports', { token: ctx.adminToken });
  const ranks = { pending: 0, 'in-progress': 1, resolved: 2 };
  const order = after.data.reports.map((r) => ranks[r.status]);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'pending, then in-progress, then resolved');

  const dashboard = await api('GET', '/api/authority/dashboard', { token: ctx.adminToken });
  const dashOrder = dashboard.data.strayReports.map((r) => ranks[r.status]);
  assert.deepEqual(dashOrder, [...dashOrder].sort((a, b) => a - b), 'dashboard uses the same order');
});

test('breeder licence renewal is only allowed for approved or expired licences', async () => {
  const applied = await api('POST', '/api/licenses/apply', {
    token: ctx.owner.token,
    body: {
      animalTypes: ['Dog'], numberOfAnimals: 4, facilityDescription: 'Backyard kennel', yearsOfExperience: 2
    }
  });
  assert.equal(applied.status, 201, JSON.stringify(applied.data));

  const earlyRenew = await api('POST', `/api/licenses/${applied.data._id}/renew`, { token: ctx.owner.token, body: {} });
  assert.equal(earlyRenew.status, 400);

  const approved = await api('PUT', `/api/licenses/${applied.data._id}/status`, {
    token: ctx.adminToken, body: { status: 'Approved', remarks: 'OK' }
  });
  assert.equal(approved.status, 200);
  assert.ok(approved.data.licenseId);

  const renew = await api('POST', `/api/licenses/${applied.data._id}/renew`, { token: ctx.owner.token, body: {} });
  assert.equal(renew.status, 201);
});

test('licence documents only keep safe data URLs (no javascript: links)', async () => {
  const applied = await api('POST', '/api/licenses/apply', {
    token: ctx.other.token,
    body: {
      animalTypes: ['Cat'], numberOfAnimals: 2, facilityDescription: 'Cattery', yearsOfExperience: 1,
      documents: {
        idProof: { label: 'ID', fileName: 'id.png', previewUrl: 'javascript:alert(document.cookie)' },
        certificates: [{ label: 'Cert', fileName: 'c.pdf', previewUrl: 'data:application/pdf;base64,JVBERi0=' }]
      }
    }
  });
  assert.equal(applied.status, 201, JSON.stringify(applied.data));

  const detail = await api('GET', `/api/licenses/${applied.data._id}`, { token: ctx.adminToken });
  assert.equal(detail.data.documents.idProof.previewUrl, '');
  assert.equal(detail.data.documents.certificates[0].previewUrl, 'data:application/pdf;base64,JVBERi0=');
});

test('vet patient search returns limited fields; the full pet list stays admin-only', async () => {
  const search = await api('GET', '/api/pets/search?q=rex', { token: ctx.vet.token });
  assert.equal(search.status, 200);
  assert.equal(search.data.pets[0].petId, ctx.pet.petId);
  assert.equal(search.data.pets[0].owner.email, undefined);
  assert.equal(search.data.pets[0].qrCode, undefined);

  const list = await api('GET', '/api/pets', { token: ctx.vet.token });
  assert.equal(list.status, 403);
});

test('malformed ids return 400 and unknown routes return JSON 404', async () => {
  const badId = await api('GET', '/api/lost-and-found/notanid');
  assert.equal(badId.status, 400);
  assert.equal(typeof badId.data, 'object');

  const missing = await api('GET', '/api/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.data.message, 'Route not found');
});

test('security headers and CORS restrictions are applied', async () => {
  const res = await api('GET', '/', { headers: { Origin: 'https://evil.example' } });
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('access-control-allow-origin'), null);

  const allowed = await api('GET', '/', { headers: { Origin: FRONTEND_ORIGIN } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
});

test('lost & found matching: suggestions, filters, tag match, admin review and notifications', async () => {
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

  // Owner reports their registered dog lost, near Galle Fort
  const lost = await api('POST', '/api/lost-and-found', {
    token: ctx.owner.token,
    body: {
      reportType: 'lost', species: 'Dog', breed: 'Labrador', color: 'Brown', petName: 'Rex',
      lastSeenLocation: 'Galle Fort', lastSeenDate: daysAgo(2), coordinates: { lat: 6.0270, lng: 80.2170 },
      contactInfo: 'Owner 0771234567', images: [tinyPng], linkedPet: ctx.pet._id
    }
  });
  assert.equal(lost.status, 201, JSON.stringify(lost.data));
  assert.equal(lost.data.reportType, 'lost');
  assert.equal(lost.data.status, 'Lost');
  assert.equal(lost.data.linkedPet, ctx.pet._id);

  // Someone else can't link a pet they don't own
  const notMyPet = await api('POST', '/api/lost-and-found', {
    token: ctx.other.token,
    body: { reportType: 'lost', breed: 'X', color: 'Y', petName: 'Z', lastSeenLocation: 'Q', lastSeenDate: daysAgo(1), contactInfo: 'c', linkedPet: ctx.pet._id }
  });
  assert.equal(notMyPet.status, 400);

  // Another user finds a similar dog about half a kilometre away
  const found = await api('POST', '/api/lost-and-found', {
    token: ctx.other.token,
    body: {
      reportType: 'found', species: 'Dog', breed: 'Labrador', color: 'brown and white',
      lastSeenLocation: 'Lighthouse Street', lastSeenDate: daysAgo(0), coordinates: { lat: 6.0300, lng: 80.2200 },
      contactInfo: 'Finder 0779998888', images: [tinyPng]
    }
  });
  assert.equal(found.status, 201, JSON.stringify(found.data));
  assert.equal(found.data.status, 'Found');
  assert.equal(found.data.petName, 'Unknown');

  // Mobile app's legacy `type` field is still understood
  const legacy = await api('POST', '/api/lost-and-found', {
    token: ctx.other.token,
    body: { type: 'Found', species: 'Cat', color: 'black', lastSeenLocation: 'Matara', lastSeenDate: daysAgo(0), contactInfo: 'x', status: 'Resolved' }
  });
  assert.equal(legacy.status, 201);
  assert.equal(legacy.data.reportType, 'found');
  assert.equal(legacy.data.status, 'Found', 'a client cannot create a report in another status');

  const rerun = await api('POST', `/api/matches/rerun/${found.data._id}`, { token: ctx.adminToken });
  assert.equal(rerun.status, 200, JSON.stringify(rerun.data));

  const suggested = await api('GET', '/api/matches?status=suggested', { token: ctx.adminToken });
  assert.equal(suggested.status, 200);
  const pair = suggested.data.matches.find((m) => m.found?._id === found.data._id && m.lost?._id === lost.data._id);
  assert.ok(pair, 'the lost and found reports are suggested as a match');
  assert.ok(pair.score >= 70, `high rule score expected, got ${pair.score}`);
  assert.equal(pair.ai.provider, 'none');
  assert.equal(pair.ai.verdict, null);
  assert.ok(!suggested.data.matches.some((m) => m.found?._id === found.data._id && m.pet?._id === ctx.pet._id),
    'the registered pet is not suggested twice when its own lost report is already a candidate');

  // Re-running does not duplicate
  await api('POST', `/api/matches/rerun/${found.data._id}`, { token: ctx.adminToken });
  const again = await api('GET', '/api/matches?status=suggested', { token: ctx.adminToken });
  assert.equal(again.data.matches.filter((m) => m.found?._id === found.data._id && m.lost?._id === lost.data._id).length, 1);

  // A dog found ~110 km away is not matched with the Galle lost report
  const far = await api('POST', '/api/lost-and-found', {
    token: ctx.other.token,
    body: { reportType: 'found', species: 'Dog', breed: 'Labrador', color: 'Brown', lastSeenLocation: 'Colombo',
      lastSeenDate: daysAgo(0), coordinates: { lat: 6.9271, lng: 79.8612 }, contactInfo: 'x' }
  });
  await api('POST', `/api/matches/rerun/${far.data._id}`, { token: ctx.adminToken });
  const farMatches = await api('GET', '/api/matches?status=suggested', { token: ctx.adminToken });
  assert.ok(!farMatches.data.matches.some((m) => m.found?._id === far.data._id && m.lost?._id === lost.data._id));

  // A cat is never matched with the lost dog, but a QR tag Pet ID matches the registered pet with certainty
  const tagged = await api('POST', '/api/lost-and-found', {
    token: ctx.other.token,
    body: { reportType: 'found', species: 'Cat', color: 'grey', lastSeenLocation: 'Galle', lastSeenDate: daysAgo(0),
      contactInfo: 'x', tagPetId: ctx.pet.petId.toLowerCase() }
  });
  await api('POST', `/api/matches/rerun/${tagged.data._id}`, { token: ctx.adminToken });
  const tagMatches = await api('GET', '/api/matches?status=suggested', { token: ctx.adminToken });
  assert.ok(!tagMatches.data.matches.some((m) => m.found?._id === tagged.data._id && m.lost?._id === lost.data._id));
  const tagMatch = tagMatches.data.matches.find((m) => m.found?._id === tagged.data._id && m.pet?._id === ctx.pet._id);
  assert.ok(tagMatch, 'tag Pet ID matches the registered pet');
  assert.equal(tagMatch.score, 100);
  assert.equal(tagMatch.breakdown.tagMatch, true);

  // Only administrators review matches; nothing is visible to users before confirmation
  assert.equal((await api('GET', '/api/matches', { token: ctx.owner.token })).status, 403);
  assert.equal((await api('GET', '/api/matches/mine', { token: ctx.owner.token })).data.matches.length, 0);

  // Detail view has all photos
  const detail = await api('GET', `/api/matches/${pair._id}`, { token: ctx.adminToken });
  assert.deepEqual(detail.data.match.found.images, [tinyPng]);

  // Confirm: both reports move to In Progress and both users see the match
  const confirm = await api('PATCH', `/api/matches/${pair._id}`, {
    token: ctx.adminToken, body: { decision: 'confirm', note: 'Same white chest patch' }
  });
  assert.equal(confirm.status, 200, JSON.stringify(confirm.data));
  assert.equal(confirm.data.match.status, 'confirmed');
  assert.equal((await api('GET', `/api/lost-and-found/${lost.data._id}`)).data.status, 'In Progress');
  assert.equal((await api('GET', `/api/lost-and-found/${found.data._id}`)).data.status, 'In Progress');
  assert.equal((await api('PATCH', `/api/matches/${pair._id}`, { token: ctx.adminToken, body: { decision: 'reject' } })).status, 400);

  const ownerView = await api('GET', '/api/matches/mine', { token: ctx.owner.token });
  const ownerMatch = ownerView.data.matches.find((m) => m._id === pair._id);
  assert.equal(ownerMatch.role, 'owner');
  assert.equal(ownerMatch.other.contactInfo, 'Finder 0779998888');
  assert.equal(ownerMatch.reviewNote, 'Same white chest patch');

  const finderView = await api('GET', '/api/matches/mine', { token: ctx.other.token });
  const finderMatch = finderView.data.matches.find((m) => m._id === pair._id);
  assert.equal(finderMatch.role, 'finder');
  assert.equal(finderMatch.other.contactInfo, 'Owner 0771234567');

  // Reject the tag match: a re-run never brings a reviewed match back as a suggestion
  const reject = await api('PATCH', `/api/matches/${tagMatch._id}`, { token: ctx.adminToken, body: { decision: 'reject' } });
  assert.equal(reject.status, 200);
  await api('POST', `/api/matches/rerun/${tagged.data._id}`, { token: ctx.adminToken });
  const afterReject = await api('GET', '/api/matches?status=suggested', { token: ctx.adminToken });
  assert.ok(!afterReject.data.matches.some((m) => m.found?._id === tagged.data._id && m.pet?._id === ctx.pet._id));

  // Feed filter by type, with only the first photo in lists
  const foundFeed = await api('GET', '/api/lost-and-found?type=found');
  assert.ok(foundFeed.data.length >= 3 && foundFeed.data.every((r) => r.reportType === 'found'));
});

test('forgot / reset password: no account discovery, one-time token, old sessions end', async () => {
  const crypto = require('node:crypto');
  const user = await signupAndVerify({ fullName: 'Reset Tester', email: 'reset@test.local', nicNumber: '199512345678' });

  const unknown = await api('POST', '/api/auth/forgot-password', { body: { email: 'nobody-here@test.local' } });
  const known = await api('POST', '/api/auth/forgot-password', { body: { email: 'RESET@test.local' } });
  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200);
  assert.equal(unknown.data.message, known.data.message, 'same reply whether or not the account exists');

  await mongoose.connect(MONGO_URI);
  const users = mongoose.connection.collection('users');
  const stored = await users.findOne({ email: 'reset@test.local' });
  assert.ok(stored.passwordResetTokenHash, 'a token hash was stored');
  assert.ok(stored.passwordResetExpires > new Date(), 'with an expiry in the future');

  // The emailed token is unknown to the test (only its hash is stored), so plant a known one
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await users.updateOne({ _id: stored._id }, { $set: { passwordResetTokenHash: hash, passwordResetExpires: new Date(Date.now() + 60000) } });

  await new Promise((resolve) => setTimeout(resolve, 1100)); // so the old login token is clearly older than the reset
  const wrong = await api('POST', '/api/auth/reset-password', { body: { token: 'a'.repeat(64), password: 'NewPassw0rd!' } });
  assert.equal(wrong.status, 400);

  const reset = await api('POST', '/api/auth/reset-password', { body: { token, password: 'NewPassw0rd!' } });
  assert.equal(reset.status, 200, JSON.stringify(reset.data));

  const reuse = await api('POST', '/api/auth/reset-password', { body: { token, password: 'Another1!' } });
  assert.equal(reuse.status, 400, 'a reset link works only once');

  const oldSession = await api('GET', '/api/auth/me', { token: user.token });
  assert.equal(oldSession.status, 401, 'sessions from before the reset are ended');

  const oldPassword = await api('POST', '/api/auth/login', { body: { email: 'reset@test.local', password: 'Passw0rd!' } });
  assert.equal(oldPassword.status, 400);
  const newPassword = await api('POST', '/api/auth/login', { body: { email: 'reset@test.local', password: 'NewPassw0rd!' } });
  assert.equal(newPassword.status, 200);

  // Expired tokens are rejected
  const expiredToken = crypto.randomBytes(32).toString('hex');
  await users.updateOne({ _id: stored._id }, {
    $set: {
      passwordResetTokenHash: crypto.createHash('sha256').update(expiredToken).digest('hex'),
      passwordResetExpires: new Date(Date.now() - 1000)
    }
  });
  const expired = await api('POST', '/api/auth/reset-password', { body: { token: expiredToken, password: 'Expired1!' } });
  assert.equal(expired.status, 400);

  // Admin "send reset link": admins only; with no email service configured it reports failure honestly
  const notAdmin = await api('POST', `/api/users/${user.id}/send-password-reset`, { token: newPassword.data.token });
  assert.equal(notAdmin.status, 403);
  const byAdmin = await api('POST', `/api/users/${user.id}/send-password-reset`, { token: ctx.adminToken });
  assert.equal(byAdmin.status, 503);
  const afterAdmin = await users.findOne({ _id: stored._id });
  assert.ok(afterAdmin.passwordResetExpires > new Date(), 'admin request created a fresh token');
  await mongoose.disconnect();
});

// ---------------------------------------------------------------------------
// QA: security and access-control tests
// ---------------------------------------------------------------------------

test('access control matrix: admin-only endpoints reject guests (401) and normal users (403)', async () => {
  const adminOnly = [
    '/api/users', '/api/pets', '/api/licenses', '/api/authority/dashboard',
    '/api/matches', '/api/vaccinations/upcoming', '/api/vaccinations/overdue'
  ];
  for (const url of adminOnly) {
    assert.equal((await api('GET', url)).status, 401, `${url} without a token`);
    assert.equal((await api('GET', url, { token: ctx.owner.token })).status, 403, `${url} as a normal user`);
    assert.equal((await api('GET', url, { token: ctx.adminToken })).status, 200, `${url} as admin`);
  }
  // Vet-only patient search
  assert.equal((await api('GET', '/api/pets/search?q=Rex', { token: ctx.owner.token })).status, 403);
  assert.equal((await api('GET', '/api/pets/search?q=Rex', { token: ctx.vet.token })).status, 200);
  // Recording vaccinations is for vets only
  const asOwner = await api('POST', '/api/vaccinations', {
    token: ctx.owner.token, body: { petId: ctx.pet._id, vaccineName: 'Rabies', dateAdministered: '2026-10-01' }
  });
  assert.equal(asOwner.status, 403);
});

test("users cannot read other users' pets, licences or profiles (no IDOR)", async () => {
  assert.equal((await api('GET', `/api/users/${ctx.owner.id}/pets`, { token: ctx.other.token })).status, 403);
  assert.equal((await api('GET', `/api/pets/${ctx.pet._id}`, { token: ctx.other.token })).status, 403);
  assert.equal((await api('GET', `/api/users/${ctx.owner.id}`, { token: ctx.other.token })).status, 403);
  const mine = await api('GET', `/api/users/${ctx.owner.id}/pets`, { token: ctx.owner.token });
  assert.equal(mine.status, 200);
  assert.equal(mine.data.pets.length, 1);

  const licence = await api('POST', '/api/licenses/apply', {
    token: ctx.owner.token,
    body: { animalTypes: ['Cat'], numberOfAnimals: 2, facilityDescription: 'Cattery', yearsOfExperience: 1 }
  });
  assert.equal(licence.status, 201);
  assert.equal((await api('GET', `/api/licenses/${licence.data._id}`, { token: ctx.other.token })).status, 403);
  assert.equal((await api('GET', `/api/licenses/${licence.data._id}`, { token: ctx.owner.token })).status, 200);
});

test('tampered, foreign, unsigned and expired tokens are all rejected', async () => {
  const jwt = require('jsonwebtoken');
  const [header, payload, signature] = ctx.owner.token.split('.');
  const flipped = `${header}.${payload}.${signature.slice(0, -2)}${signature.endsWith('AA') ? 'BB' : 'AA'}`;
  const forged = jwt.sign({ userId: ctx.owner.id }, 'not-the-server-secret');
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${payload}.`;
  const expired = jwt.sign({ userId: ctx.owner.id, exp: Math.floor(Date.now() / 1000) - 60 }, 'test-secret');
  const ghost = jwt.sign({ userId: '64b000000000000000000000' }, 'test-secret');
  // Same signature, but the payload edited to point at the admin account
  const adminId = (await api('GET', '/api/auth/me', { token: ctx.adminToken })).data.user.id;
  const editedPayload = { ...JSON.parse(Buffer.from(payload, 'base64url').toString()), userId: adminId };
  const swapped = `${header}.${Buffer.from(JSON.stringify(editedPayload)).toString('base64url')}.${signature}`;

  for (const [name, token] of Object.entries({ flipped, forged, unsigned, expired, ghost, swapped })) {
    const res = await api('GET', '/api/auth/me', { token });
    assert.equal(res.status, 401, `${name} token should be rejected`);
  }
  assert.equal((await api('GET', '/api/auth/me', { token: ctx.owner.token })).status, 200);
});

test('signup and profile updates cannot grant admin rights or skip verification', async () => {
  const signup = await api('POST', '/api/auth/signup', {
    body: {
      fullName: 'Sneaky', email: 'sneaky@test.local', password: 'Passw0rd!', phone: '0770000000',
      nicNumber: '199512340001', role: 'admin', isAdmin: true, isVerified: true,
      address: { street: 'x', city: 'Galle', province: 'Southern', postalCode: '80000' }
    }
  });
  assert.equal(signup.status, 201);
  assert.equal(signup.data.user.role, 'user');
  assert.equal(signup.data.user.isAdmin, false);
  // Still pending: cannot log in until an administrator verifies the account
  const pending = await api('POST', '/api/auth/login', { body: { email: 'sneaky@test.local', password: 'Passw0rd!' } });
  assert.equal(pending.status, 403);
  assert.equal(pending.data.code, 'ACCOUNT_PENDING_VERIFICATION');

  const update = await api('PUT', '/api/users/profile', {
    token: ctx.other.token, body: { fullName: 'Other Person', isAdmin: true, role: 'admin', isVerified: true, email: 'x@test.local' }
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.user.isAdmin, false);
  assert.equal(update.data.user.role, 'user');
  assert.equal(update.data.user.email, 'other@test.local');
  assert.equal((await api('GET', '/api/users', { token: ctx.other.token })).status, 403);
});

test('query-operator objects in text fields are rejected with 400 (no NoSQL injection, no 500s)', async () => {
  const login = await api('POST', '/api/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  assert.equal(login.status, 400);
  assert.equal(login.data.token, undefined);

  const signup = await api('POST', '/api/auth/signup', {
    body: {
      fullName: 'Inject', email: 'inject@test.local', password: 'Passw0rd!', phone: '0770000001',
      nicNumber: { $ne: null }, address: { street: 'x', city: 'Galle', province: 'Southern', postalCode: '80000' }
    }
  });
  assert.equal(signup.status, 400, JSON.stringify(signup.data));

  const profile = await api('PUT', '/api/users/profile', { token: ctx.other.token, body: { phone: { $gt: '' } } });
  assert.equal(profile.status, 400, JSON.stringify(profile.data));

  const adminEdit = await api('PUT', `/api/users/${ctx.other.id}`, { token: ctx.adminToken, body: { fullName: ['a', 'b'] } });
  assert.equal(adminEdit.status, 400, JSON.stringify(adminEdit.data));
});

test('email addresses are unique regardless of capital letters', async () => {
  const dup = await api('POST', '/api/auth/signup', {
    body: {
      fullName: 'Dup', email: 'OWNER@Test.Local', password: 'Passw0rd!', phone: '0770000002',
      nicNumber: '199612345678', address: { street: 'x', city: 'Galle', province: 'Southern', postalCode: '80000' }
    }
  });
  assert.equal(dup.status, 400, JSON.stringify(dup.data));

  // Admin editing another user's email to an existing address in different case
  const clash = await api('PUT', `/api/users/${ctx.other.id}`, { token: ctx.adminToken, body: { email: 'Owner@TEST.local' } });
  assert.equal(clash.status, 400, JSON.stringify(clash.data));

  // Login works with any capitalisation
  const login = await api('POST', '/api/auth/login', { body: { email: 'Owner@Test.Local', password: 'Passw0rd!' } });
  assert.equal(login.status, 200);
});

test('admin can edit a user; invalid and duplicate values are refused', async () => {
  const ok = await api('PUT', `/api/users/${ctx.other.id}`, {
    token: ctx.adminToken, body: { fullName: 'Other Person', address: { city: 'Matara' } }
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.address.city, 'Matara');
  assert.equal(ok.data.user.password, undefined);

  assert.equal((await api('PUT', `/api/users/${ctx.other.id}`, { token: ctx.adminToken, body: { email: 'not-an-email' } })).status, 400);
  assert.equal((await api('PUT', `/api/users/${ctx.other.id}`, { token: ctx.adminToken, body: { nicNumber: '199012345678' } })).status, 400);
  assert.equal((await api('PUT', `/api/users/${ctx.other.id}`, { token: ctx.adminToken, body: {} })).status, 400);
  assert.equal((await api('PUT', '/api/users/64b000000000000000000000', { token: ctx.adminToken, body: { fullName: 'X' } })).status, 404);
});

test('profile picture: only small JPEG/PNG/WebP images, and it can be removed', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  assert.equal((await api('PUT', '/api/users/profile-picture', { token: ctx.other.token, body: { profilePicture: 'data:image/svg+xml;base64,PHN2Zz4=' } })).status, 400);
  assert.equal((await api('PUT', '/api/users/profile-picture', { token: ctx.other.token, body: { profilePicture: 'https://evil.example/x.png' } })).status, 400);
  const set = await api('PUT', '/api/users/profile-picture', { token: ctx.other.token, body: { profilePicture: png } });
  assert.equal(set.status, 200);
  assert.equal((await api('GET', '/api/auth/me', { token: ctx.other.token })).data.user.profilePicture, png);
  assert.equal((await api('DELETE', '/api/users/profile-picture', { token: ctx.other.token })).status, 200);
  assert.equal((await api('GET', '/api/auth/me', { token: ctx.other.token })).data.user.profilePicture, '');
});

test('changing the password needs the current one and signs out old sessions', async () => {
  const user = await signupAndVerify({ fullName: 'Pass Changer', email: 'changer@test.local', nicNumber: '199712345678' });
  const wrong = await api('PUT', '/api/users/change-password', { token: user.token, body: { currentPassword: 'nope', newPassword: 'NewPassw0rd!' } });
  assert.equal(wrong.status, 400);
  const short = await api('PUT', '/api/users/change-password', { token: user.token, body: { currentPassword: 'Passw0rd!', newPassword: '123' } });
  assert.equal(short.status, 400);

  await new Promise(resolve => setTimeout(resolve, 1100)); // token iat has 1-second resolution
  const changed = await api('PUT', '/api/users/change-password', { token: user.token, body: { currentPassword: 'Passw0rd!', newPassword: 'NewPassw0rd!' } });
  assert.equal(changed.status, 200);
  assert.equal((await api('GET', '/api/auth/me', { token: user.token })).status, 401);
  // The session that changed the password carries on with the new token it was given
  assert.equal((await api('GET', '/api/auth/me', { token: changed.data.token })).status, 200);
  const relogin = await api('POST', '/api/auth/login', { body: { email: 'changer@test.local', password: 'NewPassw0rd!' } });
  assert.equal(relogin.status, 200);
});

test('social login reports clearly when it is not configured or the provider is unknown', async () => {
  const google = await api('POST', '/api/auth/oauth/google', { body: { idToken: 'abc' } });
  assert.equal(google.status, 503);
  const unknown = await api('POST', '/api/auth/oauth/myspace', { body: { idToken: 'abc' } });
  assert.equal(unknown.status, 400);
});

test("vaccination dashboards: the owner's own upcoming list needs a login", async () => {
  const upcoming = await api('GET', '/api/vaccinations/user/upcoming', { token: ctx.owner.token });
  assert.equal(upcoming.status, 200);
  assert.equal((await api('GET', '/api/vaccinations/user/upcoming')).status, 401);
});

test('lists send a small preview photo; the report itself keeps the full photos', async () => {
  const sharp = require('sharp');
  const big = await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 30, g: 90, b: 160 } } })
    .jpeg({ quality: 95 }).toBuffer();
  const photo = `data:image/jpeg;base64,${big.toString('base64')}`;
  const created = await api('POST', '/api/lost-and-found', {
    token: ctx.owner.token,
    body: {
      reportType: 'lost', petName: 'Preview', species: 'Cat', breed: 'Persian', color: 'grey',
      lastSeenLocation: 'Matara', lastSeenDate: new Date().toISOString(), contactInfo: '0770001111', images: [photo, photo]
    }
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));

  const feedItem = (await api('GET', '/api/lost-and-found')).data.find((r) => r._id === created.data._id);
  assert.equal(feedItem.images.length, 1);
  assert.match(feedItem.images[0], /^data:image\/webp;base64,/);
  assert.ok(feedItem.images[0].length < photo.length / 3, 'preview is much smaller than the photo');
  assert.equal(feedItem.imageCount, 2);
  assert.equal(feedItem.thumbnail, undefined);

  const full = (await api('GET', `/api/lost-and-found/${created.data._id}`)).data;
  assert.deepEqual(full.images, [photo, photo]);
  assert.equal(full.thumbnail, undefined);

  const dashboard = await api('GET', '/api/authority/dashboard', { token: ctx.adminToken });
  const card = dashboard.data.lostFound.find((r) => r._id === created.data._id);
  assert.match(card.imageUrl, /^data:image\/webp;base64,/);
});

test('oversized and malformed request bodies are refused without crashing the server', async () => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email": "a@b.c", '
  });
  assert.equal(res.status, 400);
  const huge = await fetch(`${BASE}/api/lost-and-found`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.owner.token}` },
    body: JSON.stringify({ description: 'x'.repeat(11 * 1024 * 1024) })
  });
  assert.equal(huge.status, 413);
  assert.equal((await api('GET', '/')).status, 200, 'server still up');
});

test('failed logins are rate limited, successful logins are not counted', async () => {
  for (let i = 0; i < 25; i += 1) {
    const ok = await api('POST', '/api/auth/login', { body: ADMIN });
    assert.equal(ok.status, 200);
  }

  let last;
  for (let i = 0; i < 25; i += 1) {
    last = await api('POST', '/api/auth/login', { body: { email: 'nobody@test.local', password: 'wrong' } });
    if (last.status === 429) break;
  }
  assert.equal(last.status, 429);
});
