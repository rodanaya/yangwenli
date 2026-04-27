#!/usr/bin/env node
/**
 * lint-tokens.mjs — token hygiene gate.
 *
 * Two tiers:
 *   severity: 'fail' — blocks the build (exit 1). Used for forbidden tokens.
 *   severity: 'warn' — reports count + samples but does NOT fail. Used to
 *                      track legacy debt being migrated toward 0.
 *
 * Run as part of CI or pre-commit:
 *   npm run lint:tokens
 *
 * Allowed exemptions:
 *   - comments (lines beginning with `//` or inside block comments)
 *   - JSON locale files (i18n translations may quote hex as text content)
 *   - explicit ALLOWLIST_FILES below (canonical palette / token files)
 *
 * To extend: add a new pattern to PATTERNS array.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const ROOTS = ['src/pages', 'src/components']

// Files that are LEGITIMATELY palette / token authorities. Any hex in these
// is canonical, by definition. Exempt from hex-literal warnings.
const ALLOWLIST_FILES = [
  'src/components/charts/editorial/tokens.ts',
  'src/components/charts/editorial/colorScales.ts',
]

const PATTERNS = [
  // ── FAIL tier ────────────────────────────────────────────────────────
  // Tailwind 400-tier saturations — dark-mode era, washed-out on cream.
  // Original 5 hues: 'fail' (the worst offenders, already 0 in fail tier)
  {
    name: 'Tailwind text-{red|amber|emerald|cyan|violet}-{300|400|500}',
    regex: 'text-(red|amber|emerald|cyan|violet)-(300|400|500)',
    severity: 'fail',
  },
  {
    name: 'Tailwind bg-*-950 (red|amber|emerald|cyan|violet|slate|zinc)',
    regex: 'bg-(red|amber|emerald|cyan|violet|slate|zinc)-950',
    severity: 'fail',
  },
  // Newly-discovered hues (orange/purple/yellow) and border/bg variants:
  // 'warn' for now — too much pre-existing debt to block on. Promote to
  // 'fail' once each pattern's count drops below ~10.
  {
    name: 'Tailwind text-{orange|purple|yellow}-{300|400|500} (warn — dark-mode era hues)',
    regex: 'text-(orange|purple|yellow)-(300|400|500)',
    severity: 'warn',
  },
  {
    name: 'Tailwind border-{red|amber|emerald|orange|purple}-{300|400|500|600|700} (warn)',
    regex: 'border-(red|amber|emerald|orange|purple)-(300|400|500|600|700)',
    severity: 'warn',
  },
  {
    name: 'Tailwind bg-{orange|purple}-950 (warn)',
    regex: 'bg-(orange|purple)-950',
    severity: 'warn',
  },
  {
    name: 'Tailwind bg-{red|orange|purple}-{600|700}/* opacity (warn)',
    regex: 'bg-(red|orange|purple)-(600|700)/[0-9]+',
    severity: 'warn',
  },
  // Hardcoded dark-mode hex — render as black bullets on cream.
  {
    name: 'Hardcoded #2d2926 (dark empty-dot fill)',
    regex: '#2d2926',
    severity: 'fail',
  },
  {
    name: 'Hardcoded #3d3734 (dark empty-dot stroke)',
    regex: '#3d3734',
    severity: 'fail',
  },
  // Bible §3.10: no green for safety on a corruption platform.
  {
    name: 'Emerald (no green-for-safety per bible §3.10)',
    regex: 'text-emerald-|bg-emerald-|border-emerald-',
    severity: 'fail',
  },
  // ── WARN tier (debt tracking; doesn't block build) ───────────────────
  // Raw 6-digit hex literals in pages/components. Should come from
  // lib/constants (RISK_COLORS, SECTOR_COLORS) or var(--…) tokens.
  // Existing count is the baseline to drive toward 0.
  {
    name: 'Raw 6-digit hex literal (#RRGGBB) — should use lib/constants or var(--…)',
    regex: "#[0-9a-fA-F]{6}\\b",
    severity: 'warn',
  },
]

let failHits = 0
let warnHits = 0
const failures = []
const warnings = []

function isAllowlisted(line) {
  // Line shape: "src/path/to/file.tsx:123:content"
  const filePath = line.split(':')[0]
  return ALLOWLIST_FILES.some((f) => filePath.endsWith(f) || filePath === f)
}

for (const root of ROOTS) {
  if (!existsSync(root)) continue
  for (const { name, regex, severity } of PATTERNS) {
    let output = ''
    try {
      output = execSync(
        `grep -rEn "${regex}" ${root} --include='*.tsx' --include='*.ts' --include='*.css'`,
        { encoding: 'utf-8' }
      )
    } catch (err) {
      if (err.status === 1) continue // 0 matches
      throw err
    }
    const lines = output.split('\n').filter(Boolean)
    const real = lines.filter((l) => {
      const after = l.split(':').slice(2).join(':')
      const trimmed = after.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false
      if (isAllowlisted(l)) return false
      return true
    })
    if (real.length > 0) {
      const entry = { name, count: real.length, samples: real.slice(0, 5), severity }
      if (severity === 'fail') {
        failures.push(entry)
        failHits += real.length
      } else {
        warnings.push(entry)
        warnHits += real.length
      }
    }
  }
}

// Print warnings first (informational)
if (warnings.length > 0) {
  console.error(`⚠ token hygiene WARNINGS — ${warnHits} occurrence(s) (legacy debt; not gating):\n`)
  for (const { name, count, samples } of warnings) {
    console.error(`  [${count}] ${name}`)
    for (const s of samples) console.error(`    ${s}`)
    if (count > samples.length) console.error(`    ... and ${count - samples.length} more`)
  }
  console.error('')
}

if (failures.length === 0) {
  console.log(
    `✓ token hygiene gate PASS — 0 forbidden patterns in src/pages + src/components` +
      (warnHits > 0 ? ` (${warnHits} warnings)` : '')
  )
  process.exit(0)
}

console.error(`✗ token hygiene gate FAIL — ${failHits} forbidden pattern(s) found:\n`)
for (const { name, count, samples } of failures) {
  console.error(`  [${count}] ${name}`)
  for (const s of samples) console.error(`    ${s}`)
  if (count > samples.length) console.error(`    ... and ${count - samples.length} more`)
}
console.error('\nFix or document each occurrence. See .claude/marathon/SHIP_CHECKLIST.md band B2.')
process.exit(1)
