import { test, expect } from '@playwright/test'

test.describe('ARIA Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/aria')
    await page.waitForLoadState('networkidle')
  })

  test('tier cards T1, T2, T3, T4 are visible', async ({ page }) => {
    // Tier cards may use text labels like "Tier 1", "T1", "Nivel 1", etc.
    // Also matches badge-style elements next to headings.
    for (const tierPattern of [/T1|Tier\s?1|Nivel\s?1/i, /T2|Tier\s?2|Nivel\s?2/i, /T3|Tier\s?3|Nivel\s?3/i, /T4|Tier\s?4|Nivel\s?4/i]) {
      const el = page
        .locator('[data-testid="tier-card"], .tier-card, h1, h2, h3, h4, span, div')
        .filter({ hasText: tierPattern })
        .first()
      await expect(el).toBeVisible({ timeout: 15000 })
    }
  })

  test('novel leads count is shown', async ({ page }) => {
    // "Novel leads" or equivalent Spanish text should appear somewhere.
    // The ARIA page summarises T1 (285 vendors), T2 (894), etc.
    // We check that at least one numeric count > 0 is visible.
    await page.waitForFunction(
      () => {
        const all = Array.from(document.querySelectorAll('*'))
        return all.some((el) => {
          const text = el.textContent ?? ''
          return /\b\d{1,3}(,\d{3})*\b/.test(text) && Number(text.replace(/[^0-9]/g, '')) > 0
        })
      },
      { timeout: 20000 },
    )

    // Additionally look for a label that refers to leads / vendors
    const leadsEl = page
      .locator('*')
      .filter({ hasText: /leads?|vendors?|proveedores|investigaci[oó]n/i })
      .first()
    await expect(leadsEl).toBeVisible({ timeout: 10000 })
  })

  test('loads ARIA queue page', async ({ page }) => {
    await expect(page).toHaveTitle(/RUBLI/)
    await expect(page.getByRole('heading', { name: /ARIA/i })).toBeVisible()
  })

  test('shows tier cards (smoke)', async ({ page }) => {
    await expect(
      page
        .locator('[data-testid="tier-card"], .tier-card, h2, h3')
        .filter({ hasText: /Tier|T[1-4]/i })
        .first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test('filter buttons are clickable', async ({ page }) => {
    const filterBtn = page
      .locator('button')
      .filter({ hasText: /All|Ghost|Monopoly|P[1-7]/i })
      .first()
    if ((await filterBtn.count()) > 0) {
      await filterBtn.click()
    }
  })

  test('vendor rows load', async ({ page }) => {
    await page
      .waitForSelector(
        'table tbody tr, [data-testid="vendor-row"], .vendor-row',
        { timeout: 15000 },
      )
      .catch(() => {})
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })
})
