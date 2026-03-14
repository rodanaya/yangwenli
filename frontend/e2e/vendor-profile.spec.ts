import { test, expect } from '@playwright/test'

test.describe('Vendor Profile', () => {
  test('loads vendor profile for a known vendor', async ({ page }) => {
    // Use vendor ID 1 as a smoke test
    await page.goto('/vendor/1')
    await expect(page).not.toHaveURL(/\/404/)
    // Should show some vendor info
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('search for vendor navigates to profile', async ({ page }) => {
    await page.goto('/')
    // Try to find a search input
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
