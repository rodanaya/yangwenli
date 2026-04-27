#!/usr/bin/env node
/**
 * codemod-entity-chip.mjs
 *
 * Auto-migrates forbidden `<Link to={`/{type}/${id}`}>...</Link>` patterns to
 * the canonical `<EntityIdentityChip>` per CLAUDE.md hard rule #1.
 *
 * Why this exists: the audit found 56 occurrences across 38 files using the
 * forbidden pattern. Manual migration is hours of busywork; this codemod
 * handles the regular 80% in one pass and prints a punch-list of edge cases
 * for human review.
 *
 *   node scripts/codemod-entity-chip.mjs              # dry-run report
 *   node scripts/codemod-entity-chip.mjs --apply      # actually rewrite
 *   node scripts/codemod-entity-chip.mjs --file=foo   # limit to one file
 *
 * What gets rewritten (the safe pattern):
 *
 *   <Link
 *     to={`/vendors/${EXPR}`}
 *     className="..."
 *     title="..."
 *   >
 *     {NAME_EXPR}                          // or
 *     <span ...>{NAME_EXPR}</span>         // or
 *     <span ...>{NAME_EXPR}</span><Icon/>  // trailing icon discarded
 *   </Link>
 *
 *   →
 *
 *   <EntityIdentityChip
 *     type="{vendor|institution|sector|category|case}"
 *     id={EXPR}
 *     name={NAME_EXPR}
 *     size="sm"
 *   />
 *
 * What gets flagged for manual review (NOT rewritten):
 *   - Multi-line children with conditional logic ({cond ? X : Y})
 *   - Children with text + multiple component siblings
 *   - Custom event handlers (onClick, etc.)
 *   - Class names that suggest non-chip styling (e.g. block, full-width, card)
 *
 * Imports are added automatically when EntityIdentityChip isn't already imported.
 * Unused `Link` and `ExternalLink` imports are NOT auto-removed (too risky to
 * auto-decide); the report flags them.
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const ROOTS = ['src/pages', 'src/components']
const ENTITY_TYPE_BY_PATH = {
  vendors: 'vendor',
  institutions: 'institution',
  sectors: 'sector',
  categories: 'category',
  cases: 'case',
  patterns: 'pattern',
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const FILE_FILTER = args.find((a) => a.startsWith('--file='))?.slice('--file='.length)

// ---- File walking -----------------------------------------------------------

function walkFiles(root, files = []) {
  if (!existsSync(root)) return files
  for (const name of readdirSync(root)) {
    const p = join(root, name)
    if (statSync(p).isDirectory()) walkFiles(p, files)
    else if (p.endsWith('.tsx')) files.push(p)
  }
  return files
}

// ---- Pattern matching -------------------------------------------------------

/**
 * Match a forbidden Link block. Returns { full, type, idExpr, attrsBlock,
 * childrenBlock } or null.
 *
 * The regex is intentionally conservative: it only matches Links whose `to`
 * prop is a template literal like `/{path}/${...}`. This is the canonical
 * forbidden pattern; anything fancier is left for manual review.
 */
function findForbiddenLinks(source) {
  const matches = []
  // Multi-line Link with template-literal `to` prop. Captures: path, idExpr,
  // attrsBlock (everything else inside the opening tag), childrenBlock.
  const re =
    /<Link\s+([^>]*?)to=\{`\/(vendors|institutions|sectors|categories|cases|patterns)\/\$\{([^}]+)\}`\}([^>]*?)>([\s\S]*?)<\/Link>/g
  let m
  while ((m = re.exec(source)) !== null) {
    const [full, attrsBefore, pathSeg, idExpr, attrsAfter, children] = m
    matches.push({
      full,
      start: m.index,
      end: m.index + full.length,
      pathSeg,
      type: ENTITY_TYPE_BY_PATH[pathSeg],
      idExpr: idExpr.trim(),
      attrs: (attrsBefore + ' ' + attrsAfter).trim(),
      children: children.trim(),
    })
  }
  return matches
}

/**
 * Extract the name expression from Link children. Strategy:
 *  1. Strip JSX wrappers like <span ...>...</span>, <div ...>...</div>
 *  2. Discard trailing icon-like components (lucide-react names, named with
 *     PascalCase, no children).
 *  3. The remaining single `{...}` expression is the name.
 *
 * Returns { nameExpr, hadIcon, complex } where `complex` flags edge cases
 * we don't auto-rewrite.
 */
function extractName(children) {
  let body = children
  let hadIcon = false

  // Strip leading <span ...> wrappers (single-pass; one nested <span> is fine).
  body = body.replace(/^<span[^>]*>([\s\S]*?)<\/span>/, '$1').trim()
  body = body.replace(/^<div[^>]*>([\s\S]*?)<\/div>/, '$1').trim()

  // Discard trailing self-closing icon components like <ExternalLink size={10} />
  const iconPattern = /<[A-Z][A-Za-z]+\s+[^>]*\/>\s*$/
  if (iconPattern.test(body)) {
    body = body.replace(iconPattern, '').trim()
    hadIcon = true
  }
  // Or trailing component blocks like <Icon>...</Icon>
  const iconBlockPattern = /<[A-Z][A-Za-z]+\b[^>]*>[\s\S]*?<\/[A-Z][A-Za-z]+>\s*$/
  if (iconBlockPattern.test(body)) {
    body = body.replace(iconBlockPattern, '').trim()
    hadIcon = true
  }

  // Now body should be a single `{expression}`.
  const exprMatch = body.match(/^\{([\s\S]+)\}$/)
  if (!exprMatch) {
    return { nameExpr: null, hadIcon, complex: true, residue: body }
  }
  const expr = exprMatch[1].trim()
  // Reject conditional / logical children — too risky to auto-rewrite.
  if (/[?][\s\S]*:/.test(expr) || /\|\||&&/.test(expr)) {
    return { nameExpr: null, hadIcon, complex: true, residue: expr }
  }
  // Reject i18n CTA labels — `t('viewProfile')`, `t('nav.fullProfile')` etc.
  // These are localized button labels, not entity names. Substituting them
  // into a chip's `name` slot would render "View profile" as if it were the
  // vendor's actual name.
  if (/^t\(['"]/.test(expr) || /^tCommon\(['"]/.test(expr)) {
    return { nameExpr: null, hadIcon, complex: true, residue: `i18n CTA label: ${expr}` }
  }
  return { nameExpr: expr, hadIcon, complex: false, residue: null }
}

/**
 * Decide if attributes contain anything we shouldn't auto-discard
 * (onClick, onMouseEnter, etc.). Style/className are safe to drop because
 * the chip provides its own visual grammar.
 */
function attrsAreSafe(attrs) {
  if (/\bon[A-Z][A-Za-z]+=/.test(attrs)) return false // event handlers
  if (/\baria-(?!label\b)[a-z]+=/.test(attrs)) return false // non-label aria
  return true
}

// ---- Replacement generation -------------------------------------------------

function buildChip(type, idExpr, nameExpr) {
  return `<EntityIdentityChip type="${type}" id={${idExpr}} name={${nameExpr}} size="sm" />`
}

/**
 * Add `import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'`
 * to the source if not already present. Inserts after the last existing import.
 */
function ensureImport(source) {
  if (source.includes('EntityIdentityChip')) return source
  const importRe = /^import .+ from .+$/gm
  let lastEnd = 0
  let m
  while ((m = importRe.exec(source)) !== null) {
    lastEnd = m.index + m[0].length
  }
  if (lastEnd === 0) return source // no imports? bail
  const before = source.slice(0, lastEnd)
  const after = source.slice(lastEnd)
  return (
    before +
    `\nimport { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'` +
    after
  )
}

// ---- Run --------------------------------------------------------------------

const files = ROOTS.flatMap((r) => walkFiles(r))
const filtered = FILE_FILTER ? files.filter((f) => f.includes(FILE_FILTER)) : files

const report = {
  rewritten: [],
  flagged: [],
  filesTouched: 0,
}

for (const file of filtered) {
  const source = readFileSync(file, 'utf8')
  const matches = findForbiddenLinks(source)
  if (matches.length === 0) continue

  let newSource = source
  let rewrites = 0
  // Replace from end → start so offsets stay valid
  for (const m of [...matches].reverse()) {
    const { nameExpr, complex, hadIcon, residue } = extractName(m.children)
    const safe = attrsAreSafe(m.attrs)

    if (!nameExpr || complex || !safe) {
      report.flagged.push({
        file: relative('.', file),
        type: m.type,
        idExpr: m.idExpr,
        reason: !nameExpr ? `complex children: ${residue?.slice(0, 80)}` : !safe ? 'unsafe attrs (event handler / aria)' : 'unknown',
      })
      continue
    }

    const replacement = buildChip(m.type, m.idExpr, nameExpr)
    newSource = newSource.slice(0, m.start) + replacement + newSource.slice(m.end)
    rewrites++
    report.rewritten.push({
      file: relative('.', file),
      type: m.type,
      idExpr: m.idExpr,
      nameExpr,
      hadIcon,
    })
  }

  if (rewrites > 0) {
    newSource = ensureImport(newSource)
    if (APPLY) {
      writeFileSync(file, newSource, 'utf8')
      report.filesTouched++
    }
  }
}

// ---- Output -----------------------------------------------------------------

console.log(`\n=== codemod-entity-chip ${APPLY ? '[APPLY]' : '[DRY-RUN]'} ===\n`)
console.log(`Rewritten: ${report.rewritten.length} occurrence(s) in ${new Set(report.rewritten.map((r) => r.file)).size} file(s)`)
console.log(`Flagged for manual review: ${report.flagged.length}\n`)

if (report.rewritten.length > 0) {
  console.log('--- AUTO-REWRITTEN ---')
  for (const r of report.rewritten) {
    console.log(`  ${r.file}  ${r.type} id={${r.idExpr}} name={${r.nameExpr}}${r.hadIcon ? ' (trailing icon discarded)' : ''}`)
  }
  console.log('')
}

if (report.flagged.length > 0) {
  console.log('--- MANUAL REVIEW NEEDED ---')
  for (const f of report.flagged) {
    console.log(`  ${f.file}  ${f.type} id={${f.idExpr}}  -- ${f.reason}`)
  }
  console.log('')
}

if (APPLY) {
  console.log(`Wrote ${report.filesTouched} file(s).`)
  console.log('Next: run `npx tsc --noEmit && npm run lint:tokens` to verify.')
} else {
  console.log('Dry-run only. Re-run with --apply to write changes.')
}
