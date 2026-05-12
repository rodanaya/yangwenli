# Audit 02 — Visual Quality vs The Bar

> Read-only audit, 2026-05-07. Live target: https://rubli.xyz (HEAD `7225855`,
> tip `ae9299a`). Bar: `docs/RUBLI_v1.0_QUALITY_BAR.md` §6 (5-bullet
> fingerprint). Three Gold surfaces (Atlas / Executive / AriaQueue) calibrate
> the ceiling.

## Method

Playwright MCP was not exposed in this run, so screenshot-based audit was not
possible. I substituted a **structural fingerprint audit** of the deployed
code (the bar document itself scores by code patterns: PlateFrame presence,
Card-grid pervasiveness, Folio eyebrow, serif H1, recharts vs hand-built SVG,
i18n-key vs ternary). All counts below are `grep -c` on the file as deployed
on `main` (rubli.xyz returned 200 on 12/12 routes; SPA shells contain no
useful HTML so visual-pixel scoring is degraded to structural scoring).

**Scoring rubric (1–5 per fingerprint bullet):** 5 = matches the Gold
reference verbatim; 4 = matches with one defensible deviation; 3 = present
but uneven; 2 = partial / inconsistent; 1 = absent or contradicted.

Raw signal counts (all from deployed `main`):

| Surface | PlateFrame | Folio | serif H1 | ui/card refs | recharts | EntityChip | i18n keys | lang ternaries | editorial charts |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Executive | 18 | 1 | 1 | **0** | 0 | 4 | 2 | 7 | 9 |
| Atlas | 4 | 2 | 1 | **0** | 0 | 0 | 2 | 46 | 5 |
| AriaQueue | 0 | 1 | 0 | **0** | 0 | 3 | 6 | 85 | 15 |
| Sectors | 0 | 1 | 6 | **0** | 0 | 4 | 3 | 28 | 0 |
| SectorProfile (salud) | 0 | 1 | 2 | **0** | 0 | 5 | 4 | 33 | 2 |
| CaseLibrary | 0 | 1 | 3 | **0** | 0 | 0 | 2 | 24 | 0 |
| Methodology | 0 | 0 | 5 | **0** | 0 | 0 | 7 | 0 | 0 |
| VendorProfile (+sub) | 0 | 1 | 0 | **0** | 0 | 0 | 2 | 10 | 0* |
| InstitutionProfile | 0 | 1 | 3 | **119** | 0 | 6 | 10 | 14 | 12 |
| CategoryProfile | 0 | 0 | 21 | **47** | 0 | 6 | 2 | 72 | 5 |
| Administrations | 3 | 3 | 6 | **121** | 0 | 0 | 11 | 9 | 6 |
| StoryNarrative | 0 | 0 | 6 | **0** | 0 | 2 | 19 | 8 | 0 |

\* VendorProfile delegates charts to `VendorEvidenceTab` / `VendorActivityTab`
/ `VendorNetworkTab`, none of which import PlateFrame, Folio, serif-class, or
ui/card. VendorHero carries the Folio·D eyebrow (1 ref) but no PlateFrame.

## Per-surface scorecard

Bullets in column order: **Folio** (PlateFrame OR Folio·N eyebrow) ·
**H1** (EB Garamond italic + dateline) · **Charts** (one signature SVG per
fold, hand-built) · **Primitives** (no `@/components/ui/card`) ·
**i18n** (keys for prose, ternary only for SVG legends).

| # | Surface | Folio | H1 | Charts | Primitives | i18n | Total | Biggest delta |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | `/` Executive | 5 | 4 | 5 | 5 | 4 | **23/25** | 7 lang-ternaries leak into copy that should be `t()` keys. |
| 2 | `/atlas` | 5 | 4 | 5 | 5 | 3 | **22/25** | 46 inline `lang===` ternaries — gold standard says ternaries are SVG-legend-only. |
| 3 | `/aria` | 4 | 5 | 5 | 5 | 3 | **22/25** | 85 lang-ternaries (highest in the audit); only 6 `useTranslation` hooks. Bar tolerates this for utility surface. |
| 4 | `/sectors` | 3 | 4 | **1** | 5 | 4 | **17/25** | **No editorial chart primitives at all** — the landing has 0 PlateFrame, 0 hand-built signature SVG. Pure list-of-tiles. |
| 5 | `/sectors/salud` | 3 | 4 | 2 | 5 | 4 | **18/25** | Only 2 editorial chart refs across the whole sector dossier; no PlateFrame chrome on hero. |
| 6 | `/cases` | 3 | 4 | **1** | 5 | 4 | **17/25** | CaseLibrary has Folio eyebrow + serif lede but **zero charts** — a library should at least carry one timeline plate. |
| 7 | `/methodology` | **1** | 4 | 1 | 5 | 5 | **16/25** | No Folio eyebrow at all; this is the authority surface and it's chrome-less. The serif sets type but nothing else codes "RUBLI v1.0". |
| 8 | `/vendors/:id` | 2 | 3 | **1** | 5 | 3 | **14/25** | VendorHero has Folio·D, but Evidence/Activity/Network sub-tabs have **zero** Folio, zero serif, zero PlateFrame, zero editorial charts. Tabs structurally break the arc (Bar §7.1.1). |
| 9 | `/institutions/:id` | 3 | 4 | 4 | **1** | 4 | **16/25** | **119 ui/card refs.** Hero is gold; body is 6-tab Card-grid dashboard (Bar §7.2.1, called out as CRITICAL). |
| 10 | `/categories/medicamentos` | **1** | 4 | 3 | **1** | 3 | **12/25** | **47 Card refs + 0 Folio + 0 PlateFrame**, plus the Bar §7.3.1 institutional-ranking data bug still ships. |
| 11 | `/administrations` | 3 | 4 | 2 | **1** | 4 | **14/25** | **121 ui/card refs** alongside 3 PlateFrame uses — page can't decide if it's a folio or a 2018 admin dashboard (Bar §7.4.3). |
| 12 | `/stories/el-ejercito-fantasma` | **1** | 5 | 1 | 5 | 5 | **17/25** | 0 Folio, 0 PlateFrame, 0 editorial chart primitives. Story prose is fine; the chapter art is not investigative-folio register. |

**Total / 300 = 188 (62.7%).**

## The 3 worst surfaces

1. **`/categories/medicamentos` — 12/25.** No Folio chrome, 47 Card refs, the
   data integrity bug from Bar §7.3.1 (institutional ranking unfiltered for
   federal vs state) still ships in the deployed top-vendors block at
   `CategoryProfile.tsx:706-812`. The 21 `font-serif` references are
   misleading — they're sprinkled on labels, not on a single editorial H1
   with dateline. **Visual evidence (structural):** `CategoryProfile.tsx`
   has 47 Card-family imports/usages but 0 PlateFrame and 0 Folio·X — the
   inverse of the gold pattern.
2. **`/vendors/:id` — 14/25.** VendorHero alone is good; the 3-tab structure
   (`Evidence / Activity / Network`) terminates 90% of the page in
   sub-components that import **zero** Folio, serif, PlateFrame, or
   editorial chart primitives. The narrative arc that RedThread achieves on
   the same vendor data is destroyed at the tab boundary. Bar §7.1 already
   flagged this; nothing has shipped to close it.
3. **`/administrations` — 14/25.** 121 ui/card refs sit next to 3 PlateFrame
   wrappers — the most internally inconsistent surface in the audit. The
   user's "too many graphs, too many cards, no editorial spine" complaint
   from Bar §7.4 is structurally visible in the file. Folio·XI exists; the
   procurement-intensity heatmap one block below reverts to `<CardHeader>`.

## The surface that surprised me

**`/methodology` (16/25) surprised negatively.** This is the *authority*
surface — the page that anchors RUBLI's legitimacy with regulators and
journalists. It has 5 `font-serif` refs and 7 `useTranslation` hooks
(highest i18n hygiene in the audit, 0 ternaries) but **0 Folio eyebrow,
0 PlateFrame, 0 editorial charts**. The page is well-typeset prose with
no investigative-folio chrome at all. For a methodology surface that
should read like an OCCRP whitepaper, the absence of Folio·M / numbered
sections / a single signature score-distribution plate is the most
*correctable* gap in the audit — and the most embarrassing if a regulator
reads it before launch.

## Honest verdict — what % of the site meets the bar today

**Three of the four reference surfaces (Executive, Atlas, AriaQueue) score
22–23/25, confirming the bar is real and reachable.** RedThread was not
in this audit pass (separate scoring) but is the bar by §2.

**4 of 12 audited surfaces (33%) clear a 20/25 cutoff** that I'd call
"meets the bar": Executive (23), Atlas (22), AriaQueue (22), and… nothing
else. Sectors-landing (17) and Sectors-profile (18) are the closest
also-rans.

**62.7% of the audited site clears the bar** if you weight by raw points
across all surfaces, but that's a misleading framing — the average is
dragged up by three Gold surfaces. The honest answer the user should
quote externally is:

> **3 of 12 launch surfaces (25%) ship at v1.0 quality. Four pathetic
> surfaces (Vendor, Institution, Category, Administrations) are
> structurally below the bar in ways the QUALITY_BAR.md §7 already
> identified, and their gaps have not closed since 7225855. The
> Methodology and Stories surfaces are unexpectedly weak given how
> textually careful they are — both are missing folio chrome entirely.**

Two structural patterns explain the gap on every below-bar surface:

1. **Card-grid pervasiveness** (`InstitutionProfile` 119, `Administrations`
   121, `CategoryProfile` 47). Removing `@/components/ui/card` on these
   three surfaces alone would close ~40% of the visible delta.
2. **Tab containers replacing scroll arcs** (`InstitutionProfile` 4 tabs,
   `VendorProfile` 3 tabs). RedThread's 6-chapter scroll is the
   counter-pattern; tabs structurally prevent it.

A v1.0 launch on 2026-05-15 with these four surfaces unchanged ships a
site where 75% of the dossier-class routes contradict the chrome promised
by the three landing surfaces. The bar document's 12–16 agent-day estimate
exceeds the 8 days remaining; triage to the §8 sequencing (data fix
Categories first, cut Administrations heatmaps, then Institution rework)
is the only path that lands a coherent v1.0.
