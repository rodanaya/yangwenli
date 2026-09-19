// PARALLAX Day 4 audit — /network (La Trama). msedge channel, LOCAL backend only.
// Usage: node audit4.mjs [baseUrl] [tag]      (LANG_ES=1 for Spanish)
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('D:/Python/yangwenli/frontend/package.json')
const { chromium } = require('playwright')
const BASE = process.argv[2] ?? 'http://localhost:3009'
const TAG = process.argv[3] ?? 'before'
const LANG = process.env.LANG_ES ? 'es' : 'en'
const OUT = `D:/Python/yangwenli/.claude/worktrees/parallax-day01/_parallax_shots/day04/${TAG}`
fs.mkdirSync(OUT, { recursive: true })
if (/rubli\.xyz/.test(BASE)) { console.error('refusing to probe prod'); process.exit(2) }
const routes = [
  ['clusters', '/network'],
  ['buyers', '/network?lens=institutions'],
]
const browser = await chromium.launch({ channel: 'msedge', headless: true })

const probe = () => {
  const main = document.querySelector('main') ?? document.body
  const R = (el) => el.getBoundingClientRect()
  const hidden = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { if (n.getAttribute?.('aria-hidden') === 'true' || /\bsr-only\b/.test((n.className?.baseVal ?? n.className ?? '').toString())) return true } return false }
  const leaves = [...main.querySelectorAll('*')].filter((el) => el.textContent?.trim() && el.children.length === 0 && !['SCRIPT', 'STYLE'].includes(el.tagName) && !hidden(el))
  // rendered font size: SVG text scales with its viewBox
  const small = []
  for (const el of leaves) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || !R(el).width) continue
    let fs = parseFloat(cs.fontSize)
    const svg = el.ownerSVGElement
    if (svg) { const vb = svg.viewBox?.baseVal?.width; if (vb) fs = fs * (R(svg).width / vb) }
    if (fs < 10) small.push({ fs: +fs.toFixed(1), tag: el.tagName, txt: el.textContent.trim().slice(0, 44), svg: !!svg })
  }
  const bySize = {}; for (const s of small) bySize[s.fs] = (bySize[s.fs] ?? 0) + 1
  // largest rendered SVG text (the scale bug runs both ways)
  const svgScale = [...main.querySelectorAll('svg[viewBox]')].filter((s) => R(s).width > 200).map((s) => ({ vb: s.viewBox.baseVal.width, w: Math.round(R(s).width), scale: +(R(s).width / s.viewBox.baseVal.width).toFixed(2), texts: s.querySelectorAll('text').length }))
  // low-opacity text tokens (text-text-muted/45 etc.) — contrast
  const faint = leaves.filter((e) => /text-text-muted\/(30|40|45|50|60)/.test((e.className?.baseVal ?? e.className ?? '').toString()) || /text-text-muted\/(30|40|45|50|60)/.test((e.parentElement?.className ?? '').toString())).length
  const italic = leaves.filter((e) => getComputedStyle(e).fontStyle === 'italic').length
  // frame: centered containers, plate widths, box-vs-text slack
  const container = main.querySelector('.max-w-6xl, [data-frame]')
  const cR = container ? R(container) : null
  const mR = R(main)
  const plates = [...main.querySelectorAll('figure, [data-plate]')].map((p) => ({ w: Math.round(R(p).width), left: Math.round(R(p).left) }))
  const proseP = [...main.querySelectorAll('p')].filter((p) => (p.textContent ?? '').trim().length > 140 && !hidden(p)).map((p) => ({ w: Math.round(R(p).width), left: Math.round(R(p).left), fs: parseFloat(getComputedStyle(p).fontSize), chars: p.textContent.trim().length, txt: p.textContent.trim().slice(0, 30) }))
  const boxes = [...main.querySelectorAll('.rounded-sm.border')].filter((b) => R(b).width > 300 && b.querySelector('p, li, span')).map((b) => {
    const texts = [...b.querySelectorAll('p, li, span, a, button')].filter((t) => t.textContent.trim() && !hidden(t) && R(t).width)
    const maxRight = texts.length ? Math.max(...texts.map((t) => R(t).right)) : R(b).left
    const inner = R(b).right - parseFloat(getComputedStyle(b).paddingRight)
    return { w: Math.round(R(b).width), slack: Math.round(inner - maxRight), txt: b.textContent.trim().slice(0, 28) }
  })
  const textLefts = [...new Set([...main.querySelectorAll('h1, h2, h3, p, figure')].filter((e) => !hidden(e) && R(e).width > 200).map((e) => Math.round(R(e).left)))].sort((a, b) => a - b)
  // a11y facts
  const headings = [...main.querySelectorAll('h1,h2,h3,h4,[role=heading]')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 40))
  const tablist = [...main.querySelectorAll('[role=tablist]')].map((t) => ({ label: t.getAttribute('aria-label'), tabs: t.querySelectorAll('[role=tab]').length, panels: main.querySelectorAll('[role=tabpanel]').length, controls: [...t.querySelectorAll('[role=tab]')].filter((x) => x.getAttribute('aria-controls')).length }))
  const divButtons = main.querySelectorAll('div[role=button]').length
  const nestedInteractive = [...main.querySelectorAll('[role=button] button, [role=button] a, a a, button button')].length
  const listNoItems = [...main.querySelectorAll('[role=list]')].filter((l) => !l.querySelector('[role=listitem], li')).length
  const svgFocusable = main.querySelectorAll('svg [tabindex="0"]').length
  const noFocusRing = [...main.querySelectorAll('button, [role=button], [role=tab], input, a')].filter((e) => /outline-none/.test((e.className?.baseVal ?? e.className ?? '').toString()) && !/focus-visible:(ring|outline|border)/.test((e.className?.baseVal ?? e.className ?? '').toString())).length
  const pressedNoLabel = [...main.querySelectorAll('button:not([aria-label])')].filter((b) => !b.textContent.trim()).length
  const liveRegions = main.querySelectorAll('[aria-live], [role=status]').length
  const titleOnly = main.querySelectorAll('[title]').length
  const lineClamped = [...main.querySelectorAll('*')].filter((e) => getComputedStyle(e).webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 2).map((e) => e.textContent.trim().slice(0, 50))
  const truncated = [...main.querySelectorAll('.truncate')].filter((e) => e.scrollWidth > e.clientWidth + 1 && !hidden(e)).map((e) => e.textContent.trim().slice(0, 50))
  const ellipsisNames = leaves.filter((e) => /…$/.test(e.textContent.trim()) && e.textContent.trim().length > 8).map((e) => e.textContent.trim().slice(0, 44))
  const scrollers = [...main.querySelectorAll('*')].filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 4).map((e) => ({ h: e.clientHeight, sh: e.scrollHeight, kids: e.children.length }))
  const docOverflow = document.documentElement.scrollWidth - window.innerWidth
  const touchSmall = [...main.querySelectorAll('button, [role=button], [role=tab], a')].filter((e) => { const r = R(e); return r.width && (r.height < 24 || r.width < 24) }).length
  const footers = document.querySelectorAll('footer, .page-footer').length
  const usdInEs = leaves.filter((e) => /US\$/.test(e.textContent)).length
  return { smallCount: small.length, bySize, smallSample: small.slice(0, 14), svgScale, faint, italic, container: cR ? { w: Math.round(cR.width), left: Math.round(cR.left - mR.left), right: Math.round(mR.right - cR.right) } : null, plates, proseP, boxes, textLefts, headings, tablist, divButtons, nestedInteractive, listNoItems, svgFocusable, noFocusRing, pressedNoLabel, liveRegions, titleOnly, lineClamped, truncated, ellipsisNames, scrollers, docOverflow, touchSmall, footers, usdInEs, docH: document.documentElement.scrollHeight }
}

const report = {}
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)) })
  await page.goto(BASE + '/network', { waitUntil: 'domcontentloaded', timeout: 400000 })
  await page.evaluate((l) => localStorage.setItem('i18nextLng', l), LANG)
  for (const [name, route] of routes) {
    const t0 = Date.now()
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 180000 })
    await page.waitForSelector('main svg[viewBox]', { timeout: 120000 }).catch(() => {})
    // Rail rows carry `content-visibility: auto` (Change 3); a skipped subtree
    // has no boxes, so every measurement below would silently pass. Lay it out.
    await page.addStyleTag({ content: '*, *::before, *::after { content-visibility: visible !important }' })
    await page.waitForTimeout(2500)
    const r = await page.evaluate(probe)
    r.loadMs = Date.now() - t0
    r.consoleErrors = errors.splice(0)
    report[`${name}@${w}`] = r
    await page.screenshot({ path: `${OUT}/${LANG}-${name}-${w}-full.png`, fullPage: true })
    await page.screenshot({ path: `${OUT}/${LANG}-${name}-${w}-top.png` })
    console.log(`${name}@${w}: sub10=${r.smallCount} ${JSON.stringify(r.bySize)} clamp=${r.lineClamped.length} trunc=${r.truncated.length} ellipsis=${r.ellipsisNames.length} overflow=${r.docOverflow} docH=${r.docH} load=${r.loadMs}ms errs=${r.consoleErrors.length}`)
  }
  await ctx.close()
}
fs.writeFileSync(`${OUT}/${LANG}-report.json`, JSON.stringify(report, null, 1))
await browser.close()
