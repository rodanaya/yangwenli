/**
 * Visual review script for RUBLI production app at http://37.60.232.109
 * Run: node scripts/visual_review.mjs
 * Requires: npx playwright install chromium (if not already installed)
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://37.60.232.109';
const VIEWPORT = { width: 1440, height: 900 };
const TIMEOUT = 30000;

const pages = [
  { name: '01_landing', url: '/', waitFor: 'networkidle', scrollToBottom: true },
  { name: '02_dashboard', url: '/dashboard', waitFor: 'networkidle', scrollToBottom: false },
  { name: '03_aria', url: '/aria', waitFor: 'networkidle', scrollToBottom: false },
  { name: '04_contracts', url: '/contracts', waitFor: 'networkidle', scrollToBottom: false },
  { name: '05_red_thread', url: '/thread/1', waitFor: 'networkidle', scrollToBottom: false },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureSection(page, name, label) {
  const path = join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  [screenshot] ${label} -> ${path}`);
  return path;
}

async function captureFullPage(page, name) {
  const path = join(SCREENSHOTS_DIR, `${name}_full.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  [screenshot-full] ${name} -> ${path}`);
  return path;
}

async function collectConsoleMessages(page) {
  const messages = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  return messages;
}

async function checkPageContent(page, pageName) {
  const issues = [];

  // Check for loading spinners still visible
  const spinners = await page.$$('[class*="spinner"], [class*="loading"], [class*="skeleton"]');
  if (spinners.length > 0) {
    issues.push(`${spinners.length} loading spinner(s)/skeleton(s) still present`);
  }

  // Check for error states
  const errorTexts = await page.$$eval(
    '[class*="error"], [class*="Error"]',
    (els) => els.filter((el) => el.offsetParent !== null).map((el) => el.textContent?.trim()).filter(Boolean)
  );
  if (errorTexts.length > 0) {
    issues.push(`Error elements found: ${errorTexts.slice(0, 3).join(' | ')}`);
  }

  // Check for "undefined", "NaN", "null" visible in text content
  const bodyText = await page.evaluate(() => document.body.innerText);
  const badTokens = ['undefined', 'NaN', 'null', 'Error:', '404', '500'];
  for (const token of badTokens) {
    const count = (bodyText.match(new RegExp(`\\b${token}\\b`, 'gi')) || []).length;
    if (count > 0) {
      issues.push(`"${token}" appears ${count} time(s) in visible text`);
    }
  }

  // Check for hardcoded English that should be Spanish
  // Look for common English UI labels that should be Spanish in a bilingual app
  const englishOnly = [
    'Loading...',
    'No data available',
    'Something went wrong',
    'Please try again',
  ];
  for (const phrase of englishOnly) {
    if (bodyText.includes(phrase)) {
      issues.push(`English-only text found: "${phrase}"`);
    }
  }

  return issues;
}

async function reviewPage(browser, pageConfig) {
  const { name, url, waitFor, scrollToBottom } = pageConfig;
  const fullUrl = BASE_URL + url;
  console.log(`\n=== Reviewing: ${name} (${fullUrl}) ===`);

  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleMessages.push(`[console.error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleMessages.push(`[page.error] ${err.message}`);
  });

  let navigationError = null;
  try {
    await page.goto(fullUrl, {
      timeout: TIMEOUT,
      waitUntil: waitFor || 'domcontentloaded',
    });
    // Extra wait for React to render and API calls to settle
    await sleep(4000);
  } catch (err) {
    navigationError = err.message;
    console.log(`  [nav error] ${err.message}`);
  }

  const screenshots = [];

  if (!navigationError) {
    // Initial viewport screenshot
    screenshots.push(await captureSection(page, `${name}_viewport`, `${name} - viewport`));

    // Scroll down slowly to trigger lazy loading
    if (scrollToBottom) {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 500;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 200);
        });
      });
      await sleep(2000);
    }

    // Full page screenshot
    screenshots.push(await captureFullPage(page, name));

    // For ARIA page — also scroll down to see vendor list
    if (name.includes('aria')) {
      await page.evaluate(() => window.scrollTo(0, 600));
      await sleep(1000);
      screenshots.push(await captureSection(page, `${name}_scrolled`, `${name} - scrolled`));
    }

    // For dashboard — also scroll down to see charts
    if (name.includes('dashboard')) {
      await page.evaluate(() => window.scrollTo(0, 800));
      await sleep(1000);
      screenshots.push(await captureSection(page, `${name}_charts`, `${name} - charts area`));
    }
  }

  const issues = navigationError ? [`Navigation failed: ${navigationError}`] : await checkPageContent(page, name);

  if (consoleMessages.length > 0) {
    issues.push(...consoleMessages.slice(0, 5));
  }

  await context.close();

  return {
    page: name,
    url: fullUrl,
    screenshots,
    issues,
  };
}

async function findT1Vendor(browser) {
  console.log('\n=== Finding T1 vendor from ARIA ===');
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/aria`, { timeout: TIMEOUT, waitUntil: 'networkidle' });
    await sleep(4000);

    // Try to find a vendor link from the T1 tier
    const vendorLinks = await page.$$eval(
      'a[href*="/vendor/"], a[href*="/vendors/"]',
      (links) => links.slice(0, 5).map((l) => l.href)
    );

    if (vendorLinks.length > 0) {
      console.log(`  Found vendor links: ${vendorLinks.slice(0, 3).join(', ')}`);
      await context.close();
      return vendorLinks[0];
    }

    // Fallback: try clicking on first vendor card
    const firstVendorCard = await page.$('[class*="vendor"], [class*="Vendor"]');
    if (firstVendorCard) {
      const link = await firstVendorCard.$('a');
      if (link) {
        const href = await link.getAttribute('href');
        await context.close();
        return href ? BASE_URL + href : null;
      }
    }
  } catch (err) {
    console.log(`  Could not find T1 vendor: ${err.message}`);
  }

  await context.close();
  // Fallback to a known vendor ID
  return `${BASE_URL}/vendor/1`;
}

async function main() {
  console.log('Starting RUBLI production visual review...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Screenshots directory: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  // Review main pages
  for (const pageConfig of pages) {
    const result = await reviewPage(browser, pageConfig);
    results.push(result);
  }

  // Find a T1 vendor and review vendor profile
  const vendorUrl = await findT1Vendor(browser);
  if (vendorUrl) {
    const vendorPath = vendorUrl.replace(BASE_URL, '');
    const vendorResult = await reviewPage(browser, {
      name: '06_vendor_profile',
      url: vendorPath,
      waitFor: 'networkidle',
      scrollToBottom: false,
    });
    results.push(vendorResult);

    // Try to capture tabs on vendor profile
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    try {
      await page.goto(vendorUrl, { timeout: TIMEOUT, waitUntil: 'networkidle' });
      await sleep(3000);
      const tabs = await page.$$('[role="tab"], [class*="tab"]');
      console.log(`\n  Found ${tabs.length} tab(s) on vendor profile`);
      for (let i = 0; i < Math.min(tabs.length, 4); i++) {
        try {
          await tabs[i].click();
          await sleep(1500);
          const tabName = await tabs[i].textContent();
          const tabScreenshot = join(SCREENSHOTS_DIR, `06_vendor_tab_${i}.png`);
          await page.screenshot({ path: tabScreenshot, fullPage: false });
          console.log(`  [tab ${i}] "${tabName?.trim()}" -> ${tabScreenshot}`);
        } catch (_) {
          // tab click failed, skip
        }
      }
    } catch (err) {
      console.log(`  Vendor tab review error: ${err.message}`);
    }
    await context.close();
  }

  await browser.close();

  // Summary report
  console.log('\n\n========== VISUAL REVIEW SUMMARY ==========\n');
  for (const result of results) {
    console.log(`PAGE: ${result.page}`);
    console.log(`URL: ${result.url}`);
    console.log(`Screenshots: ${result.screenshots.length} captured`);
    if (result.issues.length === 0) {
      console.log('Issues: NONE DETECTED');
    } else {
      console.log(`Issues (${result.issues.length}):`);
      for (const issue of result.issues) {
        console.log(`  - ${issue}`);
      }
    }
    console.log('');
  }

  console.log(`All screenshots saved to: ${SCREENSHOTS_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
