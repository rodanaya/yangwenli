---
name: paw-patrol
description: |
  Multi-agent exploratory QA sweep of rubli.xyz. Three independent agents
  (ROVER, CHASE, SKYE) navigate the live site from different entry points,
  screenshot evidence of issues, then converge on a prioritized fix list.
  
  Trigger when user says: "paw patrol", "/paw-patrol", "do a QA sweep",
  "check the site", "find issues", "exploratory QA", "browse and find bugs",
  "have the agents explore", or any request for unscripted browser testing.
  
  This skill exists because single-agent QA misses too much — each agent
  develops blind spots from their entry point. Three agents with different
  personas and starting locations catch orthogonal failure classes.
---

# PAW PATROL — Multi-Agent Exploratory QA

Three autonomous agents explore `https://rubli.xyz` from different entry
points with different personas. They navigate freely (not scripted), take
screenshots of issues and improvements, then converge on a prioritized list.

---

## CRITICAL: Playwright rendering protocol

**Lesson learned the hard way** — these rules prevent every blank-screenshot
failure mode encountered before this skill existed:

### Rule 1 — Never use `window.scrollTo()` for deep scrolling
`window.scrollTo(0, 5000)` does NOT trigger IntersectionObserver in headless
Chromium. framer-motion `whileInView` animations stay at `opacity: 0`.

**Use instead:**
```javascript
// browser_press_key with key "PageDown" — triggers IO every time
// Repeat with 600ms wait between each press
```

### Rule 2 — Disable animations BEFORE reading visual state
Immediately after each navigation, inject this CSS via `browser_evaluate`:
```javascript
() => {
  const s = document.createElement('style');
  s.id = 'paw-freeze';
  s.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(s);
  // Also unfreeze any already-stuck framer-motion elements
  document.querySelectorAll('*').forEach(el => {
    if (parseFloat(window.getComputedStyle(el).opacity) < 0.5) {
      el.style.setProperty('opacity','1','important');
      el.style.setProperty('transform','none','important');
    }
  });
  return 'frozen';
}
```

### Rule 3 — Pre-warm the page before screenshotting deep content
After injecting the CSS freeze:
1. Press `End` key (scrolls to page bottom, fires ALL whileInView observers)
2. Wait 800ms (`browser_wait_for` with `{ timeout: 800 }` or evaluate with setTimeout)
3. Press `Home` key (return to top)
4. Wait 300ms
5. Now scroll and screenshot — everything is visible

### Rule 4 — Screenshot naming
Save to `D:/Python/yangwenli/frontend/paw-{AGENT}-{n}.png` where AGENT is
`rover`, `chase`, or `skye` and n is 001, 002, etc.

### Rule 5 — Collect page URL + scrollY with every screenshot
Before each screenshot, evaluate: `() => ({ url: location.href, y: scrollY })`
Include this in findings so issues are reproducible.

---

## Parallelism — launch all three in ONE message

When `/paw-patrol` is invoked, spawn ALL THREE agents in a single message
with three Agent tool calls so they run concurrently. Do NOT wait for one
before launching the next. Wait for all three to complete, then synthesize.

The prompt for each agent is in the sections below.

---

## AGENT ROVER — Data Watchdog

**Persona:** Skeptical analyst. Trusts nothing, cross-checks everything.
Rover's job is to verify that numbers on-screen match reality and that
statistics are internally consistent. Rover is never interested in aesthetics.

**Entry point:** `https://rubli.xyz/aria` (ARIA Risk Queue)

**Exploration sequence (adjust freely based on what you see):**

1. Screenshot the ARIA Risk Queue hero — record T1/T2/T3/T4 counts and
   check they plausibly sum to the total vendor count (~249K)
2. Note the "at risk MXN" figure and the pattern distribution bar chart
3. Click into one T1 vendor (pick the top one by score)
4. On the vendor dossier: screenshot the risk score, evidence section, flags
5. Navigate to `/` dashboard — screenshot the sector bubble map
6. Note any headline numbers (contracts indexed, spend validated)
7. Navigate to a sector page (e.g., `/sectors/salud`) — check contract count
   and spend figures look coherent with what the dashboard shows
8. Navigate to `/methodology` — look for any claims that contradict what
   you've seen in the data (e.g., "AUC 0.828" but metadata says v0.8.5)

**What to flag:**
- Numbers that don't add up or seem inconsistent across pages
- Statistics that contradict each other (e.g., different total counts)
- "N/A" or empty data where data should exist
- Misleading labels ("probability of corruption" is forbidden — must be
  "risk indicator" or "indicador de riesgo")
- Model version mismatches (CLAUDE.md says v0.8.5 is active)

**Return format:** See "Agent output format" section below.

---

## AGENT CHASE — Story & Content Reader

**Persona:** Journalist reading these investigations for the first time.
Chase wants to be convinced by evidence and compelling presentation.
Chase notices when a chart is missing, a number looks wrong, or the
editorial voice breaks down.

**Entry point:** Pick ONE of these story slugs at random (or pick whichever
looks most interesting) and navigate to `https://rubli.xyz/stories/{slug}`:
- `el-ejercito-fantasma`
- `el-gran-precio`
- `el-monopolio-invisible`
- `la-ilusion-competitiva`
- `captura-institucional`
- `marea-de-adjudicaciones`
- `el-sexenio-del-riesgo`
- `la-industria-del-intermediario`
- `el-umbral-de-los-300k`

**Exploration sequence:**

1. Apply the animation-freeze protocol (Rule 2+3 above) — CRITICAL or charts blank
2. Screenshot the story hero — check headline, lede, kicker chip, lead stat
3. Press PageDown 3 times (600ms wait each) — screenshot the first DataPullquote
4. Continue PageDown — screenshot every chart you encounter
5. Check: does every chart have a kicker? a headline? a footer citation?
6. When you reach the end, screenshot the closing chapter / credits
7. Toggle to Spanish (`ES` button in bottom-left sidebar) — re-read 2 chapters.
   Check that all text translated (no English fragments left in Spanish mode)
8. Pick a SECOND story (different category) and do a lighter pass:
   hero screenshot, one DataPullquote screenshot, check ES toggle

**What to flag:**
- Blank chart frames (no SVG content visible)
- Charts with correct frame but missing data (empty bars, 0 values)
- Missing kicker, headline, or footer on any chart frame
- English text visible in ES mode (i18n gap)
- "probability of corruption" language (forbidden — §3.10)
- Broken citations (footer text that references wrong data)
- Typographic issues: wrong font, missing drop-cap, numbers not in Playfair
- DataPullquotes with `?` or placeholder data

**Return format:** See "Agent output format" section below.

---

## AGENT SKYE — Navigation & UX Explorer

**Persona:** Curious first-time visitor who arrived from a news article.
Skye wants to explore, uses the sidebar, searches for things, and notices
when the site feels broken, incomplete, or confusing.

**Entry point:** `https://rubli.xyz/` (Dashboard)

**Exploration sequence (be genuinely curious — deviate from this list
if you find something worth investigating):**

1. Screenshot the dashboard — note what's visible above the fold
2. Apply animation-freeze protocol
3. Click "The Observatory" in the sidebar — screenshot. Note whether the
   auto-tour launches (it should on first visit based on localStorage flag,
   but Playwright may have already set the flag)
4. Navigate via sidebar: click "Risk Queue" — screenshot
5. In Risk Queue, click the "T1 · Critical" row — does it filter or navigate?
   Screenshot whatever happens
6. Navigate via sidebar: click "Sectors" — screenshot
7. Click one sector (whichever has the most interesting name) — screenshot
8. Navigate via sidebar: click "Newsroom" — screenshot. Does this page exist?
9. Click the search button (Ctrl+K in header) — try typing "PEMEX" —
   screenshot results
10. Click the "ES" language toggle — screenshot the same page in Spanish.
    Check sidebar labels translated.
11. Try navigating to `/stories` — screenshot (known 404 — note if fixed)
12. Navigate to `/methodology` — screenshot. Read the AUC/version claims.
13. Try one deliberate 404: `/vendors/999999` — screenshot the error page

**What to flag:**
- Any sidebar link that produces 404 or blank page
- Interactive elements that look clickable but do nothing
- Language toggle not working (sidebar still in English in ES mode)
- Search returns no results for obvious vendors (PEMEX, IMSS, BAXTER)
- Pages that look unfinished or have placeholder content
- Navigation confusion (active state wrong, breadcrumbs missing)
- Oversized whitespace / layout that wastes screen real estate
- Mobile-hostile patterns (buttons too small, text too wide, overflow)
- Console errors (check via browser_evaluate: `() => []` won't work —
  instead note any visual errors or failed API responses)

**Return format:** See "Agent output format" section below.

---

## Agent output format

Each agent returns a structured report. Use this exact shape so synthesis
is mechanical:

```
## PAW PATROL REPORT — {AGENT NAME}
**Pages visited:** {list}
**Screenshots taken:** {list of filenames}
**Time spent:** ~{N} minutes

### FINDINGS

#### CRITICAL (breaks functionality or misleads users)
- [CRIT-1] {page} — {description} — screenshot: {filename}

#### HIGH (visible flaw, degrades trust or usability)
- [HIGH-1] {page} — {description} — screenshot: {filename}

#### MEDIUM (improvement opportunity, not broken)
- [MED-1] {page} — {description} — screenshot: {filename}

#### LOW (polish, nitpick)
- [LOW-1] {page} — {description} — screenshot: {filename}

### WHAT IMPRESSED ME (things that are A-grade, worth protecting)
- {description}

### WHAT I COULDN'T TEST (and why)
- {description}
```

---

## Synthesis step (Claude, after all 3 agents complete)

1. **Deduplicate**: merge findings that describe the same issue from
   different angles. Reference both agent IDs.

2. **Triage matrix:**
   - CRITICAL + mentioned by 2+ agents → **Fix immediately** (do it now)
   - CRITICAL + mentioned by 1 agent → **Fix now if reproducible** (verify first)
   - HIGH → Queue for next session
   - MEDIUM/LOW → Capture as suggestions, don't act unless user asks

3. **Immediate fixes:** For any CRITICAL you confirm by re-visiting the URL,
   fix inline before handing off. Update BUILD_ID and deploy.

4. **Output a clean summary** in this format:

```
## PAW PATROL SWEEP COMPLETE

### Fixed right now
- {description} (commit {hash})

### Queue for next session (ranked by priority)
1. {HIGH finding}
2. ...

### Things that are working well
- {what impressed the agents — so we don't accidentally break it}

### Testing notes
- {any Playwright limitations encountered, so future sweeps can avoid them}
```

---

## Known Playwright limitations (update this list each sweep)

1. **`window.scrollTo` does not trigger IntersectionObserver** — use
   `browser_press_key` with `PageDown` instead. 600ms wait between presses.

2. **framer-motion `whileInView` at deep scroll** — always apply animation-
   freeze protocol (Rule 2+3) at the start of every page visit.

3. **Full-page screenshots miss animated content** — framer-motion elements
   that haven't entered the viewport during the fullPage render stay at
   opacity: 0. Viewport screenshots with PageDown scroll are more reliable.

4. **Console errors during rapid scroll** — `ResizeObserver loop limit
   exceeded` fires during fast programmatic scroll. These are benign.
   Only flag console errors that appear on a clean page load (no scroll).

5. **First-visit auto-tours** — The Observatory launches a tour on first
   visit (localStorage `rubli_atlas_visited_v1`). **BEFORE visiting /atlas**,
   set this flag via `browser_evaluate`:
   ```javascript
   () => { localStorage.setItem('rubli_atlas_visited_v1', '1'); return 'set'; }
   ```
   The value MUST be `'1'` (string), NOT `'true'` — Atlas.tsx checks
   `=== '1'` exactly. Using `'true'` silently fails to suppress the auto-tour.

6. **`browser_evaluate()` can trigger navigation on keyboard-listener-heavy
   pages** — Atlas, ARIA queue, and Administrations all have global keyboard
   shortcuts. Playwright's evaluate() occasionally fires focus events that
   trigger these shortcuts. If a page unexpectedly navigates away after an
   evaluate() call, it is a Playwright/headless artifact. Do NOT flag as a
   production bug without reproducing in a real browser.

---

## Story slugs (all 9, for CHASE reference)
```
el-ejercito-fantasma      el-gran-precio
el-monopolio-invisible    la-ilusion-competitiva
captura-institucional     marea-de-adjudicaciones
el-sexenio-del-riesgo     la-industria-del-intermediario
el-umbral-de-los-300k
```

## Key page inventory (for SKYE reference)
```
/                  Dashboard (bubble map)
/atlas             El Observatorio (constellation)
/aria              ARIA Risk Queue
/newsroom          Newsroom (stories listing)
/sectors           Sector explorer
/methodology       Risk methodology
/stories/{slug}    Story narratives
/cases             Ground truth cases
/thread/{id}       Red Thread vendor narrative
```
