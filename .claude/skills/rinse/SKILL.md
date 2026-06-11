---
name: rinse
description: |
  Checkpoint-and-hand-off ritual that makes the session safe to `/clear`.
  Run this when a thread of work just closed and you want to free up context
  before starting something new — especially when switching domains (backend →
  design, one surface → the next) or when the conversation has grown long.

  Trigger phrases: "rinse", "/rinse", "let's rinse", "rinse before we clear",
  "free up context properly", "checkpoint and clear", "wrap up and clear",
  "bank this and clear", "I want to clear the context", "we're done here —
  clear", "prep for /clear", "hand off before clearing".

  Rinse does NOT clear the context itself (only the user can run `/clear`).
  It guarantees the durable record is complete FIRST, then emits the exact
  resume prompt to paste afterward, so nothing is lost across the boundary.
  Use `/compact` instead of rinse when you want to summarize-and-CONTINUE in
  the same session; rinse is for a full reset between threads.
---

# RINSE — checkpoint & hand off before clearing context

> The chat is disposable; the **record** is the handoff. Rinse makes the
> durable record (memory + ACTIVE_WORK + docs + commits) complete enough that a
> fresh session can resume from a one-line prompt. Then it hands the user the
> resume prompt and stops.

This is a **terminal step**. Do not start new work during a rinse — its only
job is to make `/clear` safe. Work in order; don't skip a step because it
"seems fine."

## 1. Scan the session for unsaved state

Account for everything that happened since the last rinse/clear that is not yet
in the durable record. Walk these buckets explicitly:

- **Shipped** — commits made, prod deploys (record commit hash + bundle hash +
  BUILD_ID), tests run and their result. State outcomes plainly, including
  failures.
- **WIP not committed** — uncommitted edits, files that carry foreign WIP and
  must be **re-applied on deploy**, anything staged but not pushed. Run
  `git status --short` to catch what you forgot.
- **Decisions** — what was chosen, what was rejected, and the *why*. These are
  the most expensive things to reconstruct and the easiest to lose.
- **Paused / blocked** — the exact resume point: the next concrete action, the
  gate it's waiting on, and where the plan lives.

## 2. Write it to the durable record

- **MEMORY.md** (`C:\Users\ranay\.claude\projects\D--Python-yangwenli\memory\`)
  — follow the project memory rules. Add/update one-line index entries in
  `MEMORY.md`; put the detail in topic files (`type: project | feedback | user |
  reference`). Convert relative dates to absolute. Don't duplicate what the
  repo/git history already records — capture what was *non-obvious*. Update the
  existing file rather than duplicating; delete memories proven wrong.
- **`.claude/ACTIVE_WORK.md`** — refresh the **RESUME PICKUP** block at the top:
  a short "Shipped", a short "Banked / paused", and a single bolded
  **Next action**. This block is what the next session reads first.
- **Re-apply-on-deploy WIP** — if any edits live only in the working tree and
  must be re-applied (e.g. a file carrying another session's WIP), spell out the
  exact lines/edits in ACTIVE_WORK so the deploy isn't archaeology.

## 3. Verify durability (the rinse test)

Ask: **"If I `/clear`ed right now and had only MEMORY.md + ACTIVE_WORK + docs +
commits, could a fresh session resume without me?"** If the answer is no, you
found a gap — fix it before handing off. Nothing load-bearing may live only in
the chat scrollback.

## 4. Emit the resume handoff

Give the user, concisely:

1. The exact **copy-paste resume prompt** — 1–2 lines that point at the pickup
   (`ACTIVE_WORK.md` RESUME PICKUP + the relevant doc + MEMORY.md) and state the
   goal. Short, because the memory reloads automatically.
2. Any **model switch** the next thread wants (`/model` → e.g. Fable 5 for a
   design day, Opus for backend/logic). Note it explicitly — `/clear` does not
   change the model.
3. The reminder to run **`/clear`** themselves (the skill can't), with `/compact`
   named as the alternative if they'd rather summarize-and-continue.

## 5. Stop

Confirm the record is durable and the handoff is ready. Do not begin the next
task — the user will `/clear` (or not) and re-issue the resume prompt when ready.

---

**Why this exists:** doing this by hand each time is error-prone — it's easy to
clear with a decision or a re-apply note living only in the chat, and then the
fresh session silently redoes or breaks it. Rinse turns "free up context" into a
checklist with a hard durability gate.
