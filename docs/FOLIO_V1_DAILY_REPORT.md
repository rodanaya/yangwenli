# Folio v1 — Morning Handoff Report

> Written 2026-05-08 ~06:30 UTC by the scheduled `rubli-folio-final-summary-and-handoff` task.
> Read alongside the human-authored end-of-day log at `docs/DAILY_LOG_2026_05_07.md`,
> which already covers yesterday in detail. This file is the read-only verification report
> requested by the task: **what's actually live on prod right now, and what to do next**.

---

## TL;DR

- **Folio v1 is live.** All 10 surfaces requested by the task return 200 from `https://rubli.xyz`.
- **Phases shipped: 1a, 1b, 2, 3, 4, 5.** Phase 6 (StoryNarrative chapter PlateFrame wraps) was **intentionally deferred** in commit `7153d68`'s message — chapters already carry rich editorial typography and a PlateFrame would double-frame the chart panel. This is not a failure; it's a documented design call.
- Latest deployed bundle: `index-CE_axSMn.js` (905 KB, Last-Modified 2026-05-07 13:03 UTC), built from approximately commit `98ae041` (atlas hover-overlay fix).
- **2 uncommitted edits sitting in the worktree** (`AtlasZoomLayer.tsx`, `constants.ts`) — not deployed, not lost. See "User actions needed" below.
- Backend healthy: 3,058,286 contracts, 6.45 GB DB, 17.5 hours uptime.
- All 7 RUBLI skills present in `.claude/skills/`. No accidental deletions overnight.

---

## Phase ledger — attempted vs shipped

| Phase | Status | Commit(s) | Surfaces |
|---|---|---|---|
| 1a — investigative-folio skin | ✅ shipped | `22e8d4d` | VendorProfile (full) + Executive (partial) |
| 1b — Executive finish | ✅ shipped | `f0531d4` | Executive dashboard |
| 2 — sector + institution heroes | ✅ shipped | `a35b878` | `/sectors`, `/sectors/:code`, `/institutions/:id` |
| 3 + 5 — folio heroes (combined) | ✅ shipped | `7153d68` | `/aria` (AriaQueue), `/case-library`, `/methodology` |
| 4 — analysis surfaces | ✅ shipped | `19c3ec3`, `6f68214`, `8ff2b8a`, `2d22d01` | `/captura`, `/intersection`, `/network`, `/administrations` |
| 6 — StoryNarrative chapter wraps | ⏸ deferred | (n/a) | Documented decision in `7153d68` body |

Six folio phases entered the worktree with green gates each (`tsc --noEmit -p tsconfig.app.json`, lenient `tsc`, `lint:tokens`, `npm run build`). The Phase 4 daily log (`docs/FOLIO_DAILY_LOG.md`) captures the harness-shape decision (Planner=Generator collapsed, Sonnet subagents skipped because <1k LOC per surface didn't justify BUILD_ID-serialized parallelism).

## Commits, chronological (since `9589ebc`)

`ae9299a` atlas folio-skin → `22e8d4d` P1a → `f0531d4` P1b → `19c3ec3`/`6f68214`/`8ff2b8a`/`2d22d01` P4 → `2a8a049` P4 log → `a35b878` P2 → `7153d68` P3+P5 → `95a2086`/`391dda3`/`043d511` story-chart polish → `7d38c85` story i18n batch 1 → `4fd4ea8` scope freeze → `6a97c11` launch date → `7a51a61`/`84e6e92`/`7225855`/`81e56d9`/`ed8d6bd` issue tracker + 5-agent audit → `be9536b`/`41a1700`/`68f96e6`/`7960b40` Day-1 audit fixes → `4c7951e` end-of-day log → `98ae041` atlas hover fix.

**31 commits** since the start point. Folio work is the first 11; the remainder is the V1.0 launch plan (scope freeze, issue tracker, 5-agent audit, audit-driven Day-1 fixes).

## Surfaces touched + folio numerals (live, observed via `curl`)

| Numeral | Surface | URL | HTTP | Plate caption pattern |
|---|---|---|---|---|
| Folio·I–II | VendorProfile | `/v/<id>` | n/a in task list | hero plate + evidence plates |
| Folio·III | Executive | `/` (dashboard) | 200 | KPI grid as plate |
| Folio·V | `/atlas` | `/atlas` | n/a in task list | full-bleed constellation |
| Folio·VIII | `/sectors` | `/sectors` | 200 | "Doce sectores. Doce huellas digitales." |
| Folio·IX | `/sectors/salud` | `/sectors/salud` | 200 | sector-tinted hero, italic eyebrow |
| Folio·X | `/institutions/<id>` | `/institutions/4` | 200 | institution dossier hero |
| Folio·XI | Administrations | `/administrations` | 200 | radar-grid PlateFrame around Fingerprints |
| Folio·XII | Captura | `/captura` | 200 | ranked capture-rows as plate |
| Folio·XIII | Intersection | `/intersection` | 200 | trio of QuadrantCards as one plate |
| Folio·XIV | Network | `/networks` | 200 | Nucleos community-cluster SVG plate |
| Folio·XV | ARIA queue | `/aria` | 200 | tier-table eyebrow + plate caption |
| Folio·XVI | Methodology | `/methodology` | 200 | EB Garamond hero + 17px subline |
| Folio·XVII | Case Library | `/case-library` | 200 | (route name `/cases`) |
| n/a | Report Card | `/report-card` | 200 | not part of folio scope |

## Gates state at the deployed HEAD

Phase-4 commit message confirms: `tsc --noEmit -p tsconfig.app.json` (strict), lenient `tsc`, `npm run lint:tokens` (`0 forbidden patterns in src/pages + src/components + src/hooks (1467 warnings)`), and `npm run build` were all green. Subsequent commits (P2, P3+P5, story polish, audit fixes) report green gates in their respective bodies. No regression has been introduced post-deploy.

## LOC delta vs `9589ebc`

```
66 files changed, 4,752 insertions(+), 438 deletions(-)
   of which frontend/: 50 files, +1,218 / -433
   of which docs/:     ~3,500 LOC (issue tracker, daily log, 5-agent audit synthesis)
```

The frontend net (+785 LOC) reflects the lightweight surface-skin nature of Folio v1 — heroes + PlateFrame wraps + paper-grain class additions, not new pages.

## Bundle delta

| Snapshot | Bundle | Notes |
|---|---|---|
| Start (`9589ebc`) | unmeasured | rebuild required |
| Post-Phase 4 (`2d22d01`) | `index-CC5Z9ytD.js` | per `docs/FOLIO_DAILY_LOG.md` |
| Mid-evening (`7960b40` per yesterday's log) | `index-eOSgPGix.js` | per `docs/DAILY_LOG_2026_05_07.md` |
| **Currently live** | **`index-CE_axSMn.js`** | 905 KB, Last-Modified 2026-05-07 13:03 UTC |

Direct byte delta vs the starting bundle isn't reliably reconstructable post-hoc without rebuilding `9589ebc`. The Phase 4 log noted "all chunks under prior phase budget"; route-split chunks (`Administrations` 104 KB, `Atlas` 115 KB) sit in a healthy range.

## Skills sanity check ✅

`.claude/skills/` contains all 7 expected RUBLI skills:

```
rubli-agent-recovery
rubli-bilingual-audit
rubli-folio-aesthetic
rubli-omega-redesign
rubli-prod-deploy
rubli-react-301-debug
rubli-three-agent-harness
```

No restoration needed.

## Visual smoke check — skipped

The Playwright MCP server (`mcp__playwright__browser_take_screenshot`) is **not connected** to this scheduled task's tool set. Available browser MCP is `Claude_in_Chrome`, which requires user-driven extension pairing — incompatible with autonomous overnight runs. Screenshots deferred to next interactive session if the user wants them.

## Deferred work / known gaps

1. **Phase 6 (StoryNarrative chapter wraps)** — intentionally deferred per `7153d68` body. Re-evaluate only if user requests; chapters already carry editorial typography.
2. **Two Administrations heroes coexist** (utility-replaced Folio·XI + the existing serif EDITORIAL MASTHEAD at L1121 of Administrations.tsx) — Phase 4 log flagged this as a Phase-5-or-later cleanup. Phase 5 ended up combined with Phase 3 and didn't address it.
3. **Four Findings cards on Executive (E6 in Phase 1 plan)** — deferred from Phase 1b. Decide whether to wrap each in a micro-plate or extract a `FindingPlate` sibling primitive.
4. **`/report-card` was not part of the Folio v1 scope** — page exists and returns 200 but doesn't carry folio chrome.
5. **Story chart i18n** — only 2 of 41 charts bilingual (`StoryAnoSinExcusas`, `StoryCartelCorazon` per `7d38c85`). The other 39 still leak English in Spanish UI.

## Worktree state — needs user attention

`git status` on `lucid-edison-ad6469`:

```
 M frontend/src/components/atlas/AtlasZoomLayer.tsx
 M frontend/src/lib/constants.ts
```

Two **uncommitted edits** sitting on top of HEAD `98ae041`. They didn't make it into a commit yesterday and aren't deployed. Likely artifacts from the late-evening atlas hover-overlay work. Diff is +185 LOC on AtlasZoomLayer + 1 line on constants.ts.

**Recommended action:** `cd .claude/worktrees/lucid-edison-ad6469 && git diff` to inspect, then either commit or `git stash`/`git restore` if it was scratch work.

## Recommended next steps

1. **Review the two uncommitted files** above before they bit-rot. If they're keepable, commit + deploy alongside the next Day-2 batch.
2. **Read `docs/DAILY_LOG_2026_05_07.md`** — it has yesterday's full narrative and the Day-2 plan (mobile breakpoints across 7 surfaces + smaller bilingual leaks).
3. **Day 2 priority**: mobile breakpoint audit. The folio chrome was built desktop-first; some heroes will need stacking + numeral-position rules at <768px.
4. **Day 3-5 priority** (largest single ticket per the issue tracker): Issue #004 InstitutionProfile rework.
5. **Launch is locked for Friday 2026-05-15** per `6a97c11` — though `4c7951e` notes the user has internally pushed it to **2026-05-22** based on the audit findings. Confirm which date is canonical before announcing externally.
6. **Methodology page copy review** — yesterday's commit `7153d68` only re-skinned the hero, body content unchanged. Worth a read-through before sharing externally given launch proximity.

---

*Report generated autonomously. No code changes were made; no pushes to `origin/main` were performed; nothing was deployed. Read-only verification + reporting only.*
