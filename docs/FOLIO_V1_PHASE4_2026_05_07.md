# RUBLI Folio v1 — Phase 4 plan

> Three-Agent Harness · Planner artifact (Opus 4.7)
> Date: 2026-05-07
> Surfaces: `/administrations`, `/captura`, `/intersection`, `/network`
> Aesthetic source: `.claude/skills/rubli-folio-aesthetic/SKILL.md`
> Budget: ~1.5–2 hours; ship 80% on all 4 ahead of perfecting 2.

---

## 0. Phase 4 brief

Phase 4 covers the **comparison-heavy analysis surfaces** — pages
where the visual job is "compare entities side by side" rather than
"explore one dossier in depth." All four surfaces are reading-heavy
(invite contemplation, not action), so per the skill decision tree
they all earn **PlateFrame around the principal data section** plus
**paper-grain page atmosphere**.

Hero pattern across all four: collapse the existing utility/editorial
header into the **Folio·N hero** — IBM Plex Mono italic 300/500
eyebrow + EB Garamond italic 500 + 600 ochre fragment headline +
68ch body lede. The current pages already have a header pattern
("`text-xl sm:text-2xl font-bold` + `text-[10px] font-mono uppercase`"
eyebrow + 3 inline anchor stats). The Phase 1b precedent (Executive,
VendorProfile) shows how to swap the typography without touching the
data layer or the inline anchor stats.

---

## 1. Surface 1 — `/administrations` (Administrations.tsx, 3,585 LOC)

**Folio numeral**: Folio·XI · Administrations
**Named precedent**: NYT Upshot — *How Trump's Picks Compare to Past
Cabinets* multi-administration grouped comparison; FT Visual
Vocabulary small multiples for the per-admin radar/fingerprint grid.

### Hero replacement

L1092–1118 (the deliberately-collapsed "utility header") gets
replaced by the **Folio·XI hero**. Keep the 3 anchor stats
(Administrations · Total spend · Contracts) inline at the right
of the hero — they're load-bearing.

ES title: *Seis administraciones, <ochre>un solo patrón.</ochre>*
EN title: *Six administrations, <ochre>one pattern.</ochre>*

ES eyebrow: `Folio·XI · Análisis sexenal · 2002–2025`
EN eyebrow: `Folio·XI · Cross-administration analysis · 2002–2025`

ES lede: *Cinco gobiernos federales, tres partidos, una métrica
constante: la adjudicación directa permanece sobre el techo OCDE
en cada sexenio. La lámina central muestra la huella de cada
administración a lo largo de las mismas seis dimensiones.*

EN lede: *Five federal administrations, three parties, one
constant: the direct-award rate stays above the OECD ceiling under
every term. The plate below shows each administration's fingerprint
across the same six dimensions.*

The second header at L1121–1171 (the "EDITORIAL MASTHEAD" with
animated pulse + serif h1) is **left alone** in Phase 4 — touching
it cascades into 8+ tabs of state. Acceptable Phase 4 cost: there
is briefly a "two heroes" effect on initial page-load. Phase 5 can
unify them.

### PlateFrame application

The flagship multi-admin comparison is `<AdministrationFingerprints />`
at L1467 — the radar-fingerprint grid. Wrap that one component in
PlateFrame with caption:

ES: *Lámina — Seis dimensiones, cinco huellas presidenciales.
La participación adjudicada directamente, los proveedores únicos,
la concentración de gasto y el riesgo medio se grafican sobre un
eje común. La forma de cada radar es la "huella" de la
administración.*

EN: *Plate — Six dimensions, five presidential fingerprints.
Direct-award share, single-bidder share, spend concentration and
mean risk are plotted on a shared axis. Each radar's shape is the
administration's fingerprint.*

Folio override: `XI`. Context override: `Administrations atlas` /
`Atlas de administraciones`.

### Paper-grain

YES — this is a contemplative comparison surface. Apply the SVG
fractalNoise overlay at the top-level page wrapper (around the
existing `<div className="min-h-screen bg-background">` at L1084).
Pattern: same as Executive / Atlas, opacity 0.045, mixBlendMode
multiply, pointer-events none, zIndex 0; content wrapped in
`<div className="relative" style={{ zIndex: 1 }}>`.

---

## 2. Surface 2 — `/captura` (CaptureCreep.tsx, 245 LOC)

**Folio numeral**: Folio·XII · Capture
**Named precedent**: ICIJ Pandora Papers entity-flow (institution
→ vendor); each row is a publishable institutional-capture story.

### Hero replacement

L166–191 (the existing utility header) gets replaced by the
**Folio·XII hero**. Keep the 3 anchor stats (Captures · Captured
value · Largest jump).

ES title: *Cómo un proveedor <ochre>captura</ochre> una
institución.*
EN title: *How a vendor <ochre>captures</ochre> an institution.*

ES eyebrow: `Folio·XII · Captura institucional · 2018–2025 · 25%
→ 50% · ≥4 años`
EN eyebrow: `Folio·XII · Institutional capture · 2018–2025 · 25%
→ 50% · ≥4 years`

ES lede: *Cada fila es una concentración monótona: el proveedor
empezó por debajo del 25% del gasto de la institución y terminó
por encima del 50%, año tras año, durante al menos cuatro años.
El ascenso no es prueba de irregularidad — pero la geometría es
publicable.*

EN lede: *Each row is a monotonic concentration: the vendor began
below 25% of the institution's spend and ended above 50%, year
after year, for at least four years. The climb is not proof of
wrongdoing — but the geometry is publishable.*

### PlateFrame application

The principal data section is the ranked list of capture rows at
L214–223. Wrap that single `<div>` in PlateFrame.

ES caption: *Lámina — Las concentraciones monótonas más grandes
de proveedor → institución, 2018–2025. El ancho de la chispa
muestra los años observados; los puntos rojos marcan años con
participación ≥ 50%.*

EN caption: *Plate — The largest monotonic vendor → institution
concentrations, 2018–2025. Sparkline width shows observed years;
red dots mark years at ≥ 50% share.*

Folio override: `XII`. Context override: `Capture atlas` / `Atlas
de captura`.

### Paper-grain

YES — capture creep is reading-heavy / contemplative.

---

## 3. Surface 3 — `/intersection` (Intersection.tsx, 394 LOC)

**Folio numeral**: Folio·XIII · The Intersection
**Named precedent**: FT Visual Vocabulary dumbbell (the page IS a
dumbbell-style comparison: model vs regulators, two states per
quadrant).

### Hero replacement

L223–269 (the existing utility header) gets replaced by the
**Folio·XIII hero**. Keep the 3 anchor stats (Novelty · Confirmed ·
Blind spot).

ES title: *El modelo señala lo que <ochre>los reguladores
todavía no.</ochre>*
EN title: *The model flags what <ochre>regulators don't yet.</ochre>*

ES eyebrow: `Folio·XIII · La intersección · RUBLI vs reguladores`
EN eyebrow: `Folio·XIII · The intersection · RUBLI vs regulators`

ES lede: *Tres cuadrantes triangulan dos métodos independientes:
el patrón cuantitativo del modelo y el registro oficial de los
reguladores. Donde divergen — proveedores que un método ve y
el otro no — está la materia prima de una investigación.*

EN lede: *Three quadrants triangulate two independent methods: the
model's quantitative pattern and the regulators' official register.
Where they diverge — vendors that one method sees and the other
does not — is the raw material of an investigation.*

### PlateFrame application

The three QuadrantCard sections are independent investigation
plates. The cleanest framing is **a single PlateFrame around the
trio** (the trio reads as one plate of "where the methods agree
and disagree"). The methodology caveat banner at L291–304 stays
above the PlateFrame; the methodology footer at L373–388 stays
below.

ES caption: *Lámina — Tres cuadrantes RUBLI × reguladores.
Novedad: alto riesgo del modelo, sin marca externa. Confirmado:
ambos métodos coinciden. Punto ciego: el modelo no detecta lo
que el regulador sí registró.*

EN caption: *Plate — Three RUBLI × regulator quadrants. Novelty:
high model risk, no external mark. Confirmed: methods agree.
Blind spot: model misses what the regulator registered.*

Folio override: `XIII`. Context override: `Intersection atlas` /
`Atlas de la intersección`.

### Paper-grain

YES — pitch / contemplation surface, not an action queue.

---

## 4. Surface 4 — `/network` (RedesKnownDossier.tsx, 1,235 LOC)

**Folio numeral**: Folio·XIV · The Invisible Network
**Named precedent**: OCCRP / ICIJ shell-company flow diagrams; the
Nucleos cluster + FlowParticle Sankey are exactly that vocabulary.

### Hero replacement

L1066–1122 (the existing "Editorial header") gets replaced by the
**Folio·XIV hero**. The current h1 uses FONT_SERIF font-black; we
swap to EB Garamond italic 500 with a 600-weight ochre fragment
on `Invisible` / `invisible`. The amber stat strip at L1109–1121
("10 communities control MX$1.40T") stays as the inline anchor —
it's already in the right voice.

ES title: *La <ochre>red invisible.</ochre>*
EN title: *The <ochre>invisible</ochre> network.*

ES eyebrow: `Folio·XIV · Inteligencia de red · ARIA + Louvain`
EN eyebrow: `Folio·XIV · Network intelligence · ARIA + Louvain`

ES lede: *No buscamos proveedores corruptos uno por uno.
Buscamos comunidades que capturan instituciones. Estas son las
diez redes más grandes detectadas por el algoritmo de Louvain
sobre 3.1M contratos federales.*

EN lede: *We do not hunt corrupt vendors one by one. We hunt
communities that capture institutions. These are the ten largest
networks detected by the Louvain community algorithm over 3.1M
federal contracts.*

### PlateFrame application

The flagship is **Act I — `<Nucleos>`** (the SVG cluster of
communities) at L1137. Wrap that component in PlateFrame.

ES caption: *Lámina — Diez núcleos de redes vendedoras.
El tamaño del círculo es proporcional al valor capturado;
el color codifica el patrón ARIA dominante.*

EN caption: *Plate — Ten cores of vendor networks. Circle size
is proportional to captured value; color encodes the dominant
ARIA pattern.*

Folio override: `XIV`. Context override: `Network atlas` / `Atlas
de redes`.

### Paper-grain

YES — Network intelligence reads as an investigative atlas, the
dominant Phase 4 contemplation surface.

---

## 5. Per-surface BUILD_ID

| Surface | BUILD_ID | Commit slug |
|---|---|---|
| Administrations | `2026-05-07-folio-v1-P4-administrations` | `feat(administrations folio-v1-P4):` |
| Captura | `2026-05-07-folio-v1-P4-captura` | `feat(captura folio-v1-P4):` |
| Intersection | `2026-05-07-folio-v1-P4-intersection` | `feat(intersection folio-v1-P4):` |
| Network | `2026-05-07-folio-v1-P4-network` | `feat(network folio-v1-P4):` |

Sequential commits — never two in flight at once because BUILD_ID
in `frontend/src/lib/constants.ts` is single-line and sequential
edits would conflict.

---

## 6. Cover-the-captions self-check

Per skill omega rule: cover all the new captions and PlateFrame
chrome. Does the page still look meaningfully different than before?

- **Administrations**: yes — the radar-fingerprint section gets
  archival framing it lacked, and the hero typography shifts from
  `font-bold tracking-tight` (default sans) to EB Garamond italic
  serif. Geometry change: the radar is now a *plate*, not a card.
- **Captura**: yes — the ranked capture rows go from a flat list
  inside `surface-card` chrome to a **plate** with crop marks +
  archival index + italic caption. The sparklines themselves are
  unchanged; the surrounding chrome is what shifts.
- **Intersection**: yes — three quadrant cards stop reading as
  three independent UI cards and start reading as **one plate of
  three quadrants**, like an FT/NYT comparison spread.
- **Network**: yes — the Nucleos cluster gets corner crop marks +
  italic caption that frame it as the **archival map plate** the
  Louvain output already wants to be.

All four pass.

---

## 7. Ship checklist (per surface)

Per `rubli-folio-aesthetic` § "five-step ship checklist":

1. New files staged before gates (none new this phase — all in-place
   edits).
2. Run all four gates from `frontend/`:
   - `node_modules/.bin/tsc --noEmit -p tsconfig.app.json`
   - `node_modules/.bin/tsc --noEmit`
   - `npm run lint:tokens`
   - `npm run build`
3. Bump BUILD_ID per surface (table above).
4. Bilingual audit — grep `lang === 'es'` and `lang === 'en'`
   counts; check `isEs ?` for /network.
5. Cover-the-captions test — re-confirmed in §6.

---

*End planner doc.*
