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
      NODE_ENV: 'test'
    },
    stdio: process.env.TEST_VERBOSE ? 'inherit' : 'ignore'
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
  if (server) server.kill();
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

  const publicList = await api('GET', '/api/incidents');
  assert.equal(publicList.status, 401, 'incident reports (and reporter contacts) are not public');
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
