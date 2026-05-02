// Reusable API utility with fallback between base URLs.
// Preference order: http://localhost:5000 -> http://localhost:5001 -> REACT_APP_API_URL (if set)
// Exports: apiRequest(path, options), apiGet, apiPost, apiPut, apiDelete

const DEFAULT_BASES = ['http://localhost:5000', 'http://localhost:5001'];

function getBases() {
  const env = typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL
    ? String(process.env.REACT_APP_API_URL).replace(/\/$/, '')
    : null;
  const bases = env ? [...DEFAULT_BASES, env] : [...DEFAULT_BASES];
  // remove duplicates while preserving order
  return [...new Set(bases)];
}

async function tryFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const contentType = res.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  if (!res.ok) {
    const err = new Error(`Request failed with status ${res.status}`);
    err.status = res.status;
    err.response = body;
    err.url = url;
    throw err;
  }
  return body;
}

function isNetworkError(err) {
  // fetch throws TypeError on network failure in browsers
  if (!err) return false;
  return err instanceof TypeError || err.name === 'TypeError' || /Failed to fetch|NetworkError/i.test(err.message || '');
}

export async function apiRequest(path, opts = {}) {
  const { method = 'GET', headers = {}, body, ...rest } = opts;

  // If path is an absolute URL, just use it (no fallback needed)
  if (/^https?:\/\//i.test(path)) {
    const fetchOpts = { method, headers: { Accept: 'application/json', ...headers }, ...rest };
    if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
      fetchOpts.headers['Content-Type'] = fetchOpts.headers['Content-Type'] ?? 'application/json';
      fetchOpts.body = JSON.stringify(body);
    } else if (body !== undefined) {
      fetchOpts.body = body;
    }
    return tryFetch(path, fetchOpts);
  }

  const bases = getBases();
  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    // new URL handles joining safely
    const url = new URL(path, base).toString();
    const fetchOpts = { method, headers: { Accept: 'application/json', ...headers }, ...rest };
    if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
      fetchOpts.headers['Content-Type'] = fetchOpts.headers['Content-Type'] ?? 'application/json';
      fetchOpts.body = JSON.stringify(body);
    } else if (body !== undefined) {
      fetchOpts.body = body;
    }
    try {
      return await tryFetch(url, fetchOpts);
    } catch (err) {
      // If it's an HTTP error (we threw above), do NOT fallback: surface to caller
      if (!isNetworkError(err)) throw err;

      // Network error: if there are more bases, try next, otherwise throw
      const last = i === bases.length - 1;
      if (last) {
        const e = new Error(`Network error: all base URLs failed. Last error: ${err.message}`);
        e.cause = err;
        throw e;
      }
      // otherwise continue to next base
      // eslint-disable-next-line no-console
      console.warn(`Network error contacting ${url}: ${err.message}. Trying next base...`);
    }
  }
}

export const apiGet = (path, opts) => apiRequest(path, { method: 'GET', ...opts });
export const apiPost = (path, body, opts = {}) => apiRequest(path, { method: 'POST', body, ...opts });
export const apiPut = (path, body, opts = {}) => apiRequest(path, { method: 'PUT', body, ...opts });
export const apiDelete = (path, opts = {}) => apiRequest(path, { method: 'DELETE', ...opts });

export default apiRequest;

/* Example usage:

import apiRequest, { apiGet, apiPost } from '../utils/api';

// GET list
const pets = await apiGet('/api/pets');

// POST new item
const newPet = await apiPost('/api/pets', { name: 'Fido' });

// Raw request with headers
const result = await apiRequest('/api/secure', { method: 'GET', headers: { Authorization: 'Bearer ...' } });

*/
