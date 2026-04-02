/**
 * Visual review script for RUBLI production app at http://37.60.232.109
 * Uses playwright from frontend/node_modules
 */

import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCREENSHOTS_DIR = join(ROOT, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Use playwright from frontend/node_modules
const require = createRequire(import.meta.url);
const { chromium } = require(join(ROOT, 'frontend', 'node_modules', 'playwright'));

const BASE_URL = 'http://37.60.232.109';
const VIEWPORT = { width: 1440, height: 900 };
const TIMEOUT = 30000;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, fullPage = false) {
  const path = join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage });
  console.log(`  [screenshot] ${name} -> ${path}`);
  return path;
}

async function checkIssues(page) {
  const issues = [];

  // Visible text content
  const bodyText = await page.evaluate(() => document.body.innerText || '');

  // Blank/empty main content
  const mainContent = await page.$('main, [role="main"], #root, #app');
  if (mainContent) {
    const text = await mainContent.evaluate((el) => el.innerText?.trim() || '');
    if (text.length < 50) {
      issues.push(`Main content appears blank (only ${text.length} chars)`);
    }
  }

  // Check for error-related text
  const errorPatterns = [
    { pattern: /\berror\b/gi, label: '"error"' },
    { pattern: /\bfailed\b/gi, label: '"failed"' },
    { pattern: /\b404\b/, label: '"404"' },
    { pattern: /\b500\b/, label: '"500"' },
    { pattern: /Cannot read/gi, label: 'JS TypeError in UI' },
    { pattern: /\bundefined\b/g, label: '"undefined"' },
    { pattern: /\bNaN\b/g, label: '"NaN"' },
  ];

  for (const { pattern, label } of errorPatterns) {
    const matches = bodyText.match(pattern);
    if (matches && matches.length > 0) {
      // Only flag if it appears more than noise level
      if (matches.length > 2 || label !== '"error"') {
        issues.push(`${label} appears ${matches.length}x in visible text`);
      }
    }
  }

  // Check for English loading states that should be translated
  const englishUiPhrases = [
    'Loading...',
    'No data',
    'Something went wrong',
    'Please wait',
    'Fetching data',
  ];
  for (const phrase of englishUiPhrases) {
    if (bodyText.includes(phrase)) {
      issues.push(`Potentially untranslated English UI text: "${phrase}"`);
    }
  }

  // Count spinners/skeletons visible
  const spinnerCount = await page.evaluate(() => {
    const selectors = [
      '[class*="spinner"]',
      '[class*="skeleton"]',
      '[class*="animate-pulse"]',
      '[class*="loading"]',
    ];
    let count = 0;
    for (const sel of selectors) {
      count += document.querySelectorAll(sel).length;
    }
    return count;
  });
  if (spinnerCount > 5) {
    issues.push(`${spinnerCount} skeleton/spinner elements visible (data may not have loaded)`);
  }

  return issues;
}

async function reviewPage(browser, name, url, options = {}) {
  const { scrollToBottom = false, extraWait = 4000 } = options;
  const fullUrl = BASE_URL + url;
  console.log(`\n=== ${name}: ${fullUrl} ===`);

  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`[uncaught] ${err.message}`));

  let navFailed = false;
  try {
    await page.goto(fullUrl, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await sleep(extraWait);
  } catch (err) {
    navFailed = true;
    console.log(`  Navigation failed: ${err.message}`);
  }

  if (navFailed) {
    await context.close();
    return { name, url: fullUrl, issues: [`Navigation failed`], screenshots: [] };
  }

  // Initial viewport screenshot
  const shots = [];
  shots.push(await takeScreenshot(page, `${name}_01_initial`));

  // Full page screenshot
  shots.push(await takeScreenshot(page, `${name}_02_full`, true));

  // Scroll to mid-page for additional content
  await page.evaluate(() => window.scrollTo(0, 600));
  await sleep(1000);
  shots.push(await takeScreenshot(page, `${name}_03_mid`));

  if (scrollToBottom) {
    await page.evaluate(async () => {
      const scrollStep = 600;
      let pos = 0;
      while (pos < document.body.scrollHeight) {
        window.scrollTo(0, pos);
        pos += scrollStep;
        await new Promise((r) => setTimeout(r, 150));
      }
    });
    await sleep(2000);
    shots.push(await takeScreenshot(page, `${name}_04_bottom`));
  }

  const issues = await checkIssues(page);
  if (consoleErrors.length > 0) {
    issues.push(`Console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  }

  await context.close();
  return { name, url: fullUrl, issues, screenshots: shots };
}

async function reviewARIAAndFindVendor(browser) {
  console.log(`\n=== 03_aria: ${BASE_URL}/aria ===`);
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE_URL}/aria`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const shots = [];
  shots.push(await takeScreenshot(page, '03_aria_01_initial'));
  shots.push(await takeScreenshot(page, '03_aria_02_full', true));

  await page.evaluate(() => window.scrollTo(0, 600));
  await sleep(1000);
  shots.push(await takeScreenshot(page, '03_aria_03_mid'));

  const issues = await checkIssues(page);
  if (consoleErrors.length > 0) {
    issues.push(`Console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  }

  // Find a vendor link to use for vendor profile review
  let vendorPath = null;
  try {
    const vendorLinks = await page.$$eval(
      'a[href*="/vendor"]',
      (links) => links.slice(0, 10).map((l) => new URL(l.href).pathname)
    );
    console.log(`  Found ${vendorLinks.length} vendor link(s): ${vendorLinks.slice(0, 3).join(', ')}`);
    if (vendorLinks.length > 0) vendorPath = vendorLinks[0];
  } catch (_) {}

  await context.close();
  return {
    result: { name: '03_aria', url: `${BASE_URL}/aria`, issues, screenshots: shots },
    vendorPath,
  };
}

async function reviewVendorProfile(browser, vendorPath) {
  const url = vendorPath || '/vendor/1';
  console.log(`\n=== 04_vendor_profile: ${BASE_URL}${url} ===`);
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE_URL}${url}`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const shots = [];
  shots.push(await takeScreenshot(page, '04_vendor_01_initial'));
  shots.push(await takeScreenshot(page, '04_vendor_02_full', true));

  // Check tabs
  const tabs = await page.$$('[role="tab"]');
  console.log(`  Found ${tabs.length} tab(s)`);
  for (let i = 0; i < Math.min(tabs.length, 5); i++) {
    try {
      const label = await tabs[i].textContent();
      await tabs[i].click();
      await sleep(2000);
      shots.push(await takeScreenshot(page, `04_vendor_tab${i}_${label?.trim().replace(/\s+/g, '_').slice(0, 20)}`));
    } catch (_) {}
  }

  const issues = await checkIssues(page);
  if (consoleErrors.length > 0) {
    issues.push(`Console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  }

  await context.close();
  return { name: '04_vendor_profile', url: `${BASE_URL}${url}`, issues, screenshots: shots };
}

async function main() {
  console.log('RUBLI Production Visual Review');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  // 1. Landing page
  results.push(
    await reviewPage(browser, '01_landing', '/', { scrollToBottom: true, extraWait: 5000 })
  );

  // 2. Dashboard
  results.push(
    await reviewPage(browser, '02_dashboard', '/dashboard', { extraWait: 6000 })
  );

  // 3. ARIA — also finds a vendor link
  const { result: ariaResult, vendorPath } = await reviewARIAAndFindVendor(browser);
  results.push(ariaResult);

  // 4. Vendor profile
  results.push(await reviewVendorProfile(browser, vendorPath));

  // 5. Contracts
  results.push(
    await reviewPage(browser, '05_contracts', '/contracts', { extraWait: 5000 })
  );

  // 6. Red Thread
  results.push(
    await reviewPage(browser, '06_red_thread', '/thread/1', { extraWait: 6000 })
  );

  await browser.close();

  // Print summary
  console.log('\n\n========================================');
  console.log('         VISUAL REVIEW REPORT');
  console.log('========================================\n');

  for (const r of results) {
    const status = r.issues.length === 0 ? 'OK' : `${r.issues.length} ISSUE(S)`;
    console.log(`[${status}] ${r.name}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Screenshots: ${r.screenshots.length}`);
    if (r.issues.length > 0) {
      for (const issue of r.issues) {
        console.log(`  ISSUE: ${issue}`);
      }
    }
    console.log('');
  }

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  console.log(`Total issues found: ${totalIssues}`);
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
