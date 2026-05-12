---
name: rubli-agent-recovery
description: |
  Recovery procedure when a delegated subagent (frontend-architect,
  api-designer, design-visionary, etc.) abandons a task mid-flight.
  Use this skill whenever you spawn a Sonnet/Opus subagent for a
  PR-sized chunk in this codebase and the agent reports completion
  but the work is half-finished — missing BUILD_ID bumps, undefined
  symbols referenced in JSX, files written to the wrong path, or a
  TS error left unhandled. This pattern has bitten this codebase
  multiple times per session; following the recovery checklist below
  saves 10-15 minutes of investigation each time and avoids the
  failure-on-top-of-failure cascade where you rerun the agent on a
  mid-state worktree.
---

# RUBLI Agent Recovery

Spawned subagents in this codebase abandon mid-task at a high rate
(observed: 4 out of 5 in a single session). The failure mode is
consistent: the agent reports "completed" but the worktree contains
files that don't build, references symbols it never defined, edited
the wrong path (main repo vs worktree), or skipped the BUILD_ID bump.

This skill captures the recovery checklist so you can finish the work
yourself in ~5 minutes instead of relaunching another agent on a
broken worktree.

---

## When to use this skill

Trigger after a subagent completes if any of the following are true:

- The agent's last message ends mid-sentence ("Now I need to define X...")
- `git status` shows uncommitted files in the worktree
- `git status` ALSO shows uncommitted files in the main repo path
  (D:\Python\yangwenli — agent edited the wrong tree)
- `git log` doesn't show the expected new commit
- BUILD_ID in `frontend/src/lib/constants.ts` wasn't bumped to the
  expected value
- TS errors when you run gates manually after the agent claims
  completion

If none of those are true and the agent committed cleanly, skip this
skill and verify normally.

---

## Recovery checklist (in order)

### Step 1 — Diagnose the worktree state

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469
git status
git log --oneline -5
```

If the agent committed but `git status` is clean: probably fine, just
verify the gates pass.

If `git status` shows uncommitted files: agent abandoned. Continue.

If the worktree is on a stale branch (didn't reset to origin/main):
```bash
git fetch origin
git reset --hard origin/main
```

### Step 2 — Check for cross-tree pollution

The single most common agent failure: edits land in
`D:/Python/yangwenli/...` (main repo working tree) instead of the
worktree. Always check both:

```bash
cd D:/Python/yangwenli && git status
```

If the main repo has uncommitted edits, copy them into the worktree
and revert the main repo:

```bash
# For each modified file:
cp D:/Python/yangwenli/<path> D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469/<path>

# For each new file:
cp D:/Python/yangwenli/<new-file> D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469/<new-file>

# Then revert main repo:
cd D:/Python/yangwenli
git checkout -- <modified-file-list>
rm -f <new-file-list>
```

### Step 3 — Stage everything, run TS strict

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469
git add <every-file-in-status>
cd frontend
node_modules/.bin/tsc --noEmit -p tsconfig.app.json 2>&1 | head -30
```

Common errors at this stage:

| Error | Likely cause | Fix |
|---|---|---|
| `Cannot find name 'X'` | Agent referenced a component/function it forgot to define | Define it inline near the reference; use the simplest possible signature |
| `Property 'Y' does not exist on type 'never'` | Conditional type that didn't narrow | Inline the discriminant: `const code = state.view.kind === 'foo' ? state.view.code : null` |
| `'X' is declared but its value is never read` (TS6133) | Agent left an unused import/local from refactoring | Remove the import or prefix with `_` |
| `Type '{}' is not assignable to type 'never'` | Same narrowing issue as above; conditional type collapsed to `never` | Replace the `Parameters<...>` conditional type with the actual `Partial<Pick<...>>` from the relevant module |

### Step 4 — Bump BUILD_ID (the agent forgot)

```bash
grep -n "BUILD_ID" D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469/frontend/src/lib/constants.ts
```

If the BUILD_ID still reads the previous phase's tag, bump it now. The
new value should match the current commit's intent
(e.g. `'2026-05-05-omega-N-FIX2'`).

### Step 5 — Run all four gates

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469/frontend
node_modules/.bin/tsc --noEmit -p tsconfig.app.json
node_modules/.bin/tsc --noEmit
npm run lint:tokens
npm run build
```

All four must pass. If any fail, fix in place — don't shrug, don't
assume the agent already handled it.

### Step 6 — Commit the agent's work + your finishes as ONE commit

The agent's intended commit message format is in their original brief
(usually `feat(<surface> <phase>): <what>`). Use that, and add a body
note acknowledging which pieces you finished:

```
feat(atlas <phase>): <what the agent meant to ship>

<body referring to plan doc + named precedents>

Finished by orchestrator (agent abandoned mid-task):
- Defined missing <Component>
- Bumped BUILD_ID to <new-value>
- Reverted stray edits in main repo path

BUILD_ID -> <new-value>.
Gates: tsc strict + tsc lenient + lint:tokens + build all green.
```

### Step 7 — Push

```bash
cd D:/Python/yangwenli/.claude/worktrees/lucid-edison-ad6469
git push origin claude/lucid-edison-ad6469:main
```

---

## Prevention — agent brief patterns that reduce abandonment

After observing the failure pattern, here are the brief additions that
correlate with successful single-shot agent runs:

### 1. Tell the agent the worktree path explicitly and check it twice

> CRITICAL — work in the WORKTREE only:
> Worktree: `D:\Python\yangwenli\.claude\worktrees\lucid-edison-ad6469`
> ALL edits MUST be under that path. `pwd` and `git status` BEFORE editing.
> DO NOT edit anything in `D:\Python\yangwenli\frontend\...` (main repo).

This single block reduces cross-tree pollution noticeably.

### 2. Make BUILD_ID bumping mandatory in the brief

> BUILD_ID bump to `'<new-value>'` in `frontend/src/lib/constants.ts`
> IN THE SAME COMMIT as the change.

Don't put it as a final step — put it in the hard-constraints list.

### 3. Make staging files mandatory before gates

> `git add` every new/modified file BEFORE running gates.
> THIS IS RECURRING FAILURE MODE — DO NOT SKIP.

The all-caps is a yellow flag normally, but agents have repeatedly
ignored a polite version. Pushy works here.

### 4. Make the four gates explicit

> Run all 4 gates from `frontend/`:
>   - `node_modules/.bin/tsc --noEmit -p tsconfig.app.json`
>   - `node_modules/.bin/tsc --noEmit`
>   - `npm run lint:tokens`
>   - `npm run build`
> All four must pass. Fix in place if anything breaks.

Listing all four (not just "the gates") catches the agent that runs
strict-tsc and stops there.

### 5. Tell the agent NOT to push

> Do NOT push — orchestrator pushes after the full set of phases
> completes.

This prevents the agent from pushing a half-finished worktree to
origin/main and breaking prod.

### 6. Brief should specify "single commit"

> Single commit with message `<exact-format>`. NO `Co-Authored-By` line.

Prevents the agent from leaving uncommitted work or producing 3
micro-commits.

---

## When to relaunch vs finish inline

| Situation | Action |
|---|---|
| Agent stopped after writing 1-2 files but the rest of the work is well-scoped (< 50 LOC) | Finish inline — faster than respawning |
| Agent stopped mid-file with TS errors and you can read the surrounding code | Finish inline — agent will likely re-introduce the same errors |
| Agent abandoned without writing anything significant (< 20 LOC) | Relaunch with a tighter brief, explicitly noting what failed |
| Multiple files written, complex state, gates failing in unfamiliar ways | Investigate the failure first, then decide |

The default bias should be: **finish inline** unless the remaining
work is genuinely large (> 200 LOC) or requires deep research the
orchestrator doesn't already have context for.

---

## Multi-agent orchestration patterns observed in this codebase

When you have multiple PR-sized chunks of work, prefer:

1. **Parallel agents in one message** for independent work
   (e.g. backend endpoint + frontend phase that uses it later — both
   can develop simultaneously since the frontend agent has a mock
   fallback path).
2. **Sequential agents via SendMessage / new spawn** for dependent
   work (e.g. P3 → P4 where P4 needs P3's state machine wiring).
3. **`run_in_background: true`** when the agent will take more than
   90s and you have other work — but don't poll the output file
   (system warns against it; you'll get a notification).

Don't spawn 5+ agents simultaneously without a coordination plan —
the recovery cost when one fails is multiplied by the number of
parallel agents touching adjacent files.
