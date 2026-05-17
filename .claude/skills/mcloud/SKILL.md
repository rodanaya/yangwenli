---
name: mcloud
description: |
  Full-scale redesign orchestrator for the RUBLI Lylat mission set.
  Eight roles execute a design→implement→QA→deploy pipeline per mission.
  DESIGNUS (Opus) invents design specs. User approves inline. FALCO/PEPPY/SLIPPY
  implement autonomously in an isolated worktree. PATROL verifies. DEPLOYER ships.
  State tracked in SQLite. Nightly quality gate via CronCreate.

  Trigger when user says: "/mcloud", "mcloud", "run mcloud", "execute mission",
  "start lylat", "next mission", "/mcloud M1", "/mcloud M7", etc.

  This skill exists because /starfox targets known fixes. /mcloud invents solutions
  for pages that need full redesign — then executes them without supervision.
---

# MCLOUD — Lylat Mission Orchestrator

Eight roles. One pipeline. Executes the RUBLI Lylat audit missions from design
through deployment without requiring the user to supervise implementation.

---

## CONFIGURATION (locked — do not change without user consent)

```
Design review:       Inline in conversation — user approves here, not in a file
Worktree mode:       Per-mission from main repo D:\Python\yangwenli\
Nightly cron:        Yes — after first successful deploy
State storage:       SQLite D:\Python\yangwenli\.claude\mcloud.db
Implementation:      Fire-and-forget after approval (PushNotification on complete)
M4 cartography:      DESIGNUS proposes 3 concepts — user picks one
M6 Networks:         Audit first, then present merge-or-drop recommendation
```

---

## PATHS (absolute — always use these)

```
Main repo:           D:\Python\yangwenli\
Worktrees base:      D:\Python\yangwenli\.claude\worktrees\
Lylat missions:      D:\Python\yangwenli\.claude\lylat.md
SQLite state DB:     D:\Python\yangwenli\.claude\mcloud.db
Design specs:        D:\Python\yangwenli\.claude\designs\
Before screenshots:  D:\Python\yangwenli\.claude\designs\{mission}-before\
After screenshots:   D:\Python\yangwenli\frontend\starfox\
Hooks:               D:\Python\yangwenli\.claude\hooks\
Frontend:            D:\Python\yangwenli\frontend\
VPS deploy:          bash /opt/rubli/deploy.sh   (run ON VPS, not local)
```

---

## ROLES

| Role | Model | Responsibility |
|------|-------|----------------|
| SEQUENCER | sonnet | Reads SQLite, routes to correct phase, enforces file locks |
| DESIGNUS | **opus + ultrathink** | Invents design specs. Uses sequential-thinking + WebSearch. |
| FOX | sonnet | Reads approved spec → finds exact files → writes pilot briefs |
| FALCO | sonnet | Visual/typography — Playfair, color tokens, editorial hierarchy |
| PEPPY | sonnet | Layout/i18n — component patterns, EN/ES completeness |
| SLIPPY | sonnet | TS gates + responsive + build — zero errors required |
| PATROL | sonnet | Playwright before/after visual verification + regression scan |
| DEPLOYER | sonnet | Commit + push + VPS deploy + SQLite state update |

**Domain assignments (FALCO/PEPPY/SLIPPY — same as StarFox):**
- FALCO: fontFamily, fontWeight, color tokens, Playfair, hex via style={{}}
- PEPPY: flex/grid layout, component imports, EN/ES strings, aria-labels
- SLIPPY: breakpoints, TypeScript types, lint:tokens, build gate

---

## SQLITE SCHEMA

On first run, SEQUENCER initializes `mcloud.db` with this schema:

```sql
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,           -- M1, M1b, M2, M3, M4, M5, M6, M7
  name TEXT NOT NULL,
  wave INTEGER,
  status TEXT DEFAULT 'pending', -- pending|infra_check|designing|review|approved|implementing|patrol|deploying|deployed|blocked
  model TEXT,                    -- sonnet|opus
  needs_design_proposal INTEGER DEFAULT 1,  -- 0 for quick wins
  priority INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT,
  filepath TEXT NOT NULL,
  description TEXT,
  read_by_designus INTEGER DEFAULT 0,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS designs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT UNIQUE,
  spec_path TEXT,
  approval_status TEXT DEFAULT 'draft',  -- draft|approved|rejected|revision_requested
  approved_at TEXT,
  revision_notes TEXT,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS implementations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT,
  worktree_path TEXT,
  branch_name TEXT,
  files_modified TEXT,           -- JSON array
  ts_gate INTEGER DEFAULT 0,     -- 0=not run, 1=pass, -1=fail
  lint_gate INTEGER DEFAULT 0,
  build_gate INTEGER DEFAULT 0,
  commit_hash TEXT,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS file_locks (
  filepath TEXT PRIMARY KEY,
  mission_id TEXT,
  locked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT,
  commit_hash TEXT,
  deployed_at TEXT,
  vps_status TEXT,               -- success|failed
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Key queries SEQUENCER uses:**
```sql
-- What needs to be done next?
SELECT id, name, status FROM missions WHERE status != 'deployed' ORDER BY wave, priority;

-- Is this file already claimed by another active mission?
SELECT mission_id FROM file_locks WHERE filepath = ? AND mission_id != ?;

-- Did all gates pass for this mission?
SELECT ts_gate, lint_gate, build_gate FROM implementations WHERE mission_id = ?;

-- Log a design decision
INSERT INTO insights (mission_id, note) VALUES (?, ?);
```

---

## MISSION REGISTRY

Seed data for `mcloud.db` — SEQUENCER inserts these if they don't exist:

```sql
INSERT OR IGNORE INTO missions VALUES ('L0', 'Infrastructure Build', 0, 'pending', 'sonnet', 0, 1, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M1', 'Risk Queue Compression + Sort', 1, 'pending', 'sonnet', 0, 2, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M1b', 'Red Thread Readability', 1, 'pending', 'sonnet', 0, 2, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M2', 'Cases Redesign', 1, 'pending', 'sonnet', 0, 3, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M3', 'Sectors Full Redesign', 3, 'pending', 'opus', 1, 4, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M4', 'Spending Categories Cartography', 4, 'pending', 'opus', 1, 4, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M5', 'Institutions Unification', 5, 'pending', 'opus', 1, 4, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M6', 'Networks Merge-or-Drop', 6, 'pending', 'opus', 1, 5, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO missions VALUES ('M7', 'Administrations Full Redesign', 7, 'pending', 'opus', 1, 5, datetime('now'), datetime('now'));
```

---

## PHASE 0 — STARTUP SEQUENCE

Every `/mcloud` invocation begins here, without exception.

### Step S1 — Initialize SQLite
```bash
# Check if mcloud.db exists
ls "D:\Python\yangwenli\.claude\mcloud.db"
# If not: run schema creation via mcp__sqlite (see schema above)
# Then seed mission registry
```

### Step S2 — Infrastructure check (L0)
Query: `SELECT status FROM missions WHERE id = 'L0'`

If L0 is not `deployed`:
- Check `frontend/src/lib/utils.ts` for `shortenContractName` → if missing, add to L0 work queue
- Check `frontend/src/components/shared/TruncatedName.tsx` → if missing, add to L0 work queue
- Run L0 before any page mission

### Step S3 — Find active mission
Query: `SELECT * FROM missions WHERE status NOT IN ('pending','deployed') ORDER BY wave LIMIT 1`

If a mission is in-progress, resume it at the correct phase.
If none in-progress: `SELECT * FROM missions WHERE status = 'pending' ORDER BY wave, priority LIMIT 1`

### Step S4 — Report state to user
Always show a brief status line before starting work:
```
MCLOUD — Mission {id}: {name}
Status: {status} → proceeding to {next phase}
{N} missions deployed · {M} remaining
```

---

## PHASE 1 — DESIGNUS (Opus + ultrathink)

**Only runs for missions where `needs_design_proposal = 1` (M3/M4/M5/M6/M7)**
Quick wins (L0/M1/M1b/M2) skip directly to Phase 3.

### Step D1 — Read all mission screenshots
Use `Read` tool on every screenshot filepath listed for this mission in `lylat.md`.
Do NOT skip any. Record which ones were read: `UPDATE screenshots SET read_by_designus = 1`.

### Step D2 — Live Playwright audit
Navigate to the mission's page on `http://localhost:3009`.
Apply animation-freeze protocol (inherited from StarFox Rule 2+3).
Take before-screenshots: `D:\Python\yangwenli\.claude\designs\{mission}-before\{n}.png`
These become the PATROL baseline.

### Step D3 — Sequential thinking (mcp__sequential-thinking)
Use `sequentialthinking` to reason through the design in explicit steps:
1. What does the page currently do? (catalog every section)
2. What works and should be kept?
3. What fails and must be replaced?
4. What should be deleted entirely?
5. For each failed element: generate 2-3 design options
6. Evaluate each option against CLAUDE.md constraints
7. Choose the best option for each element
8. Compose the final design spec

Each step must be completed before moving to the next.

### Step D4 — WebSearch for design inspiration (where needed)
For novel UI elements (M4 cartography, M7 Risk Matrix, M3 editorial charts):
Search for: `{chart type} NYT FT Economist editorial design`
Search for: `{component pattern} investigative journalism data visualization`
Use patterns and principles as inspiration — do NOT copy existing designs.
Record search results in SQLite insights.

### Step D5 — Write design spec
Save to `D:\Python\yangwenli\.claude\designs\{mission-id}-spec.md`

Spec format:
```markdown
# {Mission} Design Specification
**Mission:** {id} — {name}
**Status:** DRAFT — awaiting approval
**DESIGNUS session:** {timestamp}

## What stays (keep unchanged)
- {component}: {reason it works}

## What gets replaced (with replacement spec)
### {Component name}
**Problem:** {specific problem}
**Solution:** {exact description of what replaces it}
**Layout:** {grid/flex spec, dimensions, responsive behavior}
**Data shown:** {exactly what data fields are displayed}
**Visual treatment:** {typography, colors from CLAUDE.md, animation if any}

## What gets deleted
- {component}: {reason for deletion}

## New sections being added
### {Section name}
{full spec}

## Information architecture changes
{if tabs/sections are being reorganized, describe the before and after}

## Implementation notes for FOX
{file-specific callouts that will help FOX write briefs faster}
```

**Special rule for M4:** DESIGNUS presents 3 cartography concepts with ASCII mockups
before writing the full spec. User picks one, THEN full spec is written.

**Special rule for M6:** DESIGNUS audits `/networks` live, compares element-by-element
with `/atlas`. Writes a comparison table: what's in Networks that isn't in Observatory.
Presents recommendation (merge or drop) with evidence. User decides.

### Step D6 — Present inline for approval

Show the spec in conversation. Format:
```
━━━ DESIGNUS: {Mission} Design Spec ━━━

[summary of what's changing — 5-10 bullet points]

[ASCII mockup of key new elements if helpful]

[Full spec content]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Approve? Type: yes / change [what] / reject
```

Wait for user response. Do NOT proceed to Phase 2 until approved.
On approval: `UPDATE designs SET approval_status='approved', approved_at=datetime('now')`.
On revision: incorporate changes, re-present. Log revision notes in SQLite.

---

## PHASE 2 — WORKTREE SETUP

After design spec approved (or for quick wins, immediately after Phase 0):

```bash
# From main repo
cd D:\Python\yangwenli

# Create mission branch and worktree
git worktree add ".claude/worktrees/{mission-id}-{slug}" -b "lylat/{mission-id}-{slug}"
```

Update SQLite:
```sql
UPDATE implementations SET worktree_path = ?, branch_name = ? WHERE mission_id = ?;
```

All subsequent pilot work happens INSIDE the worktree directory.
NEVER edit files in the main repo while a mission worktree is active.

---

## PHASE 3 — FOX ANALYSIS AND BRIEFING

FOX operates from the worktree. Same protocol as StarFox FOX, with one addition:
**FOX reads the approved design spec** (`designs/{mission}-spec.md`) as the primary source
of truth for "target state." FOX does NOT reinvent the design — it translates the spec
into file-specific briefs.

### FOX brief format (same as StarFox):
```
PILOT: {FALCO|PEPPY|SLIPPY}
FILE: {exact path from repo root}
LINE: ~{approximate line or range}
CURRENT: {current code or class string}
TARGET: {what it should be per the approved design spec}
REASON: {spec section reference + CLAUDE.md section if applicable}
VERIFY: {what Playwright should show to confirm the fix is correct}
```

**File lock protocol:** Before writing any brief, FOX checks:
```sql
SELECT mission_id FROM file_locks WHERE filepath = ? AND mission_id != ?
```
If locked by another mission: flag conflict to user. Do NOT assign conflicting files to pilots.

When briefs are finalized, FOX writes file locks:
```sql
INSERT OR REPLACE INTO file_locks VALUES (filepath, mission_id, datetime('now'))
```

---

## PHASE 4 — PARALLEL IMPLEMENTATION

FOX launches FALCO + PEPPY + SLIPPY in a single message (3 simultaneous Agent calls).

### Implementation rules (inherited from StarFox, enforced here):
- Only implement what is in the brief. No "while I'm here" changes.
- Unrelated issues go in OBSERVATIONS section, not implementation.
- PEPPY audits i18n on ALL files touched by ANY pilot, not just Peppy's own files.
- Every hex color goes in `style={{}}`, never in a className string.
- Every risk color from `RISK_COLORS` in `@/lib/constants`.
- Every sector color from `SECTOR_COLORS` in `@/lib/constants`.
- `formatVendorName()` or `formatEntityName()` for all vendor/institution names.
- `shortenContractName()` (L0 utility) for all contract name displays.

### SLIPPY gate sequence (after FALCO + PEPPY report complete):
```bash
# From worktree/frontend/
npx tsc --noEmit           # MUST pass: 0 errors
npm run lint:tokens        # MUST pass: 0 violations
npm run build              # MUST pass: 0 errors
```

Use Monitor for build — don't block synchronously.

Update SQLite on each gate:
```sql
UPDATE implementations SET ts_gate=1 WHERE mission_id=?;    -- on pass
UPDATE implementations SET ts_gate=-1 WHERE mission_id=?;   -- on fail
```

**If any gate fails:** SLIPPY fixes the specific error. Re-run gates. Do NOT commit until all three pass.

---

## PHASE 5 — PATROL (QA Verification)

After all three gates pass, PATROL runs from the worktree.

### PATROL protocol:
1. Start dev server if not running: `npm run dev` (Monitor for "ready" message)
2. Navigate to the mission's primary page
3. Apply animation-freeze protocol (StarFox Rule 2+3)
4. Take viewport screenshots: `slippy-desktop-001.png`, `slippy-tablet-001.png`, `slippy-mobile-001.png`
5. Compare against before-screenshots from Phase 1 (DESIGNUS)
6. Navigate to adjacent pages that share components — check for regressions
7. Check all user-visible text for untranslated Spanish in English mode (SYS-2)
8. Check all vendor/institution names — confirm no ellipsis truncation without tooltip (SYS-1)

**PATROL pass criteria:**
- [ ] Primary page renders correctly at 1280px, 768px, 375px
- [ ] No content visible before fold is missing
- [ ] No Spanish strings in English mode
- [ ] No name truncation without tooltip
- [ ] Adjacent pages show no regressions
- [ ] TypeScript: 0 errors (already confirmed)
- [ ] BUILD_ID updated in constants.ts

If PATROL finds issues: return to FALCO/PEPPY with specific fixes. Do NOT deploy with known issues.

---

## PHASE 6 — DEPLOYER

After PATROL signs off:

### Step DEP1 — Stage and commit
```bash
# From worktree root
git add {specific files modified by mission — never git add .}
git commit -m "$(cat <<'EOF'
fix(lylat/{mission-id}): {brief description}

FALCO: {summary}
PEPPY: {summary}
SLIPPY: gates passed — tsc/lint:tokens/build all clean

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Step DEP2 — Merge to main + push
```bash
# Merge worktree branch to main
git checkout main
git merge lylat/{mission-id}-{slug} --no-ff -m "merge(lylat/{mission-id}): {name}"
git push origin main
```

### Step DEP3 — VPS deploy
```bash
# SSH to VPS and run deploy script
ssh root@37.60.232.109 "bash /opt/rubli/deploy.sh"
```

### Step DEP4 — State update
```sql
INSERT INTO deployments VALUES (NULL, mission_id, commit_hash, datetime('now'), 'success');
UPDATE missions SET status='deployed', updated_at=datetime('now') WHERE id=mission_id;
DELETE FROM file_locks WHERE mission_id=mission_id;
```

Update lylat.md: mark all action items for this mission as ✅.

### Step DEP5 — Cleanup worktree
```bash
git worktree remove ".claude/worktrees/{mission-id}-{slug}"
git branch -d "lylat/{mission-id}-{slug}"
```

### Step DEP6 — Nightly cron (first deploy only)
If this is the first mission to deploy, create the nightly quality gate:
- Schedule: daily at 02:00 local time
- Command: `cd D:\Python\yangwenli\frontend && npx tsc --noEmit && npm run lint:tokens`
- On failure: PushNotification to user — "MCLOUD nightly gate failed — {error summary}"

### Step DEP7 — PushNotification
```
Mission {mission-id} deployed successfully.
{brief summary of what changed}
Next: {next pending mission name}
```

---

## PHASE 7 — SEQUENCER ROUTES TO NEXT MISSION

```sql
SELECT id, name FROM missions WHERE status='pending' ORDER BY wave, priority LIMIT 1;
```

Show the user what's coming next. If they want to continue immediately, proceed.
If they want to stop, /mcloud will resume at the correct state on next invocation.

---

## LAYER 0 — INFRASTRUCTURE BUILD (L0)

L0 runs before any page mission if either shared primitive is missing.
L0 is a quick-win (no DESIGNUS needed). FOX writes briefs directly from lylat.md.

### L0-1: `shortenContractName(name: string): string`
Add to `frontend/src/lib/utils.ts`:

```typescript
const CONTRACT_STRIP_PREFIXES = [
  'CONTRATO DE SERVICIOS DE ',
  'CONTRATO DE PRESTACIÓN DE SERVICIOS DE ',
  'ADJUDICACIÓN DIRECTA PARA LA ',
  'ADJUDICACIÓN DIRECTA PARA ',
  'LICITACIÓN PÚBLICA NACIONAL PARA ',
  'LICITACIÓN PÚBLICA INTERNACIONAL PARA ',
  'SERVICIO DE ',
  'ADQUISICIÓN DE ',
  'PROYECTO INTEGRAL DE ',
  'ELABORACIÓN DEL PROYECTO EJECUTIVO, SUMINISTRO DE MATERIALES, ',
  'ELABORACIÓN DE PROYECTO EJECUTIVO, SUMINISTRO DE MATERIALES, ',
  'TRABAJOS DE CONSTRUCCIÓN Y OBRAS COMPLEMENTARIAS DEL ',
]

const INSTITUTION_ABBREVS: Record<string, string> = {
  'INSTITUTO MEXICANO DEL SEGURO SOCIAL': 'IMSS',
  'PETRÓLEOS MEXICANOS': 'PEMEX',
  'COMISIÓN FEDERAL DE ELECTRICIDAD': 'CFE',
  'SECRETARÍA DE SALUD': 'SS',
  'SECRETARÍA DE EDUCACIÓN PÚBLICA': 'SEP',
  'SECRETARÍA DE HACIENDA Y CRÉDITO PÚBLICO': 'SHCP',
  'SECRETARÍA DE INFRAESTRUCTURA, COMUNICACIONES Y TRANSPORTES': 'SICT',
  'COMISIÓN NACIONAL DEL AGUA': 'CONAGUA',
  'INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO': 'ISSSTE',
  'BANCO NACIONAL DE OBRAS Y SERVICIOS PÚBLICOS': 'BANOBRAS',
}

export function shortenContractName(name: string, maxChars = 80): string {
  if (!name) return ''
  let s = name.toUpperCase()
  for (const prefix of CONTRACT_STRIP_PREFIXES) {
    if (s.startsWith(prefix)) { s = s.slice(prefix.length); break }
  }
  for (const [full, abbrev] of Object.entries(INSTITUTION_ABBREVS)) {
    s = s.replace(full, abbrev)
  }
  s = s.charAt(0) + s.slice(1).toLowerCase()
  return s.length > maxChars ? s.slice(0, maxChars) + '…' : s
}
```

### L0-2: `<TruncatedName>` shared component
Create `frontend/src/components/shared/TruncatedName.tsx`:

```tsx
interface TruncatedNameProps {
  name: string
  maxChars?: number
  className?: string
  isContract?: boolean
}

export function TruncatedName({ name, maxChars = 60, className, isContract }: TruncatedNameProps) {
  const display = isContract ? shortenContractName(name, maxChars) : name
  const isTruncated = display.length < name.length || display.endsWith('…')
  if (!isTruncated) return <span className={className}>{display}</span>
  return (
    <span className={className} title={name} style={{ cursor: 'help' }}>
      {display}
    </span>
  )
}
```

---

## PLAYWRIGHT PROTOCOL (inherited — apply in every Playwright session)

Rules inherited from StarFox and paw-patrol. Never violate these.

**Rule 1** — Never `window.scrollTo()`. Use `browser_press_key` with `"PageDown"`, 600ms between presses.
**Rule 2** — Disable animations immediately after navigation (inject CSS freeze via `browser_evaluate`).
**Rule 3** — Pre-warm before screenshotting: press `End`, wait 800ms, press `Home`, wait 300ms.
**Rule 4** — Screenshot naming: before = `designs/{mission}-before/{n}.png` · after = `starfox/{agent}-after-{n}.png`
**Rule 5** — Collect `url` and `scrollY` with every screenshot.
**Rule 6** — Atlas localStorage flag before visiting `/atlas`: `localStorage.setItem('rubli_atlas_visited_v1', '1')`
**Rule 7** — Viewport screenshots only, not `fullPage: true`.

---

## DESIGN CONSTANTS (from CLAUDE.md — do not re-read CLAUDE.md for these)

```
Large data numbers:    font-playfair-display italic font-extrabold tabular-nums
Section kickers:       font-mono text-xs uppercase tracking-wider text-text-muted
Vendor/institution:    formatVendorName() or formatEntityName() — never raw name
Contract names:        shortenContractName() — always

Risk critical (≥0.60): RISK_COLORS.critical from @/lib/constants
Risk high (≥0.40):     RISK_COLORS.high
Risk medium (≥0.25):   RISK_COLORS.medium
Risk low (<0.25):       text-text-muted — NEVER green (absolute rule)
Sector colors:         SECTOR_COLORS from @/lib/constants

Editorial chart palette:
  HIGHLIGHT_COLOR:   sector-salud red (story charts)
  REFERENCE_COLOR:   sector-tecnologia purple
  ANCHOR_COLOR:      #a06820 (dashboard amber)

Design reference for all redesigns: Dashboard.tsx — match its density
```

---

## FAILURE MODES — PREVENTION

**FM-1: DESIGNUS spec too vague**
DESIGNUS MUST specify exact layout for every component it proposes. "Redesign the chart"
is not a spec. "Replace the line chart with a horizontal ranked bar — institution name
left-aligned, MXN value right-aligned, risk badge in between, 40px row height, sorted
by MXN descending" IS a spec.

**FM-2: Parallel file editing**
SEQUENCER checks file_locks before every FOX brief assignment. If a file is locked by
another mission, that file is OFF LIMITS until the locking mission deploys.

**FM-3: Gate run before pilots finish**
SLIPPY runs gates STRICTLY after FALCO and PEPPY both report complete. Not before.

**FM-4: Blank Playwright screenshots**
Apply animation-freeze protocol (Rules 2+3) before EVERY screenshot. No exceptions.

**FM-5: Spanish leaking in English mode**
PEPPY audits ALL files touched by ANY pilot for untranslated strings. Not just Peppy's files.

**FM-6: Cross-mission contamination**
One worktree per mission. Pilots work inside the worktree. Never edit main repo directly
while a mission is active.

**FM-7: Deploying without PATROL sign-off**
DEPLOYER is blocked by PATROL. PATROL must explicitly report "PASS" before DEPLOYER runs.
No exceptions for "small changes."

**FM-8: Missing BUILD_ID bump**
FALCO or SLIPPY (whoever does the last edit) bumps BUILD_ID in constants.ts.
Format: `'{YYYY-MM-DD}-mcloud-{mission-id}-{slug}'`
Example: `'2026-05-17-mcloud-M7-administrations'`

---

## FINAL NOTES

- lylat.md is the human-readable brief. mcloud.db is the machine state. Both stay in sync.
- When in doubt about a design decision: look at Dashboard.tsx. That is the reference.
- "Warehouse with a chair" = any page where the content floats in a sea of whitespace. Fix it.
- "Made with paint" = any chart that uses default recharts styling with no editorial treatment. Fix it.
- SYS-1 through SYS-6 apply to every single file touched. They are not optional.
- The user wants to "not come back to this ever." Treat every commit as permanent.
