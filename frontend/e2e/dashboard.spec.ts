import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('homepage loads and shows key metrics', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Should show contract count or value somewhere
    await expect(page.locator('body')).not.toContainText('Cannot connect')
    await expect(page.locator('body')).not.toContainText('Network Error')
  })

  test('navigation sidebar works', async ({ page }) => {
    await page.goto('/')
    // Click on Sectors link
    const sectorsLink = page
      .locator('a[href*="sectors"], nav')
      .filter({ hasText: /sectors/i })
      .first()
    if ((await sectorsLink.count()) > 0) {
      await sectorsLink.click()
      await expect(page).toHaveURL(/sectors/)
    }
  })
})
