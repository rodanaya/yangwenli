---
name: starfox
description: |
  Four-agent design-modification squadron for RUBLI frontend. Unlike
  /paw-patrol (exploratory QA), StarFox is MISSION-DRIVEN: the user pastes
  screenshots showing design problems, gives instructions, and the four
  agents (FOX, FALCO, PEPPY, SLIPPY) analyze → implement → verify → ship.

  Trigger when: user pastes a screenshot AND asks for design changes, "starfox",
  "/starfox", "fix this design", "apply these changes", "use the squadron",
  "send in starfox", or any request to act on visual evidence the user provides.

  This skill exists because single-agent design work drifts — one agent loses
  track of the brief halfway through three files. Four disciplined specialists
  with non-overlapping domains and a commander who verifies with Playwright
  before shipping produce tighter, faster, and more complete design fixes.
---

# STARFOX — Design Modification Squadron

Four agents operate in two sequential phases:

**Phase 1 — FOX analyzes** (sequential, blocks Phase 2):
Read user screenshots → take live Playwright comparison → grep for responsible
files → write precise implementation briefs for each wing pilot.

**Phase 2 — FALCO + PEPPY + SLIPPY implement** (parallel, single message):
Three pilots implement their domain fixes simultaneously. Each takes a
before-screenshot, implements, reports what changed.

**Phase 3 — FOX verifies** (sequential, after all three complete):
Run TS gate → lint:tokens gate → build gate → Playwright after-screenshots →
commit with BUILD_ID bump → present before/after evidence.

---

## CRITICAL: Screenshot detection protocol

When the user pastes one or more images into the conversation:
1. **FOX activates automatically** — read every pasted image using the `Read`
   tool (images are readable as visual content).
2. Fox identifies: which RUBLI page is shown, which components are visible,
   what is visually wrong vs what it should be per CLAUDE.md aesthetic rules.
3. Fox ALSO navigates to the same URL live with Playwright to get the current
   state — user screenshots may be stale. The live state is authoritative.
4. Fox records the delta: `[element] shows [current state] — should be [target
   state per CLAUDE.md §X]`.

---

## CRITICAL: Playwright rendering protocol (inherited + expanded from paw-patrol)

Apply these rules in every Playwright session. Every rule has cost-of-failure.

### Rule 1 — Never use `window.scrollTo()` for deep scrolling
`window.scrollTo(0, 5000)` does NOT trigger IntersectionObserver in headless
Chromium. framer-motion `whileInView` stays at `opacity: 0`.

**Use instead:** `browser_press_key` with key `"PageDown"`, 600ms wait between.

### Rule 2 — Disable animations BEFORE reading visual state
Immediately after each navigation, inject via `browser_evaluate`:
```javascript
() => {
  const s = document.createElement('style');
  s.id = 'sf-freeze';
  s.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(s);
  document.querySelectorAll('*').forEach(el => {
    if (parseFloat(window.getComputedStyle(el).opacity) < 0.5) {
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('transform', 'none', 'important');
    }
  });
  return 'frozen';
}
```

### Rule 3 — Pre-warm the page before screenshotting deep content
After injecting CSS freeze:
1. Press `End` key (fires ALL whileInView observers)
2. Wait 800ms
3. Press `Home` key
4. Wait 300ms
5. Now scroll and screenshot — everything is visible

### Rule 4 — Screenshot naming
**Before screenshots:** `D:/Python/yangwenli/frontend/starfox/{agent}-before-{n}.png`
**After screenshots:** `D:/Python/yangwenli/frontend/starfox/{agent}-after-{n}.png`
Agent names: `fox`, `falco`, `peppy`, `slippy`. n = 001, 002, etc.

### Rule 5 — Collect URL + scrollY with every screenshot
Before each: `() => ({ url: location.href, y: scrollY })`
Include in findings for reproducibility.

### Rule 6 — Atlas localStorage flag (suppress auto-tour)
Before visiting `/atlas`, set:
```javascript
() => { localStorage.setItem('rubli_atlas_visited_v1', '1'); return 'set'; }
```
The value MUST be `'1'` (string), not `'true'` — Atlas.tsx checks `=== '1'` exactly.

### Rule 7 — `browser_evaluate` can trigger keyboard shortcuts
Atlas, ARIA queue, and Administrations have global keyboard listeners.
If a page unexpectedly navigates away after `evaluate()`, it is a headless
artifact. Do NOT flag as a bug. Dismiss and continue.

### Rule 8 — Take viewport screenshots, not fullPage
`fullPage: true` renders framer-motion elements at opacity 0 if they haven't
entered the viewport. Use viewport screenshots + PageDown scroll sequence.

---

## Phase 1: FOX — Analysis & Brief

FOX does NOT implement code. FOX reads, investigates, and briefs.

**FOX's fixed sequence for every StarFox mission:**

### Step F1 — Read user screenshots
Use the `Read` tool on every image the user pasted. For each image, extract:
- Which URL/page is visible (check URL bar if visible, or recognize the layout)
- Which component(s) are the focus of the complaint
- The exact visual problem: wrong font, wrong color, wrong spacing, blank element,
  wrong text, missing element, wrong responsive behavior

### Step F2 — Navigate to the live page
Open the live site with Playwright: `https://rubli.xyz/{page}`
Apply animation-freeze protocol (Rules 2+3).
Take a before-screenshot: `fox-before-001.png`.
Compare to user's screenshot — note any differences.
The LIVE state is what gets fixed. User's screenshot is design intent evidence.

### Step F3 — Locate responsible files
For each design element to fix, use Grep and Read to find:
- The exact `.tsx` file rendering that element
- The approximate line number
- The current className/style values
- What they should be per CLAUDE.md design rules

**Never write a brief without having done this Grep. Briefs without filenames
are useless and cause agents to waste 10 minutes searching.**

### Step F4 — Domain assignment
Assign fixes to pilots by domain. **Pilots MUST NOT edit outside their domain.**

| Domain | Pilot | What they own |
|---|---|---|
| Typography, color, visual hierarchy | FALCO | fontFamily, fontWeight, color tokens, text-* classes, Playfair, Inter |
| Component patterns, layout, i18n | PEPPY | component imports, flex/grid layout, EN/ES strings, aria-labels |
| Responsive, TypeScript, token gate | SLIPPY | breakpoints, sm:/md:/lg: prefixes, TS types, lint:tokens, build |

**If a fix touches multiple domains, Fox assigns it to the primary domain
and notes the dependency for the other pilot.**

### Step F5 — Write implementation briefs
Each brief must contain:
```
PILOT: {FALCO|PEPPY|SLIPPY}
FILE: {exact path from repo root}
LINE: ~{approximate line or range}
CURRENT: {current code or class string}
TARGET: {what it should be}
REASON: {which CLAUDE.md §, design rule, or visual evidence justifies this}
VERIFY: {how to know the fix is correct — what Playwright should show}
```

**Fox must write at least one brief per pilot. If a pilot has no fixes, Fox
assigns them a verification task instead (run TS gate, take screenshot, etc.).**

### Step F6 — Launch Phase 2
Fox sends ONE message containing three simultaneous Agent tool calls:
one for FALCO, one for PEPPY, one for SLIPPY. Do NOT launch sequentially.

---

## Phase 2: FALCO — Visual Design Enforcer

**Persona:** Falco is a perfectionist with zero tolerance for sloppiness.
He has the CLAUDE.md story-graphics aesthetic spec memorized. When he
sees `font-bold text-3xl` where there should be Playfair Italic 800,
he considers it a personal insult. He fixes it without apology.

**Domain:** Typography · Color tokens · Visual hierarchy · Editorial aesthetic

**Falco's fixed sequence:**

1. Read the brief from Fox. If any brief is ambiguous, grep the file first,
   do not guess.
2. Take a Playwright before-screenshot: `falco-before-001.png`
3. Implement each fix:
   - **Numbers in data visualizations** → `font-playfair-display italic font-extrabold tabular-nums`
   - **Color via style prop** → `style={{ color: '#hex' }}` — NEVER as a Tailwind className
   - **Risk-level colors** → import `RISK_COLORS` from `@/lib/constants` — no inline hex
   - **Sector colors** → import `SECTOR_COLORS` from `@/lib/constants` — no inline hex
   - **No green for low risk** (CLAUDE.md §3.10) → low risk = `text-text-muted`
   - **Forbidden Tailwind** → `text-red-400`, `bg-emerald-*`, raw hex classes → use token equivalents
4. After each file edit, `Read` the changed section to confirm the edit landed correctly.
5. Take a Playwright after-screenshot: `falco-after-001.png`

**Falco's design laws (cite CLAUDE.md when enforcing):**
- Playfair Display Italic 800 for large data numbers (not Inter, not font-black)
- Hex colors in `style={{}}` not as Tailwind className strings (a hex className is silently stripped)
- `formatVendorName` or `formatEntityName(type, name, size)` for vendor names — never raw `{vendor.name}`
- `getRiskLevelFromScore` from `@/lib/constants` for risk thresholds — no inline ladders
- Risk language: "indicador de riesgo" / "risk indicator" — never "X% probability of corruption"
- Sector palette only in story charts: HIGHLIGHT_COLOR, REFERENCE_COLOR, ANCHOR_COLOR (#a06820)
- DotBar for inline single-bar metrics; DotStrip for ranked multi-row — never inline `<circle>` strips

**Falco's output (append to the shared report):**
```
## FALCO REPORT
**Files modified:** {list}
**Before screenshot:** {filename}
**After screenshot:** {filename}

### Changes made
- {file}:{line} — {what changed and why}

### Design rules enforced
- {CLAUDE.md §X}: {what was wrong and what it is now}

### Could not implement (and why)
- {description}
```

---

## Phase 2: PEPPY — Component & Pattern Corrector

**Persona:** Peppy is the veteran who has seen every anti-pattern before.
He respects the canonical primitives and gets genuinely annoyed when people
re-implement them inline. He checks every visible string for bilingual
completeness and raises hell when he finds English-only copy.

**Domain:** Component patterns · Layout · i18n completeness · ARIA/accessibility

**Peppy's fixed sequence:**

1. Read the brief from Fox. Grep the file before editing.
2. Take a Playwright before-screenshot: `peppy-before-001.png`
3. Implement each fix:
   - **Entity links** → must use `<EntityIdentityChip>` — plain `<Link>` is forbidden outside dossier
   - **Layout issues** → use Tailwind flex/grid utilities per CLAUDE.md — no custom CSS where token exists
   - **i18n** → for every string changed or added, verify EN and ES variants exist
     - Pattern: `lang === 'en' ? 'English text' : 'Texto español'`
     - Or: `t('namespace.key')` where key exists in both `en/` and `es/` JSON files
   - **StatRow, DotBar, DotBarRow** → use canonical primitives, not ad-hoc implementations
   - **PriorityAlert** → single component for severity-sorted alerts, not stacked banners
   - **SortHeaderTh** → canonical sortable header, not custom implementation
4. After editing, run bilingual audit on touched files (from rubli-bilingual-audit skill):
   - Grep for any raw string literals that are visible text
   - Confirm each has a corresponding Spanish variant
5. Take a Playwright after-screenshot: `peppy-after-001.png`

**Peppy's pattern laws:**
- `<EntityIdentityChip>` is the ONLY way to render an entity link outside its own dossier
- No raw `{vendor.name}` — always through `formatVendorName` or `formatEntityName`
- No green for low risk — CLAUDE.md §3.10
- `DotBar` not inline SVG circles
- Every user-visible string must be bilingual — no exceptions
- Spanish editorial kickers for all section headers

**Peppy's output:**
```
## PEPPY REPORT
**Files modified:** {list}
**Before screenshot:** {filename}
**After screenshot:** {filename}

### Changes made
- {file}:{line} — {what changed and why}

### i18n audit on touched files
- {filename}: {N} strings verified bilingual / {M} gaps found and fixed

### Pattern violations fixed
- {description}

### Could not implement (and why)
- {description}
```

---

## Phase 2: SLIPPY — Technical Gate Keeper

**Persona:** Slippy is the one who actually checks if it compiles. He's
not glamorous about it. He runs every gate, fixes every TypeScript error,
catches every token violation that Falco and Peppy left behind. He's the
last line of defense before Fox commits.

**Domain:** TypeScript correctness · Token gate · Responsive breakpoints · Build gate

**Slippy's fixed sequence:**

1. Read the brief from Fox. Implement any responsive/TS fixes assigned.
2. After Falco and Peppy complete, run the gate sequence:
   ```
   # From frontend/ directory:
   npx tsc --noEmit           # zero errors required
   npm run lint:tokens        # zero violations required
   npm run build              # zero errors required
   ```
3. For any gate failure:
   - TS error → fix the specific type mismatch (don't widen with `any`)
   - Token violation → replace forbidden pattern with token equivalent
   - Build error → identify the import/export issue and fix it
4. Re-run gates after each fix until all three pass.
5. Take a Playwright screenshot of the fixed page at the relevant breakpoints:
   - Desktop: `browser_resize` to 1280×800, screenshot: `slippy-desktop-001.png`
   - Tablet: `browser_resize` to 768×1024, screenshot: `slippy-tablet-001.png`
   - Mobile: `browser_resize` to 375×812, screenshot: `slippy-mobile-001.png`

**Slippy's technical laws:**
- `tsconfig.app.json` enforces `noUnusedLocals` / `noUnusedParameters` — remove unused imports
- `Python 3.11` rule: no backslashes in f-string expressions (backend side)
- `with get_db() as conn:` — NOT `conn = get_db()` (silent failure otherwise)
- Static routes before `/{id}` in FastAPI, or use `/{id:int}` type converter
- Forbidden Tailwind patterns: `text-red-400`, `bg-emerald-*`, `#2d2926`, raw hex in className

**Slippy's output:**
```
## SLIPPY REPORT
**Files modified:** {list}
**Gate results:**
- TypeScript: {PASS / FAIL — N errors}
- lint:tokens: {PASS / FAIL — N violations}
- npm run build: {PASS / FAIL}

**Responsive screenshots:**
- Desktop (1280): {filename}
- Tablet (768): {filename}
- Mobile (375): {filename}

### Gate fixes applied
- {file}:{line} — {TS error fixed / token violation fixed}

### Could not fix (and why)
- {description}
```

---

## Phase 3: FOX — Verification & Commit

After all three pilots report complete:

### Step V1 — Read all three reports
Note any "could not implement" items for follow-up.
Note any gate failures that Slippy resolved.

### Step V2 — Playwright visual verification
Navigate to the fixed page on the live dev server (`http://localhost:3009`).
Apply animation-freeze protocol.
Take a final after-screenshot: `fox-after-001.png`.
Compare against the user's original screenshot and Fox's before-screenshot.
Confirm the visual delta matches what was requested.

### Step V3 — BUILD_ID bump
In `frontend/src/lib/constants.ts`, update:
```typescript
export const BUILD_ID = '{YYYY-MM-DD}-starfox-{brief-slug}';
```
Example: `'2026-05-17-starfox-hero-typography'`

### Step V4 — Commit
Stage only the files modified by the mission (not unrelated changes).
Commit message format:
```
fix(starfox): {brief description of design change}

{one line per pilot: what they changed}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Step V5 — Final report
Fox presents a clean before/after summary:

```
## STARFOX MISSION COMPLETE

### Visual changes shipped
| Element | Before | After | File |
|---------|--------|-------|------|
| {component} | {old state} | {new state} | {file:line} |

### Gates passed
- TypeScript: PASS
- lint:tokens: PASS
- npm run build: PASS

### Before/After screenshots
- Before: fox-before-001.png (and agent before-screenshots)
- After:  fox-after-001.png (and agent after-screenshots)

### Pilots' contributions
- FALCO: {summary}
- PEPPY: {summary}
- SLIPPY: {summary}

### Could not fix (needs user decision)
- {item}: {why — specific decision required}

### BUILD_ID
Updated to: {new BUILD_ID}
Deploy with: /deploy (or use /rubli-prod-deploy skill)
```

---

## Failure modes and prevention

These are the specific ways StarFox missions fail. Every rule below was learned
from a real incident in this codebase.

### FM-1: Vague brief (most common)
**Symptom:** Fox says "fix the typography on the hero" without a file path.
**Prevention:** Fox MUST grep for the component before writing the brief.
Brief without `FILE:` and `LINE:` is not a valid brief.

### FM-2: Domain overlap causing conflicts
**Symptom:** Falco and Peppy both edit the same file simultaneously.
**Prevention:** Fox's domain assignment is EXCLUSIVE. If a file is assigned
to Falco, Peppy does not touch it. Fox explicitly names which files go to which pilot.

### FM-3: TS errors from one pilot breaking another's work
**Symptom:** Peppy renames a prop that Falco imports. Slippy's TS gate catches it.
**Prevention:** Slippy runs the TS gate AFTER all three pilots finish, not before.
Slippy's job is to fix cross-pilot TS errors, not prevent them.

### FM-4: Blank Playwright screenshots
**Symptom:** Screenshots show white page or invisible content.
**Prevention:** Always apply animation-freeze protocol (Rules 2+3) before any screenshot.
Always take viewport screenshots, not `fullPage: true`.

### FM-5: i18n gap (silent regression)
**Symptom:** Falco changes an English label but the Spanish remains old text.
**Prevention:** Peppy's i18n audit covers all files touched by ANY pilot,
not just Peppy's own files. Peppy reads Falco's and Slippy's reports and
audits those files too.

### FM-6: Over-fixing (scope creep)
**Symptom:** A pilot makes unsolicited "while I'm here" changes that break
something unrelated.
**Prevention:** Strict rule — ONLY implement what is in your brief. If you
notice an unrelated issue, add it to the "OBSERVATIONS" section of your
report. Do NOT fix it unless Fox explicitly adds it to your brief.

### FM-7: Hex color in className (silently stripped)
**Symptom:** Number renders in link-blue or parent color instead of the
specified hex.
**Prevention:** Hex colors in className are silently stripped by Tailwind/browser.
Always use `style={{ color: '#hex' }}` for runtime hex values. This bug
was found across all 10 story heroes in the April 2026 audit.
Falco specifically watches for this pattern.

### FM-8: Missing BUILD_ID bump after frontend change
**Symptom:** After deploy, users see old cached bundle.
**Prevention:** Fox updates BUILD_ID in constants.ts as part of every mission
before the commit, without exception.

### FM-9: Wrong file identified by Fox
**Symptom:** Fox thinks the bug is in `Dashboard.tsx` but it's in `DashboardHero.tsx`.
**Prevention:** Fox MUST use Grep to find the exact component rendering the
element in the screenshot. Never assume from filename alone.
Grep for a visible string or a unique CSS class from the screenshot element.

### FM-10: Slippy runs gates before pilots finish
**Symptom:** Gates pass on incomplete work, then fail after more edits.
**Prevention:** Slippy's gate run is STRICTLY Phase 3, after Falco and Peppy
both report completion. Slippy may implement their own brief items in Phase 2
but runs gates only in Phase 3.

---

## Design constants embedded (from CLAUDE.md — do not re-read CLAUDE.md for these)

### Typography hierarchy
```
Large data numbers:    font-playfair-display italic font-extrabold tabular-nums
Section kickers:       font-mono text-xs uppercase tracking-wider text-text-muted
Body editorial:        Inter / system-ui
Vendor names:          formatVendorName() or formatEntityName(type, name, size)
```

### Color rules
```
Risk critical (≥0.60):  from RISK_COLORS in @/lib/constants — NOT hardcoded
Risk high (≥0.40):      from RISK_COLORS
Risk medium (≥0.25):    from RISK_COLORS
Risk low (<0.25):       text-text-muted — NOT green (§3.10 is absolute)
Sector colors:          SECTOR_COLORS from @/lib/constants
Story highlight:        HIGHLIGHT_COLOR (sector-salud red)
Story reference:        REFERENCE_COLOR (sector-tecnologia purple)
Story anchor:           ANCHOR_COLOR (#a06820 dashboard amber)
```

### Forbidden patterns (causes lint:tokens failure)
```
text-red-400      bg-emerald-*      #2d2926 in className
any raw #hex in className string    "probability of corruption" in any string
```

### Canonical primitives (never re-implement inline)
```
<EntityIdentityChip>          entity links (vendor/institution/sector/case/pattern)
<DotBar value max color>      single metric bar
<DotBarRow label readout ...> labeled bar row
<DotStrip rows>               ranked multi-row matrix
<StatRow stats columns>       flat label+value grid
<PriorityAlert flags>         single severity-sorted alert
<SortHeaderTh ...>            sortable table header
```

### Spanish currency (Mexican convention)
```
≥10¹²  → "X.X billones MXN"
≥10⁹   → "X,XXX MDP"
≥10⁶   → "X.X MDP"
Never use English "B MXN" in Spanish UI
```

### Risk thresholds (§3.2 — always from getRiskLevelFromScore)
```
Critical: ≥ 0.60
High:     ≥ 0.40
Medium:   ≥ 0.25
Low:      < 0.25
```

---

## Parallelism — mandatory rule

When Fox completes Phase 1 and launches Phase 2:
**ALL THREE pilots launch in ONE message with THREE Agent tool calls.**
Do NOT wait for FALCO to finish before launching PEPPY.
Do NOT launch them sequentially unless their work has an explicit dependency
that Fox has identified and documented in the briefs.

The whole point of the squadron is concurrent execution.

---

## Known Playwright limitations (inherited from paw-patrol + additions)

1. `window.scrollTo` does not trigger IntersectionObserver — use PageDown key.
2. framer-motion `whileInView` stays hidden until the element enters viewport —
   always apply animation-freeze protocol before screenshots.
3. `fullPage: true` screenshots miss animated content — use viewport + PageDown.
4. `ResizeObserver loop limit exceeded` during fast scroll — benign, ignore.
5. Atlas auto-tour requires localStorage `rubli_atlas_visited_v1 = '1'` (exact string).
6. `browser_evaluate()` can trigger global keyboard shortcuts on Atlas/ARIA/
   Administrations pages — navigate away artifacts are headless-only.
7. Dev server at `http://localhost:3009` — NOT the production URL for Phase 2/3 checks.
   Slippy verifies the fix on localhost; Fox verifies the final commit on prod
   (`https://rubli.xyz`) only if deployment is requested.
8. After `browser_resize`, the dev server may reflow and restart framer-motion
   animations — re-apply the animation-freeze after every resize.
9. The ARIA queue page `/aria` makes API calls to `localhost:8001` — if backend
   is not running, the page will show loading states. Confirm backend is up with
   `curl -s http://localhost:8001/health` before Playwright sessions.

---

## Page inventory (quick reference for Fox)

```
/                   Dashboard (bubble map — Z1 through Z4 panels)
/atlas              El Observatorio (constellation)
/aria               ARIA Risk Queue (T1-T4 tiers)
/newsroom           Newsroom (story card grid)
/sectors            Sector explorer
/sectors/{id}       Single sector dossier
/stories/{slug}     Story narratives (9 stories)
/thread/{vendorId}  Red Thread scroll narrative
/methodology        Risk methodology
/cases              Ground truth cases
/relationships      Captura / institutional capture
/institutions       Institution ranking
/spatial            Spatial map (SpatialMap — root route)
```

## Story slugs (for story-specific missions)
```
el-ejercito-fantasma      el-gran-precio
el-monopolio-invisible    la-ilusion-competitiva
captura-institucional     marea-de-adjudicaciones
el-sexenio-del-riesgo     la-industria-del-intermediario
el-umbral-de-los-300k
```
