// Text-clip census: any text cut by overflow, truncate, nowrap, or SVG box.
import { createRequire } from 'node:module'
const require = createRequire('D:/Python/yangwenli/frontend/package.json')
const { chromium } = require('playwright')
const BASE = process.argv[2] ?? 'http://localhost:3009'
const routes = (process.argv[3] ?? '/stories/el-vacio,/stories/el-sexenio-del-riesgo,/stories/el-monopolio-invisible,/gap').split(',')
const widths = (process.argv[4] ?? '1440,1280,1024,390').split(',').map(Number)
if (/rubli.xyz/.test(BASE)) { console.error('refusing to probe prod'); process.exit(2) }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const probe = () => {
  const R = (e) => e.getBoundingClientRect()
  const out = []
  const clipAncestor = (el) => { let n = el.parentElement; while (n && n !== document.body) { const cs = getComputedStyle(n); if (/(hidden|clip|scroll|auto)/.test(cs.overflow + cs.overflowX + cs.overflowY)) return n; n = n.parentElement } return null }
  const main = document.querySelector('main') ?? document.body
  // STORY_DAYS principle 7 excludes sr-only and aria-hidden decoration. They
  // were not being excluded here, and on a page with several live figures they
  // filled the result list — the real hits fell past the print cap below and
  // the gate read as clean. Excluded at the source so the count IS the gate.
  const excluded = (e) => {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const cls = (n.className?.baseVal ?? n.className ?? '').toString()
      if (/\bsr-only\b/.test(cls)) return true
      if (n.getAttribute?.('aria-hidden') === 'true') return true
    }
    return false
  }
  const leaves = [...main.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent ?? '').trim().length > 0 && !['SCRIPT', 'STYLE', 'TEXT', 'TSPAN'].includes(e.tagName) && !excluded(e))
  for (const e of leaves) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const r = R(e); if (r.width === 0 || r.height === 0) continue
    // (a) own-box clip: text wider than the box (truncate / nowrap in a narrow cell)
    if (e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible') out.push({ kind: 'own-clip', txt: e.textContent.trim().slice(0, 40), over: e.scrollWidth - e.clientWidth, cls: (e.className?.baseVal ?? e.className ?? '').toString().slice(0, 50) })
    // (a2) vertical own-clip: a fixed-height/line-clamped box cutting lines
    if (e.scrollHeight > e.clientHeight + 2 && /(hidden|clip)/.test(cs.overflowY + cs.overflow)) out.push({ kind: 'own-vclip', txt: e.textContent.trim().slice(0, 40), over: e.scrollHeight - e.clientHeight, cls: (e.className?.baseVal ?? e.className ?? '').toString().slice(0, 50) })
    // (b) ancestor clip: text box escapes nearest overflow-hidden/clip ancestor
    const a = clipAncestor(e)
    if (a) { const ar = R(a); const acs = getComputedStyle(a); const scrollable = /(auto|scroll)/.test(acs.overflowX); if (!scrollable && (r.right > ar.right + 1 || r.left < ar.left - 1 || r.bottom > ar.bottom + 1)) out.push({ kind: 'ancestor-clip', txt: e.textContent.trim().slice(0, 40), over: Math.round(Math.max(r.right - ar.right, ar.left - r.left, r.bottom - ar.bottom)), anc: a.tagName + '.' + (a.className?.toString() ?? '').slice(0, 40) }) }
  }
  // (d) any block with overflow hidden whose content is taller than itself (text cut across a line)
  for (const b of main.querySelectorAll('div, p, figcaption, li, span, a, h1, h2, h3, h4')) { if (excluded(b)) continue; const cs = getComputedStyle(b); if (!/(hidden|clip)/.test(cs.overflowY + cs.overflow)) continue; if (b.scrollHeight > b.clientHeight + 2 && (b.textContent ?? '').trim()) { const r = R(b); if (!r.width || !r.height) continue;
    // The aria-hidden exemption applies to the SOURCE of the overflow, not
    // just to the block. ChapterBanner clips a 14rem decorative numeral marked
    // aria-hidden; what overflows is that glyph's INK, which no bounding rect
    // reports — so the test is the other way round: a block that holds no text
    // of its own and whose every child box fits is cutting chrome, not text.
    // A clamped <p> owns its text node and stays reported; a wrapper whose
    // child text box escapes still has that child in `over`.
    const ownText = [...b.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim())
    const over = [...b.querySelectorAll('*')].filter((d) => R(d).bottom > r.bottom + 1)
    if (!ownText && over.every((d) => excluded(d))) continue
    out.push({ kind: 'block-vclip', txt: b.textContent.trim().slice(0, 40), over: b.scrollHeight - b.clientHeight, cls: (b.className?.toString() ?? '').slice(0, 60) }) } }
  // (e) narrow caption: text inside a figure that wraps to 2+ lines while
  // sitting in well under the figure's content width — the "ragged column of
  // caption beside empty figure" the user complained about twice on 2026-09-18.
  // Measured against the figure's CONTENT width (its box minus its own
  // padding), so a card with 20px gutters is not counted as 40px of slack.
  for (const fig of main.querySelectorAll('figure')) {
    for (const el of fig.querySelectorAll('p, figcaption, li')) {
      if (excluded(el)) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = R(el)
      if (r.width === 0 || r.height === 0) continue
      // Measured against the element's OWN parent box, not the figure's.
      // Against the figure, every cell of a multi-column block inside a plate
      // reads as "narrow" when it is simply filling its column, and a plate
      // caption that deliberately sets a 64ch serif measure reads as a bug.
      // What this is looking for is text that does not fill the box it was
      // put in — which is exactly what the site measure did to chart captions.
      const parent = el.parentElement
      if (!parent) continue
      const pcs = getComputedStyle(parent)
      const contentW = R(parent).width - parseFloat(pcs.paddingLeft || '0') - parseFloat(pcs.paddingRight || '0')
      if (contentW <= 0) continue
      // An inline max-width is someone choosing a measure on purpose.
      if (el.style.maxWidth) continue
      // Centred text is exempt: a centred measure is a deliberate editorial
      // device (DataPullquote's closing verdict), not a caption stranded at
      // half width. index.css already carves the same exemption out of the
      // site measure for `.text-center` blocks. The bug this check is for is
      // LEFT-aligned caption text sitting in a narrow ragged column with the
      // figure's white space beside it.
      if (cs.textAlign === 'center') continue
      const fs = parseFloat(cs.fontSize)
      // Its own box may be inset by padding too; compare like with like.
      const own = r.width
      const lines = r.height / Math.max(fs, 1)
      if (own < contentW * 0.85 && lines > 1.6) {
        out.push({
          kind: 'narrow-caption',
          txt: el.textContent.trim().slice(0, 40),
          over: Math.round(contentW - own),
          cls: `${Math.round(own)}px of ${Math.round(contentW)}px · ${(cs.className ?? el.className ?? '').toString().slice(0, 40)}`,
        })
      }
    }
  }
  // (c) SVG text outside its svg box
  for (const t of main.querySelectorAll('svg text')) { const svg = t.ownerSVGElement; if (!svg) continue; const r = R(t), s = R(svg); if (r.width && (r.right > s.right + 1 || r.left < s.left - 1)) out.push({ kind: 'svg-clip', txt: t.textContent.trim().slice(0, 40), over: Math.round(Math.max(r.right - s.right, s.left - r.left)) }) }
  return out
}
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, isMobile: w < 500, locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(BASE + '/network', { waitUntil: 'domcontentloaded', timeout: 400000 })
  await page.evaluate((l) => localStorage.setItem('i18nextLng', l), process.env.LANG_ES ? 'es' : 'en')
  for (const route of routes) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 })
      // D4 § Change 3 gives the rail rows `content-visibility: auto`. A skipped
      // subtree has no layout boxes, so its text would read as "not clipped"
      // for free. Force every row to lay out before the census measures.
      await page.addStyleTag({ content: '*, *::before, *::after { content-visibility: visible !important }' })
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)) } window.scrollTo(0, 0) })
      await page.waitForTimeout(1500)
      const r = await page.evaluate(probe)
      console.log(`### ${route} @${w}: ${r.length} clipped`)
      for (const x of r.slice(0, 40)) console.log('   ', x.kind, `+${x.over}px`, JSON.stringify(x.txt), x.cls ?? x.anc ?? '')
    } catch (e) { console.log(route, w, 'ERR', String(e).slice(0, 100)) }
  }
  await ctx.close()
}
await browser.close()
