// Automated accessibility scan (axe-core, WCAG 2.1 A and AA rules) of the main pages.
// Every violation is written to results/accessibility.json for the QA report;
// the test fails only on "critical" or "serious" problems.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { createUser, loginUI, ADMIN } = require('./helpers');

// One file per page (Playwright restarts the worker after a failure, so nothing is kept in memory)
const outDir = path.join(__dirname, '..', 'results', 'accessibility');
const scan = async (page, name) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${name.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify({
    page: name,
    url: page.url().replace(/^https?:\/\/[^/]+/, ''),
    violations: violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
      details: v.nodes.slice(0, 3).map((n) => n.failureSummary)
    }))
  }, null, 2));
  return violations.filter((v) => ['critical', 'serious'].includes(v.impact));
};

const publicPages = [
  ['Landing page', '/'],
  ['Login', '/login'],
  ['Sign up', '/signup'],
  ['Forgot password', '/forgot-password'],
  ['Lost & Found feed', '/lost-and-found'],
  ['Report an animal incident', '/report-incident']
];

for (const [name, url] of publicPages) {
  test(`accessibility: ${name}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const serious = await scan(page, name);
    expect(serious.map((v) => `${v.id} (${v.impact}): ${v.help}`)).toEqual([]);
  });
}

test('accessibility: pet owner pages', async ({ page, request }) => {
  const user = await createUser(request);
  await loginUI(page, user.email, user.password);
  const serious = [];
  for (const [name, url] of [['User dashboard', '/user/dashboard'], ['My pets', '/user/my-pets'], ['Report lost or found pet', '/lost-and-found/report'], ['Edit profile', '/user/edit-profile']]) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    serious.push(...(await scan(page, name)).map((v) => `${name}: ${v.id} (${v.impact})`));
  }
  expect(serious).toEqual([]);
});

test('accessibility: administrator pages', async ({ page }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  const serious = [];
  for (const [name, url] of [['Admin dashboard', '/admin/dashboard'], ['Authority dashboard', '/admin/authority'], ['Users', '/admin/users'], ['Match review', '/admin/matches']]) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    serious.push(...(await scan(page, name)).map((v) => `${name}: ${v.id} (${v.impact})`));
  }
  expect(serious).toEqual([]);
});
