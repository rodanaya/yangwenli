// D4 Change 8 acceptance — typing in the search must not redraw the mesh.
// Reads the TEMPORARY window.__tramaRenders counter (removed before commit).
// Usage: node renders4.mjs [baseUrl]
import { createRequire } from 'node:module'
const require = createRequire('D:/Python/yangwenli/frontend/package.json')
const { chromium } = require('playwright')
const BASE = process.argv[2] ?? 'http://localhost:3009'
if (/rubli\.xyz/.test(BASE)) { console.error('refusing to probe prod'); process.exit(2) }

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE + '/network', { waitUntil: 'networkidle', timeout: 400000 })
await page.waitForSelector('main svg[viewBox]', { timeout: 180000 })
await page.waitForTimeout(3000)

const read = () => page.evaluate(() => ({ ...(window.__tramaRenders ?? {}) }))
const zero = () => page.evaluate(() => { window.__tramaRenders = {} })

// --- typing ---------------------------------------------------------------
await zero()
const input = await page.$('main input')
await input.click()
for (const ch of 'abcde') { await page.keyboard.type(ch); await page.waitForTimeout(160) }
await page.waitForTimeout(1500)
const afterTyping = await read()

// --- hover a node ---------------------------------------------------------
await page.keyboard.press('Escape')
await zero()
const node = await page.$('main svg g[role=button], main svg g[tabindex]')
if (node) { await node.hover(); await page.waitForTimeout(700) }
const afterHover = await read()

console.log(JSON.stringify({ afterTyping, afterHover }, null, 1))
await browser.close()
