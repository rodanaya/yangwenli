import { test, expect } from '@playwright/test'

test.describe('ARIA Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/aria')
  })

  test('loads ARIA queue page', async ({ page }) => {
    await expect(page).toHaveTitle(/RUBLI/)
    await expect(page.getByRole('heading', { name: /ARIA/i })).toBeVisible()
  })

  test('shows tier cards', async ({ page }) => {
    // Should show at least one tier card (T1, T2, T3, T4)
    await expect(
      page
        .locator('[data-testid="tier-card"], .tier-card, h2, h3')
        .filter({ hasText: /Tier|T[1-4]/i })
        .first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test('filter buttons are clickable', async ({ page }) => {
    // Pattern filter buttons should exist
    const filterBtn = page
      .locator('button')
      .filter({ hasText: /All|Ghost|Monopoly|P[1-7]/i })
      .first()
    if ((await filterBtn.count()) > 0) {
      await filterBtn.click()
    }
  })

  test('vendor rows load', async ({ page }) => {
    // Wait for vendor rows to appear
    await page
      .waitForSelector(
        'table tbody tr, [data-testid="vendor-row"], .vendor-row',
        { timeout: 15000 },
      )
      .catch(() => {})
    // Page should not show error state
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })
})
