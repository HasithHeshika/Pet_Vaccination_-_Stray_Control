// Shared helpers: set up data through the API (fast), drive the journey under test through the UI
const { expect } = require('@playwright/test');
const { API_URL, ADMIN } = require('../scripts/ports');

let counter = 0;
const unique = (prefix) => `${prefix}${Date.now().toString(36)}${(counter += 1)}`;

const api = async (request, method, url, { token, data } = {}) => {
  const res = await request.fetch(`${API_URL}${url}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data
  });
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  return { status: res.status(), body };
};

const adminToken = async (request) => {
  const res = await api(request, 'POST', '/api/auth/login', { data: ADMIN });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.token;
};

// A verified pet owner, created through the API
const createUser = async (request, overrides = {}) => {
  const id = unique('u');
  const user = {
    fullName: `E2E ${id}`,
    email: `${id}@e2e.local`,
    password: 'Passw0rd!',
    phone: '0771234567',
    nicNumber: `${Date.now()}${counter}`.slice(-12),
    address: { street: '1 Main St', city: 'Galle', province: 'Southern', postalCode: '80000' },
    ...overrides
  };
  const signup = await api(request, 'POST', '/api/auth/signup', { data: user });
  expect(signup.status, JSON.stringify(signup.body)).toBe(201);
  const admin = await adminToken(request);
  const verify = await api(request, 'PATCH', `/api/users/${signup.body.user.id}/verify`, { token: admin });
  expect(verify.status).toBe(200);
  const login = await api(request, 'POST', '/api/auth/login', { data: { email: user.email, password: user.password } });
  return { ...user, id: signup.body.user.id, token: login.body.token };
};

const registerPet = async (request, ownerId, overrides = {}) => {
  const admin = await adminToken(request);
  const res = await api(request, 'POST', '/api/pets/register', {
    token: admin,
    data: {
      ownerId, petName: 'Bruno', petType: 'Dog', breed: 'Labrador',
      age: { years: 3, months: 1 }, gender: 'Male', color: 'Golden', weight: 24, ...overrides
    }
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.pet;
};

// Log in through the real login page. By default waits until the app has left the login page
// (the session is stored), so the next navigation is made as the logged-in user.
const loginUI = async (page, email, password, { expectSuccess = true } = {}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /log ?in/i }).click();
  if (expectSuccess) await expect(page).not.toHaveURL(/\/login$/);
};

module.exports = { api, adminToken, createUser, registerPet, loginUI, unique, ADMIN };
