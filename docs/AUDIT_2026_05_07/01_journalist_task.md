# Audit 01 — Journalist Task

Reporter: Animal Político · Subject: Vitalmex (Cártel del Corazón) · Site: https://rubli.xyz · Browser: Playwright/Chromium · Time on task: ~18 min.

## First impressions (30s)
Homepage is a long executive briefing. Headline: "MX$9.9 trillion in federal contracts. Three out of four awarded without competition." Subhead claims "trained on 1,363 documented corruption cases." Reads like a glossy magazine cover, not a query interface. Nothing on-screen tells me how to find a specific vendor — no visible search box, just a "⌘K" hint. The model version is stated as **V0.8.5** in the dateline. (Screenshot `screenshots/01_home.png`.)

## Path to Vitalmex
1. ⌘K opened a palette — but typing did nothing on the homepage. Pressing the letter "v" silently navigated me to `/aria` (a one-letter shortcut hijacked my search). `screenshots/03_search_vitalmex.png`.
2. Tried `/api/v1/vendors/search?q=vitalmex` → **502 Bad Gateway**. The user-facing search endpoint is dead. (Console log shows the 502.)
3. Found the right endpoint by guessing: `/api/v1/search?q=vitalmex` → returned `{id: 4325, name: "VITALMEX INTERNACIONAL, S.A. DE C.V.", contracts: 999, risk_score: 0.91}`.
4. Navigated to `/vendors/4325`. Page renders, then **the entire site auto-rotates every ~3 seconds** through unrelated pages: vendor → atlas → patterns → institutions → methodology → a story. I could not hold the Vitalmex page open long enough to read it. `screenshots/06_vendor4325_immediate.png`, `07_vitalmex_actual.png`.
5. Tried singular `/vendor/4325` (typo). It silently redirected to a different vendor — Repsol id 29819. No 404, no warning.

## What I could find / what I couldn't
- **Vitalmex contract value 2010–2024 from IMSS:** could not find. The contracts API returns max 50 rows regardless of `limit=5000`, all from 2025. No aggregate-by-institution-and-year endpoint surfaced. Only summable: 50 contracts, MX$1.38B; of those 42 are IMSS, MX$696M — but this is a 50-row sample of a 999-contract vendor, not the answer.
- **Cártel del Corazón case:** does not exist. `/api/v1/cases?limit=2000` returns **43 cases**, none mention "corazón", "cártel del corazón", "cardíaco", or Vitalmex. The home claim "1,363 documented corruption cases" and CLAUDE.md's "1,401 cases" cannot be reconciled with 43 visible to the API.
- **Vitalmex case linkage:** the vendor profile says "Documentado en 3 caso(s)". The page below that lists all 43 generic cases (Línea 12, Tren Maya, Casa Blanca…). No filter to the 3.
- **`/api/v1/cases?vendor_id=4325`** returns identical results to `/api/v1/cases` — the filter is silently ignored.
- **Methodology / T1 priority:** never reached the page; the carousel kept moving.
- **URL share state:** `/stories/el-ejercito-fantasma` and others have no query params. Nothing about chapter, year, lens, or scroll position is in the URL. Useless to share.
- **Language toggle:** clicking EN navigated me away to `/stories/el-ejercito-fantasma` instead of switching language. The session was already mixed: ES strings ("Saltar al contenido principal", "INICIAR SESIÓN") next to EN ("Generate Report", "LIVE", "Vendor Profile" breadcrumb). Bilingual is broken in both directions.

## What broke trust (severity-ranked)
1. **Auto-rotating page carousel.** Every page ejects me to a different page after a few seconds. I cannot read a vendor profile. Killer for any reporter on deadline. (Screenshots `04`, `06`, `07`.)
2. **The "Cártel del Corazón" case isn't in the database.** Cases endpoint returns 43, not 1,363/1,401. Either the homepage number is fabricated, or only 3% of "training cases" are actually exposed.
3. **Vendor profile says "documented in 3 cases" then displays 43 unrelated cases.** No filter, no link from the chip to the actual three. Trust-killer for an investigation page.
4. **`/api/v1/cases?vendor_id=4325` filter is silently ignored.** Returns the global list. Any UI that reads from it is showing wrong-by-design data.
5. **Model version mismatch:** vendor page says "modelo v0.6.5" while the home dateline says "MODEL V0.8.5". CLAUDE.md confirms v0.8.5 is active — the vendor copy is stale.
6. **`/vendor/4325` (singular) silently routes to Repsol (id 29819).** No 404. A URL-edit typo lands you on a different vendor with a different industry. Citation poison.
7. **Top-bar search 502s.** `/api/v1/vendors/search?q=…` returns Bad Gateway. The on-page palette doesn't accept input on the homepage.
8. **Risk language overreaches in places.** Vendor margin note: "Puntaje de riesgo crítico (91/100) — mayor similitud con patrones de corrupción documentados". The 91/100 numeric score, framed as "criticality", reads as a corruption probability — exactly what your own house style says to avoid.
9. **No URL state.** Stories, dossiers, atlas — nothing serializes lens/year/chapter into the querystring. Sharing a finding with a colleague means screenshot, not link.
10. **Language toggle button hijacked by the carousel.** Clicking EN navigated, not toggled.

## Would I cite this in my piece?
**No.** I have one number I trust (Vitalmex IMSS contracts in 2025, MX$696M, from a 50-row API sample) and dozens I cannot verify because the UI ejects me before I can read it. The "Cártel del Corazón" case I came to investigate is not in the documented cases, despite the homepage claim of 1,363. Citing the platform would mean staking my piece on numbers the platform itself cannot hold still long enough to display.

## What ONE fix would change my answer
**Stop the auto-rotation on `/vendors/:id`.** If the vendor profile would simply stay on screen, I could read the case linkage, the contracts panel, the risk factors, the timeline. Everything else in this audit (filter bug, model-version drift, missing cases) becomes a follow-up question. Right now the page literally will not let me read it.
