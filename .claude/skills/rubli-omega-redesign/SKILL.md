---
name: rubli-omega-redesign
description: |
  RUBLI's "omega" redesign workflow — the user's named multi-step pattern
  for redesigning specific selected UI graphics with amplified geometric
  changes (not annotation). Use this skill IMMEDIATELY whenever the user
  says "omega" (case-insensitive) about UI elements they've selected,
  highlighted in screenshots, or referenced via launch-selected-element
  blocks. Also use when the user says "redesign these specific elements",
  "amplify this chart", "this needs the omega treatment", or invokes
  similar phrasing for targeted-scope chart redesigns. The omega workflow
  is plan-then-execute with strict gates between steps; following it
  saves the cycle of "you put a little more text and now the elements
  are unreadable" failure mode the user explicitly named.
---

# Omega Redesign Workflow

User named this workflow on **2026-05-04** after watching the previous
generic redesign cycle fail repeatedly. The pattern is:

1. **Targeted scope** — only what they highlight, no opportunistic
   creep
2. **Named-precedent vocabulary** — cite a specific piece by name and
   use its actual mechanic, not just its vibe
3. **Bilingual rigor** — every visible string in ES + EN
4. **Plan-then-execute** — Opus plans, Sonnet executes, gates between

The whole point of "omega" is to force **amplified visual redesign**
where the chart's geometry actually changes — not annotation pasted on
top of an unchanged chart. See "What omega is NOT" below for the
failure mode it exists to prevent.

---

## ⚠️ Default citation library — Pudding is NOT the default for RUBLI

Pudding.cool is great for editorial / whimsical / cultural data
storytelling. **It is wrong for RUBLI.**

RUBLI is accountability journalism about $9.9T procurement and
corruption. Readers are MCCI, IMCO, Animal Político, ICIJ-style
journalists. Pudding mechanics like "30 Years of American Anxieties"
giant typography read as gimmick when applied to prosecutorial data.

**Default citation library** in priority order (must cite by name in
plan + commit body):

1. **FT Visual Vocabulary** — bullet, slope, dumbbell, deviation bar,
   small multiples
2. **Reuters Graphics** — *Forever Pollution* paired-named-outliers,
   *Carbon's Casualties* annotated time series, time-of-evidence
   timelines
3. **ICIJ** — Panama / Pandora Papers entity-flow diagrams,
   institution → intermediary → vendor
4. **NYT Upshot** — federal spending treemap, *How Much Hotter*
   annotated dot strip
5. **ProPublica** — Bailout Tracker, accountability data viz
6. **OCCRP** — organized-crime / corruption flow diagrams
7. **Sigma Awards 2024 finalists** — peer-juried best-of-data-journalism
8. **Bureau of Investigative Journalism** — UK accountability viz

Pudding may still be cited when the data has a genuinely cultural /
editorial frame (e.g. a "Year in Review" piece). For default chart
redesigns on RUBLI's accountability surfaces, prefer the libraries
above.

The cover-the-captions test stays. The amplified-redesign rule stays.
The cite-by-name rule stays. Only the citation default changes.

---

## ⚠️ What omega is NOT

**Omega is NOT "add captions, anchor stats, taglines, glossaries on top
of the existing chart."** That is the failure mode that got the user
angry on 2026-05-05 and made them say "you put a little more text and
now the elements are unreadable."

**Omega IS an amplified visual redesign.** The chart's GEOMETRY
changes. The encoding changes. The reader sees a different *shape* of
information, not the same shape with more words around it.

If the cited Reuters piece is *"Forever Pollution"*, the deliverable
must use paired-dot geometry — two dots per row on a shared axis with
the gap as the editorial story. Adding a single anchor stat above a
horizontal bar chart is NOT *Forever Pollution* treatment.

If the cited piece is FT bullet, the deliverable shows the
threshold-vs-actual encoding directly — not a separate caption that
says "we missed the 25% mark."

If the cited piece is NYT *How the Virus Got Out*, the deliverable
animates the camera following the narrative — not a chapter strip
overlay on a static chart.

**Test before shipping**: cover the captions with your hand. Does the
chart look meaningfully different from before? If no, the redesign
failed.

---

## Step 1 — Review what they marked

Inspect the `<launch-selected-element>` blocks in the user message.
Read the React component name, file path, surrounding context.
**Do NOT ask "which elements?"** if blocks exist; only ask if the
message has none.

**Gate 1**: for every element, `Read` the actual file at the cited
line range BEFORE planning. Plans built on assumed prop shapes have
repeatedly been wrong (e.g. "T1 PRIORITY hardcoded inside SVG" was
only caught at execution time on 2026-05-05 because the planner
skipped this read).

---

## Step 2 — Audit common issues

For each element, check:

- Text readability (truncation, contrast, illegible at default zoom)
- **Bilingual completeness** — every label in BOTH ES + EN, including
  strings inside event handlers, aria-labels, tooltip builders, and
  conditional branches. Run
  `grep -E "['\"][A-Z][a-z]+ [a-z]+['\"]" file` on the touched file
  to surface English strings missed by the planner.
- Generic / template-feeling vocabulary
- CLAUDE.md hard rules (DESIGN_SYSTEM.md anti-patterns table)

If the audit reveals a **correctness bug** (e.g. MacroArc 30% vs
platform 25%), promote it to its own phase — don't bury it in polish.

---

## Step 3 — Plan in Opus

Spawn `design-visionary` subagent with `model: opus`. Plan must
include:

- For EACH element: file path + line range (verified, not guessed),
  current state audit, ONE named precedent by name, ASCII sketch,
  encoding details, full bilingual key table (ES + EN columns),
  anti-patterns to avoid, effort estimate.
- **Mechanic discipline**: when citing a piece by name, the
  enhancement must use that piece's *actual mechanic*. *Forever
  Pollution* means paired-named-outlier dots + zero-axis +
  one anchor stat. NYT *How Much Hotter* means persistent named
  callouts on the chart. If the proposed enhancement could attach
  to any piece, the citation is decorative — pick a different piece
  or a different mechanic.
- **Primitive-first rule**: before specifying any new component, the
  plan MUST list which existing primitive was checked and why it
  doesn't fit. Check `frontend/src/components/editorial/`,
  `frontend/src/components/sectors/`, and
  `frontend/src/components/charts/editorial/`. Candidates that
  almost always fit: `BenchmarkRow`, `EditorialDistribution`,
  `EditorialTimeline`, `Sledgehammer`, `DotStrip`,
  `EntityIdentityChip`, `PlateFrame`.
- **Plan-stage element existence check**: confirm the element still
  exists in the page. On 2026-05-04, omega-P4 targeted a heatmap
  that had already been replaced by `TopCategoriesChart` — re-aim
  or drop the phase at plan time, not after the agent loads the
  file.
- Save plan as `docs/OMEGA_<short-slug>_<YYYY_MM_DD>.md`.

**Gate 2**: plan ships ordered by dependency (correctness fixes
first, shared primitives before consumers). Ship a brief table at
the bottom listing each phase's blocking dependency.

---

## Step 4 — Execute in Sonnet

Spawn `frontend-architect` subagent(s) with `model: sonnet`, one per
PR-sized chunk. Each agent must complete this checklist before
claiming done:

1. **Read first**: re-read the actual file before editing. Plan is a
   guide; file is truth.
2. **Stage all created files**: `git status` and `git add` every new
   file BEFORE running gates. The 2026-05-04 cycle broke prod twice
   because new files compiled locally (uncommitted) but not in CI.
3. **Bilingual audit before declaring done**:
   - `grep -cE "lang ?=== ?'es' ?\?" file` and same for `'en'` —
     counts should be identical.
   - `grep -nE "['\"][A-Z][a-z]+ [a-z]+" file` on the touched
     region — every English-looking string should be wrapped in a
     ternary or i18n call.
   - If touching i18n JSON: `diff <(jq -S keys es/X.json)
     <(jq -S keys en/X.json)` returns empty.
4. **Bump BUILD_ID** in `frontend/src/lib/constants.ts` ONCE per
   phase, in the same commit that ships the change. (2026-05-04
   omega-P2 needed a follow-up BUILD_ID-only commit because the
   agent forgot.)
5. **Run all four gates** from `frontend/`:
   - `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` (strict)
   - `node_modules/.bin/tsc --noEmit` (lenient, root project —
     catches files not yet `git add`-ed in some configs)
   - `npm run lint:tokens`
   - `npm run build`
   All four must pass.
6. **Use existing primitives** unless the plan documented why none
   fit.
7. **Commit message**: `feat|fix(<surface> omega-P<n>): <what>` —
   cite the plan doc path in the body. **Drop the
   `Co-Authored-By: Claude Sonnet 4.6` line** — that attribution is
   stale (we are on Opus 4.7 / SDK-driven flows).
8. **Smoke screenshot**: take a Playwright/preview screenshot of
   the touched surface and attach to the agent's report. Zero-test
   phases miss visible regressions.

---

## The "amplified redesign" gate (added 2026-05-05 after user critique)

Before claiming the plan is done, the planner MUST answer YES to all
of these:

- [ ] Does the chart's GEOMETRY change? (e.g. bar → Cleveland-pair,
  list → beeswarm, grid → swarm with force-collide)
- [ ] If I COVER all the new captions/labels with my hand, does the
  chart still look meaningfully different from the original?
- [ ] Is the cited piece's actual MECHANIC visible in the visual
  output, or is it just the name on a captioned version of the old
  chart?
- [ ] Does the redesign make the reader see something they couldn't
  see before? (Not "read something" — SEE something.)

If the answer to any is "no, but I added an anchor stat / tagline /
glossary that explains it", the redesign is decoration, not omega.

---

## Common failure modes

- **Bilingual half-fix**: agent patches the visible string, leaves
  two more inside event handlers and aria-labels. → checklist 3.
- **Forgot `git add`**: new file compiles locally but breaks prod.
  → checklist 2 + dual tsc gate.
- **Wrong worktree served**: edited the worktree but `npm run dev`
  ran from main repo. → before claiming "verified visually",
  confirm the dev server's cwd matches the edit cwd.
- **Citation cargo cult**: cite by name, propose generic
  enhancement. → plan-stage mechanic-discipline check.
- **"Annotation, not redesign"** (2026-05-05): every omega phase
  shipped added captions/anchor stats/glossaries while the
  underlying chart geometry stayed identical. User flagged it:
  "you put a little more text and now the elements are unreadable."
  → amplified redesign gate above + cover-the-captions test.
- **Stale element**: target was already removed/replaced. →
  plan-stage element existence check.
- **Hardcoded literal in SVG**: e.g. `<text>T1 PRIORITY</text>`. →
  step-1 file read at plan time catches this.
- **BUILD_ID drift**: phase ships without the bump, requires a
  follow-up commit. → checklist 4.

---

## Scope discipline

Opportunistic fixes inside an omega phase are **allowed** when:

- The fix is in a file the phase already touches, AND
- The fix is < 10 lines, AND
- The commit message lists it as a separate bullet.

Otherwise, flag it via `mcp__ccd_session__spawn_task` and continue
with the omega scope. Don't let one phase grow a tail of pre-existing
fixes.

---

## What to assume from CLAUDE.md (don't restate)

CLAUDE.md and DESIGN_SYSTEM.md already cover: no green for low risk,
no `SECTOR_COLORS` on text (use `SECTOR_TEXT_COLORS`), no pies/
donuts, no inline thresholds (use `getRiskLevelFromScore`),
`EntityIdentityChip` mandatory, `formatCompactMXN` for pesos,
"indicador de riesgo" never "X% probability". The omega cycle does
not restate these — agents that haven't read CLAUDE.md will fail the
`lint:tokens` gate regardless.

The companion `rubli-folio-aesthetic` skill carries the visual
vocabulary; load that when picking the named precedent. The
`rubli-agent-recovery` skill carries the recovery procedure when
an executing agent abandons mid-task.
