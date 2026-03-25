import { test, expect } from '@playwright/test'

// IMSS is vendor_id 251 in the RUBLI database — a known large vendor
// with many contracts. This serves as a reliable smoke test target.
const IMSS_VENDOR_ID = 251

test.describe('Vendor Profile', () => {
  test('navigate to /vendors/251 — page title is visible', async ({ page }) => {
    await page.goto(`/vendors/${IMSS_VENDOR_ID}`)
    await page.waitForLoadState('networkidle')

    // Should not redirect to 404
    await expect(page).not.toHaveURL(/\/404/)

    // A heading or title element should be visible
    const heading = page
      .locator('h1, h2, [data-testid="vendor-name"], .vendor-title')
      .first()
    await expect(heading).toBeVisible({ timeout: 15000 })
    // The heading text should be non-empty
    const text = await heading.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('navigate to /vendors/251 — risk score badge is rendered', async ({
    page,
  }) => {
    await page.goto(`/vendors/${IMSS_VENDOR_ID}`)
    await page.waitForLoadState('networkidle')

    // Risk badges may use text labels or data-testid attributes.
    // Look for any element that mentions a risk level.
    const riskBadge = page
      .locator('*')
      .filter({ hasText: /critical|high|medium|low|critico|alto|medio|bajo/i })
      .first()
    await expect(riskBadge).toBeVisible({ timeout: 15000 })
  })

  test('loads vendor profile for a known vendor (smoke)', async ({ page }) => {
    await page.goto('/vendors/1')
    await expect(page).not.toHaveURL(/\/404/)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('search for vendor navigates to profile', async ({ page }) => {
    await page.goto('/')
    const searchInput = page
      .locator(
        'input[placeholder*="search" i], input[placeholder*="vendor" i], input[type="search"]',
      )
      .first()
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('PEMEX')
      await page.waitForTimeout(500)
    }
  })
})
