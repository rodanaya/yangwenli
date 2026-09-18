# PARALLAX Day 2d — Metodología reading frame (kill the empty space)

Trigger: user screenshots after Day 2c (`Screenshot 2026-09-18 1056xx/1057xx`): on `/methodology` the bordered finding boxes (`rounded-md bg-accent/5 …`), the score-formula box and the thresholds block run the full 1,040px clause column while the text inside stops at 68ch, leaving ~450px of dead paper on the right of every box; the masthead eyebrow "RUBLI · EL DICTAMEN · MODEL v0.8.5 · RUN CAL-v8-…" and the clause kickers wrap onto two lines because the 68ch paragraph rule caught them. "Look how much empty space there is. This is just sloppy."

Design (Fable, folio aesthetic skill § body lede 68ch + NYT/FT reading column): **the reading column is the measure.** A centered editorial block, text column 640px, figures overhang to 760px, single-line labels exempt from the measure. Same mechanic the stories already use (656px column, centered).

## Keep
Everything in the Dictamen except widths: masthead copy and anchor stats, index rail, clause/annex grammar, all plates' internals (Day 2b), Two Worlds ledger, tables, footers, bilingual strings. The Day 2c global measure rules stay.

## Change (4)

### 1. Global: single-line labels are exempt from the measure — `frontend/src/index.css`
Append after the Day 2c block (same `:where()` zero specificity, later wins):
```css
/* Labels are not paragraphs: eyebrows, kickers, datelines, bylines and
   editorial-labels stay on one line regardless of length. */
main :where(.uppercase, .text-kicker, .text-byline, .lede-dateline, .editorial-label, [style*="text-transform: uppercase"]) {
  max-width: none;
}
```
Accept (probe, 1440): on `/methodology` the masthead eyebrow, the "PRINT / PDF" button label and every ClauseSection kicker (`p.font-mono.uppercase`) render on one line (height ≤ 1.7 × font-size); on `/gap` and `/dashboard` no `.uppercase` leaf is taller than 1.7 × its font-size unless its text is > 90 characters.

### 2. The Dictamen reading frame — `frontend/src/pages/Methodology.tsx`
- Outer container (line ~381): `max-w-screen-xl` → `max-w-[1010px]` (keep `mx-auto px-4 sm:px-6 …`). 210px rail + 40px gap + 760px figure width = 1010.
- The clause column (`<div className="space-y-12 min-w-0">`, line ~396): add `lg:max-w-[640px]`. This is the measure for the page: every box, table and paragraph in the clauses is now ≤ 640px, so boxes are as wide as their text.
- Figures bleed: pass `className="lg:w-[760px] lg:max-w-none"` to `<BalanzaLedger />` and `<CalibrationRecord />` (both already accept `className` on their wrapper div), and add the same `className?: string` prop to `TwoWorldsExhibit` (apply it on the outer `<section id="two-worlds">`) and pass it. Plates therefore render 760px wide, 120px past the text column's right edge, on `lg+`; below `lg` they stay full-width as today. The Day 2b `maxWidth: 760 / minWidth: 660` on the plate SVGs is unchanged and now fills its plate exactly.
- Clause body prose: the Day 2 `text-[13px]` paragraph sites (the 47 sites of Change 8, i.e. `<p className="text-[13px] text-text-secondary …">` / `text-[13px] text-text-muted …`) → `text-[15px]`. At 15px, 68ch ≈ 560px, so a paragraph fills a 616px box interior with ≤ 60px to spare. Do NOT touch `text-xs` tables, `font-mono` notes, kickers, badges, `Formula`, tier-card `<li>`s.
- Tables inside the clauses (`overflow-x-auto` wrappers) stay; at 640px the 5–6-column tables fit (probe it; if a table needs > 640, give that wrapper `lg:w-[760px] lg:max-w-none` like a plate).
- Accept (probe, 1440 and 1920): the outer container is 1010px wide and horizontally centered (`left` margin == `right` margin ± 2px); `#overview`'s clause column is 640px; every `.rounded-md`/`.fern-card` box inside the clauses is ≤ 640px and the widest text child's right edge is within 70px of the box's inner right edge; the three plate wrappers are 760px wide; no document-level horizontal overflow at 1440, 1024 or 390; the masthead h1 wraps to ≤ 3 lines at 1010.

### 3. Masthead + coda + footers follow the frame — `Methodology.tsx`, `DictamenChrome.tsx`
- `DictamenMasthead` lede `maxWidth: '68ch'` stays; the anchor-stats grid stays 3-up inside 1010.
- `MethodologyCoda` (3-column ramp grid), `MethodologyProvenanceFooter`, `CitationBlock`, `PageFooter` inherit the 1010 container; nothing else to change unless the probe shows a box wider than the text by > 70px — then cap that block at `lg:max-w-[640px]` too.
- Accept: same box-vs-text check across the whole page, not only the clauses.

### 4. Bilingual + gates
- No new strings expected; run `rubli-bilingual-audit` on the two touched TSX files anyway. `tsc -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens` clean.

## Out of scope (backlog)
- The same reading-frame treatment for `/gap` (GradeBlock note, colophon), `/cases`, `/administrations` prose boxes — apply on their PARALLAX days using this file as the pattern.
- Page-container outliers (Day 2c backlog).

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, new branch `parallax/day-02d-reading-frame` from `origin/main` (`b3797090`). Ignore `frontend/Python.npm-cache/`. Never junction node_modules, never bare `git stash`, temp files under D:\.
- Read `Methodology.tsx` fully (chunks), `DictamenChrome.tsx`, `TwoWorldsExhibit.tsx` before editing. Re-read after edits.
- Dev server: 3011 is probably still serving this worktree (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/methodology`); reuse it, else `VITE_API_URL=https://rubli.xyz npm run dev -- --port 3011` from `frontend/`.
- Probe: write `_parallax_shots/day02/frame.mjs` (Playwright, `channel: 'msedge'`, createRequire on `D:/Python/yangwenli/frontend/package.json`) implementing the acceptance checks above at 1920, 1440, 1024 and 390, and save screenshots of `/methodology` at 1920 and 1440 (top, Part I, Part II with the plate overhang, Part V) to `_parallax_shots/day02/after-2d/`. Read the screenshots yourself before reporting: the block must read as one centered editorial column with figures overhanging right, no half-empty boxes.
- Commit: `feat(methodology § PARALLAX D2d): centered 1010px reading frame — 640px text column, 760px figure bleed, 15px clause prose; labels exempt from the measure` + body citing `docs/parallax/DAY-02d-methodology-reading-frame.md § Change 1–4`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not bump BUILD_ID, push or deploy — Fable judges first.

## Result

Built by Opus executor `parallax-day02d`, judged by Fable on 1920/1440 screenshots (`_parallax_shots/day02/after-2d/`). Commit `dcef67f2`.

| Width | Container | Margins in `main` | Text column | Plates | h1 lines | Overflow |
|---|---|---|---|---|---|---|
| 1920 | 1010 | 323 / 323 | 640 | 5 × 760 | 2 | none |
| 1440 | 1010 | 83 / 83 | 640 | 5 × 760 | 2 | none |
| 1024 | 928 | 0 / 0 | 630 | 5 × 630 (bleed off below 1300) | 2 | none |
| 390 | 366 | 0 / 0 | 334 | 5 × 334 | 4 | none |

Boxes: 28 of 33 within 70px of their text; the 5 exceptions are the code band (full measure by convention), the 760 Two Worlds exhibit and three stat tiles. Eyebrows and kickers: one line at 1440 and 1920 everywhere; the remaining wrapped `.uppercase` leaves are stat-tile captions in narrow grid cells.

Deviations accepted: figure bleed gated at 1300px (not `lg`) because at 1024 a 760 plate overflowed the container; the two 3-up card exhibits (tiers, cross-model pillars) bleed to 760 and keep 13px bodies so 3-word lines don't appear in 155px cells; at 1024 La Balanza (min 660) scrolls inside its frame (documented Day 2b fallback). Gates: tsc 0 · build OK · lint PASS. Shipped 2026-09-18: `0adea6e9` (BUILD_ID `2026-09-18-parallax-d2d-reading-frame`), entry `index-pEemEF4r.js`, label-exempt rule in the served stylesheet, VPS HEAD `0adea6e9`, health OK. Live at 1920: container 1010 centered (343/343), column 640, eyebrows one line.
