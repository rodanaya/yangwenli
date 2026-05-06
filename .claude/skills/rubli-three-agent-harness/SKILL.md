---
name: rubli-three-agent-harness
description: |
  Anthropic's "Three-Agent Harness" pattern (Planner / Generator /
  Evaluator with iterative critique) applied to RUBLI workflows. Use this
  skill when the user asks for a "deep" or "thorough" or "high-stakes"
  task, mentions "multi-agent", references the keynote pattern of "three
  agents cycling through plans three times", or asks to "triangulate" /
  "validate" / "stress-test" a design or plan. Specifically valuable for
  surface redesigns, risk-model retraining decisions, schema migrations,
  GT mining sessions, anywhere a wrong call costs hours. The pattern
  produces stronger plans than single-agent work because each cycle's
  critique catches the mid-task abandonment + decoration-not-redesign
  failure modes that have repeatedly cost time in this codebase.
---

# Three-Agent Harness for RUBLI

This pattern codifies what Anthropic demonstrated as the "three-agent
harness" — Planner, Generator, Evaluator — running in iterative
critique cycles. It's the right shape for high-stakes RUBLI work
where a single agent tends to fail (mid-task abandonment, decoration
not redesign, citation cargo cult, missed bilingual strings).

The user saw a keynote demo where 3 agents cycled through planning 3
times, producing 9 total planning artifacts that were then
synthesized. That's exactly this skill.

---

## When to invoke this skill

**Use when:**
- The user asks for an "omega" redesign of a complex surface
  (multiple charts, multiple files, hundreds of LOC)
- Schema migration with downstream effects (vendor_stats,
  category_stats, aria_queue dependencies)
- Risk model retraining decisions where wrong hyperparameters waste
  3 hours
- Ground truth mining sessions that affect 100+ vendors
- Visual redesigns where a single Sonnet agent has already failed
  once

**Don't use when:**
- The task is simple (single file, < 50 LOC)
- Speed > robustness (e.g. "ship this typo fix now")
- The user has explicit context the agents lack and wants to drive
  manually

---

## The three roles

### Planner (model: opus)

Breaks the problem into tractable chunks. Reads the relevant files
first, picks named precedents, designs the encoding, writes a plan
doc with phase-by-phase dependencies.

**Tool allowlist**: Read, Glob, Grep, Write, Bash(git), Bash(grep).
No edit tools — the planner only writes plan docs, never source.

**Output**: `docs/PLAN_<slug>_<YYYY_MM_DD>.md` with:
- Phase table (correctness fixes first, shared primitives before consumers)
- For each phase: file paths, line ranges (verified, not guessed),
  named precedent, ASCII sketch, bilingual ES + EN key table,
  effort estimate
- Cover-the-captions self-check at the bottom (omega rule)

### Generator (model: sonnet)

Executes one phase of the plan. Reads the actual files. Writes /
edits source. Runs gates. Commits.

**Tool allowlist**: Read, Glob, Grep, Write, Edit, Bash(npm,
node, git, tsc).

**Output**: One commit per phase, BUILD_ID bumped, all four gates
green. Reports back with commit SHA, files touched, gate output
highlights.

### Evaluator (model: opus or sonnet — opus preferred for hard
critique)

Critiques the generator's output against structured criteria. Reads
the diff, runs the gates locally, evaluates against the rubric,
produces a feedback document.

**Tool allowlist**: Read, Glob, Grep, Bash(git diff, npm, node).
No edit tools — the evaluator only writes critique docs.

**Output**: `docs/CRITIQUE_<slug>_<phase>_<iter>.md` with:
- PASS / FAIL per rubric item
- Specific lines that need to change with quoted diffs
- A concrete recommendation: SHIP, REVISE, or REWRITE

---

## The standard rubric (used by Evaluator)

For UI redesigns:

1. **Cover-the-captions test** — does the chart geometry change, or
   is it caption-on-top-of-old-chart?
2. **Named precedent mechanic** — is the cited piece's actual
   mechanic visible in the output, or is it just the name?
3. **Bilingual coverage** — `grep -cE "lang ?=== ?'es' ?\?"` and
   `'en'` counts must match. Run grep yourself, don't trust the
   generator's claim.
4. **Existing primitive used** — did the generator reuse
   `EntityIdentityChip`, `BenchmarkRow`, `DotStrip`, `PlateFrame`
   etc. where applicable?
5. **CLAUDE.md hard rules** — no green for low risk, no
   `SECTOR_COLORS` on text, no inline thresholds, `formatCompactMXN`
   for pesos
6. **All four gates green** — strict tsc, lenient tsc, lint:tokens,
   build
7. **BUILD_ID bumped** — same commit as the change
8. **Single commit, no Co-Authored-By Sonnet 4.6**

For backend / data work, replace 1-4 with: data validation
(MAX_CONTRACT_VALUE 100B), parameterized queries, vendor_stats not
raw vendors.avg_risk_score, structural FP exclusions, calibration
sanity (intercept < -0.5, PU c > 0.30).

---

## The cycle

For each phase of work:

```
CYCLE 1
  Planner    →  plan_v1.md
  Generator  →  commit_v1 (against plan_v1)
  Evaluator  →  critique_v1.md (against rubric)

CYCLE 2 (if critique_v1 says REVISE or REWRITE)
  Planner    →  plan_v2.md (incorporates critique_v1)
  Generator  →  commit_v2 (replaces commit_v1)
  Evaluator  →  critique_v2.md

CYCLE 3 (final pass; only if cycle 2 still says REVISE)
  Planner    →  plan_v3.md
  Generator  →  commit_v3
  Evaluator  →  critique_v3.md (must say SHIP)
```

**3 agents × 3 cycles = 9 artifacts**. That's the pattern from the
keynote demo.

If cycle 3 still says FAIL, escalate to the user — don't loop a 4th
time, that's a sign the original plan was wrong.

If cycle 1 says SHIP cleanly, stop early — don't burn cycles for the
sake of pattern compliance.

---

## Implementation in this codebase

You don't need the SDK for this — the existing `Agent` tool with
`subagent_type` is enough. The harness uses three of the available
agents:

- **Planner**: `design-visionary` (for UI) or `schema-architect`
  (for DB) or `risk-model-engineer` (for scoring) — all opus-capable
- **Generator**: `frontend-architect` (for UI) or `api-designer`
  (for backend) or `general-purpose` — sonnet
- **Evaluator**: spawn a `general-purpose` agent with explicit
  rubric in the brief, or use `claude-code-guide` for SDK-related
  critiques

### Suggested orchestration shape

The orchestrator (you, the main agent) spawns one Planner, waits for
the plan doc, spawns one Generator per phase, then ALWAYS spawns an
Evaluator before declaring the phase done.

Don't run all three in parallel — they have a hard dependency chain
within a phase. But you CAN run multiple phases' Generators in
parallel if they touch independent files (e.g. backend endpoint +
frontend phase that has a mock fallback).

```
Phase A:  Planner →  Generator →  Evaluator   (sequential within phase)
Phase B:  Planner →  Generator →  Evaluator   (parallel to A if independent)
                          ↓
                  Synthesizer (you, main agent) merges both
```

### Background mode is the default

Spawn each agent with `run_in_background: true`. You'll get a
completion notification. Don't poll the output file (system warns
against it).

While agents run in background, you can:
- Read additional context for the next phase
- Run gates locally to confirm the worktree is clean
- Update plan docs based on user feedback

---

## When the harness saves vs costs time

**Saves time** (use the harness):
- Surface redesign affecting > 5 files / > 300 LOC
- Schema change with downstream RPC effects
- Risk model decision where wrong choice = 3+ hour rescore
- High-visibility user-facing change where a regression is
  embarrassing

**Costs time** (skip the harness):
- Single-file fix
- Typo / copy edit
- Adding a property to an existing component
- BUILD_ID bump only

The harness has fixed overhead (~3 minutes per role × 3 cycles). For
small work, that overhead exceeds the task itself. Use judgment.

---

## Pre-built rubrics (cite when spawning Evaluator)

Save these in `docs/rubrics/` and reference by path in the
Evaluator brief:

- `docs/rubrics/ui-redesign.md` — the 8-point UI rubric above
- `docs/rubrics/backend-endpoint.md` — Pydantic validation, paramd
  SQL, OpenAPI shape, vendor_stats canonical, error mapping
- `docs/rubrics/risk-scoring.md` — PU c floor, intercept range,
  calibration AUC, structural FP exclusion, gold-set score
- `docs/rubrics/schema-migration.md` — backup before destructive
  ops, view dependencies, index plan, rollback procedure

If a rubric file doesn't exist yet, the first Evaluator should
write it before grading; subsequent Evaluators reuse it.

---

## Example: a real omega redesign through the harness

Hypothetical: user says "omega the dashboard's risk distribution chart."

**Cycle 1**:
- Planner reads `frontend/src/pages/Executive.tsx` lines 1200-1350,
  finds the existing `RiskDistribution` component, picks
  *FT bullet* as the precedent (chart is threshold-vs-actual),
  writes `docs/OMEGA_RISKDIST_2026_05_06.md` with ASCII sketch +
  bilingual key table + 2-phase plan
- Generator implements P1 + P2 in `frontend-architect` agent, runs
  gates, commits
- Evaluator runs the UI rubric, finds: cover-captions test PASS,
  bilingual gap (one English `'High'` literal in a tooltip
  builder), uses `BenchmarkRow` primitive, all four gates green.
  Writes critique: REVISE with quoted diff for the bilingual fix

**Cycle 2**:
- Planner integrates critique, writes plan_v2 with the bilingual
  patch as a single hunk
- Generator applies the hunk, re-runs gates, amends commit
- Evaluator re-checks: PASS on all 8 rubric items. SHIP.

Total: 6 agents, 6 artifacts (plan_v1, commit_v1, critique_v1,
plan_v2, commit_v2, critique_v2). Two cycles, harness exited early
because cycle 2 was clean.

If cycle 2 had still failed, cycle 3 would have produced the full
9-artifact set.

---

## Companion skills

- `rubli-omega-redesign` — when the user invokes "omega" — the
  workflow this harness implements
- `rubli-folio-aesthetic` — visual vocabulary the Planner must use
  when picking precedents
- `rubli-agent-recovery` — what to do when the Generator abandons
  mid-task within a cycle
- `rubli-prod-deploy` — what to do after a successful final cycle

The harness is the orchestration; those skills are the components.
