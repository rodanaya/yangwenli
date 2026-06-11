---
name: rinse
description: |
  Checkpoint the finished thread, then hand back the EXACT one line to run next
  so the context gets cleaned and the next task starts with minimal friction.
  Run when one piece of work just closed and you want to move to the next task
  while freeing up context to save tokens.

  Invoke with the next task as an argument: `/rinse <next task>`
  (e.g. `/rinse start the Casos design day`). With no argument, rinse falls
  back to the **Next action** in `.claude/ACTIVE_WORK.md`.

  Trigger phrases: "rinse", "/rinse", "rinse and move on", "next task",
  "I'm done with this, what's next", "free up context and continue",
  "checkpoint and continue", "clean the context and start the next one",
  "bank this and go to <X>", "wrap up and switch to <X>".

  What rinse CANNOT do (be honest about this every time): it cannot clean the
  context or switch the model itself — `/clear`, `/compact`, and `/model` are
  user-only commands, and a skill runs inside the OLD context so it can't start
  a task in a fresh one. Rinse therefore writes the durable record, then prints
  the single command for the user to run. For a same-model handoff that command
  is `/compact <next task>` (compress + auto-continue, one action). For a
  model switch it's the `/clear` → `/model X` → paste trio (irreducible — only
  the user can switch models).
---

# RINSE — checkpoint, then emit the exact next command

> The chat is disposable; the **record** is the handoff. Rinse makes the durable
> record (memory + ACTIVE_WORK + docs + commits) complete enough that a fresh or
> compacted context can resume, then hands the user the single line to run.

This is a **terminal step**. Do not start the next task yourself — rinse runs in
the old context; the next task belongs in the cleaned one. Work in order.

**Input:** the next task, from the skill argument. If none was given, read the
bolded **Next action** in `.claude/ACTIVE_WORK.md` and use that.

## 1. Scan the session for unsaved state

Account for everything since the last rinse/clear not yet in the durable record:
- **Shipped** — commits (hash), prod deploys (commit + bundle hash + BUILD_ID),
  tests run + result. State failures plainly. (`git status --short`, `git log`.)
- **WIP not committed** — uncommitted edits, files carrying foreign WIP that must
  be **re-applied on deploy**, anything staged-not-pushed.
- **Decisions** — what was chosen, what was rejected, and the *why*. Most
  expensive to reconstruct, easiest to lose.
- **Paused / blocked** — the exact resume point and the gate it waits on.

## 2. Write it to the durable record

- **MEMORY.md** (`C:\Users\ranay\.claude\projects\D--Python-yangwenli\memory\`) —
  per the memory rules: one-line index entries in `MEMORY.md`, detail in topic
  files (`type: project | feedback | user | reference`), absolute dates, capture
  the *non-obvious* (not what git already records), update don't duplicate.
- **`.claude/ACTIVE_WORK.md`** — refresh the **RESUME PICKUP** block: short
  "Shipped", short "Banked / paused", one bolded **Next action**.
- **Re-apply-on-deploy WIP** — spell out exact lines/edits so deploy isn't
  archaeology.

## 3. Durability gate

Ask: **"If the context were cleaned right now and only MEMORY.md + ACTIVE_WORK +
docs + commits survived, could the next session resume without me?"** If no, fix
the gap before handing off. Nothing load-bearing may live only in the scrollback.

## 4. Pick the handoff route — same model vs model switch

Determine the **target model** for the next task:
- Explicit wins: if the user named a model in the args (or the task says "with
  Fable / on Opus"), use it.
- Else infer from the work: **design / UI / frontend / redesign / DESIGNUS /
  visual / page polish → Fable 5**; **backend / data / ML / scoring / SQL / API /
  label / logic → Opus**. (Per `docs/POLISH_SCHEDULE.md`: Fable = design brain,
  Opus = backend/logic.)
- Compare against the **current** session model (state it — e.g. "currently on
  Opus").

## 5. Emit the single next command, then stop

**Route A — same model** (target == current): print one copy-paste line —

```
/compact <next task, phrased as an instruction>
```

`/compact` compresses the history (token savings) and auto-continues with that
instruction, on the same model. One action. Note the tradeoff once if useful:
`/compact` keeps a summary (some tokens) so it can continue; `/clear` saves more
but can't continue — auto-continue and maximal savings are mutually exclusive.

**Route B — model switch** (target != current): print the trio, in order —

```
1. /clear
2. /model  → <target model>
3. paste:  <the resume prompt: next task + "Context: ACTIVE_WORK.md RESUME
            PICKUP + <relevant doc> + MEMORY.md">
```

This is irreducible — only the user can switch models, so a switch costs ~3
actions no matter what. Rinse's job is to make them safe and pre-fill step 3.

**Then stop.** Confirm the record is durable and the command is ready. Do not
begin the next task — the user runs the emitted command when ready.

---

**Why this shape:** a skill can't clean context or switch models, so the honest
best is: guarantee the durable record, then collapse the user's decision to
"run this one line." Same-model handoffs (e.g. consecutive Fable design days)
become a single `/compact <surface>`; model switches stay a safe, pre-filled
3-step. Pairs with `/compact` (continue) — not a replacement for it.
