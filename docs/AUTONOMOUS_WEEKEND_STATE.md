# Autonomous weekend run — state for next wake

> User has authorized me to work through the weekend without prompts.
> This file is the handoff to my future-self each wakeup.

## Currently running

- **Harness**: `python scripts/automated_explore.py --hours 72 --base https://rubli.xyz --out data/explore_runs/20260509_062947_72h`
  - Started 2026-05-09T06:29:47 UTC, ends ~2026-05-12T06:29 UTC (Tuesday)
  - PID 5744 (current). If killed, relaunch via the same command.
- **Awake wedge**: `python scripts/keep_awake.py` (PID 14396 current)
  - SetThreadExecutionState — keeps Windows from sleeping while running.
  - Power settings also disabled standby/monitor/hibernate via powercfg.

If the python processes died (taskkill, reboot, etc.), the first thing
to do on wakeup is re-launch both. See "Relaunch playbook" below.

## Tasks for the weekend (working list)

### Harness-found bugs (act on top recurring issues)

- [x] CaseDetail.titleCase(null) — null guard added (commit `4063c16`)
- [x] Removed dead /cases/odebrecht and /cases/segalmex from harness route list
- [ ] Recharts width(-1)/height(-1) warning × 207 — find the chart container with 0 dims
- [ ] React error #301 (too many re-renders) × 6 — bisect via the rubli-react-301-debug skill
- [ ] Backend 502 cluster on /api/v1/aria/stats, /executive/summary,
      /analysis/structural-breaks, /vendors/4325/* — capacity issue from harness pounding;
      add caching to the heaviest endpoints (vendor cache pattern from earlier work).
- [ ] /api/v1/institutions/399/top-categories?limit=8 → 404 — endpoint signature?

### Spatial rebuild progression (`/explore`)

- [x] Phase 1 (Z0+Z1+Z2): commit `5a6a8bf`
- [x] Phase 2 (cinematic fly-in zoom): commit `4063c16`
- [x] Phase 3 (URL state sync — `?s=&i=&v=`): commit `55f07b5`
- [ ] Phase 4 (year scrubber + risk floor controls overlaid on canvas)
- [ ] Phase 5 (Z3 contracts-in-space — vendor → contracts radial layout)
- [ ] Phase 6 (mobile pinch + two-finger pan)
- [ ] Phase 7 (promote /explore to / when stable; deprecate /atlas)

### Other v1.0 launch items (per RUBLI_v1.0_LAUNCH_PLAN.md, 2026-06-12 launch)

- [ ] Story chart bilingual sweep (Issue #007) — ~12 charts × 2hr each
- [ ] Methodology body i18n + polish (Issue #006)
- [ ] /administrations chart simplification (Issue #005)
- [ ] /institutions/:id rework (Issue #004) — currently legacy InstitutionProfile
- [ ] /vendors/:id rework (Issue #003)

## Wakeup playbook (every loop)

1. **Verify harness alive**:
   ```
   tasklist | grep python3
   ```
   If 0 results → relaunch (see below).
   If results → check `wc -l data/explore_runs/20260509_062947_72h/actions.jsonl`
   to confirm iteration count is advancing.

2. **Read newest hourly summary**:
   ```
   ls data/explore_runs/20260509_062947_72h/hourly_*.md | tail -1
   ```
   Look for top NEW console errors / network failures since last wakeup.

3. **Triage + fix top 1-3 high-confidence bugs** from the harness data.
   Always commit each fix as a separate small commit. Always BUILD_ID bump.
   Always deploy + verify (curl HEAD on prod).

4. **One Phase work-block** on /explore (or other launch-plan item).
   ~30-60 minutes of focused work; ship clean, no half-fixes.

5. **Update this doc** — check off completed items, add new findings.

6. **Schedule next wakeup**:
   - 1 hour if active mid-task
   - 3-4 hours if waiting for harness to gather data
   - 30 min if mid-deploy verification

## Relaunch playbook (if harness died)

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469
OUT="data/explore_runs/$(date +%Y%m%d_%H%M%S)_72h"
mkdir -p "$OUT"
cmd.exe //c "start /B python scripts\\automated_explore.py --hours 72 --base https://rubli.xyz --out $OUT > $OUT\\run.log 2>&1"
cmd.exe //c "start /B python scripts\\keep_awake.py > $OUT\\keep_awake.log 2>&1"
echo "Relaunched: $OUT"
```

Update the `Currently running` section above with the new dir name.

## Boundaries (things I will NOT do without user approval)

- Database migrations or destructive backend changes
- Anything touching auth or payment surfaces
- Force-push or rewriting git history
- Schema changes that affect deployed data
- Anything that costs the user money (LLM API calls, deploy egress, etc.)
- Decisions that change the product concept (those need user input — I just execute the spatial-nav rebuild plan)

## What to ping the user about (only)

- Catastrophic prod outage that survives 3 deploy attempts
- Build gate failures that survive 2 fix attempts
- New conceptual ambiguity in the launch plan
- The 72h harness run completes and SUMMARY.md is ready to read

Otherwise: stay autonomous. The user is sleeping / weekend mode.

## Last wakeup state

| Wakeup # | Time (UTC) | What I did |
|---|---|---|
| 0 (initial) | 2026-05-09 06:29 | Restart 72h harness, fix CaseDetail null + dead case slugs, ship Phase 2 cinematic fly-in zoom on /explore (commit `4063c16`), schedule first wakeup at +1h |
| 1 (continue) | 2026-05-09 06:55 | Ship Phase 3 URL state sync (commit `55f07b5`) — `/explore?s=salud&i=251&v=29277` now deep-links to focused vendor inside institution inside sector. New `useExploreUrlSync` hook, new `hydrate-from-url` + `pop-to-level` actions. Breadcrumbs use single-dispatch pop. Next: Phase 4 year scrubber + risk floor controls overlay |
