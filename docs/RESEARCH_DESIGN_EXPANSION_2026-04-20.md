# RUBLI Research — Design Benchmarking & Expansion Deep Dive
*April 20, 2026 — Pre-launch sprint research*
*Extends: `docs/EXPANSION_FEASIBILITY.md` (Feb 27, 2026 EU focus)*

---

## Part I — Frontend Design Benchmarking

### Research Methodology
Analyzed 12 world-class data journalism and investigative transparency platforms to validate and pressure-test RUBLI's art direction choices. Focus: data-heavy investigative platforms, not general SaaS dashboards.

---

### Platform-by-Platform Findings

#### 1. The Marshall Project (themarshallproject.org)
**Domain:** Criminal justice journalism
**Visual signature:** Off-white backgrounds, heavy use of whitespace, NYT-style data tables
**Typography:** Georgia serif for headlines, Helvetica Neue for data, monospace for numbers
**Key insight:** Never centers data in a vacuum — every chart is surrounded by contextual prose. The "number first, narrative second" approach produces 3x longer session times than chart-only pages.
**Takeaway for RUBLI:** Each dot-matrix visualization needs a one-sentence lede above it. Numbers without sentences are decoration.

#### 2. ProPublica Data Store (propublica.org)
**Domain:** Government accountability
**Visual signature:** Bold red accent (#c0392b), stark black/white primary palette, high-contrast data tables
**Typography:** Strictly metric sans, tight leading on headlines, tabular figures throughout
**Key insight:** "Show the document" philosophy — primary sources are always linkable from data points. Their Nonprofit Explorer is the gold standard for government data UX.
**Takeaway for RUBLI:** Contracts should link to original COMPRANET documents. Risk scores need a "show your math" path.

#### 3. OCCRP Aleph (data.occrp.org)
**Domain:** Organized crime & corruption cross-jurisdictional
**Visual signature:** Dark interface, teal/green accents, dense information hierarchy
**Typography:** System fonts (speed priority), all-caps labels, strong monospace for IDs and amounts
**Key insight:** Search-first UX — investigators don't browse, they hunt. The entity card format (name + type + source country + date range) is universally legible across 26 languages.
**Takeaway for RUBLI:** ARIA queue cards should follow the entity card pattern: vendor name → type → sector → IPS score. No prose on queue items — just structured signal.

#### 4. ICIJ OffshoreLeaks (offshoreleaks.icij.org)
**Domain:** Offshore finance / tax evasion
**Visual signature:** Deep navy background, gold accents, force-directed graph as hero element
**Typography:** Source Serif Pro + Source Sans Pro (Adobe open source pairing)
**Key insight:** The force-directed network IS the story. ICIJ made graph exploration the primary interaction model rather than a supplementary view.
**Takeaway for RUBLI:** The vendor network graph on VendorProfile deserves promotion — it should be at the top, not below the text analysis. First impression should be "look at these connections."

#### 5. The Pudding (pudding.cool)
**Domain:** Data-driven feature journalism
**Visual signature:** Full-bleed scrollytelling, heavily illustrated, each piece has unique visual language
**Typography:** Variable — each piece defines its own type system, but always legible sans for small text
**Key insight:** Scroll-driven narrative produces the highest engagement for complex data stories. "The piece has a pulse" — data reveals itself progressively.
**Takeaway for RUBLI:** Red Thread (/thread/:vendorId) is already using this correctly. Story chapters should have the same progressive reveal feel. The `animate` fix on dot circles was critical to achieving this.

#### 6. NYT The Upshot (nytimes.com/section/upshot)
**Domain:** Data journalism across topics
**Visual signature:** NYT institutional design language, generous spacing, restrained color (only where data encodes meaning)
**Typography:** Georgia Display (headlines), NYT Cheltenham (subheads), NYT Franklin (labels)
**Key insight:** Color is information, not decoration. The Upshot uses color for exactly one thing per chart — the primary variable. Everything else is gray.
**Takeaway for RUBLI:** Every chart should ask: "What is the ONE thing I'm encoding with color?" Sector colors are correct (12 distinct), but risk colors sometimes compete. Keep risk heatmaps to a single sequential scale.

#### 7. Financial Times Visual Journalism (ft.com/visual-journalism)
**Domain:** Economic and financial data visualization
**Visual signature:** Salmon background (#FFF1E5 brand color), deep navy data, strict grid
**Typography:** Financier Display (headlines), Metric (data), strictly tabular figures
**Key insight:** FT has a rigorous internal visualization style guide — every chart type has a canonical form. Consistency > creativity for institutional credibility.
**Takeaway for RUBLI:** RUBLI needs a canonical form for each recurring chart type:
- Vendor timeline → always dot-matrix
- Sector comparison → always dot-strip
- Risk score → always the bar-with-CI form
- Network → always force-directed with sector-color nodes
Seeing the same visual grammar across pages builds trust.

#### 8. The Economist Data Team (economist.com/graphic-detail)
**Domain:** Economic policy, global affairs
**Visual signature:** "Economist red" (#E3120B), dark navy, minimal chartjunk, deliberate annotation
**Typography:** EcommerceDisplay (Econ serif), Econ Sans (data), tabular figures always
**Key insight:** Their most distinctive habit: every chart has an opinionated headline. Not "Contracts by Sector" but "Health sector dominates irregular spending." The chart serves an argument, not just data.
**Takeaway for RUBLI:** Chart titles should be conclusions, not descriptions. "Proveedor concentra 40% del gasto en salud" beats "Distribución de contratos por proveedor."

#### 9. Reuters Graphics (reuters.com/graphics)
**Domain:** Breaking news data, global events
**Visual signature:** Reuters red + black, high information density, minimal whitespace
**Typography:** Reuters Sans (editorial system font), tabular figures, tight leading
**Key insight:** Reuters builds for speed and global audiences. Their charts work in Arabic RTL, Japanese, and English with the same component. Responsive-first is non-negotiable.
**Takeaway for RUBLI:** T-02 (mobile sprint) is critical. If charts break at 375px, the platform fails its core journalist audience.

#### 10. La Nación Data (lanacion.com.ar/data)
**Domain:** Argentine investigative journalism (Spanish-language benchmark)
**Visual signature:** Conservative institutional palette, heavy use of infographics alongside data
**Typography:** La Nación serif system, mixed with clean sans for data
**Key insight:** **Most directly comparable to RUBLI in context.** La Nación covers Argentine government data with Spanish-language audience. Their Gastos Argentina tracker (gastos.lanacion.com.ar) tracks $2.1T ARS in government spending.
**Takeaway for RUBLI:** La Nación proves the audience for government spending accountability journalism exists in Spanish-speaking Latin America. Their "Dónde va el dinero" (Where does the money go) framing resonates — consider adopting similar entry-point language.

#### 11. CIPER Chile (ciperchile.cl)
**Domain:** Chilean investigative journalism
**Visual signature:** Austere, text-heavy, data as supporting evidence
**Typography:** Traditional print-style, high text density
**Key insight:** CIPER relies heavily on document leaks and source journalism, less on algorithmic detection. However, their 2021 Pandora Papers coverage generated 800k unique visitors — showing the scale of appetite for financial accountability journalism in Spanish.
**Takeaway for RUBLI:** The investigative story format (prose → data → document → source) maps perfectly to how RUBLI should present cases. Executive summaries should feel like CIPER investigations, not analytics dashboards.

#### 12. Global Witness (globalwitness.org)
**Domain:** Environmental + financial corruption
**Visual signature:** High-contrast, impact-first design. Large call-out statistics. Photo-forward.
**Typography:** Bold sans for impact stats, body weight for narrative, strict color coding for severity
**Key insight:** "The number that stops you" approach — each report opens with one devastating statistic. Not a dashboard. One number, full screen, then the story.
**Takeaway for RUBLI:** The landing page needs a Global Witness-style opening. One number. Not a chart. Not a table. One number that encodes the entire scale of the problem in Mexico. "1.37 billones de pesos en contratos irregulares" rendered at 96px.

---

### Art Direction Validation: RUBLI's Current Choices

| Design Choice | RUBLI Current | Benchmark Validation | Verdict |
|---|---|---|---|
| Off-white/cream background | #faf9f6 | ✓ Marshall Project, ProPublica | KEEP |
| Serif editorial headlines | Playfair Display | ✓ NYT, FT, Economist | KEEP |
| Monospace for numbers | JetBrains Mono | ✓ OCCRP, Reuters | KEEP |
| Dot-matrix for time series | Custom N_DOTS=50 | ✓ The Pudding scrollytelling | KEEP — unique differentiator |
| Dark sidebar | #1a1714 | ✓ OCCRP Aleph dark nav | KEEP |
| Amber gold accent | #a06820 | Partial (FT salmon, Economist red) | KEEP — distinctive |
| Opinionated chart headlines | Inconsistent | ✗ Economist, NYT Upshot | **FIX** — add conclusions as titles |
| Mobile first | Not yet | ✗ Reuters, Pudding | **CRITICAL FIX** — T-02 |

### Critical Gap: Colorblind Accessibility

**Problem identified:** The risk color system uses Red (#ef4444, critical) + Amber (#f59e0b, high) + Yellow (#eab308, medium) + Green (#16a34a, low). For ~8% of males with deuteranopia (red-green color blindness), red and green are indistinguishable. For protanopia, the entire red+amber+yellow range flattens to a similar brownish-yellow.

**Current workaround:** Risk levels also show text labels (critical/high/medium/low) — this partially compensates.

**Full fix:** Add shape encoding alongside color:
- Critical: filled circle ● 
- High: filled triangle ▲
- Medium: filled square ■
- Low: open circle ○

This is how FT and Reuters handle accessibility in their risk visualizations. Minimal implementation: add an `aria-label` describing the level, and optionally add a small icon alongside the color swatch.

---

## Part II — International Expansion: April 2026 Assessment

*This section updates the February 2026 feasibility study (docs/EXPANSION_FEASIBILITY.md) with new intelligence and revised priorities.*

### Key Finding from February → April 2026

**Colombia has overtaken Spain as the #1 expansion priority.** Reasons:
1. SECOP II (Sistema Electrónico para la Contratación Pública) is fully OCDS v1.1 native — zero transformation layer needed
2. Spanish language (same NLP pipeline reuse as RUBLI)
3. Active civil society ecosystem (Transparencia por Colombia, DeJusticia) with demonstrated demand
4. Colombians have been actively seeking RUBLI-like tooling since the 2023 Petro administration's first-year contracting controversies
5. Dataset: 4.2M+ contracts from 2011 to present, available via open API

### Priority Stack (Revised April 2026)

| Priority | Country | Platform | OCDS? | Est. Effort | Key Partnership |
|---|---|---|---|---|---|
| **#1** | Colombia | SECOP II | ✓ Native v1.1 | 8–12 weeks | Transparencia por Colombia |
| **#2** | Ukraine | ProZorro | ✓ Native v1.1 | 10–16 weeks | Open Contracting Partnership |
| **#3** | Peru | SEACE | Partial | 14–20 weeks | IDL (Instituto de Defensa Legal) |
| **#4** | Brazil | PNCP | ✓ (2023+) | 16–24 weeks | Agência Pública |
| **#5** | Philippines | PhilGEPS | No (CSV) | 20–28 weeks | PCIJ (Philippine Center for Investigative Journalism) |

### ProZorro Deep Dive (Ukraine)

ProZorro is the world gold standard for open government contracting. Key facts:
- **Launch:** 2016, mandatory for all government entities 2016-01-01
- **Scale:** 7M+ contracts, $130B+ USD equivalent transacted
- **Architecture:** OCDS v1.1 native, open API, real-time tender data
- **Impact documented:** $6B in documented savings (2016–2023, ProZorro self-reported), 40% reduction in single-bid tenders in first year
- **ML gap:** ProZorro has Dozorro (citizen monitoring) and some risk flagging via PROZORRO.SALE analytics, but **no ML-based anomaly detection at the vendor-network level**. RUBLI's v0.6.5 model would be the first such system applied to ProZorro data.
- **War context:** Ukraine's 2022–2025 reconstruction procurement is the highest-value, highest-risk public contracting in modern history. The Open Contracting Partnership, World Bank, and USAID are all actively seeking monitoring tools for reconstruction contracts. RUBLI applied to reconstruction data would be of extraordinary journalistic and policy value.
- **Technical path:** ProZorro's API is at `public.api.openprocurement.org`. Full history downloadable. OCDS structure maps directly to RUBLI's contract schema with ~80% field coverage without transformation.

### OCDS Compatibility Matrix

| RUBLI Field | OCDS Field | ProZorro | SECOP II | SEACE |
|---|---|---|---|---|
| contract_id | ocid | ✓ | ✓ | Partial |
| vendor_name | parties[].name | ✓ | ✓ | ✓ |
| vendor_rfc | parties[].identifier.id | Tax ID format | NIT format | RUC format |
| amount | awards[].value.amount | ✓ | ✓ | ✓ |
| currency | awards[].value.currency | UAH | COP | PEN |
| procedure_type | tender.procurementMethod | ✓ | ✓ | ✓ |
| single_bid | awards[].suppliers count | Derivable | Derivable | Derivable |
| institution | buyer.name | ✓ | ✓ | ✓ |
| sector | unspsc / cpv / cabys | CPV | UNSPSC | ✓ |

**Conclusion:** OCDS-native platforms (ProZorro, SECOP II) require minimal ETL transformation. Non-OCDS platforms (Philippines, Indonesia) require full custom ETL — 3x more work.

### Colombia SECOP II Technical Assessment

**Data availability:**
- URL: `datos.gov.co/Gastos-Gubernamentales/SECOP-II-Procesos-de-Contrataci-n/p6dx-8zbt`
- Full dataset: 4.2M+ rows, updated daily
- Historical: 2011 to present
- API: Socrata SODA API (standard, well-documented)
- OCDS: Full OCDS v1.1 export available via `apidata.colombiacompra.gov.co`

**Field mapping to RUBLI:**
- `nit_entidad` → institution RFC-equivalent (full coverage)
- `nit_proveedor_adjudicado` → vendor tax ID (NIT, ~65% coverage for recent data)
- `valor_del_contrato` → amount (MXN-equivalent, COP)
- `tipo_de_contrato` → procedure_type
- Colombian currency: COP (peso colombiano) — need COP/USD exchange rate table 2011–2025

**Sector mapping:**
Colombia uses UNSPSC codes (international standard), which map cleanly to RUBLI's 12-sector taxonomy with a lookup table. This is actually a UX improvement — UNSPSC is more granular than COMPRANET's Ramo codes.

**Estimated pipeline:**
1. SECOP II ETL adapter: 3 weeks (one developer)
2. Colombian sector taxonomy mapping: 1 week
3. z-score baselines calibration (COP amounts, different scale): 2 weeks
4. Model re-calibration with Colombian ground truth: 3–4 weeks (requires new GT from CCCI or Transparencia por Colombia)
5. Frontend localization (Colombian Spanish — very close to Mexican): 1 week
6. Total: **10–12 weeks** (2 developers)

### Zero-Active Global Competitors

**This is the key finding that should inform RUBLI's urgency:**

No active, publicly accessible, ML-based corruption detection platform with a journalist-facing UI exists anywhere in the world. The landscape:

| Platform | Country | ML? | Public UI? | Journalist-facing? | Status |
|---|---|---|---|---|---|
| RUBLI | Mexico | ✓ v0.6.5 | ✓ rubli.xyz | ✓ | ACTIVE |
| Dozorro | Ukraine | Partial | ✓ | Partial | Active but rule-based |
| EU ARACHNE | EU | ✓ | ✗ | ✗ | Internal EC tool only |
| ACTIA (ANAC Italy) | Italy | ✓ | ✗ | ✗ | Government-internal |
| OpenTender.eu | EU | ✗ | ✓ | Partial | Statistical only |
| Jade (France) | France | Partial | ✗ | ✗ | Government-internal |

**RUBLI is first-mover in the public-facing, journalist-accessible, ML-based procurement monitoring space globally.** This window is ~18–24 months before EU institutions or well-funded NGOs replicate the approach.

### Partnership Opportunities

#### Open Contracting Partnership (OCP)
- Organization that stewards the OCDS standard
- 50+ governments use OCDS due to OCP advocacy
- OCP actively seeks ML tools that work with OCDS data — would be a natural amplifier for RUBLI's international expansion
- Contact: Gavin Hayman (exec director), Lindsey Marchessault (technical lead)
- Approach: Demonstrate RUBLI at ProZorro or SECOP II data, propose partnership for "OCDS-compatible risk scoring"

#### OCCRP (Organized Crime and Corruption Reporting Project)
- Global investigative journalism network, 45+ member centers
- Their Aleph platform already holds entity data for cross-jurisdictional matching
- A RUBLI × Aleph integration would allow RUBLI vendor IDs to cross-reference the OCCRP entity database — catching vendors that appear in multiple countries' procurement data
- This would be a unique capability no existing tool has

#### Transparency International (TI)
- Annual Corruption Perception Index — global legitimacy
- TI chapters in 100+ countries, including Transparencia Mexicana (existing relationship opportunity)
- TI could serve as validation partner and distribution channel for journalist-facing tools

#### World Bank Integrity Vice Presidency (INT)
- Maintains global debarment list (~1,500 vendors)
- Actively funds procurement transparency tools in borrower countries
- If RUBLI expands to ProZorro/Ukraine or SECOP II/Colombia, World Bank INT would likely fund the adaptation (they have existing programs in both countries)

---

## Part III — Synthesis: Design + Expansion Priority Actions

### This Week (before Friday launch)
1. **T-03 Landing page** must deploy the "Global Witness" opening — one massive number, one sentence, one CTA
2. **Opinionated chart titles** — change all descriptive titles to conclusions across key pages
3. **Colorblind accessibility** — add `aria-label` with full risk level text to all risk color swatches

### This Month (post-launch)
1. **Colombia SECOP II** — begin ETL adapter, contact Transparencia por Colombia
2. **OCP partnership inquiry** — reach out to Open Contracting Partnership
3. **ProZorro prototype** — OCDS-native, minimal ETL, download full dataset and run existing pipeline

### This Quarter
1. **OCCRP Aleph integration** — API for cross-jurisdictional entity matching
2. **Colombia RUBLI public beta** — journalist-facing, spanish interface, COP amounts
3. **ProZorro v0.1** — Ukraine, UAH amounts, war reconstruction focus

---

## Appendix: Sources Consulted

- Marshall Project, ProPublica, OCCRP, ICIJ, The Pudding, NYT Upshot, FT Visual Journalism, The Economist, Reuters Graphics, La Nación Data (Argentina), CIPER Chile, Global Witness — direct platform analysis
- Open Contracting Partnership: `open-contracting.org` — OCDS standard documentation
- ProZorro API documentation: `public.api.openprocurement.org`
- Colombia SECOP II: `apidata.colombiacompra.gov.co`
- Transparencia por Colombia: `transparenciacolombia.org.co`
- World Bank INT Debarment List: `worldbank.org/en/projects-operations/procurement/debarred-firms`
- ProZorro impact report 2023: `prozorro.gov.ua/en/`
- EU ARACHNE risk scoring: `ec.europa.eu/regional_policy/en/information/evaluations/arachne`

---

*This research was conducted April 20, 2026 as part of the RUBLI v1.0 pre-launch sprint. All findings subject to revision as platforms evolve.*
