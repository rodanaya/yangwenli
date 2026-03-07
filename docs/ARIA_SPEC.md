# ARIA: Automated Risk Investigation Algorithm

**Version:** 1.0 Draft | **Author:** Risk Model Engineer | **Date:** 2026-03-07
**Status:** Design Specification -- Not Yet Implemented

---

> *The duty of a soldier is to protect, not to kill. To save, not to destroy.*
> ARIA exists to focus scarce investigative resources on the procurement patterns most likely to represent genuine corruption, while filtering out the noise.

---

## Table of Contents

1. Executive Summary
2. Architecture Overview
3. Module 1: Investigation Priority Score (IPS)
4. Module 2: Pattern Classifier
5. Module 3: Intermediary Detection Algorithm
6. Module 4: Temporal Anomaly Detection
7. Module 5: External Cross-Reference Engine
8. Module 6: False Positive Screening
9. Module 7: Evidence Synthesis and LLM Integration
10. Module 8: Ground Truth Auto-Update
11. Module 9: Data Quality Watch
12. Database Schema
13. API Endpoints
14. Implementation Roadmap
15. Validation Strategy
16. Known Limitations

---

## 1. Executive Summary

### Problem

RUBLI currently provides four independent risk signals per contract/vendor:

| Signal | Source | Strength | Blind Spot |
|--------|--------|----------|------------|
| risk_score (v5.1) | Logistic regression, 16 z-features | Best for concentrated monopoly patterns | Fails on low-concentration vendors (single-use intermediaries, ghost companies) |
| mahalanobis_distance | Chi-squared multivariate anomaly | Catches extreme multivariate outliers | No directional information -- high D2 could be benign |
| vendor_shap_v52 | Linear SHAP on per-vendor mean z-vectors | Explains why a vendor scores high/low | Same model blind spots as risk_score |
| ensemble_anomaly_score | IForest + COPOD normalized mean | Unsupervised; catches novel patterns | No corruption-specific calibration; many false positives |

These signals are displayed independently. No system combines them into a unified investigation queue, classifies the type of corruption pattern, cross-references external registries, screens for false positives, or synthesizes evidence into actionable investigation memos.

**UAB JORINIS example** -- the canonical blind spot case:
- risk_score = 0.07 (7%) -- logistic regression sees low vendor_concentration and assigns low risk
- mahalanobis_distance = 706 -- extreme multivariate outlier (p = 4.6e-140)
- Pattern: single-use foreign intermediary, burst of high-value vaccine contracts, disappeared after reform
- A human investigator would immediately flag this; the current system buries it

### Solution

ARIA is a 9-module pipeline that:

1. **Combines** all four signals + external data + financial scale into one Investigation Priority Score (IPS)
2. **Classifies** which corruption pattern type(s) apply using a rule-based classifier grounded in 25 documented cases
3. **Detects** intermediary and burst-then-disappear patterns that the logistic regression misses
4. **Cross-references** SAT EFOS, SFP sanctions, and ASF audit findings
5. **Screens** false positives (patent exceptions, data errors, structural monopolies)
6. **Synthesizes** structured investigation memos via LLM
7. **Auto-updates** ground truth when high-confidence external matches are found
8. **Monitors** data quality post-ETL
9. **Queues** findings for human review in priority order

### Design Principles

- **Deterministic first, LLM second.** Modules 1-6 and 8-9 use deterministic algorithms. Only Module 7 calls an LLM.
- **Human-in-the-loop always.** ARIA generates investigation leads, never verdicts.
- **Incremental deployment.** Each module is independently useful. Phase 1 requires no LLM.
- **Replay-safe.** Running twice on the same data produces identical results (except LLM memo text).

---

## 2. Architecture Overview

### Data Flow

1. **Input**: Vendor-level aggregates from existing tables (contracts, contract_z_features, vendor_shap_v52, contract_anomaly_scores, external registries)
2. **Processing**: All modules run at vendor-level granularity. One finding per (vendor_id, primary_sector_id) pair.
3. **Output**: Rows in aria_queue with IPS, pattern classification, external flags, FP screening result, and optionally an LLM-generated memo.

### Execution Mode

Batch script (python -m scripts.aria_pipeline). Runtime: 5-15 minutes for 3.1M contracts / ~200K vendors. Results served via read-only API endpoints.

Trigger: after ETL ingestion, after model retraining, or on-demand via CLI.

---

## 3. Module 1: Investigation Priority Score (IPS)

### Purpose

Combine heterogeneous risk signals into a single 0-1 score. The IPS must handle the blind spot: a vendor with risk_score=0.07 but mahalanobis=706 must score higher than one with risk_score=0.25 and mahalanobis=20.

### Input Features (per vendor)

| Feature | Source | Range |
|---------|--------|-------|
| avg_risk_score | vendors.avg_risk_score | [0, 1] |
| max_risk_score | MAX(contracts.risk_score) | [0, 1] |
| avg_mahalanobis | AVG(contract_z_features.mahalanobis_distance) | [0, ~1000+] |
| max_mahalanobis | MAX(mahalanobis_distance) | [0, ~1000+] |
| ensemble_anomaly | AVG(contracts.ensemble_anomaly_score) | [0, 1] |
| shap_magnitude | SUM(abs(shap_values)) from vendor_shap_v52 | [0, ~10] |
| total_value_mxn | vendors.total_amount_mxn | [0, ~100B] |
| external_flag_count | Count of EFOS + SFP + ASF matches | [0, ~10] |
| is_efos_definitivo | RFC in sat_efos_vendors stage=definitivo | {0, 1} |

### Step 1: Normalize to [0, 1]

**Mahalanobis normalization**: Logistic transform centered at D2=80 with steepness 1.5.

    normalize_maha(d2) = 1 / (1 + exp(-1.5 * (ln(d2) - ln(80))))
    
    D2=16 -> 0.10, D2=50 -> 0.30, D2=100 -> 0.60, D2=300 -> 0.90, D2=700 -> 0.99

**Financial scale**: Linear in log10, 0 at 10^5, 1 at 10^10.5.

    normalize_financial(v) = clamp((log10(v) - 5.0) / 5.5, 0, 1)

**Ensemble**: score^0.8 (mild nonlinearity to boost moderate values).

**SHAP magnitude**: clamp(shap_mag / 5.0, 0, 1).

### Step 2: Compute IPS

    primary = MAX(risk_score, maha_norm)   # blind spot fix
    
    secondary = 0.30 * max_risk + 0.30 * ensemble_norm + 0.20 * shap_norm + 0.20 * maha_norm
    
    base_ips = 0.60 * primary + 0.40 * secondary
    
    financial_multiplier = 0.5 + financial_norm   # range [0.5, 1.5]
    
    external_boost = min(0.24, external_flags * 0.08)
    efos_boost = 0.15 if is_efos else 0.0
    
    IPS = clamp(base_ips * financial_multiplier + external_boost + efos_boost, 0, 1)

**Design rationale**: MAX(risk_score, maha_norm) ensures either signal dominates. If risk_score is low but mahalanobis extreme, the primary signal reflects the anomaly.

### Step 3: IPS Tiers

| Tier | Range | Action | Expected Volume |
|------|-------|--------|-----------------|
| Tier 1: Investigate | >= 0.70 | Full memo, assign to analyst | ~500-2,000 |
| Tier 2: Review | 0.40-0.70 | Summary card, batch review | ~5,000-15,000 |
| Tier 3: Monitor | 0.20-0.40 | Watchlist only | ~20,000-40,000 |
| Tier 4: Archive | < 0.20 | No action | ~150,000+ |

### Verification Test Cases

| Vendor | risk_score | mahalanobis | total_value | Expected IPS | Tier |
|--------|-----------|-------------|-------------|--------------|------|
| UAB JORINIS (intermediary) | 0.07 | 706 (norm:0.99) | 2B | >= 0.75 | 1 |
| LICONSA (known bad) | 0.98 | 45 (norm:0.25) | 50B | >= 0.85 | 1 |
| Gilead (patent exception) | 0.35 | 30 (norm:0.18) | 500M | ~0.30 | 3* |
| Random small vendor | 0.05 | 12 (norm:0.06) | 1M | < 0.10 | 4 |
| EFOS ghost | 0.15 | 25 (norm:0.15) | 5M | ~0.35 | 2** |

*After FP screening. **With EFOS boost.

### SQL: Vendor Aggregation

    SELECT v.id, v.name, v.rfc, v.total_contracts, v.total_amount_mxn,
        v.avg_risk_score, MAX(c.risk_score) AS max_risk_score,
        AVG(zf.mahalanobis_distance) AS avg_mahalanobis,
        MAX(zf.mahalanobis_distance) AS max_mahalanobis,
        AVG(c.ensemble_anomaly_score) AS avg_ensemble_anomaly,
        MIN(c.contract_year) AS first_year, MAX(c.contract_year) AS last_year,
        (SELECT sector_id FROM contracts WHERE vendor_id = v.id
         GROUP BY sector_id ORDER BY COUNT(*) DESC LIMIT 1) AS primary_sector_id
    FROM vendors v
    JOIN contracts c ON v.id = c.vendor_id
    LEFT JOIN contract_z_features zf ON c.id = zf.contract_id
    WHERE v.total_contracts >= 1
      AND COALESCE(c.amount_mxn, 0) <= 100000000000
    GROUP BY v.id;

---

## 4. Module 2: Pattern Classifier

### Approach: Rule-Based Classifier

**Recommendation: Deterministic rule-based**, not ML. With 25 cases, ML overfits. Cases provide archetypes for rule design. Rules are auditable and adjustable.

### Pattern Taxonomy (7 Types)

| ID | Name | Archetypes | Key Features |
|----|------|-----------|-------------|
| P1 | Concentrated Monopoly | IMSS Ghost, Segalmex, Edenred | vendor_concentration > 0.30, institution_count <= 3 |
| P2 | Ghost Company | EFOS, Estafa Maestra, Decoaro | total_contracts <= 20, direct_award > 0.80, (is_efos OR years_active <= 3) |
| P3 | Single-Use Intermediary | UAB JORINIS | burst_score > 0.7, high_value, disappeared |
| P4 | Bid Rigging | IPN Cartel | co_bid_rate > 0.50, win_rate > 0.70, low price_variance |
| P5 | Overpricing | Cyber Robotic | z_price_ratio > 2.0, industry_mismatch |
| P6 | Institution Capture | Garza Ponce, Cotemar | top_institution_ratio > 0.80, institution_count = 1 |
| P7 | Conflict of Interest | Grupo Higa | External evidence only |

### Classification Rules (Pseudocode)

Each rule produces confidence in [0, 1]. A vendor can match multiple patterns. Minimum confidence threshold: 0.30.

**P1 (Concentrated Monopoly)**: vendor_concentration > 0.50 -> 0.8; > 0.30 -> 0.5; > 0.15 -> 0.2. Boost +0.15 if institution_count <= 3. Boost +0.10 if win_rate > 0.80.

**P2 (Ghost Company)**: is_efos_definitivo -> 0.90. Else: total_contracts <= 20 AND direct_award > 0.80 -> 0.4; years_active <= 3 -> +0.2; no RFC -> +0.15.

**P3 (Single-Use Intermediary)**: burst_score > 0.5 -> confidence = burst_score. (Detail in Module 4.)

**P4 (Bid Rigging)**: co_bid_rate > 0.50 -> 0.4; win_rate > 0.70 -> +0.2; price_variance < P25 -> +0.2; top_cobidder_frequency > 0.60 -> +0.15.

**P5 (Overpricing)**: avg_z_price_ratio > 2.0 -> 0.5; > 1.5 -> 0.3. industry_mismatch > 0.50 -> +0.25. price_hypothesis_count > 3 -> +0.15.

**P6 (Institution Capture)**: top_institution_ratio > 0.80 AND total_contracts > 10 -> 0.6; institution_count = 1 -> 0.8; single_bid > 0.50 -> +0.15.

**P7 (Conflict of Interest)**: Only when external flag exists -> 0.5.

### Acceptance: >= 80% of ground truth vendors correctly classified into primary pattern.

---

## 5. Module 3: Intermediary Detection Algorithm

### Problem

Single-use intermediaries are the primary blind spot. They appear briefly, execute high-value contracts for commodities also supplied by established vendors, then disappear. Vendor_concentration near zero.

### Algorithm

For each vendor with total_contracts <= 50 and activity_span <= 3 years:

1. **Temporal window**: activity_span_days = MAX(date) - MIN(date). Skip if > 1095 days.
2. **Burst characteristics**: value_per_contract, contracts_per_month. Skip if < 2 contracts or < 1M MXN.
3. **Value anomaly**: value_ratio = value_per_contract / sector_median. Skip if < 2.0x.
4. **Product overlap**: Find established vendors (>= 50 contracts) supplying same partida_code to same institution. overlap_score = count / total.
5. **Disappearance**: years_since_last >= 2 -> disappeared.
6. **RFC age**: new company (creation near first contract) -> boost.
7. **Burst score**: Weighted sum of above signals (weights: 0.25 value_ratio + 0.20 contracts/month + 0.20 disappeared + 0.15 overlap + 0.10 short_window + 0.10 rfc_age).

### Product Overlap

For Structure D (2023+): match on partida_code + institution_id.
For pre-2023: Jaccard token similarity on descriptions. Threshold >= 0.25.

---

## 6. Module 4: Temporal Anomaly Detection

### Algorithm: Activity Envelope Analysis

1. **Activity window**: span in years
2. **Rate**: contracts per year
3. **Burstiness coefficient** (Goh and Barabasi 2008): B = (sigma - mu) / (sigma + mu) on inter-arrival times. B=1 maximally bursty, B=0 Poisson, B=-1 periodic.
4. **Value concentration**: fraction of total value in peak quarter
5. **Disappearance**: years_since_last >= 2
6. **Composite**: burst_score = 0.25*burstiness + 0.25*peak_share + 0.20*disappeared + 0.15*rate + 0.15*short_window

Thresholds: >= 0.70 strong, 0.50-0.70 moderate, < 0.30 normal.

---

## 7. Module 5: External Cross-Reference Engine

### Data Availability Reality

**Critical constraint**: ARIA can only automatically cross-reference structured data that already exists in the database or is publicly downloadable as machine-readable files. The most important external sources — investigative journalism, ASF PDF audit reports, congressional testimony — require human reading or LLM-assisted web search (handled in Module 7).

| Source | Status | Table | Match | Strength |
|--------|--------|-------|-------|----------|
| SAT EFOS definitivo | ✅ IN DB | `sat_efos_definitivo` | RFC exact | Direct (SAT-confirmed ghost company) |
| SFP Sanctions | ✅ IN DB | `sfp_sanctions` | RFC exact + Jaccard name | Strong (government sanction record) |
| Ground Truth cases | ✅ IN DB | `ground_truth_vendors` | vendor_id FK | Direct (already investigated) |
| ASF audit reports | ❌ NOT STRUCTURED | — | — | PDFs only — no machine-readable DB |
| Animal Político / Proceso | ❌ NO API | — | — | Web search required (Module 7) |
| SAT black list (69-B no definitivo) | ❌ NOT LOADED | To be downloaded | RFC | Moderate |
| RUPC (blacklisted suppliers) | ❌ BLOCKED | datos.gob.mx removed it | — | Was Strong |

**What this means in practice:**
- The only *automated* external signals are SAT EFOS and SFP sanctions
- Media evidence (Animal Político, Latinus, Aristegui, Proceso, ASF) is gathered by the LLM in Module 7 via web search — not automated DB lookup
- ASF structured data requires a scraper project (future work, 2-4 weeks)

### Batch SQL Cross-Reference (Automated)

Single batch query against the two available structured sources:

```sql
SELECT v.id AS vendor_id, v.name, v.rfc,
    CASE WHEN e.rfc IS NOT NULL THEN 1 ELSE 0 END AS is_efos,
    CASE WHEN s.rfc IS NOT NULL THEN 1 ELSE 0 END AS is_sfp_sanctioned,
    CASE WHEN g.vendor_id IS NOT NULL THEN 1 ELSE 0 END AS in_ground_truth
FROM vendors v
LEFT JOIN sat_efos_definitivo e ON v.rfc = e.rfc
LEFT JOIN sfp_sanctions s ON v.rfc = s.rfc
LEFT JOIN ground_truth_vendors g ON v.id = g.vendor_id
WHERE v.id IN (SELECT vendor_id FROM aria_queue WHERE aria_run_id = ?)
```

Name-based fuzzy matching (Jaccard >= 0.80 auto, >= 0.60 flag for review) runs as a Python post-processing step for vendors with NULL RFC — targets the ~53% of vendors without registered RFC.

---

## 8. Module 6: False Positive Screening

Three FP screens, applied after IPS. Cumulative penalty capped at -0.40.

**FP1: LAASSP Art. 41 Patent Exceptions** (-0.15 to -0.20)
Curated list: Gilead, Pfizer, Microsoft, Oracle, SAP, etc. Also keyword check in contract descriptions for patente, licencia, exclusiv, articulo 41.

**FP2: Data Errors** (-0.25)
If max contract > 100x second-largest AND > 1000x sector median: probable decimal error.

**FP3: Structural Monopoly** (-0.10 to -0.15)
Sectors with regulated monopoly (Energia vouchers, Defensa clearance). If entire sector has <= 10 active vendors.

---

## 9. Module 7: Evidence Synthesis and LLM Integration

The LLM is called in **two sequential steps** per Tier 1/2 vendor:

1. **Web search** — gather media and public source evidence
2. **Memo generation** — synthesize all evidence into a structured investigation memo

All scoring upstream (Modules 1-6) is deterministic. The LLM only touches evidence text and memo generation.

### Step 1: Web Search (media evidence gathering)

For each Tier 1 or 2 vendor, Claude calls `web_search` with these queries (in Spanish):

```
"{vendor_name}" corrupción Mexico
"{vendor_name}" ASF auditoria observación
"{vendor_name}" Animal Político OR Proceso OR Latinus OR Aristegui
"{vendor_name}" {institution_name} irregularidades
RFC {rfc} EFOS México (if RFC available)
```

Results are scraped for relevant excerpts (title, URL, snippet, date). False positives filtered by requiring at least one of: vendor name exact match, RFC match, or institution name co-occurrence. Results stored in `aria_web_evidence` table with source URL, snippet, and relevance score.

**What web search can realistically find:**
- Investigative press articles (Animal Político, Latinus, Aristegui, Proceso, El Universal)
- ASF Cuenta Pública summaries (ASF publishes Spanish-language summaries online)
- FGR press releases (when there are formal charges)
- SFP Informe de Resultados (available as PDF via IFAI)
- Company registration data (Buró de Entidades Financieras, SIGER)

**What it cannot reliably find:**
- Full ASF audit PDF text (too long for web snippet)
- Internal government records
- Sealed FGR investigations

### Step 2: Memo Generation (single Claude API call)

After web search, one Claude call generates the full memo.

**Input JSON to Claude:**
```json
{
  "vendor": { "name", "rfc", "sector", "years_active", "total_value_mxn", "contract_count" },
  "scores": { "ips_final", "risk_score", "mahalanobis_distance", "burst_score", "ensemble_anomaly" },
  "patterns": [ { "type": "P3_INTERMEDIARY", "confidence": 0.82 } ],
  "shap_top3": [ { "feature": "z_price_volatility", "shap_value": 1.44 }, ... ],
  "external_flags": { "is_efos": false, "is_sfp_sanctioned": false, "in_ground_truth": false },
  "fp_screens": { "fp1_patent": false, "fp2_data_error": false, "fp3_structural": false },
  "comparable_gt_cases": [ { "case_name": "BIRMEX Vaccine Intermediary", "similarity": 0.87 } ],
  "web_evidence": [ { "source": "Animal Político", "url": "...", "snippet": "...", "date": "2022-05-14" } ],
  "contract_sample": [ { "year", "amount_mxn", "institution", "procedure_type" } ]
}
```

**Prompt template:**

```
Eres un analista de inteligencia financiera especializado en auditoría de contrataciones
gubernamentales en México. Se te proporciona un paquete de evidencia estructurada sobre
un proveedor del gobierno federal. Tu tarea es redactar un memorando de investigación
conciso y factual en español.

EVIDENCIA ESTRUCTURADA:
{json_evidence}

Redacta el memorando en las siguientes secciones EXACTAS (usa estos encabezados):

## RESUMEN EJECUTIVO
(2-3 oraciones: qué hace el proveedor, por qué es sospechoso, magnitud financiera)

## PERFIL DEL PROVEEDOR
(tabla con: RFC, sector, años activo, total contratos, valor total MXN, instituciones principales)

## SEÑALES DE RIESGO DETECTADAS
(lista de señales con valores numéricos concretos, ordenadas por importancia)

## PATRÓN PROBABLE DE CORRUPCIÓN
(patrón clasificado, confianza %, por qué se clasifica así, caso GT comparable)

## EVIDENCIA PÚBLICA DISPONIBLE
(solo si hay web_evidence; cita fuente, fecha y hallazgo exacto. Si no hay evidencia pública,
escribe: "No se encontró cobertura pública del proveedor en medios especializados.")

## HIPÓTESIS ALTERNATIVAS (FALSOS POSITIVOS)
(razones por las que podría NO ser corrupción; FP screens aplicadas)

## PREGUNTAS DE INVESTIGACIÓN SUGERIDAS
(5 preguntas concretas para un investigador humano)

## CLASIFICACIÓN RECOMENDADA
Acción: [AGREGAR_A_GT / REVISAR_URGENTE / REVISAR_RUTINA / DESCARTAR]
Nivel de confianza: [ALTO / MEDIO / BAJO]
Razón en 1 oración.

Sé preciso, factual y conservador. No afirmes corrupción sin evidencia sólida.
```

**Model**: `claude-sonnet-4-6` (current deployed model)
**Max tokens**: 1,800
**Temperature**: 0.2 (low — we want consistent, factual output)

### Output Storage

Memo stored in `aria_queue.memo_text` (Markdown). Web evidence stored in `aria_web_evidence` (separate table with URL deduplication).

### Cost Estimate

| Volume | Web searches | Memo tokens | Approx cost |
|--------|-------------|-------------|-------------|
| 500 Tier 1 vendors | 4 searches × 500 = 2,000 | 2,000 × 500 = 1M | ~$3 |
| 5,000 Tier 2 vendors | 4 searches × 5,000 = 20,000 | 1,000 × 2,000 = 2M | ~$8 |
| **Full run** | **22,000 searches** | **~3M tokens** | **~$11 total** |

### Fallback: Template-based memo (no LLM required)

If ANTHROPIC_API_KEY is not set or LLM call fails, a deterministic template generates a simplified memo from the JSON evidence package — no free text, but all numeric signals are presented in structured format. Fallback is always available for Phase 1 deployment.

---

## 10. Module 8: Ground Truth Auto-Update

### Decision Tree

1. RFC in EFOS definitivo + >= 5 contracts + not in GT -> AUTO-INSERT (direct, 1.0)
2. RFC in EFOS definitivo + < 5 contracts -> FLAG for review
3. RFC in SFP + risk_score >= 0.30 + >= 3 contracts -> AUTO-INSERT (circumstantial, 0.95)
4. RFC in SFP + risk_score < 0.30 -> FLAG for review
5. mahalanobis > 500 AND value > 1B MXN -> FLAG for review
6. IPS >= 0.80 AND pattern_confidence >= 0.70 AND no FP -> FLAG for review

### Safety

- Auto-insert ONLY for RFC-confirmed external matches
- Max 100 auto-inserts per run
- Every action logged with undo capability in aria_gt_updates

---

## 11. Module 9: Data Quality Watch

| Check | Threshold | Action |
|-------|-----------|--------|
| Contracts > 100B MXN | 0 expected | BLOCK |
| Risk score coverage | >= 90% | BLOCK if < 90% |
| Z-feature coverage | >= 90% | BLOCK if < 90% |
| Duplicate contracts | < 0.1% | WARN |
| Null vendor_id | Log count | WARN |
| Year gaps (2002-2025) | No gaps | WARN |

---

## 12. Database Schema

### Primary Table: aria_queue

    CREATE TABLE IF NOT EXISTS aria_queue (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id             INTEGER NOT NULL,
        vendor_name           TEXT,
        vendor_rfc            TEXT,
        primary_sector_id     INTEGER,
        -- IPS inputs (normalized)
        avg_risk_score        REAL,
        max_risk_score        REAL,
        avg_mahalanobis       REAL,
        max_mahalanobis       REAL,
        maha_normalized       REAL,
        ensemble_anomaly      REAL,
        shap_magnitude        REAL,
        financial_norm        REAL,
        total_value_mxn       REAL,
        total_contracts       INTEGER,
        -- IPS computation
        ips_primary           REAL,
        ips_secondary         REAL,
        ips_base              REAL,
        external_boost        REAL DEFAULT 0.0,
        efos_boost            REAL DEFAULT 0.0,
        fp_penalty            REAL DEFAULT 0.0,
        ips_final             REAL NOT NULL,
        ips_tier              INTEGER NOT NULL,       -- 1,2,3,4
        -- Pattern classification
        pattern_ids           TEXT,                    -- JSON array e.g. ["P1","P3"]
        pattern_confidences   TEXT,                    -- JSON e.g. {"P1":0.75,"P3":0.55}
        primary_pattern       TEXT,                    -- highest-confidence pattern
        -- External flags
        is_efos_definitivo    INTEGER DEFAULT 0,
        is_sfp_sanctioned     INTEGER DEFAULT 0,
        is_asf_flagged        INTEGER DEFAULT 0,
        is_ground_truth       INTEGER DEFAULT 0,
        external_flag_count   INTEGER DEFAULT 0,
        external_details      TEXT,                    -- JSON
        -- FP screening
        fp_screens_applied    TEXT,                    -- JSON array e.g. ["FP1_patent"]
        fp_total_penalty      REAL DEFAULT 0.0,
        -- Temporal features
        first_year            INTEGER,
        last_year             INTEGER,
        years_active          INTEGER,
        burst_score           REAL,
        burstiness_coeff      REAL,
        peak_quarter_share    REAL,
        is_disappeared        INTEGER DEFAULT 0,
        -- Intermediary features
        intermediary_score    REAL,
        product_overlap_score REAL,
        -- LLM memo
        memo_text             TEXT,
        memo_generated_at     TIMESTAMP,
        memo_model            TEXT,
        -- Review workflow
        review_status         TEXT DEFAULT 'pending',  -- pending/reviewing/confirmed/dismissed
        reviewed_by           TEXT,
        reviewed_at           TIMESTAMP,
        review_notes          TEXT,
        -- Metadata
        aria_version          TEXT NOT NULL DEFAULT '1.0',
        computed_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id),
        FOREIGN KEY (primary_sector_id) REFERENCES sectors(id)
    );

    CREATE INDEX IF NOT EXISTS idx_aria_ips ON aria_queue(ips_final DESC);
    CREATE INDEX IF NOT EXISTS idx_aria_tier ON aria_queue(ips_tier, ips_final DESC);
    CREATE INDEX IF NOT EXISTS idx_aria_vendor ON aria_queue(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_aria_pattern ON aria_queue(primary_pattern);
    CREATE INDEX IF NOT EXISTS idx_aria_status ON aria_queue(review_status);
    CREATE INDEX IF NOT EXISTS idx_aria_efos ON aria_queue(is_efos_definitivo);

### Web Evidence Cache

    CREATE TABLE IF NOT EXISTS aria_web_evidence (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id         INTEGER NOT NULL,
        aria_run_id       TEXT NOT NULL,
        query             TEXT NOT NULL,
        source_name       TEXT,                    -- 'Animal Político', 'ASF', 'Proceso', etc.
        source_url        TEXT,
        snippet           TEXT,
        published_date    TEXT,
        relevance_score   REAL DEFAULT 0.0,        -- 0-1, computed by keyword overlap
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    CREATE INDEX IF NOT EXISTS idx_web_ev_vendor ON aria_web_evidence(vendor_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_web_ev_url ON aria_web_evidence(vendor_id, source_url);

### Ground Truth Auto-Update Log

    CREATE TABLE IF NOT EXISTS aria_gt_updates (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id         INTEGER NOT NULL,
        vendor_name       TEXT,
        vendor_rfc        TEXT,
        source            TEXT NOT NULL,               -- 'efos_definitivo', 'sfp_sanction', 'manual'
        evidence_type     TEXT NOT NULL,               -- 'direct', 'circumstantial'
        confidence        REAL NOT NULL,
        -- What was inserted
        case_id           INTEGER,                     -- FK to ground_truth_cases if created
        inserted_to_gt    INTEGER DEFAULT 0,           -- 1 if auto-inserted
        -- Review
        review_status     TEXT DEFAULT 'pending',      -- pending/approved/rejected/auto
        reviewed_by       TEXT,
        reviewed_at       TIMESTAMP,
        review_notes      TEXT,
        -- Undo
        can_undo          INTEGER DEFAULT 1,
        undone            INTEGER DEFAULT 0,
        undone_at         TIMESTAMP,
        -- Metadata
        aria_run_id       TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    CREATE INDEX IF NOT EXISTS idx_gt_updates_status ON aria_gt_updates(review_status);
    CREATE INDEX IF NOT EXISTS idx_gt_updates_vendor ON aria_gt_updates(vendor_id);

### Data Quality Reports

    CREATE TABLE IF NOT EXISTS aria_dq_reports (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id            TEXT NOT NULL,
        check_name        TEXT NOT NULL,
        check_status      TEXT NOT NULL,               -- 'pass', 'warn', 'block'
        threshold         TEXT,
        actual_value      TEXT,
        message           TEXT,
        affected_count    INTEGER DEFAULT 0,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_dq_run ON aria_dq_reports(run_id);

### Pipeline Run Log

    CREATE TABLE IF NOT EXISTS aria_runs (
        id                TEXT PRIMARY KEY,             -- UUID
        started_at        TIMESTAMP NOT NULL,
        completed_at      TIMESTAMP,
        status            TEXT DEFAULT 'running',       -- running/completed/failed
        vendors_processed INTEGER DEFAULT 0,
        tier1_count       INTEGER DEFAULT 0,
        tier2_count       INTEGER DEFAULT 0,
        tier3_count       INTEGER DEFAULT 0,
        tier4_count       INTEGER DEFAULT 0,
        gt_auto_inserts   INTEGER DEFAULT 0,
        gt_flags          INTEGER DEFAULT 0,
        dq_blocks         INTEGER DEFAULT 0,
        dq_warnings       INTEGER DEFAULT 0,
        memos_generated   INTEGER DEFAULT 0,
        error_message     TEXT,
        aria_version      TEXT NOT NULL DEFAULT '1.0',
        config_snapshot   TEXT                          -- JSON of all constants used
    );

### Intermediary Candidates Cache

    CREATE TABLE IF NOT EXISTS aria_intermediary_candidates (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id         INTEGER NOT NULL,
        total_contracts   INTEGER,
        activity_span_days INTEGER,
        value_per_contract REAL,
        sector_median     REAL,
        value_ratio       REAL,
        contracts_per_month REAL,
        overlap_score     REAL,
        is_disappeared    INTEGER DEFAULT 0,
        burst_score       REAL,
        aria_run_id       TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    CREATE INDEX IF NOT EXISTS idx_intermediary_vendor ON aria_intermediary_candidates(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_intermediary_score ON aria_intermediary_candidates(burst_score DESC);


---

## 13. API Endpoints

### 13.1 Investigation Queue

**GET /api/v1/aria/queue**

Paginated investigation queue sorted by IPS descending.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| tier | int | null | Filter by tier (1-4) |
| pattern | str | null | Filter by primary_pattern (P1-P7) |
| sector_id | int | null | Filter by primary_sector_id |
| status | str | null | Filter by review_status |
| efos_only | bool | false | Only EFOS-flagged vendors |
| min_ips | float | null | Minimum IPS score |
| page | int | 1 | Page number |
| per_page | int | 50 | Results per page (max 100) |

Response envelope:

    {
        "data": [ { vendor_id, vendor_name, ips_final, ips_tier,
                     primary_pattern, pattern_confidences,
                     total_contracts, total_value_mxn,
                     external_flags: {efos, sfp, asf, ground_truth},
                     fp_screens, burst_score, review_status,
                     sector, years_active } ],
        "pagination": { page, per_page, total, total_pages },
        "run_summary": { run_id, computed_at, tier_counts }
    }

**GET /api/v1/aria/queue/{vendor_id}** -- Full ARIA detail including all sub-scores, pattern breakdown, external evidence, FP screening, and temporal features.

**GET /api/v1/aria/queue/{vendor_id}/memo** -- Investigation memo (LLM or template). Returns 404 if none; 202 if generation queued.

**PATCH /api/v1/aria/queue/{vendor_id}/review** -- Update review status (confirmed/dismissed/reviewing) with analyst name and notes.

### 13.2 Pipeline Management

**POST /api/v1/aria/run** -- Trigger full pipeline. Admin-only. Body: modules (list), generate_memos (bool), dry_run (bool). Returns 202 with run_id.

**GET /api/v1/aria/stats** -- Latest run summary plus historical tier distribution trend.

### 13.3 Ground Truth Management

**GET /api/v1/aria/gt-updates** -- Auto-detected GT candidates. Params: status, source, page, per_page.

**PATCH /api/v1/aria/gt-updates/{id}/review** -- Approve/reject GT candidate.

### 13.4 Data Quality

**GET /api/v1/aria/dq-reports** -- DQ check results. Param: run_id.

---

## 14. Module Implementation Detail

This section provides production-ready pseudocode for core algorithms.

### 14.1 IPS Computation

```python
import math

def normalize_mahalanobis(d2: float) -> float:
    if d2 <= 0:
        return 0.0
    return 1.0 / (1.0 + math.exp(-1.5 * (math.log(d2) - math.log(80))))

def normalize_financial(value_mxn: float) -> float:
    if value_mxn <= 0:
        return 0.0
    log_val = math.log10(max(value_mxn, 1.0))
    return max(0.0, min(1.0, (log_val - 5.0) / 5.5))

def normalize_ensemble(score: float) -> float:
    return max(0.0, min(1.0, score ** 0.8))

def normalize_shap(magnitude: float) -> float:
    return max(0.0, min(1.0, magnitude / 5.0))

def compute_ips(avg_risk, max_risk, avg_maha, max_maha,
                ensemble, shap_mag, total_value,
                external_flags, is_efos, fp_penalty=0.0):
    maha_norm = normalize_mahalanobis(max_maha)
    ens_norm = normalize_ensemble(ensemble)
    shap_norm = normalize_shap(shap_mag)
    fin_norm = normalize_financial(total_value)

    # MAX ensures either signal dominates (blind spot fix)
    primary = max(avg_risk, maha_norm)

    secondary = (0.30 * max_risk + 0.30 * ens_norm
                 + 0.20 * shap_norm + 0.20 * maha_norm)

    base = 0.60 * primary + 0.40 * secondary
    fin_mult = 0.5 + fin_norm  # [0.5, 1.5]

    ext_boost = min(0.24, external_flags * 0.08)
    efos_val = 0.15 if is_efos else 0.0

    ips = base * fin_mult + ext_boost + efos_val + fp_penalty
    ips = max(0.0, min(1.0, ips))

    tier = 1 if ips >= 0.70 else 2 if ips >= 0.40 else 3 if ips >= 0.20 else 4
    return ips, tier
```

### 14.2 VendorFeatures Dataclass

```python
from dataclasses import dataclass

@dataclass
class VendorFeatures:
    vendor_id: int
    vendor_name: str = ""
    vendor_rfc: str = ""
    total_contracts: int = 0
    total_value_mxn: float = 0.0
    avg_risk_score: float = 0.0
    max_risk_score: float = 0.0
    # Concentration
    vendor_concentration: float = 0.0
    institution_count: int = 0
    top_institution_ratio: float = 0.0
    # Procedures
    direct_award_ratio: float = 0.0
    single_bid_ratio: float = 0.0
    win_rate: float = 0.0
    # Co-bidding
    co_bid_rate: float = 0.0
    co_bidder_count: int = 0
    top_cobidder_frequency: float = 0.0
    # Price
    avg_z_price_ratio: float = 0.0
    price_variance: float = 0.0
    price_hypothesis_count: int = 0
    industry_mismatch_ratio: float = 0.0
    # Temporal
    years_active: int = 0
    first_year: int = 0
    last_year: int = 0
    burst_score: float = 0.0
    burstiness_coeff: float = 0.0
    peak_quarter_share: float = 0.0
    is_disappeared: bool = False
    contracts_per_year: float = 0.0
    # External
    is_efos_definitivo: bool = False
    is_sfp_sanctioned: bool = False
    is_asf_flagged: bool = False
    is_ground_truth: bool = False
    has_rfc: bool = False
    # Anomaly scores
    avg_mahalanobis: float = 0.0
    max_mahalanobis: float = 0.0
    ensemble_anomaly: float = 0.0
    shap_magnitude: float = 0.0
```

### 14.3 Pattern Classifier

```python
def classify_patterns(v: VendorFeatures) -> dict:
    results = {}

    # P1: Concentrated Monopoly (IMSS, Segalmex, Edenred)
    conf = 0.0
    if v.vendor_concentration > 0.50:
        conf = 0.80
    elif v.vendor_concentration > 0.30:
        conf = 0.50
    elif v.vendor_concentration > 0.15:
        conf = 0.20
    if conf > 0 and v.institution_count <= 3:
        conf += 0.15
    if conf > 0 and v.win_rate > 0.80:
        conf += 0.10
    if conf >= 0.30:
        results["P1"] = min(conf, 1.0)

    # P2: Ghost Company (EFOS, Estafa Maestra, Decoaro)
    conf = 0.0
    if v.is_efos_definitivo:
        conf = 0.90
    elif v.total_contracts <= 20 and v.direct_award_ratio > 0.80:
        conf = 0.40
        if v.years_active <= 3:
            conf += 0.20
        if not v.has_rfc:
            conf += 0.15
    if conf >= 0.30:
        results["P2"] = min(conf, 1.0)

    # P3: Single-Use Intermediary (UAB JORINIS)
    if v.burst_score > 0.50:
        results["P3"] = min(v.burst_score, 1.0)

    # P4: Bid Rigging (IPN Cartel de la Limpieza)
    conf = 0.0
    if v.co_bid_rate > 0.50:
        conf = 0.40
    if conf > 0 and v.win_rate > 0.70:
        conf += 0.20
    if conf > 0 and v.price_variance < 0.10:
        conf += 0.20
    if conf > 0 and v.top_cobidder_frequency > 0.60:
        conf += 0.15
    if conf >= 0.30:
        results["P4"] = min(conf, 1.0)

    # P5: Overpricing (Cyber Robotic Solutions)
    conf = 0.0
    if v.avg_z_price_ratio > 2.0:
        conf = 0.50
    elif v.avg_z_price_ratio > 1.5:
        conf = 0.30
    if conf > 0 and v.industry_mismatch_ratio > 0.50:
        conf += 0.25
    if conf > 0 and v.price_hypothesis_count > 3:
        conf += 0.15
    if conf >= 0.30:
        results["P5"] = min(conf, 1.0)

    # P6: Institution Capture (Garza Ponce, Cotemar)
    conf = 0.0
    if v.top_institution_ratio > 0.80 and v.total_contracts > 10:
        conf = 0.60
    if v.institution_count == 1 and v.total_contracts > 5:
        conf = max(conf, 0.80)
    if conf > 0 and v.single_bid_ratio > 0.50:
        conf += 0.15
    if conf >= 0.30:
        results["P6"] = min(conf, 1.0)

    # P7: Conflict of Interest (Grupo Higa)
    if v.is_sfp_sanctioned:
        results["P7"] = 0.50

    return results
```

### 14.4 Temporal Anomaly: Burstiness Coefficient

```python
import numpy as np

def compute_burstiness(contract_dates: list) -> float:
    """Goh & Barabasi (2008). B=1 bursty, B=0 Poisson, B=-1 periodic."""
    if len(contract_dates) < 3:
        return 0.0
    dates_sorted = sorted(contract_dates)
    inter_arrivals = []
    for i in range(1, len(dates_sorted)):
        delta = (dates_sorted[i] - dates_sorted[i - 1]).days
        inter_arrivals.append(max(delta, 1))
    arr = np.array(inter_arrivals, dtype=float)
    mu = arr.mean()
    sigma = arr.std()
    if sigma + mu == 0:
        return 0.0
    return (sigma - mu) / (sigma + mu)

def compute_burst_score(burstiness, peak_quarter_share,
                        is_disappeared, contracts_per_year,
                        activity_span_days):
    burst_norm = max(0.0, burstiness)
    rate_norm = min(contracts_per_year / 20.0, 1.0)
    short_window = (1.0 if activity_span_days < 365
                    else 0.5 if activity_span_days < 730 else 0.0)
    disappeared = 1.0 if is_disappeared else 0.0
    return (0.25 * burst_norm + 0.25 * peak_quarter_share
            + 0.20 * disappeared + 0.15 * rate_norm
            + 0.15 * short_window)
```

### 14.5 Intermediary Detection

```python
def detect_intermediary(vendor_id, conn):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*), MIN(contract_date), MAX(contract_date), "
        "SUM(amount_mxn), AVG(amount_mxn) "
        "FROM contracts WHERE vendor_id = ? AND amount_mxn <= 100000000000",
        (vendor_id,))
    row = cursor.fetchone()
    n, first, last, total_val, avg_val = row

    if n < 2 or n > 50 or total_val < 1_000_000:
        return 0.0

    from datetime import datetime
    d_first = datetime.strptime(first, "%Y-%m-%d")
    d_last = datetime.strptime(last, "%Y-%m-%d")
    span = (d_last - d_first).days
    if span > 1095:
        return 0.0

    # Sector median for value ratio
    cursor.execute(
        "SELECT sector_id FROM contracts WHERE vendor_id = ? "
        "GROUP BY sector_id ORDER BY COUNT(*) DESC LIMIT 1",
        (vendor_id,))
    sector_id = cursor.fetchone()[0]
    cursor.execute(
        "SELECT AVG(amount_mxn) FROM contracts "
        "WHERE sector_id = ? AND amount_mxn > 0 "
        "AND amount_mxn <= 100000000000", (sector_id,))
    sector_median = cursor.fetchone()[0] or 1_000_000
    value_ratio = avg_val / sector_median
    if value_ratio < 2.0:
        return 0.0

    cpm = n / max(span / 30.0, 1.0)
    disappeared = 1 if (2025 - d_last.year) >= 2 else 0
    short_window = 1.0 if span < 365 else (0.5 if span < 730 else 0.0)

    burst = (0.25 * min(value_ratio / 10.0, 1.0)
             + 0.20 * min(cpm / 5.0, 1.0)
             + 0.20 * disappeared
             + 0.15 * 0.0  # product overlap placeholder
             + 0.10 * short_window
             + 0.10 * 0.0) # rfc age placeholder
    return min(burst, 1.0)
```


### 14.6 False Positive Screening

Three screens. Cumulative penalty capped at -0.40.

**FP1: Patent Exceptions** (-0.15 to -0.20): ~25 curated patent holders + keyword check.
**FP2: Data Errors** (-0.25): max contract > 100x second-largest.
**FP3: Structural Monopoly** (-0.10 to -0.15): sector <= 10 active vendors.

### 14.7 LLM Evidence Synthesis

Single integration point. JSON evidence in, Spanish memo out. 7 sections.
Model: claude-sonnet-4-20250514, 1500 tokens, temp 0.3. Cost: ~$6/run.

### 14.8 Template-Based Fallback Memo

String-interpolation template for Tier 2/3. Same 7 sections, generic questions.
Cost: zero. Latency: < 1ms.

### 14.9 External Cross-Reference Batch Query

Single SQL joining vendors vs sat_efos_vendors, sfp_sanctions, asf_cases,
ground_truth_vendors by RFC. Non-RFC: Jaccard >= 0.80 auto, >= 0.60 review.

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Week 1-2) -- 3 dev-days

| Task | File | Hours |
|------|------|-------|
| ARIA DB schema | scripts/aria_create_schema.py | 2 |
| Vendor aggregation | scripts/aria_aggregate_vendors.py | 4 |
| IPS computation | scripts/aria_compute_ips.py | 4 |
| External cross-ref | scripts/aria_external_xref.py | 3 |
| Basic queue API | api/routers/aria.py | 4 |
| DQ checks | scripts/aria_dq_checks.py | 3 |
| Unit tests | tests/test_aria.py | 4 |

**Exit:** aria_queue populated, UAB JORINIS Tier 1, >= 80% GT Tier 1-2.

### Phase 2: Pattern Detection (Week 3-4) -- 5 dev-days

| Task | File | Hours |
|------|------|-------|
| Pattern classifier | scripts/aria_pattern_classifier.py | 6 |
| Intermediary detection | scripts/aria_intermediary_detection.py | 6 |
| Temporal anomaly | scripts/aria_temporal_anomaly.py | 4 |
| FP screening | scripts/aria_fp_screening.py | 4 |
| GT auto-update | scripts/aria_gt_update.py | 4 |
| Pipeline + API + tests | scripts/aria_pipeline.py + api/ + tests/ | 14 |

**Exit:** >= 80% GT classified, P3 catches intermediaries, FP -20%.

### Phase 3: LLM + Frontend (Week 5-6) -- 6 dev-days

| Task | File | Hours |
|------|------|-------|
| LLM + template memos | scripts/aria_generate_memos.py | 9 |
| APIs + frontend | api/ + pages/aria/ | 24 |
| E2E tests + docs | tests/ + docs/ | 7 |

**Total: ~14 dev-days across 6 weeks**

---

## 16. Validation Strategy

### 16.1 GT Regression

After each run, verify all GT vendors: >= 80% Tier 1-2, zero Tier 4,
UAB JORINIS-type in Tier 1, Mann-Whitney p < 0.001.

### 16.2 FP Rate

50 patent holders: >= 40 screened. 100 Tier 1 random: >= 50% suspicious.

### 16.3 IPS Calibration

Tier 1: 500-2000 vendors. Tier 4: >= 70%. r(IPS, risk_score) = 0.5-0.7.

### 16.4 Pattern Accuracy

| Case | Expected |
|------|----------|
| IMSS Ghost | P1 |
| Segalmex | P1 |
| COVID-19 | P1/P6 |
| EFOS | P2 |
| Estafa Maestra | P2 |
| UAB JORINIS | P3 |
| IPN Cartel | P4 |
| Cyber Robotic | P5 |
| Cotemar | P6 |
| Grupo Higa | P7 |

**Target: >= 80% correct primary pattern.**

---

## 17. Known Limitations

| # | Limitation | Mitigation |
|---|-----------|------------|
| L1 | IPS inherits v5.1 blind spots | MAX(risk_score, mahalanobis) |
| L2 | Product overlap needs partida (2023+) | 1 of 6 burst sub-scores |
| L3 | LLM memos not deterministic | JSON evidence is truth |
| L4 | FP patent list curated | Quarterly review + keywords |
| L5 | GT auto-update feedback loop | Cap 100/run, track separately |
| L6 | co_bid_rate = 0 in v5.1 | P4 rule-based compensates |
| L7 | No real-time scoring | Schedule within 1h of ETL |
| L8 | Mahalanobis sigmoid heuristic | Validate vs GT |
| L9 | Name matching ~5% error | Threshold tiers + human review |
| L10 | SHAP on per-vendor means | Correct granularity for queue |

---

## Appendix A: Configuration Constants

    IPS_PRIMARY_WEIGHT = 0.60
    IPS_SECONDARY_WEIGHT = 0.40
    IPS_TIER1_THRESHOLD = 0.70
    IPS_TIER2_THRESHOLD = 0.40
    IPS_TIER3_THRESHOLD = 0.20
    MAHA_SIGMOID_MIDPOINT = 80
    MAHA_SIGMOID_STEEPNESS = 1.5
    EXTERNAL_FLAG_BOOST = 0.08
    EFOS_BOOST = 0.15
    FP_PENALTY_CAP = -0.40
    PATTERN_MIN_CONFIDENCE = 0.30
    INTERMEDIARY_MAX_CONTRACTS = 50
    GT_AUTO_INSERT_LIMIT = 100
    FUZZY_MATCH_AUTO = 0.80
    LLM_MAX_TOKENS = 1500
    DQ_AMOUNT_MAX = 100_000_000_000

(Full list: 50+ values in scripts/aria_config.py)

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **IPS** | Investigation Priority Score |
| **Mahalanobis** | Multivariate anomaly measure |
| **SHAP** | Per-feature contribution decomposition |
| **Burstiness** | Goh-Barabasi temporal irregularity |
| **EFOS** | SAT ghost company list |
| **SFP** | Federal sanctions registry |
| **ASF** | Federal audit authority |
| **LAASSP** | Federal procurement law |
| **RFC** | Mexican taxpayer ID |
| **Partida** | Product/service code (2023+) |

---

*The goal is not a perfect model, but a useful one that helps investigators focus limited resources on the most suspicious patterns.*

*ARIA is named for the investigative clarity it aims to provide -- not a verdict, but a structured guide for those who must decide where to look first.*
