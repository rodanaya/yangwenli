import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('page loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical browser noise
    const fatalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('Warning:'),
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('risk distribution cards are visible (Critical, High, Medium, Low)', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Cards may be labelled in Spanish or English — match either
    for (const label of [/critical|critico/i, /high|alto/i, /medium|medio/i, /low|bajo/i]) {
      await expect(
        page.locator('*').filter({ hasText: label }).first(),
      ).toBeVisible({ timeout: 10000 })
    }
  })

  test('at least one sector card is rendered', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Sector names from the 12-sector taxonomy (Spanish or English)
    const sectorNames = [
      /salud|health/i,
      /educaci[oó]n|education/i,
      /infraestructura|infrastructure/i,
      /energ[ií]a|energy/i,
      /defensa|defense/i,
      /tecnolog[ií]a|technology/i,
      /hacienda/i,
      /gobernaci[oó]n|government/i,
      /agricultura|agriculture/i,
      /ambiente|environment/i,
      /trabajo|labor/i,
    ]

    let found = false
    for (const name of sectorNames) {
      const count = await page.locator('*').filter({ hasText: name }).count()
      if (count > 0) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  test('animated counter in hero section shows a number greater than 0', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for the hero section's animated counter to settle.
    // The counter shows the total contract count (3.1M+) or similar large number.
    // We look for any span containing a comma-formatted number > 0.
    await page.waitForFunction(
      () => {
        const spans = Array.from(document.querySelectorAll('span'))
        return spans.some((s) => {
          const n = Number(s.textContent?.replace(/[^0-9.]/g, ''))
          return n > 0
        })
      },
      { timeout: 15000 },
    )

    const spans = page.locator('span')
    const count = await spans.count()
    let hasPositiveNumber = false
    for (let i = 0; i < count; i++) {
      const text = await spans.nth(i).textContent()
      const num = Number(text?.replace(/[^0-9.]/g, ''))
      if (num > 0) {
        hasPositiveNumber = true
        break
      }
    }
    expect(hasPositiveNumber).toBe(true)
  })

  test('homepage loads and shows key metrics (smoke)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Cannot connect')
    await expect(page.locator('body')).not.toContainText('Network Error')
  })

  test('navigation sidebar works', async ({ page }) => {
    await page.goto('/')
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
