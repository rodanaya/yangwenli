# STORY DAYS — QC panel (after Day 10)

Five perspectives, run as **parallel read-only Opus agents**, over all 13 stories in EN + ES (`frontend/src/lib/story-content.ts`; live figures in `frontend/src/components/stories/live/*.tsx`; prod https://rubli.xyz/stories/<slug>). Fable adjudicates; one Opus applier ships. Nothing a panelist writes is applied blindly — every proposed fact change is re-checked against the endpoint by the adjudicator (see `project_stories_remade_newsroom_2026-06-26`: a "correction" can be wrong).

## Stories (13)
`el-vacio` · `el-ejercito-fantasma` · `el-gran-precio` · `el-monopolio-invisible` · `la-ilusion-competitiva` · `captura-institucional` · `marea-de-adjudicaciones` · `el-sexenio-del-riesgo` · `la-industria-del-intermediario` · `el-umbral-de-los-300k` · `volatilidad-el-precio-del-riesgo` · `el-ano-de-la-emergencia` · `el-cartel-de-los-vales`

Days 1–10 remade ten of them with live figures; `el-gran-precio`, `el-monopolio-invisible`, `volatilidad-el-precio-del-riesgo` were kept (Day 11 = chips where a vendor is named + the ARHNOS removal) and get the fullest read.

## Perspectives (one agent each, read-only: Read/Grep/Glob/Bash(curl) only — no Edit/Write except its own report)

| # | Agent name | Lens | What it grades (per story, 1–5) | What it must produce |
|---|---|---|---|---|
| 1 | `qc-editor` | Investigative editor (ProPublica/NYT desk) | Lede strength · thesis holds end to end · chapter order · every chapter earns its figure · closing lands · no hedging padding | Rewrites of weak sentences (EN + ES both, verbatim old → new), cuts, reorder proposals |
| 2 | `qc-facts` | Data fact-checker | Every number, name, date, rate in prose/kickers/pullquotes/captions/card vs the live endpoints (`/api/v1/analysis/year-over-year`, `sector-year-breakdown`, `amount-histogram`, `/aria/*`, `/vendors/*`, `/institutions/*`, `/categories/sexenio`, `/sectors`) — and whether a claim is *sourced* (external citation) or *computed* (dated) | A claim ledger per story: claim · location (EN/ES field) · endpoint · live value · verdict (holds / drifted / false / unverifiable) · proposed wording |
| 3 | `qc-espanol` | Mexican-Spanish editor (Reforma/Proceso desk) | Natural Mexican Spanish, not translated English · MDP / mil millones / billones convention (never "B MXN") · accents and typographic conventions · § kickers · register consistent with the EN | Verbatim ES old → new for every fix; flag EN/ES meaning divergences |
| 4 | `qc-reader` | Lay reader / clarity | Can a non-specialist follow each chapter? Jargon (P1–P7, GT, Structure A, HHI, single bid vs direct award) explained on first use? Figures readable without the prose? Pull-quotes stand alone? | Plain-language rewrites, glossary insertions (one sentence, in place), figure-caption clarifications |
| 5 | `qc-legal` | Honesty & legal reviewer (defamation, model-claim discipline) | "Indicador de riesgo" never "probability of corruption" (rule 5) · no named vendor/official asserted as corrupt without a documented case (ARIA `review_status`, GT case id) · false-positive/cleared vendors not named as suspects · acquittals stated where they exist · partial-year and Structure A caveats present · external citations exist and support the sentence | Sentence-level risk list with the fix; a "must not ship" list |

Each agent writes `_parallax_shots/story-days/qc-<name>.md` with: one table per story (grade, top 3 issues), then a **REWRITES** section as a JSON array `[{slug, field_path, lang, old, new, reason, evidence}]` where `field_path` is the story-content.ts path (e.g. `chapters[2].prose[1]`, `leadStat.sublabel_es`, `kickerStats[0].suffix`) and `old` is the verbatim current string (so the applier can match it). Agents do not talk to each other.

## Adjudication (Fable)
1. Merge the five REWRITES arrays; group by (slug, field_path, lang).
2. For every fact change: re-hit the endpoint myself; accept only what the live value supports. For every style change: accept if it does not alter a verified number and keeps the story's voice; reject rewrites that soften a true finding or harden an unverified one.
3. Conflicts between panelists → the honesty lens wins over the editor lens; the Spanish editor wins on ES wording.
4. Output `docs/story-days/QC-ADJUDICATION.md` (accepted / rejected with one-line reasons) and `D:/Python/_rw/qc-accepted.json` (the accepted array).

## Application (one Opus agent, `qc-applier`, branch `story/qc-pass` off origin/main)
- Apply `qc-accepted.json` to `story-content.ts` string-aware (pattern: `D:/Python/_apply_rewrites.py` — it swaps prose/headline/dek/kicker/leadStat/pullquote TEXT only, never data fields; extend it to the `field_path` form or write the equivalent).
- Also the code items from the STORY_DAYS QC list that belong to the stories surface: `el-gran-precio` ARHNOS mention removed (EN + ES), `captura-institucional` ch4 "176" → live 155 or the live token, card `status` mismatches on `/journalists`, the shared story footer "3,051,294" → the register count or "scored corpus" wording, Day 11 chips in the three kept stories, `MoneySankeyChart.tsx` deleted, `MacroArc.tsx` hardcoded `YEARLY_DA` → `useYearOverYear`, `atlas-stories.ts` COVID "87%" → the live 78.1% wording. Backend items (single-bid-rate docstring, admin-breakdown eras, `/sectors?year=2023` Hacienda, threshold-gaming retirement, ghost_confidence rerun) are logged, not done, in this pass unless trivial and tested.
- Gates (tsc 0 · build · lint:tokens) · probe all 13 stories at 1440 + 390 EN + ES (Days 1–10 scrollies step, 0 console errors) · `clipcensus.mjs` 0 on all 13 + `/journalists` (EN + ES, 4 widths) · report `_parallax_shots/story-days/qc-report.md`.
- Ship: BUILD_ID `2026-09-19-story-qc-pass`, STORY_DAYS row "QC" ✅, push HEAD:main, `deploy-safe.sh`, verify. Then the loop stops.

## Budget
Five panelists in parallel (read-only, ~one story-content.ts read + endpoint probes each), one applier. If a session limit hits mid-panel, the reports on disk are the recovery point — re-spawn only the missing perspective.
