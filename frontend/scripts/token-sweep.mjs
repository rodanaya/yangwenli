#!/usr/bin/env node
/**
 * Token sweep — one-shot migration of dark-mode Tailwind / white classes to
 * bible-aligned semantic tokens (ART_DIRECTION.md §2, §3, §5).
 *
 * Skips files that are legitimately dark-context:
 *   - components/layout/Sidebar.tsx  (sidebar stays dark, bible §2)
 *
 * Does NOT touch the new primitive layer (components/charts/editorial/*)
 * which was authored correctly from the start.
 */

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'src')

const SKIP = new Set([
  path.resolve(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.tsx'),
])

const SKIP_DIRS = [
  path.resolve(__dirname, '..', 'src', 'components', 'charts', 'editorial'),
]

/**
 * Ordered replacement rules.
 * Order matters — more specific patterns first, so "text-zinc-900" doesn't
 * get partially matched by "text-zinc-9" etc.
 */
const RULES = [
  // ── TEXT COLORS ─────────────────────────────────────────────────────────
  // Primary family (white-ish → text-text-primary)
  [/\btext-white\b(?!\/)/g, 'text-text-primary'],
  [/\btext-white\/90\b/g, 'text-text-primary'],
  [/\btext-zinc-50\b/g, 'text-text-primary'],
  [/\btext-zinc-100\b/g, 'text-text-primary'],

  // Secondary family (zinc 200-400 → text-text-secondary)
  [/\btext-zinc-200\b/g, 'text-text-secondary'],
  [/\btext-zinc-300\b/g, 'text-text-secondary'],
  [/\btext-zinc-400\b/g, 'text-text-secondary'],

  // Muted family (zinc 500-600 → text-text-muted)
  [/\btext-zinc-500\b/g, 'text-text-muted'],
  [/\btext-zinc-600\b/g, 'text-text-muted'],

  // Dark zinc used as text on dark grounds — those grounds are now cream,
  // so the text needs to be dark to be visible.
  [/\btext-zinc-700\b/g, 'text-text-primary'],
  [/\btext-zinc-800\b/g, 'text-text-primary'],
  [/\btext-zinc-900\b/g, 'text-text-primary'],
  [/\btext-zinc-950\b/g, 'text-text-primary'],

  // White with alpha — opacity-specific → text-muted
  [/\btext-white\/25\b/g, 'text-text-muted'],
  [/\btext-white\/50\b/g, 'text-text-muted'],
  [/\btext-white\/60\b/g, 'text-text-muted'],
  [/\btext-white\/70\b/g, 'text-text-secondary'],
  [/\btext-white\/80\b/g, 'text-text-secondary'],

  // ── BACKGROUND COLORS ────────────────────────────────────────────────────
  // Zinc backgrounds (dark) → cream/card tokens
  [/\bbg-zinc-950\b/g, 'bg-background'],
  [/\bbg-zinc-900\b(?!\/)/g, 'bg-background-card'],
  [/\bbg-zinc-900\/40\b/g, 'bg-background-card'],
  [/\bbg-zinc-900\/50\b/g, 'bg-background-card'],
  [/\bbg-zinc-900\/60\b/g, 'bg-background-card'],
  [/\bbg-zinc-900\/70\b/g, 'bg-background-card'],
  [/\bbg-zinc-900\/80\b/g, 'bg-background-card'],
  [/\bbg-zinc-800\b(?!\/)/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/30\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/40\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/50\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/60\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/70\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/80\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-700\b(?!\/)/g, 'bg-background-elevated'],
  [/\bbg-zinc-700\/40\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-700\/50\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-700\/60\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-700\/70\b/g, 'bg-background-elevated'],

  // White-with-alpha backgrounds (dark-mode idiom) → subtle elevated
  [/\bbg-white\/5\b/g, 'bg-background-elevated'],
  [/\bbg-white\/8\b/g, 'bg-background-elevated'],
  [/\bbg-white\/10\b/g, 'bg-background-elevated'],
  [/\bbg-white\/\[0\.0[0-9]+\]/g, 'bg-background-elevated'],
  [/\bbg-white\/\[0\.[01][0-9]?\]/g, 'bg-background-elevated'],

  // Hover backgrounds
  [/\bhover:bg-zinc-900\b(?!\/)/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-900\/40\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-900\/50\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-900\/60\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-900\/70\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-800\b(?!\/)/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-800\/50\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-zinc-700\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-white\/5\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-white\/8\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-white\/10\b/g, 'hover:bg-background-elevated'],

  // ── BORDER COLORS ────────────────────────────────────────────────────────
  [/\bborder-zinc-950\b/g, 'border-border'],
  [/\bborder-zinc-900\b(?!\/)/g, 'border-border'],
  [/\bborder-zinc-900\/50\b/g, 'border-border'],
  [/\bborder-zinc-800\b(?!\/)/g, 'border-border'],
  [/\bborder-zinc-800\/30\b/g, 'border-border'],
  [/\bborder-zinc-800\/40\b/g, 'border-border'],
  [/\bborder-zinc-800\/50\b/g, 'border-border'],
  [/\bborder-zinc-800\/60\b/g, 'border-border'],
  [/\bborder-zinc-800\/70\b/g, 'border-border'],
  [/\bborder-zinc-700\b(?!\/)/g, 'border-border'],
  [/\bborder-zinc-700\/50\b/g, 'border-border'],
  [/\bborder-zinc-700\/60\b/g, 'border-border'],
  [/\bborder-zinc-700\/70\b/g, 'border-border'],
  [/\bborder-zinc-600\b/g, 'border-border'],
  [/\bborder-white\/5\b/g, 'border-border'],
  [/\bborder-white\/8\b/g, 'border-border'],
  [/\bborder-white\/10\b/g, 'border-border'],
  [/\bborder-white\/20\b/g, 'border-border'],
  [/\bhover:border-zinc-700\b/g, 'hover:border-border-hover'],
  [/\bhover:border-zinc-600\b/g, 'hover:border-border-hover'],
  [/\bhover:border-white\/20\b/g, 'hover:border-border-hover'],

  // Divide
  [/\bdivide-zinc-800\b/g, 'divide-border'],
  [/\bdivide-zinc-700\b/g, 'divide-border'],
  [/\bdivide-white\/5\b/g, 'divide-border'],
  [/\bdivide-white\/10\b/g, 'divide-border'],

  // Ring / outline
  [/\bring-zinc-700\b/g, 'ring-border'],
  [/\bring-zinc-800\b/g, 'ring-border'],
  [/\bring-offset-zinc-900\b/g, 'ring-offset-background'],
  [/\bfocus:ring-offset-zinc-900\b/g, 'focus:ring-offset-background'],
  [/\bfocus:ring-offset-zinc-800\b/g, 'focus:ring-offset-background'],

  // Gradient from/to zinc → neutralize to token-based
  [/\bfrom-zinc-900\b/g, 'from-background-card'],
  [/\bfrom-zinc-800\b/g, 'from-background-elevated'],
  [/\bto-zinc-900\b/g, 'to-background-card'],
  [/\bto-zinc-800\b/g, 'to-background-elevated'],
  [/\bvia-zinc-900\b/g, 'via-background-card'],
  [/\bvia-zinc-800\b/g, 'via-background-elevated'],

  // ── ROUNDED (cards/panels → 2px per bible §5) ────────────────────────────
  // Only migrate the bigger radii; keep rounded-full for pills
  [/\brounded-2xl\b/g, 'rounded-sm'],
  [/\brounded-xl\b/g, 'rounded-sm'],
  // rounded-lg is sometimes intentional on pills; keep conservative — don't migrate.

  // ── PASS 2 — edge cases caught in second sweep ──────────────────────────
  // zinc-400/500 used as borders on light pages
  [/\bborder-zinc-400\b/g, 'border-border'],
  [/\bborder-zinc-500\b/g, 'border-border'],
  [/\bhover:border-zinc-500\b/g, 'hover:border-border-hover'],
  [/\bborder-zinc-700\/30\b/g, 'border-border'],
  [/\bborder-zinc-700\/40\b/g, 'border-border'],
  // Mid-gray fills used on light pages for muted swatches / bars
  [/\bbg-zinc-600\b(?!\/)/g, 'bg-text-muted'],
  [/\bbg-zinc-600\/30\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-600\/40\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-600\/50\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-800\/20\b/g, 'bg-background-elevated'],
  [/\bbg-zinc-900\/95\b/g, 'bg-background-card'],
  // Pass-2 backgrounds
  [/\bhover:bg-white\/3\b/g, 'hover:bg-background-elevated'],
  [/\bborder-white\/40\b/g, 'border-border-hover'],

  // ── PASS 3 — stone / slate / gray / neutral dark drift ──────────────────
  // (Design audit discovered these still leaking dark on cream pages.)
  // Text
  [/\btext-stone-50\b/g, 'text-text-primary'],
  [/\btext-stone-100\b/g, 'text-text-primary'],
  [/\btext-stone-200\b/g, 'text-text-secondary'],
  [/\btext-stone-300\b/g, 'text-text-secondary'],
  [/\btext-stone-400\b/g, 'text-text-secondary'],
  [/\btext-stone-500\b/g, 'text-text-muted'],
  [/\btext-stone-600\b/g, 'text-text-muted'],
  [/\btext-stone-700\b/g, 'text-text-primary'],
  [/\btext-stone-800\b/g, 'text-text-primary'],
  [/\btext-stone-900\b/g, 'text-text-primary'],
  [/\btext-slate-50\b/g, 'text-text-primary'],
  [/\btext-slate-100\b/g, 'text-text-primary'],
  [/\btext-slate-200\b/g, 'text-text-secondary'],
  [/\btext-slate-300\b/g, 'text-text-secondary'],
  [/\btext-slate-400\b/g, 'text-text-secondary'],
  [/\btext-slate-500\b/g, 'text-text-muted'],
  [/\btext-slate-600\b/g, 'text-text-muted'],
  [/\btext-slate-700\b/g, 'text-text-primary'],
  [/\btext-slate-800\b/g, 'text-text-primary'],
  [/\btext-slate-900\b/g, 'text-text-primary'],
  [/\btext-gray-[0-9]{2,3}\b/g, 'text-text-muted'],
  [/\btext-neutral-[0-9]{2,3}\b/g, 'text-text-muted'],

  // Backgrounds (treat dark stone/slate/neutral as cream-mode equivalents)
  [/\bbg-stone-950\b/g, 'bg-background'],
  [/\bbg-stone-900\b(?!\/)/g, 'bg-background-card'],
  [/\bbg-stone-900\/20\b/g, 'bg-background-card'],
  [/\bbg-stone-900\/30\b/g, 'bg-background-card'],
  [/\bbg-stone-900\/40\b/g, 'bg-background-card'],
  [/\bbg-stone-900\/50\b/g, 'bg-background-card'],
  [/\bbg-stone-900\/60\b/g, 'bg-background-card'],
  [/\bbg-stone-900\/95\b/g, 'bg-background-card'],
  [/\bbg-stone-800\b(?!\/)/g, 'bg-background-elevated'],
  [/\bbg-stone-800\/40\b/g, 'bg-background-elevated'],
  [/\bbg-stone-800\/60\b/g, 'bg-background-elevated'],
  [/\bbg-stone-700\b/g, 'bg-background-elevated'],
  [/\bbg-stone-500\b/g, 'bg-text-muted'],
  [/\bbg-stone-200\b/g, 'bg-background-elevated'],
  [/\bbg-slate-950\b/g, 'bg-background'],
  [/\bbg-slate-900\b(?!\/)/g, 'bg-background-card'],
  [/\bbg-slate-900\/50\b/g, 'bg-background-card'],
  [/\bbg-slate-900\/60\b/g, 'bg-background-card'],
  [/\bbg-slate-800\b/g, 'bg-background-elevated'],
  [/\bbg-slate-400\/40\b/g, 'bg-text-muted'],

  // Borders
  [/\bborder-stone-[0-9]{2,3}\b/g, 'border-border'],
  [/\bborder-stone-[0-9]{2,3}\/[0-9]+\b/g, 'border-border'],
  [/\bborder-slate-[0-9]{2,3}\b/g, 'border-border'],
  [/\bborder-slate-[0-9]{2,3}\/[0-9]+\b/g, 'border-border'],

  // Hover
  [/\bhover:bg-stone-[89]00\b/g, 'hover:bg-background-elevated'],
  [/\bhover:bg-stone-[89]00\/[0-9]+\b/g, 'hover:bg-background-elevated'],
  [/\bhover:border-stone-[0-9]{2,3}\b/g, 'hover:border-border-hover'],
  [/\bhover:text-stone-[0-9]{2,3}\b/g, 'hover:text-text-primary'],
]

function walk(dir, files = []) {
  if (SKIP_DIRS.some((d) => dir === d || dir.startsWith(d + path.sep))) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, files)
    else if (e.isFile() && /\.(tsx|ts|jsx|js)$/.test(e.name)) files.push(full)
  }
  return files
}

function processFile(file) {
  if (SKIP.has(file)) return { file, changes: 0, skipped: true }
  const orig = fs.readFileSync(file, 'utf8')
  let out = orig
  let changes = 0
  for (const [re, repl] of RULES) {
    const before = out
    out = out.replace(re, () => { changes++; return repl })
    void before
  }
  if (out !== orig) {
    fs.writeFileSync(file, out, 'utf8')
    return { file, changes, skipped: false }
  }
  return { file, changes: 0, skipped: false }
}

function main() {
  const files = walk(ROOT)
  const results = []
  for (const f of files) {
    const r = processFile(f)
    if (r.changes > 0 || r.skipped) results.push(r)
  }
  const touched = results.filter((r) => r.changes > 0)
  const skipped = results.filter((r) => r.skipped)
  const total = touched.reduce((s, r) => s + r.changes, 0)
  touched
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 30)
    .forEach((r) => {
      console.log(`${r.changes.toString().padStart(5)}  ${path.relative(ROOT, r.file)}`)
    })
  console.log(`\n${touched.length} files modified, ${total} replacements total`)
  if (skipped.length) {
    console.log(`Skipped (legitimately dark):`)
    skipped.forEach((r) => console.log(`       ${path.relative(ROOT, r.file)}`))
  }
}

main()
