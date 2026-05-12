---
name: rubli-bilingual-audit
description: |
  Audit a touched RUBLI frontend file for missing Spanish translations
  before claiming a redesign is done. Use this skill whenever you have
  edited a React/TSX file and need to verify every visible string is
  bilingual (`lang === 'en' ? EN : ES` pattern), when the user mentions
  "translate", "i18n", "Spanish", "bilingual", or whenever you are about
  to commit a frontend change. Bilingual gaps are the most repeated
  half-fix failure mode in this codebase: an agent patches the visible
  string and leaves two more inside event handlers, aria-labels, and
  tooltip builders. Running this audit before commit catches them in 30
  seconds.
---

# Bilingual Audit for RUBLI

Every visible string in the RUBLI frontend lives in BOTH Spanish and
English. The codebase convention is:

```tsx
{lang === 'en' ? 'English copy' : 'Copia en español'}
```

**Spanish is the else branch.** Do not flip the order — `lang === 'es'
? ES : EN` is wrong (it works but breaks the pattern grep below).

Bilingual half-fixes are a chronic problem because strings hide in:

- Inline JSX text
- Event handler bodies (`onClick={() => alert('...')}`)
- `aria-label` / `aria-describedby` props
- `title` attributes
- Tooltip builder functions
- `console.log` / error messages users actually see
- Conditional branches (`if (foo) return 'Bar'`)
- Format strings inside template literals

The grep audit below catches all of them.

---

## The 30-second audit

Run from the worktree root, substituting `<file>` with the touched
file path:

```bash
# 1. ES branch count
grep -cE "lang ?=== ?'es' ?\?" <file>

# 2. EN branch count
grep -cE "lang ?=== ?'en' ?\?" <file>

# 3. Find any English-looking strings without a ternary nearby
grep -nE "['\"][A-Z][a-z]+ [a-z]+['\"]" <file>
```

### Interpreting the output

**Counts (1 + 2)** should match. Both branches mean both languages
were considered for that string. If one count is 0 and the other is
non-zero, the file is monolingual — fix it.

If counts differ by 1-2: usually fine. It happens because the
codebase has both styles:
```tsx
{lang === 'en' ? 'EN' : 'ES'}    // counts as 1 EN
{lang === 'es' ? 'ES' : 'EN'}    // counts as 1 ES
```
Both are bilingual; they just count differently.

If counts differ by > 5: investigate. One pattern dominating without
the other usually means a chunk of strings are still monolingual.

**Pattern 3 (English-looking strings)** flags `"Title Case strings"`
and `"camelCase phrases"` that look like UI copy but might lack
translation. Walk through each match:

- If it's wrapped in a ternary: skip
- If it's a JSON key, prop name, type alias, comment: skip
- If it's a UI string with no ternary: this is the bug — wrap it

---

## Common hiding spots — check each one explicitly

### 1. Aria-labels

```tsx
// WRONG
<button aria-label="Close dialog">×</button>

// RIGHT
<button aria-label={lang === 'en' ? 'Close dialog' : 'Cerrar diálogo'}>×</button>
```

### 2. Title attributes (tooltip on hover)

```tsx
// WRONG
<div title="Click to expand">...</div>

// RIGHT
<div title={lang === 'en' ? 'Click to expand' : 'Clic para expandir'}>...</div>
```

### 3. Event handler bodies

```tsx
// WRONG
onClick={() => {
  if (confirm('Are you sure?')) deleteItem()
}}

// RIGHT
onClick={() => {
  if (confirm(lang === 'en' ? 'Are you sure?' : '¿Estás seguro?')) deleteItem()
}}
```

### 4. Tooltip / chart label builders

Recharts and ECharts let you pass formatter functions. The function
runs at render time and has access to `lang` if you closure-capture
it:

```tsx
// Inside a component that has access to `lang`:
const tooltipFormatter = (val: number) => {
  return `${formatCompactMXN(val)} ${lang === 'en' ? 'in contracts' : 'en contratos'}`
}
```

### 5. Conditional return strings

```tsx
// WRONG
function getStatus(state: string): string {
  if (state === 'pending') return 'Pending review'
  if (state === 'done') return 'Complete'
  return 'Unknown'
}

// RIGHT — pass lang in or use a lookup table
function getStatus(state: string, lang: 'en' | 'es'): string {
  const labels: Record<string, { en: string; es: string }> = {
    pending: { en: 'Pending review', es: 'Pendiente de revisión' },
    done:    { en: 'Complete',       es: 'Completo' },
  }
  return labels[state]?.[lang] ?? (lang === 'en' ? 'Unknown' : 'Desconocido')
}
```

### 6. Error / toast messages

If users see it, translate it. If only developers see it (a console
log for debugging), leave it English.

### 7. Date / number formatting

`Intl.NumberFormat` and `Intl.DateTimeFormat` need locale args:

```tsx
new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US').format(n)
new Date(x).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { ... })
```

`formatCompactMXN(amount)` already does this internally — use it
instead of building number strings by hand. In Spanish output it
produces "MDP" / "billones" (Mexican media convention), never
"B MXN".

---

## Bulk audit — multiple files at once

If you've touched many files (e.g. an omega phase that landed in 8
components), run the audit across all of them:

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469
git diff --name-only HEAD~1 -- '*.tsx' | while read f; do
  es=$(grep -cE "lang ?=== ?'es' ?\?" "$f" 2>/dev/null || echo 0)
  en=$(grep -cE "lang ?=== ?'en' ?\?" "$f" 2>/dev/null || echo 0)
  printf "%s\tes=%d\ten=%d\n" "$f" "$es" "$en"
done
```

Then pipe through `awk` to flag files where the counts are wildly
unbalanced:

```bash
... | awk -F'\t' '{
  split($2,a,"="); split($3,b,"=")
  if (a[2] > 0 || b[2] > 0) {
    diff = a[2] - b[2]; if (diff < 0) diff = -diff
    if (diff > 3) print $0 "  ⚠️ unbalanced"
  }
}'
```

Files flagged "unbalanced" are the ones to read and fix.

---

## Sector / risk / status string lookups

For repeating strings like sector names, risk levels, statuses,
don't inline the ternary every time — build a lookup once:

```tsx
import { SECTOR_NAMES_EN, getSectorNameEN } from '@/lib/constants'

// SECTOR_NAMES_EN already exists; for ES use the Spanish names from SECTORS:
const sectorLabel = lang === 'es'
  ? SECTORS.find((s) => s.code === code)?.name ?? code
  : getSectorNameEN(code)
```

Risk levels — there's no canonical bilingual map yet, but the
common rendering is:

```tsx
const RISK_LABELS: Record<RiskLevel, { en: string; es: string }> = {
  critical: { en: 'Critical', es: 'Crítico' },
  high:     { en: 'High',     es: 'Alto' },
  medium:   { en: 'Medium',   es: 'Medio' },
  low:      { en: 'Low',      es: 'Bajo' },
}
```

If you find yourself writing this same map in 3+ files, hoist it to
`@/lib/i18n/risk-labels.ts` and import.

---

## Special cases — when monolingual is OK

Not everything needs translation:

- **JSON keys**, prop names, type aliases — never translated
- **Proper nouns** (vendor names like "REPSOL COMERCIALIZADORA",
  pattern codes like "P5", section IDs like "Folio·IX")
- **Numbers** without unit labels
- **Brand strings** ("RUBLI" itself)
- **Internal dev logs** that users never see
- **API response field names** in error messages
- **CLI scripts** in `backend/scripts/` (developers only)

Don't translate any of those. The audit grep will sometimes flag
them; just walk past.

---

## Why this matters

Mexican investigative-journalism audiences strongly prefer Spanish.
English-only or English-default UI signals "made for export, not
for us." A single "Pending review" tooltip in an otherwise-Spanish
UI is enough to undermine credibility.

Conversely, English-only readers exist (international press, donors,
regulators) and the codebase ships both — but English exists *as*
a translation, not as the original. The Spanish should read natively;
the English should serve as a working international translation.

If you're adding new copy, write the Spanish first. The English
follows.

---

## Companion skills

- `rubli-folio-aesthetic` — for the typography and tone of the
  copy you're translating
- `rubli-omega-redesign` — has the audit baked into checklist 3
- `rubli-agent-recovery` — covers the cross-tree pollution case
  where an agent's bilingual fixes landed in the wrong worktree
