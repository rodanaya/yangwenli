# RUBLI — Post-Audit Development Roadmap
*Written: February 25, 2026. Resume this document after the 5-auditor backend audit completes.*

---

## Context for the Next Session

RUBLI is a Mexican federal procurement corruption detection platform with:
- **3.1M contracts** (2002–2025) from CompraNet
- **Risk model v5.0** — 16 z-score features, 12 per-sector logistic regression sub-models, Train AUC 0.967, Test AUC 0.960
- **Backend**: FastAPI on port 8001, SQLite (`backend/RUBLI_NORMALIZED.db`, ~5.6GB)
- **Frontend**: React + TypeScript + i18n (EN/ES) on port 3009
- **Ground truth**: 15 cases, 27 vendors, 26,582 contracts across all 12 sectors

The audit that is currently running is a deep backend review. **No scripts should be run against the database until the audit is declared finished.**

---

## Part 1 — What Was Already Built This Session

These things are **coded and committed** but have not been executed against the live database.

### 1.1 Narrative and Journalistic Context (deployed in frontend)

The platform now tells the story of what's happening to Mexico's procurement transparency infrastructure. These are live in the UI:

| Page | What Was Added |
|------|---------------|
| **Executive Summary** | New "SectionSystem" section explaining how public procurement is supposed to work: licitación pública vs. adjudicación directa, the 71% direct-award reality, the transparency crisis (CompraNet abolished April 2025, INAI eliminated December 2024) |
| **Dashboard** | Transparency context card: key dates, what was deleted, link to Limitations page |
| **Limitations** | New "data-pipeline" limitation: 1.9M contracts deleted August 2024, 5-year retention rule threatening 2.6M more contracts, INAI elimination |
| **Glossary (EN + ES)** | 7 new/updated terms: `compranet`, `licitacionPublica`, `laassp`, `inai`, `comprasmx`, `sfp`, `rupc` |

### 1.2 External Registry Integration (built, not yet run)

A complete integration layer for three external government registries was built. The UI is deployed; the backend tables do not yet exist in the live DB and the data has not been loaded.

**New backend scripts (written, not executed):**
- `backend/scripts/load_sfp_sanctions.py` — downloads SFP sanctioned providers CSV from datos.gob.mx → `sfp_sanctions` table
- `backend/scripts/load_rupc.py` — downloads RUPC vendor registry CSV → `rupc_vendors` table

**New DB tables (defined in schema, not yet created in live DB):**
- `sfp_sanctions` — RFC, company name, sanction type, start/end date, amount, authority
- `rupc_vendors` — RFC, compliance grade, status, registered/expiry dates

**New API endpoint (written, not yet reachable because tables don't exist):**
- `GET /vendors/{id}/external-flags` — returns SFP sanctions + RUPC grade + ASF cases for any vendor

**New frontend UI (deployed and waiting for data):**
- VendorProfile now has a 5th tab: **"External Records"** showing SFP sanctions (red banner if found), RUPC compliance grade, and ASF audit mentions

**New TypeScript types:** `SFPSanction`, `RUPCVendor`, `ASFCaseItem`, `VendorExternalFlags` in `frontend/src/api/types.ts`

### 1.3 The v5.0.2 Revert — Partially Complete

The v5.0.2 model was rolled back because it caused a regression (false negative rate 0.6% → 13.4%). The revert is **72% complete**:
- Rows 1–2,400,000: restored to v5.0 scores ✓
- Rows 2,400,001–3,110,072: still have v5.0.2 scores — **needs finishing**

After the revert is complete, `precompute_stats.py` must be run from the `backend/` directory.

---

## Part 2 — The Research Done This Session

### 2.1 Data Sources Evaluated

An extensive research pass was done on all available Mexican government and civil society data sources. Priority ranking:

| Priority | Source | Format | What It Adds | Complexity |
|----------|--------|--------|-------------|------------|
| **1** | SAT EFOS/EDOS (Art. 69-B) | CSV, monthly | Confirmed ghost companies by RFC — best external signal available | LOW |
| **2** | SFP Proveedores Sancionados | CSV, daily | Official blacklist — already built, just needs running | LOW |
| **3** | ComprasMX 2025 data | CSV | Continuation of data after CompraNet abolished April 2025 — may have a gap | LOW |
| **4** | QuiénEsQuién.Wiki API | REST API | Vendor name variant catalog for deduplication (targeted use only) | MEDIUM |
| **5** | IMCO IRC annual CSV | CSV, annual | External institution-level corruption scores for cross-validation | MEDIUM |
| **6** | SFP SIDEC complaints | CSV, monthly | Citizen complaints by institution as institutional risk signal | LOW |
| **7** | SHCP Transparencia Presupuestaria | OCDS API | Budget allocation vs. actual spending — Q4 spending anomalies | MEDIUM |
| **8** | ASF MDB_Consolidado PDF | PDF (annual) | Execution-phase fraud evidence — RUBLI's primary blind spot | HIGH |

### 2.2 QuiénEsQuién.Wiki — Detailed Assessment

This was researched in depth because it was considered as a deduplication source.

**What it is:** A civil society platform built by PODER (Proyecto sobre Organización, Desarrollo, Educación e Investigación) that reprocessed CompraNet data into OCDS format with entity resolution. Contains 6.7M contracts, 234K company entities, 2002–2022 coverage.

**Key finding: PODER transferred the platform to Abrimos.info in February 2026** (literally weeks ago). Data has been frozen since September 2022. The platform is now in archive mode.

**Why it's useful but limited for RUBLI:**
- ✓ Stores multiple name variants per company — useful for deduplication of Structure A/B (2002–2017) data where names are inconsistent ALL CAPS
- ✓ Has 2.1M IMSS-specific contracts from a separate IMSS portal — not in RUBLI's CompraNet-only dataset
- ✗ RFC coverage is the same as RUBLI's own (their RFC data comes from CompraNet fields, not SAT)
- ✗ Data frozen at 2022 — RUBLI has data through 2025
- ✗ No beneficial ownership for domestic Mexican companies

**How to access:** REST API at `https://api.quienesquien.wiki/v3/` — no authentication required, CC-BY-SA 4.0 license. Known SSL certificate issue (altname mismatch) — use `verify=False` in Python requests. Endpoint: `GET /companies?identifier=<RFC>&embed=1`

**Decision: Targeted use only.** Not a full pipeline integration. Query the API for RUBLI's top 3,000 vendors by contract value to pull their known name variants. One afternoon of API calls, stored in a `vendor_name_variants` table.

### 2.3 New Ground Truth Cases Found in Journalism

Three well-documented corruption cases from 2024–2026 that should be added to ground truth for v5.1 model training:

| Case | Vendors Named | Sector | Source | Notes |
|------|--------------|--------|--------|-------|
| IMSS overpriced medicines | Ethomedical, Abastecedora de Medicinas y Materiales | Salud (1) | MCCI investigation | Up to 885% overpricing documented |
| Tren Maya direct awards | FONATUR subsidiaries, key construction firms | Infraestructura (3) | ASF CP2024, PODER | 86% direct awards, 36.5B MXN, 2.6B MXN in ASF-detected irregularities |
| Sedena as contractor | Sedena commercial arm | Infraestructura (3) | ASF November 2025 | Novel pattern — military entity as vendor, 51 active litigation cases |

**Before adding any of these to training**: verify ≥50 matching contracts exist in RUBLI for each vendor. Lesson from v5.0.2: cases with too few contracts damage sub-model quality.

---

## Part 3 — Execution Plan (After Audit)

### Step 1: Complete the v5.0 Revert (Day 1, do first)

The risk model is in a mixed state. Fix this before anything else.

```
1. Use MCP write_query (NOT a Python script — WAL conflict risk) to update rows 2,400,001–3,110,072
   - Set risk_score, risk_level, risk_score_v5, risk_confidence_lower/upper back to v5.0 values
   - Pattern: copy from the February 17 backup restore approach used earlier
2. Run: cd backend && python -m scripts.precompute_stats
3. Run: python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider
   - Expected: 251 tests passing
4. Verify: false negative rate = 0.6% (not 13.4%), IPN Cartel critical rate ≈ 64.6%
```

### Step 2: Create External Registry Tables (Day 1)

```bash
# Option A: Run schema creation script (creates ALL tables, safe on existing DB)
cd backend
python -m scripts.etl_create_schema

# Option B: Use MCP write_query for just the two new tables (more targeted)
# CREATE TABLE IF NOT EXISTS sfp_sanctions (...)
# CREATE TABLE IF NOT EXISTS rupc_vendors (...)
```

### Step 3: Load SFP Sanctions (Day 2)

```bash
cd backend
python -m scripts.load_sfp_sanctions

# If the default URL is stale (CompraNet ecosystem changed April 2025):
# Check: https://datos.gob.mx/busca/dataset/proveedores-y-contratistas-sancionados
# Then: python -m scripts.load_sfp_sanctions --url <updated_url>
```

After loading, open a vendor profile in the UI and confirm the "External Records" tab shows data.

### Step 4: Build and Run SAT EFOS Integration (Day 3 — highest priority new build)

This is the most important new data source. Ghost companies confirmed by the Mexican tax authority.

**URL:** `http://omawww.sat.gob.mx/tramitesyservicios/Paginas/datos_abiertos_articulo69b.htm`

**Build `backend/scripts/load_sat_efos.py`** with this schema:
```sql
CREATE TABLE sat_efos_vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfc TEXT NOT NULL,
    company_name TEXT NOT NULL,
    stage TEXT,  -- presunto / definitivo / favorecido / desvirtuado
    dof_date TEXT,
    loaded_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_sat_efos_rfc ON sat_efos_vendors(rfc);
```

**Add to `GET /vendors/{id}/external-flags` endpoint** — the endpoint already exists in `backend/api/routers/vendors.py`, just add a fourth query block for `sat_efos_vendors`.

**Add to VendorProfile External Records tab** — add a "SAT Ghost Company List" section. If a vendor's RFC appears in EFOS at stage `definitivo`, show a prominent red badge.

### Step 5: ComprasMX 2025 Data Audit (Day 4)

```
1. Go to: https://upcp-compranet.buengobierno.gob.mx/informacion_ayuda/datos_abiertos.html
2. Download the 2025 CSV
3. Run through data-quality-guardian agent: check field names, amounts, structure
4. Compare field names to Structure D (2023-2025) definition in etl_pipeline.py
5. If same structure: run existing ETL pipeline on the new file
6. If new structure (possible "Structure E"): update etl_pipeline.py field mapping
7. After ETL: verify contract count for 2025 increased and check for April-December gap
```

### Step 6: QuiénEsQuién.Wiki Name Variant Enrichment (Week 2)

Build `backend/scripts/enrich_vendor_names_qqw.py`:

```python
# Pseudocode
for vendor in top_3000_vendors_by_contract_value:
    if vendor.rfc:
        response = requests.get(
            'https://api.quienesquien.wiki/v3/companies',
            params={'identifier': vendor.rfc, 'embed': 1},
            verify=False  # SSL cert altname issue
        )
        name_variants = extract_variants(response.json())
        insert into vendor_name_variants table
        sleep(0.5)  # rate limiting
```

Schema:
```sql
CREATE TABLE vendor_name_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id),
    rfc TEXT,
    variant_name TEXT NOT NULL,
    source TEXT DEFAULT 'qqw',
    added_at TEXT DEFAULT (datetime('now'))
);
```

Attribution in UI: "Name variants sourced from QuiénEsQuién.Wiki (PODER / Abrimos.info) — CC-BY-SA 4.0"

### Step 7: New Ground Truth Cases → v5.1 Model (Week 2–3)

```
1. For each candidate case (Ethomedical, FONATUR Tren Maya, Sedena):
   a. Search for vendor RFC in RUBLI vendors table
   b. Count matching contracts — must be ≥50 to qualify
   c. Check which sector they fall in (Salud=1, Infraestructura=3)
   d. If qualified: INSERT into ground_truth_cases + ground_truth_vendors

2. Retrain only if all three conditions met:
   - Each new case has ≥50 contracts
   - No existing case's detection rate drops below 90%
   - Test AUC ≥ 0.960 (maintain current bar)

3. Pipeline:
   cd backend
   python -m scripts.calibrate_risk_model_v5
   python -m scripts.calculate_risk_scores_v5 --batch-size 100000
   python -m scripts.precompute_stats

4. If regression detected: revert immediately (restore from backup)
   Backup first: cp backend/RUBLI_NORMALIZED.db backend/backups/RUBLI_pre_v5.1_$(date +%Y%m%d).db
```

### Step 8: ASF MDB_Consolidado PDF Integration (Month 2)

This is the complex one. Build only after Phases 1–4 are stable.

**Data:** `https://informe.asf.gob.mx/Documentos/Matriz/MDB_Consolidado.pdf`
- Annual, delivered in 3 tranches
- 2024 Cuenta Pública delivered February 17, 2026 — most recent
- PDF table only, no CSV version exists

**Dependencies to add:** `pip install pdfplumber`

**Schema:**
```sql
CREATE TABLE asf_institution_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ramo_code INTEGER,
    institution_name TEXT,
    audit_year INTEGER,
    finding_type TEXT,
    amount_mxn REAL,
    observations INTEGER,
    solventadas INTEGER,
    source_pdf TEXT,
    loaded_at TEXT DEFAULT (datetime('now'))
);
```

**API:** `GET /institutions/{id}/asf-findings` — timeline of ASF observations, joins on ramo_code

**Frontend:** Timeline chart on the Sectors page showing ASF audit findings vs. RUBLI risk scores for the same period. This is the "execution-phase fraud" layer the model currently cannot see.

---

## Part 4 — Deferred Items (Research Done, Don't Build Yet)

| Item | Why Deferred | Revisit When |
|------|-------------|--------------|
| IMCO IRC CSV | Annual release (usually December). 2024 report already out — CSV may be available on request | IMCO publishes 2025 report |
| SFP SIDEC complaints | Low priority — only covers 2024+, institutional risk already in model | After higher-priority items stable |
| SHCP OCDS API | Uncertain status post-INAI dissolution in December 2024 | Check if still accessible |
| OCP state-level OCDS data | Would add subnational procurement (Nuevo León, CDMX, Veracruz) — significant schema work | Separate project track |
| OpenSanctions.org | Better dedup than QEQ for current data — needs license review | Evaluate after QEQ enrichment |
| Academic collaboration (arXiv 2211.01478) | Need author outreach for ground truth sharing | Contact authors |
| OpenCorporates API | Name-only matching (no RFC), diminishing dedup value vs. effort | Low priority |

---

## Part 5 — Architecture Reminders for Next Session

### WAL and MCP Conflict
Python scripts using `BEGIN IMMEDIATE` can deadlock when the MCP server holds a persistent SQLite connection. For large batch UPDATEs (like risk score restores), **use MCP write_query directly** rather than Python scripts.

### Database Backup Protocol
Before any large operation:
```bash
cp backend/RUBLI_NORMALIZED.db backend/backups/RUBLI_NORMALIZED_$(date +%Y%m%d_%H%M%S).db
# Or compressed:
gzip -c backend/RUBLI_NORMALIZED.db > backend/backups/RUBLI_NORMALIZED_$(date +%Y%m%d).db.gz
```

### Performance for Batch Updates
```python
conn.execute("PRAGMA synchronous=OFF")   # ~900x speedup for batch writes
conn.execute("PRAGMA cache_size=-200000")  # 200MB cache
# Use cursor-based pagination (WHERE id > ?) not OFFSET for large tables
```

### Test Baseline
- 251 backend tests passing as of February 21, 2026
- Run: `python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider`
- Tests use `scope="module"` fixtures with FastAPI TestClient

### TypeScript Check
Always run after frontend changes:
```bash
cd frontend && npx tsc --noEmit
# Expected: 0 errors
```

### Key File Locations
| Purpose | Path |
|---------|------|
| Risk model calibration | `backend/scripts/calibrate_risk_model_v5.py` |
| Risk scoring | `backend/scripts/calculate_risk_scores_v5.py` |
| Precompute stats | `backend/scripts/precompute_stats.py` |
| External flags endpoint | `backend/api/routers/vendors.py` (end of file) |
| VendorProfile External tab | `frontend/src/pages/VendorProfile.tsx` |
| SFP load script | `backend/scripts/load_sfp_sanctions.py` |
| RUPC load script | `backend/scripts/load_rupc.py` |
| ASF scraper (dormant) | `backend/scripts/scrape_asf.py` |
| External types | `frontend/src/api/types.ts` (VendorExternalFlags) |
| i18n glossary EN | `frontend/src/i18n/locales/en/glossary.json` |
| i18n glossary ES | `frontend/src/i18n/locales/es/glossary.json` |

---

## Part 6 — The Bigger Picture

### What RUBLI Detects vs. What It Misses

The platform is strong at detecting **award-phase** corruption patterns. It is blind to **execution-phase** fraud (cost overruns, ghost workers, inflated invoices after the contract is awarded). This is Limitation 9.1 in `docs/RISK_METHODOLOGY_v5.md`.

The ASF integration (Phase 8) is the path to partially closing that gap.

### The Transparency Infrastructure Crisis (Journalistic Context)

This is now documented in the platform's UI (Executive Summary, Limitations), but worth keeping in mind as context for all decisions:

- **August 2024**: 1.9M contracts (2012–2023) quietly deleted from CompraNet public access
- **December 20, 2024**: INAI (independent transparency body) abolished constitutionally
- **April 10, 2025**: CompraNet abolished by Congress (vote 68–23)
- **April 18, 2025**: ComprasMX launched as replacement, starting with ~1,000 contracts
- **New ComprasMX rules**: 5-year data retention clause threatens historical records; "classified" contracts exempt from disclosure

RUBLI's 3.1M contracts are a **historical archive** of data that is progressively being removed from public access. The platform's long-term value increases as the government reduces transparency, not decreases.

### Ground Truth Strategy Going Forward

The model currently has 15 documented corruption cases. The v5.0.2 lesson was clear: adding cases that are too small or too concentrated in a sector without sufficient training data causes regressions.

For future ground truth expansion, the rule is:
- ≥50 matched contracts per new vendor
- At least 2 vendors per new sector being added
- Test AUC must remain ≥ 0.960 after retraining
- If a sector sub-model degrades, fall back to global model for that sector (don't force it)

---

*End of roadmap. Resume here when the audit is complete.*
*Platform: RUBLI v5.0 | Model: v5.0 (reverted from v5.0.2) | Date written: 2026-02-25*
