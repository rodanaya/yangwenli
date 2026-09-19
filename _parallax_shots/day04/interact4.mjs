// D4 interaction acceptance — rail rows (Change 3) + keyboard/semantics (Change 6).
// Usage: node interact4.mjs [baseUrl]   (LANG_ES=1 for Spanish)
import { createRequire } from 'node:module'
const require = createRequire('D:/Python/yangwenli/frontend/package.json')
const { chromium } = require('playwright')
const BASE = process.argv[2] ?? 'http://localhost:3009'
const LANG = process.env.LANG_ES ? 'es' : 'en'
if (/rubli\.xyz/.test(BASE)) { console.error('refusing to probe prod'); process.exit(2) }

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const out = {}
await page.goto(BASE + '/network', { waitUntil: 'domcontentloaded', timeout: 400000 })
await page.evaluate((l) => localStorage.setItem('i18nextLng', l), LANG)
await page.goto(BASE + '/network', { waitUntil: 'networkidle', timeout: 180000 })
await page.waitForSelector('main aside ul li button', { timeout: 180000 })
await page.waitForTimeout(2500)

// --- structure ------------------------------------------------------------
out.structure = await page.evaluate(() => {
  const main = document.querySelector('main')
  const rows = [...main.querySelectorAll('aside ul > li')]
  return {
    divButtons: main.querySelectorAll('div[role=button]').length,
    nested: main.querySelectorAll('button button, button a, a button, [role=button] button').length,
    roleList: main.querySelectorAll('[role=list]').length,
    tablist: main.querySelectorAll('[role=tablist]').length,
    rows: rows.length,
    rowsWithButton: rows.filter((li) => li.querySelector(':scope > button')).length,
    liveRegions: main.querySelectorAll('[aria-live], [role=status]').length,
  }
})

// --- statline: <= 2 lines, no intra-stat wrap -----------------------------
out.statlines = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('main aside ul > li')]
  let worstLines = 0
  let intraWrap = 0
  for (const li of rows) {
    const stat = [...li.querySelectorAll('span')].find((s) => /flex-wrap/.test(s.className) && /gap-x-2\.5/.test(s.className))
    if (!stat) continue
    const fs = parseFloat(getComputedStyle(stat).fontSize)
    // exact: how many distinct y-rows the flex items land on
    const tops = new Set([...stat.children].map((c) => Math.round(c.getBoundingClientRect().top)))
    worstLines = Math.max(worstLines, tops.size)
    for (const item of stat.children) {
      const r = item.getBoundingClientRect()
      if (r.height > fs * 1.9) intraWrap++
    }
  }
  return { rows: rows.length, worstLines, intraWrap }
})

// --- pin toggles + persists ------------------------------------------------
const pinBtn = await page.$('main aside ul > li button[aria-label*="Pin"], main aside ul > li button[aria-label*="Fijar"]')
if (pinBtn) {
  const label = await pinBtn.getAttribute('aria-label')
  await pinBtn.click()
  await page.waitForTimeout(400)
  const stored = await page.evaluate(() => localStorage.getItem('rubli_trama_pins_v1'))
  await page.reload({ waitUntil: 'networkidle', timeout: 180000 })
  await page.waitForSelector('main aside ul li button', { timeout: 180000 })
  await page.waitForTimeout(2000)
  const afterReload = await page.evaluate(() => localStorage.getItem('rubli_trama_pins_v1'))
  const pressed = await page.evaluate(() => [...document.querySelectorAll('main aside ul > li button[aria-pressed=true]')].filter((b) => /Pin|Fijar|Unpin|Desfijar/.test(b.getAttribute('aria-label') ?? '')).length)
  out.pin = { label, stored, afterReload, pressedAfterReload: pressed }
} else out.pin = 'NO PIN BUTTON FOUND'

// --- keyboard select on a row + scroll into view --------------------------
out.keyboard = await page.evaluate(async () => {
  const rows = [...document.querySelectorAll('main aside ul > li > button[aria-pressed]')]
  const target = rows.find((b) => b.getAttribute('aria-pressed') === 'false') ?? rows[1]
  target.focus()
  const focused = document.activeElement === target
  const before = new URL(location.href).searchParams.get('comm')
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  target.click() // Enter on a real <button> fires click natively in a browser
  await new Promise((r) => setTimeout(r, 600))
  return { focused, before, after: new URL(location.href).searchParams.get('comm') }
})

// --- tab order + tab stops inside each graph ------------------------------
out.tabOrder = []
await page.goto(BASE + '/network', { waitUntil: 'networkidle', timeout: 180000 })
await page.waitForSelector('main aside ul li button', { timeout: 180000 })
await page.waitForTimeout(2000)
await page.evaluate(() => (document.querySelector('main') ?? document.body).focus())
for (let i = 0; i < 26; i++) {
  await page.keyboard.press('Tab')
  const d = await page.evaluate(() => {
    const a = document.activeElement
    if (!a) return null
    const inSvg = !!a.closest('svg')
    return { tag: a.tagName, label: (a.getAttribute('aria-label') ?? a.textContent ?? '').trim().slice(0, 30), inSvg }
  })
  out.tabOrder.push(d)
}
out.svgTabStops = await page.evaluate(() => {
  const g = [...document.querySelectorAll('main svg')].map((s) => s.querySelectorAll('[tabindex="0"]').length)
  return g
})

console.log(JSON.stringify(out, null, 1))
await browser.close()
