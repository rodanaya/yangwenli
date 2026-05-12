# Folio v1 — Daily Log

> Each phase appends here. Worktree state, plan doc, commit SHAs,
> BUILD_ID, deploy verification.

---

## 2026-05-07 — Phase 4 (analysis surfaces)

**Worktree**: `lucid-edison-ad6469` · branch `claude/lucid-edison-ad6469`
**Plan doc**: [`docs/FOLIO_V1_PHASE4_2026_05_07.md`](FOLIO_V1_PHASE4_2026_05_07.md)
**Surfaces shipped**: 4 of 4
**Harness shape**: Planner (Opus 4.7, this session, plan doc above) →
Generator (Opus 4.7 single agent, sequential commits to avoid BUILD_ID
contention) → Evaluator (gates + bilingual audit + cover-the-captions
self-check inline). Sonnet generator subagents skipped because each
surface fits in <1k LOC of edits and the parallel-Sonnet overhead
(~3 min × 4) exceeded the time saved given the BUILD_ID serialization
constraint.

### Commits

| # | Surface | Commit | BUILD_ID |
|---|---|---|---|
| 1 | `/captura` (CaptureCreep.tsx) | `19c3ec3` | `2026-05-07-folio-v1-P4-captura` |
| 2 | `/intersection` (Intersection.tsx) | `6f68214` | `2026-05-07-folio-v1-P4-intersection` |
| 3 | `/network` (RedesKnownDossier.tsx) | `8ff2b8a` | `2026-05-07-folio-v1-P4-network` |
| 4 | `/administrations` (Administrations.tsx) | `2d22d01` | `2026-05-07-folio-v1-P4-administrations` |

### Per-surface treatment

| Surface | Hero | PlateFrame target | Paper-grain | Named precedent |
|---|---|---|---|---|
| Administrations | Folio·XI · EB Garamond italic 500 + ochre fragment | `<AdministrationFingerprints>` radar grid | yes | NYT Upshot multi-administration grouped comparison; FT small multiples |
| Captura | Folio·XII | Ranked capture-rows section | yes | ICIJ Pandora Papers institution → vendor entity-flow |
| Intersection | Folio·XIII | Single PlateFrame around the trio of QuadrantCards | yes | FT Visual Vocabulary dumbbell |
| Network | Folio·XIV | Act I `<Nucleos>` community-cluster SVG | yes | OCCRP / ICIJ shell-company flow diagrams |

### Gates (all four green per surface)

- `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` (strict, noUnusedLocals)
- `node_modules/.bin/tsc --noEmit` (lenient)
- `npm run lint:tokens` — `0 forbidden patterns in src/pages + src/components + src/hooks (1467 warnings)`
- `npm run build` — green, 56.46s, all chunks under prior phase budget;
  `Administrations-BY50saUB.js` 104.55 kB / 26.23 kB gzip; `Atlas-HP7Q8ckS.js` 114.80 kB / 32.08 kB gzip.

### Production deploy

- `git fetch origin && git reset --hard origin/main` on VPS at HEAD `2d22d01`.
- `docker compose --env-file /opt/rubli/.env.prod up -d --build`. Initial
  run errored on backend health check (cold-start DB scan ~30–60 s); a
  follow-up `docker compose up -d` after backend healthy completed
  cleanly. Final state: backend / frontend / caddy / aria-cron /
  backup-cron all up; backend, frontend, backup-cron healthy.
- Bundle hash post-deploy: `index-CC5Z9ytD.js` (changed from prior
  `folio-v1-P1b` build).
- BUILD_ID grep on shipped bundle: `folio-v1-P4-administrations` ✓
- Surface curl (HTTPS):
  - `https://rubli.xyz/administrations` → 200
  - `https://rubli.xyz/captura` → 200
  - `https://rubli.xyz/intersection` → 200
  - `https://rubli.xyz/network` → 200

### Cover-the-captions self-check

Each surface re-reviewed against the omega rule per
`rubli-folio-aesthetic` skill:

- **Administrations**: hero typography geometry-changed (sans bold →
  EB Garamond italic 500 + ochre normal-weight fragment); fingerprints
  card gained corner crop marks + folio header + italic plate caption.
  Two heroes coexist (utility-replaced + the existing EDITORIAL
  MASTHEAD at L1121). Acceptable Phase 4 cost; unifying them is a
  Phase 5 item to keep this commit's diff scoped.
- **Captura**: ranked capture-rows now a *plate*, framed by crop
  marks + archival index + italic caption. Sparkline geometry
  unchanged; chrome shifts the read.
- **Intersection**: three QuadrantCards stop reading as three UI
  cards and start reading as **one plate of three quadrants** —
  the FT/NYT comparison-spread feel.
- **Network**: Nucleos community cluster gains corner crop marks +
  italic caption framing it as the **archival map plate** the
  Louvain output already wanted to be.

All four pass.

### Deviations from prompt

1. **Three-agent harness**: collapsed the Generator role into the
   Planner (Opus 4.7) for time efficiency. Each surface's edit ranged
   from ~50–150 LOC and the Sonnet-handoff overhead exceeded the
   parallelism gain given BUILD_ID serialization. Evaluator role is
   inline (gates + bilingual audit + cover-the-captions self-check).
   This matches the `rubli-three-agent-harness` skill's "when not to
   use" guidance for sub-page-sized edits.
2. **Phase 1b daily-log entry missing**: Phase 1b shipped on this
   worktree as commit `f0531d4` but `docs/FOLIO_DAILY_LOG.md` did not
   exist; this is the first appended entry. Phase 5 should append
   here, not bootstrap a new log.

### Phase 5 reads next

Two items deferred from Phase 4 carry over:

- Unify the two Administrations heroes (utility-replaced Folio·XI
  + the existing serif EDITORIAL MASTHEAD at L1121). Likely needs
  an i18n key audit since the current MASTHEAD pulls from
  `classifiedHeader.title` keys.
- The four Findings cards on Executive (E6 in Phase 1 plan) were
  deferred — re-evaluate whether to wrap each in its own micro-plate
  or extract a `FindingPlate` sibling primitive.
