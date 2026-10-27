// Smoke test of the LIVE deployment (Azure). Mostly read-only; the only write is one clearly
// labelled Lost & Found report, which is deleted again at the end.
// Usage: LIVE_ADMIN_EMAIL=... LIVE_ADMIN_PASSWORD=... node scripts/live-smoke.js
// Writes results/live-smoke.json for the QA report.
const fs = require('node:fs');
const path = require('node:path');

const API = process.env.LIVE_API_URL || 'https://pet-control-api-fxhkd7fwa5e2gtem.malaysiawest-01.azurewebsites.net';
const WEB = process.env.LIVE_WEB_URL || 'https://lively-sky-055ae2000.7.azurestaticapps.net';
const { LIVE_ADMIN_EMAIL: email, LIVE_ADMIN_PASSWORD: password } = process.env;

const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass: Boolean(pass), detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const timed = async (url, options = {}) => {
  const start = performance.now();
  const res = await fetch(url, options);
  const body = await res.text();
  return { res, body, ms: Math.round(performance.now() - start) };
};

const timings = async (label, url, n = 10) => {
  const samples = [];
  for (let i = 0; i < n; i += 1) samples.push((await timed(url)).ms);
  const sorted = [...samples].sort((a, b) => a - b);
  const row = { label, url: url.replace(API, '{API}').replace(WEB, '{WEB}'), samples: n, minMs: sorted[0], medianMs: sorted[Math.floor(n / 2)], maxMs: sorted[n - 1] };
  console.log(`TIME  ${label}: median ${row.medianMs} ms (min ${row.minMs}, max ${row.maxMs})`);
  return row;
};

(async () => {
  // Wake the API (free tier sleeps when idle) and record the first response time
  const first = await timed(`${API}/`);
  check('API is up', first.res.ok, `first request ${first.ms} ms`);

  // ---- Response times (sequential samples from this computer) ----
  const responseTimes = [
    await timings('API health check', `${API}/`),
    await timings('Public Lost & Found feed', `${API}/api/lost-and-found`),
    await timings('Web app landing page (HTML)', `${WEB}/`)
  ];

  // ---- Web app ----
  const home = await timed(`${WEB}/`);
  check('Web app loads', home.res.ok && /<div id="root">/.test(home.body), `HTTP ${home.res.status}`);
  const deepLink = await timed(`${WEB}/lost-and-found`);
  check('Deep links work (single-page app fallback)', deepLink.res.ok && /<div id="root">/.test(deepLink.body), `HTTP ${deepLink.res.status}`);
  const plain = await fetch(WEB.replace('https://', 'http://'), { redirect: 'manual' });
  check('Plain HTTP is redirected to HTTPS', [301, 302, 307, 308].includes(plain.status) && /^https:/.test(plain.headers.get('location') || ''), `HTTP ${plain.status}`);

  // ---- API security behaviour ----
  const h = first.res.headers;
  check('API sends X-Content-Type-Options: nosniff', h.get('x-content-type-options') === 'nosniff');
  check('API sends a frame-blocking header', /deny|sameorigin/i.test(h.get('x-frame-options') || '') || /frame-ancestors/i.test(h.get('content-security-policy') || ''));
  check('API does not advertise Express (X-Powered-By)', !h.get('x-powered-by'), h.get('x-powered-by') || 'absent');
  const corsOk = await fetch(`${API}/api/lost-and-found`, { headers: { Origin: WEB } });
  check('CORS allows the web app', corsOk.headers.get('access-control-allow-origin') === WEB);
  const corsBad = await fetch(`${API}/api/lost-and-found`, { headers: { Origin: 'https://evil.example' } });
  check('CORS refuses other websites', corsBad.headers.get('access-control-allow-origin') !== 'https://evil.example', corsBad.headers.get('access-control-allow-origin') || 'no allow-origin header');
  for (const url of ['/api/users', '/api/pets', '/api/matches', '/api/authority/dashboard']) {
    const res = await fetch(`${API}${url}`);
    check(`Guest is refused ${url}`, res.status === 401, `HTTP ${res.status}`);
  }
  const unknown = await timed(`${API}/api/does-not-exist`);
  check('Unknown routes return JSON 404', unknown.res.status === 404 && /Route not found/.test(unknown.body));
  const badLogin = await timed(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'qa-nobody@example.com', password: 'wrong' })
  });
  check('Wrong credentials are refused', badLogin.res.status === 400, `HTTP ${badLogin.res.status}`);

  // ---- Admin journey (one labelled report, deleted afterwards) ----
  if (!email || !password) {
    check('Admin journey', false, 'LIVE_ADMIN_EMAIL / LIVE_ADMIN_PASSWORD not set');
  } else {
    const login = await timed(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    const token = login.res.ok && JSON.parse(login.body).token;
    check('Admin can log in', Boolean(token), `HTTP ${login.res.status}, ${login.ms} ms`);
    if (token) {
      const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const dash = await timed(`${API}/api/authority/dashboard`, { headers: auth });
      check('Authority dashboard loads', dash.res.ok && JSON.parse(dash.body).metrics, `${dash.ms} ms`);
      const matches = await timed(`${API}/api/matches?status=suggested`, { headers: auth });
      check('Match review list loads', matches.res.ok, `HTTP ${matches.res.status}`);

      const label = `QA SMOKE TEST ${new Date().toISOString()} - please ignore`;
      const created = await timed(`${API}/api/lost-and-found`, {
        method: 'POST', headers: auth,
        body: JSON.stringify({
          reportType: 'lost', petName: label, species: 'Other', speciesOther: 'QA test', breed: 'QA test',
          color: 'none', lastSeenLocation: 'QA test', lastSeenDate: new Date().toISOString(), contactInfo: 'QA test'
        })
      });
      const report = created.res.status === 201 && JSON.parse(created.body);
      check('A lost report can be created', Boolean(report), `HTTP ${created.res.status}`);
      if (report) {
        const feed = JSON.parse((await timed(`${API}/api/lost-and-found?type=lost`)).body);
        check('It appears in the public feed', feed.some((r) => r._id === report._id));
        const del = await fetch(`${API}/api/lost-and-found/${report._id}`, { method: 'DELETE', headers: auth });
        check('It can be deleted (clean-up)', del.ok, `HTTP ${del.status}`);
        const gone = await fetch(`${API}/api/lost-and-found/${report._id}`);
        check('It is gone afterwards', gone.status === 404, `HTTP ${gone.status}`);
      }
    }
  }

  const out = path.join(__dirname, '..', 'results', 'live-smoke.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), api: API, web: WEB, checks, responseTimes }, null, 2));
  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
})().catch((error) => { console.error(error); process.exitCode = 1; });
