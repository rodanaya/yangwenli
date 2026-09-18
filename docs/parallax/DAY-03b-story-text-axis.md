# PARALLAX Day 3b — story template: one text axis

Trigger: user after the Day 3 deploy — "make sure that the text is not messed up? alignment and the size of everything and lining and size of boxes". Prod census (`_parallax_shots/day03/align3.mjs https://rubli.xyz`, 1440 / 1920 / 390, three stories) + section crops (`_parallax_shots/day03/prod/crops/monopolio-1440-section2.png`).

## What the census found (1440, positions relative to `main`; the 640 text column sits at 288–928)

| Block | left | width | verdict |
|---|---|---|---|
| body prose (hero / standard / connective / closing / coda) | 288 | 640 | the axis ✓ |
| StoryHero h1 / deck / kickers | 252 | 712 | 36px left of the axis (760 wrapper + `sm:px-6`) |
| hero chapter title block, closing title block | 252 | 712 | same |
| ChapterBanner text | 268 | — | 20px left of the axis (760 box + `px-10`) |
| **feature chapter prose** (7/12 of the 1010 grid) | **143** | 526 | **145px left of the axis**; its own banner text starts 125px to its right |
| figures in hero chapter | 228 | 760 | ✓ (60px overhang each side) |
| figures in feature / data-spotlight / closing, quote figure, dramatis | 252 | 712 | 48px short: wrappers carry `sm:px-6` |
| 390: banner text | 44 | — | 8px right of body prose (36) |

Sizes and leading are consistent: chapter prose 17px (19px lede, 18px closing) at a computed 1.6 line-height on every story; headings Playfair 68 / 36 / 52 / 60. The global `p { line-height: 1.6 }` (index.css:222, unlayered) beats every `leading-[1.75]` utility — uniform, so not a Day-3b edit; backlog.

## Keep
Everything Day 3 shipped: 1010 frame, 640 text, 760 figures, ChapterBanner band + Playfair, dateline, ChapterNav, ScrollSvgFrame, all copy and chart data.

## Change (4) — `frontend/src/pages/StoryNarrative.tsx`, `frontend/src/components/stories/ChapterBanner.tsx`

### 1. Title blocks sit on the text axis
- StoryHero inner container (`max-w-[760px] mx-auto px-4 sm:px-6 py-12 md:py-20`) → `max-w-[640px] mx-auto px-4 sm:px-0 py-12 md:py-20`. The deck's own `max-w-[640px]` becomes redundant — drop it.
- HeroChapter title block (`max-w-[760px] mx-auto px-4 sm:px-6 pt-16 pb-10 relative`) → `max-w-[640px] mx-auto px-4 sm:px-0 …`; the watermark numeral stays `absolute -top-2 right-2 sm:right-8` inside it (it may overhang the column — it is aria-hidden decoration at 7% opacity, and `-z-10` keeps it behind the text; give it `lg:-right-24` so it keeps its old visual position).
- ClosingChapter title block (`max-w-[760px] mx-auto px-4 sm:px-6 pt-12 pb-6`) → `max-w-[640px] mx-auto px-4 sm:px-0 …`.
- Accept (1440 + 1920): left edge of `main header h1`, the hero chapter `h2`, the closing chapter `h2`, and every body prose `p` are equal ±1px.

### 2. ChapterBanner text on the axis, box stays 760 — `ChapterBanner.tsx`
- Content padding `px-6 md:px-10` → `px-4 sm:px-6 lg:pl-[60px] lg:pr-10` (760 box at axis−60 → text at the axis; on phones text at 36 like the body). Watermark numeral `left-4` → `lg:left-6` (unchanged look).
- Accept: every ChapterBanner `h2` left edge == the axis ±1px at 1440/1920; at 390 == body prose left (36) ±1px.

### 3. Feature chapter: prose on the axis, pullquote in flow
- The `lg:grid-cols-12` two-column layout cannot put a 640 column on the axis and keep a useful aside inside the 1010 frame (the aside would be 129px). Replace it: body column `max-w-[640px] mx-auto px-4 sm:px-0` (prose + sources), then the pullquote in its own `max-w-[640px] mx-auto px-4 sm:px-0 my-10` block (keep `renderPullquote(chapter, story, '', isFirst, 'feature')` so the `ledger` role for the first feature is preserved), then the chart at 760 (Change 4). Remove `isolate`, the `<aside>`, `lg:sticky lg:top-24`, and the now-unneeded `relative z-20` on the chart wrapper. Update the comments.
- Accept: `section[id^=chapter-] .lg\:grid-cols-12` = 0; feature prose left == axis; the pullquote box width == 640 (its DataPullquote container query renders the wide layout).

### 4. Every figure box is 760 at axis−60
- Wrappers `max-w-[760px] mx-auto px-4 sm:px-6` → `max-w-[760px] mx-auto px-4 sm:px-0` at: feature chart, data-spotlight chart (its gradient `rounded-lg p-1 sm:p-2` frame becomes the 760 box; the chart inside is ≈744 — acceptable, the frame is part of the figure), quote-spotlight `figure`, closing pullquote, closing chart, DramatisPersonae, the sexenio era-strip divider (`px-4` → `px-4 sm:px-0`).
- Accept (1440 + 1920): every `figure[role=img]` not inside another figure, every ChapterBanner box, the dramatis box, the quote-spotlight figure: width 760 ±2 and left == axis − 60 ±2. At 390: all of them 350 wide at left 20, body prose at 36, no document overflow.

## Out of scope (backlog)
- `p, .text-body { line-height: 1.6 }` at index.css:222 is unlayered and defeats every `leading-*` utility on paragraphs site-wide. Decide once (move into `@layer base` or delete) on a shell day.
- StoryHero kicker/lead-stat block sits inside the 640 column now; if the 60px Playfair h1 wraps to 3 lines on the longest headline ("Inside Institutional Capture: 15,923 Vendors at Three Agencies"), that is the measure working, not a defect.

## Build notes for the executor
- Worktree `D:\Python\yangwenli\.claude\worktrees\parallax-day01`, new branch `parallax/day-03b-text-axis` off `origin/main` (`9d8c6ee8`). Never bare `git stash`, never junction node_modules, temp under D:\. Ignore untracked `frontend/Python.npm-cache/` and `_parallax_shots/`.
- Read `StoryNarrative.tsx` (≤500-line chunks) and `ChapterBanner.tsx` fully before editing; re-read after edits.
- Dev server: port 3011 serves this worktree (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/journalists` → 200); else `VITE_API_URL=https://rubli.xyz npm run dev -- --port 3011` from `frontend/` in background.
- Probe: extend `_parallax_shots/day03/align3.mjs` into the acceptance above (axis = left edge of the first hero-chapter prose `p`; report every text block's delta from the axis and every figure box's width + delta from axis−60; fail on any |delta| > 2). Run it against `http://localhost:3011` on all 13 slugs at 1440, 1920, 390. Section crops: `_parallax_shots/day03/sec.mjs` pointed at localhost for `el-monopolio-invisible` and `el-sexenio-del-riesgo` (sections 1, 2, last) into `_parallax_shots/day03/after-3b/`. Read the crops: every text block must share one left edge, figures overhang 60px each side, nothing else moves.
- Gates from `frontend/`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run lint:tokens`. No new strings → no bilingual audit needed, but run `rubli-bilingual-audit` on the two files anyway.
- Commit: `fix(stories § PARALLAX D3b): one text axis — titles, banners and feature prose on the 640 column, every figure 760` with a body citing `docs/parallax/DAY-03b-story-text-axis.md § Change 1–4`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not bump BUILD_ID, push or deploy — Fable judges first.
- Report: per-change PASS/FAIL, the max |delta| per story at each width, figure widths, gate outputs, commit hash, crop list.

## Result

Built by Opus executor `parallax-day03c`; judged by Fable on `_parallax_shots/day03/after-3b/` (two stories × 1440/1920/390, hero + sections 1, 2, last). Probe `_parallax_shots/day03/axis3b.mjs` over all 13 stories.

| Width | Max text delta from the axis | Boxes | Overflow |
|---|---|---|---|
| 1440 (13 stories) | 0px (was 145 feature prose / 36 titles / 20 banner text) | every 760 box at axis−60, 0px (was 712 at +24 in three variants) | none |
| 1920 (13 stories) | 0px | 0px | none |
| 768 (3 stories) | 0px incl. hero | every box left == prose left | none |
| 390 (3 stories) | 0px incl. hero (was 8px) | every box left == prose left (banners were 350/20 vs figures 318/36) | none |

Judge ruling for phones: the body-prose edge wins — every box and every text block sits on it. Executor deviations accepted: the banner's inner content is a 640 column centred inside the 760 band (zero padding broke 768), which moves the era pill 20px inward onto the text column's right edge; the StoryHero and Dramatis Personae are wrapped in a copy of the chapters container (`max-w-[1010px] mx-auto px-2 sm:px-4`) rather than hand-tuned padding (drifted up to 16px in the 640–695 band); Act II–IV containers moved to `px-2 sm:px-4` to match. The feature chapter's sticky two-column aside is gone — a 640 column plus a useful sidebar does not fit a 1010 frame; the pullquote now follows the prose in flow, then the chart at 760.

Gates: tsc 0 · build OK · lint:tokens PASS · bilingual audit no new strings. Commit `9078f774` → rebased onto `18077b2b` (an automated visual-review commit landed on origin/main meanwhile) as `17a2ae1f`; docs `33874a4b`; BUILD_ID `b9b67edf` (`2026-09-18-parallax-d3b-text-axis`).

Deployed 2026-09-18 12:50Z via `deploy-safe.sh` (`[deploy] done`, VPS HEAD `b9b67edf`). Entry bundle `index-D8bJdIcU.js` → `index-CeyJAWSN.js`; BUILD_ID string 1 hit in the served entry chunk; health `db_connected: true`, 3,058,286 contracts. Prod census (`align3.mjs https://rubli.xyz`, three stories): every text block's left edge = 288 at 1440, 528 at 1920, 36 at 390 (page hero, chapter titles, banner text, body prose, closing, coda); the only nonzero centre offsets are short 16px banner subtitles measured at their natural width (left edge on the axis) and the dramatis roster's inner bordered box (1px). Prose 17px/1.6 (19 lede, 18 closing) on every story; no document overflow at any width.
