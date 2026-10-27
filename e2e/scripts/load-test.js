// Load test of the local API (same build as production) with autocannon.
// Usage: node scripts/load-test.js   (MongoDB on 127.0.0.1:27077; starts and stops its own API)
// Writes results/load-test.json for the QA report.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const autocannon = require('autocannon');
const { API_URL, ADMIN } = require('./ports');

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(`${API_URL}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
};

const waitForApi = async () => {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${API_URL}/`)).ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('API did not start');
};

const run = (title, opts) => new Promise((resolve, reject) => {
  autocannon({ duration: 15, connections: 20, ...opts, url: `${API_URL}${opts.path}` }, (err, r) => {
    if (err) return reject(err);
    const row = {
      scenario: title,
      connections: opts.connections || 20,
      durationSec: opts.duration || 15,
      requests: r.requests.total,
      reqPerSec: Math.round(r.requests.average),
      latencyAvgMs: r.latency.average,
      latencyP50Ms: r.latency.p50,
      latencyP97_5Ms: r.latency.p97_5,
      latencyP99Ms: r.latency.p99,
      latencyMaxMs: r.latency.max,
      non2xx: r.non2xx,
      errors: r.errors,
      timeouts: r.timeouts
    };
    console.log(JSON.stringify(row));
    resolve(row);
  });
});

(async () => {
  const api = spawn(process.execPath, [path.join(__dirname, 'start-api.js')], { stdio: 'ignore' });
  try {
    await waitForApi();
    const admin = (await call('POST', '/api/auth/login', { body: ADMIN })).token;

    // Seed: one owner with a pet, and 60 lost/found reports with photos for a realistic feed
    const owner = { fullName: 'Load Owner', email: 'load@e2e.local', password: 'Passw0rd!', phone: '0771234567', nicNumber: '200012345678',
      address: { street: 'x', city: 'Galle', province: 'Southern', postalCode: '80000' } };
    const signup = await call('POST', '/api/auth/signup', { body: owner });
    await call('PATCH', `/api/users/${signup.user.id}/verify`, { token: admin });
    const ownerToken = (await call('POST', '/api/auth/login', { body: { email: owner.email, password: owner.password } })).token;
    const pet = (await call('POST', '/api/pets/register', { token: admin, body: {
      ownerId: signup.user.id, petName: 'Load', petType: 'Dog', breed: 'Labrador', age: { years: 2, months: 0 }, gender: 'Male', color: 'Black', weight: 20
    } })).pet;
    // A real 1024x768 JPEG with camera-like noise, about the size the web and mobile apps upload
    const sharp = require(path.join(__dirname, '..', '..', 'Backend', 'node_modules', 'sharp'));
    const jpeg = await sharp({ create: { width: 1024, height: 768, channels: 3, background: { r: 150, g: 110, b: 70 }, noise: { type: 'gaussian', mean: 128, sigma: 20 } } })
      .jpeg({ quality: 70 }).toBuffer();
    const photo = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    console.log(`Photo size: ${Math.round(jpeg.length / 1024)} KB`);
    for (let i = 0; i < 60; i += 1) {
      await call('POST', '/api/lost-and-found', { token: ownerToken, body: {
        reportType: i % 2 ? 'found' : 'lost', petName: `Dog ${i}`, species: 'Dog', breed: 'Mixed', color: 'brown',
        lastSeenLocation: 'Galle', lastSeenDate: new Date().toISOString(), contactInfo: '0771234567', images: [photo, photo]
      } });
    }

    const results = [];
    results.push(await run('Health check  GET /', { path: '/' }));
    results.push(await run('Public Lost & Found feed  GET /api/lost-and-found (60 reports with photos)', { path: '/api/lost-and-found' }));
    results.push(await run('QR code scan  GET /api/pets/petid/:petId', { path: `/api/pets/petid/${pet.petId}` }));
    results.push(await run('Owner dashboard  GET /api/users/:id/pets (authenticated)', {
      path: `/api/users/${signup.user.id}/pets`, headers: { Authorization: `Bearer ${ownerToken}` }
    }));
    results.push(await run('Admin dashboard  GET /api/authority/dashboard', {
      path: '/api/authority/dashboard', headers: { Authorization: `Bearer ${admin}` }
    }));
    results.push(await run('Login  POST /api/auth/login (bcrypt)', {
      path: '/api/auth/login', method: 'POST', connections: 10,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: owner.email, password: owner.password })
    }));

    const out = path.join(__dirname, '..', 'results', 'load-test.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), node: process.version, results }, null, 2));
  } finally {
    api.kill();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
