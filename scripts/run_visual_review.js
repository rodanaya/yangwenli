/**
 * Visual review of RUBLI production app
 * Run from project root: node scripts/run_visual_review.js
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'frontend', 'node_modules', 'playwright'));
const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://37.60.232.109';
const VIEWPORT = { width: 1440, height: 900 };
const TIMEOUT = 30000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shot(page, name, fullPage = false) {
  const p = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage });
  console.log(`  -> ${p}`);
  return p;
}

async function getIssues(page) {
  const issues = [];
  const text = await page.evaluate(() => document.body.innerText || '');

  // Blank content check
  if (text.trim().length < 100) {
    issues.push(`Page appears mostly blank (${text.trim().length} chars of text)`);
  }

  // Count skeleton/spinner elements
  const skeletons = await page.evaluate(() =>
    document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]').length
  );
  if (skeletons > 8) {
    issues.push(`${skeletons} skeleton elements visible - data may not have loaded`);
  }

  // Bad tokens in visible text
  const patterns = [
    [/\bNaN\b/g, 'NaN'],
    [/\bundefined\b/g, 'undefined'],
    [/Cannot read prop/gi, 'TypeError in UI'],
    [/Failed to fetch/gi, 'Failed to fetch'],
    [/Network Error/gi, 'Network Error'],
    [/Something went wrong/gi, 'English error text'],
    [/Loading\.\.\./g, 'Loading... (may be stuck)'],
  ];

  for (const [re, label] of patterns) {
    const m = text.match(re);
    if (m && m.length > 0) {
      issues.push(`"${label}" found ${m.length}x in visible text`);
    }
  }

  return issues;
}

async function reviewPage(browser, id, urlPath, opts = {}) {
  const url = BASE_URL + urlPath;
  const wait = opts.wait || 4000;
  console.log(`\n--- ${id}: ${url}`);

  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const pg = await ctx.newPage();

  const consoleErrs = [];
  pg.on('console', (m) => {
    if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200));
  });
  pg.on('pageerror', (e) => consoleErrs.push('[uncaught] ' + e.message.slice(0, 200)));

  let navErr = null;
  try {
    await pg.goto(url, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await sleep(wait);
  } catch (e) {
    navErr = e.message;
  }

  if (navErr) {
    await ctx.close();
    return { id, url, issues: [`Navigation failed: ${navErr}`], shots: [] };
  }

  const shots = [];
  shots.push(await shot(pg, `${id}_viewport`));
  shots.push(await shot(pg, `${id}_full`, true));

  // Scroll to middle
  await pg.evaluate(() => window.scrollTo(0, Math.min(800, document.body.scrollHeight / 2)));
  await sleep(800);
  shots.push(await shot(pg, `${id}_mid`));

  if (opts.scrollFull) {
    // Slow scroll to trigger lazy loading
    const total = await pg.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < total; y += 500) {
      await pg.evaluate((pos) => window.scrollTo(0, pos), y);
      await sleep(120);
    }
    await sleep(2000);
    shots.push(await shot(pg, `${id}_after_scroll`, true));
  }

  const issues = await getIssues(pg);
  if (consoleErrs.length) {
    issues.push(`Console errors (${consoleErrs.length}): ${consoleErrs.slice(0, 2).join(' | ')}`);
  }

  await ctx.close();
  return { id, url, issues, shots };
}

async function reviewARIA(browser) {
  const url = BASE_URL + '/aria';
  console.log(`\n--- aria: ${url}`);
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const pg = await ctx.newPage();
  const consoleErrs = [];
  pg.on('console', (m) => {
    if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200));
  });

  await pg.goto(url, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const shots = [];
  shots.push(await shot(pg, 'aria_viewport'));
  shots.push(await shot(pg, 'aria_full', true));
  await pg.evaluate(() => window.scrollTo(0, 700));
  await sleep(800);
  shots.push(await shot(pg, 'aria_mid'));

  // Find vendor link
  let vendorPath = null;
  try {
    const links = await pg.$$eval(
      'a[href*="/vendor"]',
      (els) => els.map((el) => {
        try { return new URL(el.href).pathname; } catch { return null; }
      }).filter(Boolean)
    );
    if (links.length > 0) {
      vendorPath = links[0];
      console.log(`  Vendor links found: ${links.slice(0, 3).join(', ')}`);
    }
  } catch (_) {}

  const issues = await getIssues(pg);
  if (consoleErrs.length) {
    issues.push(`Console errors: ${consoleErrs.slice(0, 2).join(' | ')}`);
  }

  await ctx.close();
  return { ariaResult: { id: 'aria', url, issues, shots }, vendorPath };
}

async function reviewVendor(browser, vendorPath) {
  const path_ = vendorPath || '/vendor/1';
  const url = BASE_URL + path_;
  console.log(`\n--- vendor_profile: ${url}`);
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const pg = await ctx.newPage();
  const consoleErrs = [];
  pg.on('console', (m) => {
    if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200));
  });

  await pg.goto(url, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const shots = [];
  shots.push(await shot(pg, 'vendor_viewport'));
  shots.push(await shot(pg, 'vendor_full', true));

  // Click through tabs
  const tabs = await pg.$$('[role="tab"]');
  console.log(`  Tabs found: ${tabs.length}`);
  for (let i = 0; i < Math.min(tabs.length, 6); i++) {
    try {
      const label = (await tabs[i].textContent() || `tab${i}`).trim().replace(/\s+/g, '_').slice(0, 20);
      await tabs[i].click();
      await sleep(2000);
      shots.push(await shot(pg, `vendor_tab_${i}_${label}`));
    } catch (_) {}
  }

  const issues = await getIssues(pg);
  if (consoleErrs.length) {
    issues.push(`Console errors (${consoleErrs.length}): ${consoleErrs.slice(0, 2).join(' | ')}`);
  }

  await ctx.close();
  return { id: 'vendor_profile', url, issues, shots };
}

async function main() {
  console.log('=== RUBLI Production Visual Review ===');
  console.log(`URL: ${BASE_URL}`);
  console.log(`Output: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];

  results.push(await reviewPage(browser, 'landing', '/', { wait: 5000, scrollFull: true }));
  results.push(await reviewPage(browser, 'dashboard', '/dashboard', { wait: 6000 }));

  const { ariaResult, vendorPath } = await reviewARIA(browser);
  results.push(ariaResult);

  results.push(await reviewVendor(browser, vendorPath));
  results.push(await reviewPage(browser, 'contracts', '/contracts', { wait: 5000 }));
  results.push(await reviewPage(browser, 'red_thread', '/thread/1', { wait: 6000 }));

  await browser.close();

  // Report
  console.log('\n\n============================================================');
  console.log('                 VISUAL REVIEW REPORT');
  console.log('============================================================\n');

  let totalIssues = 0;
  for (const r of results) {
    totalIssues += r.issues.length;
    const status = r.issues.length === 0 ? '✓ OK' : `✗ ${r.issues.length} issue(s)`;
    console.log(`${status.padEnd(14)} ${r.id}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Screenshots: ${r.shots.length} files`);
    for (const iss of r.issues) {
      console.log(`  ISSUE: ${iss}`);
    }
    console.log('');
  }

  console.log(`Total issues: ${totalIssues}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
