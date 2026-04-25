#!/usr/bin/env node
/**
 * lint-tokens.mjs — token hygiene gate.
 *
 * Forbids dark-mode-era patterns from re-entering the codebase. Run as
 * part of CI or pre-commit:
 *   npm run lint:tokens
 *
 * Exit code 1 if any forbidden pattern is found in src/pages or
 * src/components. Used by SHIP_CHECKLIST.md band B2.
 *
 * Allowed exemptions:
 *   - comments (lines beginning with `//` or inside `/* ... *\/`)
 *   - JSON locale files (i18n translations may legitimately quote the
 *     hex strings — they're text content, not styles)
 *
 * To extend: add a new pattern to PATTERNS array.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const ROOTS = ['src/pages', 'src/components']
const PATTERNS = [
  // Tailwind 400-tier color saturations — dark-mode era, reads
  // washed-out on cream broadsheet base.
  {
    name: 'Tailwind text-{red|amber|emerald|cyan|violet}-{300|400|500}',
    regex: 'text-(red|amber|emerald|cyan|violet)-(300|400|500)',
  },
  {
    name: 'Tailwind bg-*-950 (near-black on cream)',
    regex: 'bg-(red|amber|emerald|cyan|violet|slate|zinc)-950',
  },
  // Hardcoded dark-mode hex from the original dark-zinc palette.
  // These render as black bullets on the cream broadsheet.
  {
    name: 'Hardcoded #2d2926 (dark empty-dot fill)',
    regex: '#2d2926',
  },
  {
    name: 'Hardcoded #3d3734 (dark empty-dot stroke)',
    regex: '#3d3734',
  },
  // Bible §3.10: no green for safety on a corruption platform.
  {
    name: 'Emerald (no green-for-safety per bible §3.10)',
    regex: 'text-emerald-|bg-emerald-|border-emerald-',
  },
]

let totalHits = 0
const failures = []

for (const root of ROOTS) {
  if (!existsSync(root)) continue
  for (const { name, regex } of PATTERNS) {
    let output = ''
    try {
      output = execSync(
        `grep -rEn "${regex}" ${root} --include='*.tsx' --include='*.ts' --include='*.css'`,
        { encoding: 'utf-8' }
      )
    } catch (err) {
      // grep exits 1 when zero matches — that's our success case
      if (err.status === 1) continue
      throw err
    }
    const lines = output.split('\n').filter(Boolean)
    // Exclude comment-only lines as much as plain grep can.
    const real = lines.filter((l) => {
      const after = l.split(':').slice(2).join(':')
      const trimmed = after.trim()
      return !trimmed.startsWith('//') && !trimmed.startsWith('*')
    })
    if (real.length > 0) {
      failures.push({ name, count: real.length, samples: real.slice(0, 5) })
      totalHits += real.length
    }
  }
}

if (failures.length === 0) {
  console.log('✓ token hygiene gate PASS — 0 forbidden patterns in src/pages + src/components')
  process.exit(0)
}

console.error(`✗ token hygiene gate FAIL — ${totalHits} forbidden pattern(s) found:\n`)
for (const { name, count, samples } of failures) {
  console.error(`  [${count}] ${name}`)
  for (const s of samples) console.error(`    ${s}`)
  if (count > samples.length) console.error(`    ... and ${count - samples.length} more`)
}
console.error('\nFix or document each occurrence. See .claude/marathon/SHIP_CHECKLIST.md band B2.')
process.exit(1)
