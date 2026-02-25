# RUBLI — Post-Audit Technical Specification
*Written: February 25, 2026. This document covers backend schema, API endpoints, and frontend
structure for every planned integration. Resume here after the 5-tier backend audit completes.*

---

## 0. Pre-Conditions Before Any New Work

### 0.1 Complete the v5.0 Model Revert (BLOCKING)

The rollback from the failed v5.0.2 is 72% done. Rows 2,400,001–3,110,072 still carry
v5.0.2 scores. This must be fixed first — all other analytics depend on correct scores.

**Method:** Use MCP `write_query` directly (NOT a Python script — WAL+MCP deadlock risk).
```sql
-- Verify the problem first:
SELECT COUNT(*) FROM contracts WHERE risk_model_version = 'v5.0.2' AND id > 2400000;
-- Should return ~710,072. If 0, revert is already done.

-- Restore from risk_score_v5 backup col is NOT reliable (pre-final scores).
-- Must restore from the Feb 17 backup ATTACH method used in the earlier session.
```

**After revert:**
```bash
cd backend
python -m scripts.precompute_stats
python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider
# Expected: 251 tests passing
# Verify: false negative rate = 0.6%, IPN Cartel critical ≈ 64.6%
```

### 0.2 Current API Endpoint Map (what already exists)

| Router | Prefix | Key Endpoints |
|--------|--------|---------------|
| vendors.py | `/vendors` | list, detail, contracts, institutions, risk-profile, related, asf-cases, **external-flags** (built, tables missing), risk-timeline, ai-summary |
| institutions.py | `/institutions` | list, detail, risk-timeline, risk-profile, contracts, vendors |
| analysis.py | `/analysis` | risk-overview, monthly-breakdown, year-over-year, sector-year-breakdown, price-hypotheses, structural-breaks, ml-anomalies |
| stats.py | `/stats` | fast-dashboard, sector-stats |
| investigation.py | `/investigation` | cases, leads, queue |
| network.py | `/network` | graph, communities |

### 0.3 Existing Tables Relevant to New Work

```
vendors          — id, name, rfc, sector_id, ...
contracts        — id, vendor_id, institution_id, amount_mxn, risk_score, risk_level, ...
ground_truth_cases    — id, case_name, case_type, sector_id, ...
ground_truth_vendors  — id, case_id, vendor_id, vendor_name_source, ...
asf_cases        — id, asf_report_id, entity_name, vendor_rfc, finding_type, amount_mxn, ...
sfp_sanctions    — DEFINED IN SCHEMA, NOT YET IN LIVE DB
rupc_vendors     — DEFINED IN SCHEMA, NOT YET IN LIVE DB
```

---

## 1. Fix: Activate the Already-Built External Flags System

### What Was Built (code exists, DB tables don't yet exist in live DB)

**Backend files already written:**
- `backend/scripts/load_sfp_sanctions.py`
- `backend/scripts/load_rupc.py`
- `backend/api/routers/vendors.py` — `GET /vendors/{id}/external-flags` (line ~956)

**Frontend files already deployed:**
- `frontend/src/pages/VendorProfile.tsx` — "External Records" tab (5th tab)
- `frontend/src/api/types.ts` — `VendorExternalFlags`, `SFPSanction`, `RUPCVendor`, `ASFCaseItem`
- `frontend/src/api/client.ts` — `vendorApi.getExternalFlags()`

### What Needs to Run (in order)

```bash
# Step 1: Create the two tables in the live DB
cd backend
python -c "
import sqlite3
conn = sqlite3.connect('RUBLI_NORMALIZED.db')
conn.executescript(open('scripts/etl_create_schema.py').read().split('\"\"\"')[1].split('sfp_sanctions')[1].split('idx_rupc_rfc')[0] + 'idx_rupc_rfc ON rupc_vendors(rfc);')
conn.close()
"
# SAFER: Just run the relevant CREATE TABLE statements directly via MCP write_query

# Step 2: Load SFP sanctions data
python -m scripts.load_sfp_sanctions
# If URL is stale: python -m scripts.load_sfp_sanctions --url <new_url_from_datos.gob.mx>

# Step 3: Load RUPC data
python -m scripts.load_rupc
# URL likely stale (CompraNet abolished). Try ComprasMX portal first.
# python -m scripts.load_rupc --url <comprasmx_rupc_url>

# Step 4: Verify via API
curl http://127.0.0.1:8001/api/v1/vendors/1/external-flags
```

### Current `ExternalFlagsResponse` Shape (already in vendors.py)

```json
{
  "vendor_id": 1234,
  "sfp_sanctions": [
    {
      "id": 1,
      "rfc": "ABC123456XYZ",
      "company_name": "CONSTRUCTORA EJEMPLO SA DE CV",
      "sanction_type": "inhabilitacion",
      "sanction_start": "2022-03-15",
      "sanction_end": "2025-03-15",
      "amount_mxn": 1500000.0,
      "authority": "SFP"
    }
  ],
  "rupc": {
    "rfc": "ABC123456XYZ",
    "company_name": "CONSTRUCTORA EJEMPLO SA DE CV",
    "compliance_grade": "A",
    "status": "activo",
    "registered_date": "2015-06-01",
    "expiry_date": "2026-06-01"
  },
  "asf_cases": [
    {
      "id": 1,
      "asf_report_id": "ASFPEF2023-1",
      "entity_name": "IMSS",
      "finding_type": "irregularidad",
      "amount_mxn": 4500000.0,
      "report_year": 2023,
      "report_url": "https://informe.asf.gob.mx/...",
      "summary": "Contrato adjudicado sin licitación..."
    }
  ]
}
```

---

## 2. New Integration: SAT EFOS/EDOS (Ghost Companies)

**Priority: HIGHEST.** Confirmed ghost companies by RFC from Mexico's tax authority.
This is the most powerful external signal available — directly upgrades ground truth.

### 2.1 Data Source

- **URL:** `http://omawww.sat.gob.mx/tramitesyservicios/Paginas/datos_abiertos_articulo69b.htm`
- **Format:** CSV download (full cumulative list)
- **Fields:** RFC, company name, EFOS stage, DOF publication date
- **Update frequency:** Monthly additions published in Diario Oficial de la Federación
- **Coverage:** 2014 onward (Article 69-B enacted 2014)
- **Stage values:**
  - `presunto` — presumed ghost company (under review)
  - `definitivo` — confirmed ghost company (blacklisted)
  - `favorecido` — company that received invoices from ghost company
  - `desvirtuado` — company that successfully challenged the classification

### 2.2 Database Schema

New table — add to `backend/scripts/etl_create_schema.py`:

```sql
CREATE TABLE IF NOT EXISTS sat_efos_vendors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rfc         TEXT NOT NULL,
    company_name TEXT NOT NULL,
    stage       TEXT NOT NULL,
    -- presunto / definitivo / favorecido / desvirtuado
    dof_date    TEXT,
    -- Date published in Diario Oficial de la Federacion
    loaded_at   TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sat_efos_rfc
    ON sat_efos_vendors(rfc);
CREATE INDEX IF NOT EXISTS idx_sat_efos_stage
    ON sat_efos_vendors(stage);
```

### 2.3 New Script: `backend/scripts/load_sat_efos.py`

```
Purpose  : Download SAT Art. 69-B list, insert into sat_efos_vendors
CLI      : python -m scripts.load_sat_efos [--url URL] [--dry-run]
Logic    :
  1. Download CSV from SAT datos abiertos URL
  2. Parse columns: rfc, nombre/razon_social, situacion/estado, fecha_dof
  3. Normalize stage to: presunto/definitivo/favorecido/desvirtuado
  4. INSERT OR REPLACE into sat_efos_vendors (UNIQUE on rfc)
  5. Log: N records inserted, N replaced
Fallback : If URL fails, log warning and exit 0 (don't crash pipeline)
```

### 2.4 API Changes

**Extend the existing `/vendors/{id}/external-flags` endpoint** (already in `vendors.py`).

Add a 4th query block inside `get_vendor_external_flags()`:

```python
# --- SAT EFOS ghost companies ---
result["sat_efos"] = None  # add to result dict
if vendor_rfc:
    try:
        row = cursor.execute(
            "SELECT rfc, company_name, stage, dof_date "
            "FROM sat_efos_vendors WHERE rfc = ?",
            (vendor_rfc,)
        ).fetchone()
        if row:
            result["sat_efos"] = dict(row)
    except Exception:
        pass
```

**Update `ExternalFlagsResponse` Pydantic model** (currently inline in vendors.py):

```python
class SATEFOSRecord(BaseModel):
    rfc: str
    company_name: str
    stage: str          # presunto / definitivo / favorecido / desvirtuado
    dof_date: Optional[str]

class ExternalFlagsResponse(BaseModel):
    vendor_id: int
    sfp_sanctions: list[SFPSanctionItem]
    rupc: Optional[RUPCItem]
    asf_cases: list[ASFCaseItem]
    sat_efos: Optional[SATEFOSRecord]   # NEW
```

**Updated response shape:**
```json
{
  "vendor_id": 1234,
  "sfp_sanctions": [...],
  "rupc": {...},
  "asf_cases": [...],
  "sat_efos": {
    "rfc": "ABC123456XYZ",
    "company_name": "EMPRESA FANTASMA SA DE CV",
    "stage": "definitivo",
    "dof_date": "2023-08-15"
  }
}
```

### 2.5 Frontend Changes

**File:** `frontend/src/pages/VendorProfile.tsx`

**In `ExternalFlagsPanel` component:**

Add a `SATEFOSRecord` type to `frontend/src/api/types.ts`:
```typescript
export interface SATEFOSRecord {
  rfc: string
  company_name: string
  stage: 'presunto' | 'definitivo' | 'favorecido' | 'desvirtuado'
  dof_date: string | null
}

// Update VendorExternalFlags:
export interface VendorExternalFlags {
  vendor_id: number
  sfp_sanctions: SFPSanction[]
  rupc: RUPCVendor | null
  asf_cases: ASFCaseItem[]
  sat_efos: SATEFOSRecord | null   // NEW
}
```

**Add SAT EFOS section in `ExternalFlagsPanel`:**

```tsx
{/* SAT Ghost Company List */}
{flags.sat_efos && (
  <div className="p-4 rounded border border-red-500/40 bg-red-950/20">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="h-4 w-4 text-red-400" />
      <span className="text-sm font-semibold text-red-300">
        SAT Art. 69-B — Ghost Company Registry
      </span>
      <span className={cn(
        "text-xs px-2 py-0.5 rounded font-mono uppercase",
        flags.sat_efos.stage === 'definitivo'
          ? "bg-red-900 text-red-200"
          : "bg-amber-900 text-amber-200"
      )}>
        {flags.sat_efos.stage}
      </span>
    </div>
    <p className="text-xs text-text-muted">
      RFC {flags.sat_efos.rfc} listed in SAT's Empresas Fantasma registry.
      {flags.sat_efos.dof_date && ` Published in DOF: ${flags.sat_efos.dof_date}.`}
    </p>
  </div>
)}
```

**Update the status banner** at the top of `ExternalFlagsPanel` to also check `sat_efos.stage === 'definitivo'` for the critical warning state.

### 2.6 Model Training Opportunity

Once `sat_efos_vendors` is populated, run this SQL to find SAT-confirmed ghost companies
in RUBLI's vendor table:
```sql
SELECT v.id, v.name, v.rfc, e.stage, COUNT(c.id) as contract_count
FROM vendors v
JOIN sat_efos_vendors e ON v.rfc = e.rfc
JOIN contracts c ON c.vendor_id = v.id
WHERE e.stage = 'definitivo'
GROUP BY v.id
HAVING contract_count >= 50
ORDER BY contract_count DESC;
```
Any vendor with stage `definitivo` and ≥50 contracts is a candidate for ground truth.
These are government-verified, not just statistically suspicious.

---

## 3. New Integration: ComprasMX 2025 Data

**Priority: HIGH.** CompraNet was abolished April 10, 2025. There is likely a data gap
in the current 3.1M dataset for contracts published only on ComprasMX after April 18, 2025.

### 3.1 Data Source

- **URL:** `https://upcp-compranet.buengobierno.gob.mx/informacion_ayuda/datos_abiertos.html`
- **Format:** CSV by year (same portal pattern as old CompraNet)
- **Critical question:** Are the field names the same as Structure D (2023-2025)?
  If yes → existing ETL pipeline works unchanged.
  If no → need to add Structure E mapping in `etl_pipeline.py`.

### 3.2 Investigation Steps (no code until structure is confirmed)

```
1. Download ComprasMX 2025 CSV
2. Check header row against Structure D fields in etl_pipeline.py
3. Profile with data-quality-guardian agent:
   - Row count (how many contracts from April 2025 onward?)
   - Max amount (reject > 100B MXN)
   - NULL rates on critical fields
   - Verify sector coverage (is Ramo still the classification field?)
4. If same structure: run existing ETL with the new CSV file
5. If new fields: identify mapping, update etl_pipeline.py before running
```

### 3.3 Potential ETL Change (only if needed)

In `backend/scripts/etl_pipeline.py`, the data structure is detected by inspecting the
header. Add Structure E detection if ComprasMX changed field names:

```python
# Existing structure detection (approximate):
def detect_structure(columns):
    if 'CODIGO_CONTRATO' in columns:  # Structure D indicator
        return 'D'
    # ... etc

# Add if needed:
    if 'codigo_expediente' in columns:  # hypothetical ComprasMX new field
        return 'E'
```

### 3.4 No New Tables or Endpoints Needed

ComprasMX data goes into the existing `contracts` table through the existing ETL pipeline.
No API or frontend changes required — the existing pages will automatically reflect new data.

---

## 4. New Integration: Vendor Name Deduplication via QuiénEsQuién.Wiki

**Priority: MEDIUM.** Targeted use only — not a full pipeline. Fetch name variants
for the top 3,000 vendors to improve dedup of Structure A/B (2002–2017) data.

### 4.1 Data Source

- **API:** `https://api.quienesquien.wiki/v3/companies?identifier=<RFC>&embed=1`
- **Auth:** None required
- **License:** CC-BY-SA 4.0 (must attribute PODER / Abrimos.info)
- **Known issue:** SSL certificate altname mismatch → use `verify=False` in requests
- **Status:** Data frozen at September 2022. Platform transferred from PODER to Abrimos.info
  in February 2026. API still accessible.

### 4.2 Database Schema

New table:
```sql
CREATE TABLE IF NOT EXISTS vendor_name_variants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id   INTEGER NOT NULL REFERENCES vendors(id),
    rfc         TEXT,
    variant_name TEXT NOT NULL,
    source      TEXT DEFAULT 'qqw',
    -- 'qqw' = QuienEsQuien, 'manual' = manually added, 'etl' = from ETL normalization
    added_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vnv_vendor_id
    ON vendor_name_variants(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vnv_rfc
    ON vendor_name_variants(rfc);
CREATE INDEX IF NOT EXISTS idx_vnv_name
    ON vendor_name_variants(variant_name COLLATE NOCASE);
```

### 4.3 New Script: `backend/scripts/enrich_vendor_names_qqw.py`

```
Purpose  : Query QQW API for top N vendors by contract value, store name variants
CLI      : python -m scripts.enrich_vendor_names_qqw [--limit 3000] [--dry-run]
Logic    :
  1. SELECT v.id, v.rfc, v.name, SUM(c.amount_mxn) as total
     FROM vendors v JOIN contracts c ON c.vendor_id = v.id
     WHERE v.rfc IS NOT NULL
     GROUP BY v.id ORDER BY total DESC LIMIT 3000
  2. For each vendor with RFC:
     GET https://api.quienesquien.wiki/v3/companies?identifier={rfc}&embed=1
     (verify=False for SSL issue)
  3. Extract name variants from response (company.names array or similar)
  4. INSERT OR IGNORE into vendor_name_variants
  5. sleep(0.5) between requests (rate limiting)
  6. Log progress every 100 vendors
Failure  : If QQW API returns error for a vendor, log and continue
```

### 4.4 API Changes

**Extend `GET /vendors/{id}` response** to include known name variants:

In `backend/api/routers/vendors.py`, inside `get_vendor()`, add:
```python
# Fetch name variants
variants = cursor.execute(
    "SELECT variant_name, source FROM vendor_name_variants WHERE vendor_id = ?",
    (vendor_id,)
).fetchall()
# Add to response dict:
vendor["name_variants"] = [dict(r) for r in variants]
```

**Update `VendorDetailResponse` model** in `backend/api/models/vendor.py`:
```python
class NameVariant(BaseModel):
    variant_name: str
    source: str

class VendorDetailResponse(BaseModel):
    # ... existing fields ...
    name_variants: list[NameVariant] = []   # NEW
```

**New search endpoint** — update `GET /vendors?q=` to also search `vendor_name_variants`:

In `list_vendors()` in `vendors.py`, extend the search WHERE clause:
```sql
-- Current (approximate):
WHERE v.name LIKE ?

-- Updated:
WHERE v.name LIKE ?
   OR v.id IN (
     SELECT vendor_id FROM vendor_name_variants
     WHERE variant_name LIKE ?
   )
```

### 4.5 Frontend Changes

**File:** `frontend/src/pages/VendorProfile.tsx`

In the vendor header section (top of the page, where vendor name is shown), add:
```tsx
{vendor.name_variants && vendor.name_variants.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    <span className="text-xs text-text-muted">Also known as:</span>
    {vendor.name_variants.slice(0, 5).map((v) => (
      <span key={v.variant_name}
            className="text-xs bg-surface-2 text-text-muted px-2 py-0.5 rounded">
        {v.variant_name}
      </span>
    ))}
  </div>
)}
```

**Attribution notice** — add a small footer note anywhere QQW data appears:
```tsx
<p className="text-xs text-text-muted">
  Name variants from{' '}
  <a href="https://quienesquienwiki.sociedad.info"
     target="_blank" rel="noopener noreferrer"
     className="underline">QuiénEsQuién.Wiki</a>
  {' '}(PODER / Abrimos.info) — CC-BY-SA 4.0
</p>
```

---

## 5. New Integration: ASF Institution-Level Findings

**Priority: MEDIUM-HIGH but complex.** This closes the model's primary blind spot:
execution-phase fraud (cost overruns, ghost workers, inflated invoices after award).

### 5.1 Data Source

- **URL:** `https://informe.asf.gob.mx/Documentos/Matriz/MDB_Consolidado.pdf`
- **Format:** PDF with tabular data (no CSV version exists)
- **Content:** Per-institution audit results — finding type, amount, observations count,
  solventadas (resolved), per fiscal year
- **Frequency:** Annual, delivered in 3 tranches. 2024 Cuenta Pública: delivered Feb 17, 2026
- **Join key:** Institution name → crosswalk to RUBLI's `ramo_code` → sector

### 5.2 New Dependency

```
pip install pdfplumber
# Add to backend/requirements.txt
```

### 5.3 Database Schema

```sql
CREATE TABLE IF NOT EXISTS asf_institution_findings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    ramo_code           INTEGER,
    institution_name    TEXT NOT NULL,
    audit_year          INTEGER NOT NULL,
    finding_type        TEXT,
    -- 'irregularidad', 'observacion', 'recuperacion', 'daño_patrimonio'
    amount_mxn          REAL,
    observations_total  INTEGER,
    observations_solved INTEGER,
    source_pdf          TEXT,
    -- filename of the PDF this was parsed from
    loaded_at           TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asf_if_ramo
    ON asf_institution_findings(ramo_code);
CREATE INDEX IF NOT EXISTS idx_asf_if_year
    ON asf_institution_findings(audit_year);
CREATE INDEX IF NOT EXISTS idx_asf_if_institution
    ON asf_institution_findings(institution_name);

-- Crosswalk table: maps ASF institution names to RUBLI ramo codes
-- (ASF uses free-text names; RUBLI uses numeric ramo codes)
CREATE TABLE IF NOT EXISTS asf_ramo_crosswalk (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    asf_institution_name TEXT NOT NULL,
    ramo_code           INTEGER,
    confidence          REAL DEFAULT 1.0,
    -- 1.0 = exact match, 0.8 = fuzzy match, manually review if < 0.7
    added_at            TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asf_crosswalk_name
    ON asf_ramo_crosswalk(asf_institution_name);
```

### 5.4 New Script: `backend/scripts/parse_asf_mdb.py`

```
Purpose  : Parse ASF MDB_Consolidado PDF, store institution-level findings
CLI      : python -m scripts.parse_asf_mdb [--pdf PATH] [--year YEAR] [--dry-run]
           python -m scripts.parse_asf_mdb --pdf downloads/MDB_Consolidado_2024.pdf --year 2024
Logic    :
  1. Open PDF with pdfplumber
  2. Extract tables page by page (pdfplumber.open(path).pages[n].extract_table())
  3. For each table row: parse institution name, finding type, amounts, observation counts
  4. Build name→ramo_code crosswalk using fuzzy match against known RUBLI institutions
  5. INSERT into asf_institution_findings
  6. Log: N findings inserted, N institutions matched, N unmatched (for manual review)
Defensive: If page layout doesn't match expected, log warning and skip page (don't crash)
```

### 5.5 API Changes

**New endpoint in `backend/api/routers/institutions.py`:**

```python
@router.get("/{institution_id:int}/asf-findings")
def get_institution_asf_findings(
    institution_id: int = Path(...),
    years: int = Query(10, description="How many years back to show"),
):
    """ASF audit findings for this institution over time."""
    # Response shape below
```

**Response shape:**
```json
{
  "institution_id": 42,
  "institution_name": "IMSS",
  "ramo_code": 19,
  "findings": [
    {
      "audit_year": 2023,
      "finding_type": "irregularidad",
      "amount_mxn": 4500000000.0,
      "observations_total": 47,
      "observations_solved": 12
    },
    {
      "audit_year": 2022,
      "finding_type": "irregularidad",
      "amount_mxn": 2800000000.0,
      "observations_total": 38,
      "observations_solved": 31
    }
  ],
  "total_amount_mxn": 7300000000.0,
  "coverage_years": [2018, 2019, 2020, 2021, 2022, 2023]
}
```

**New endpoint in `backend/api/routers/sectors.py`:**

```python
@router.get("/{sector_id}/asf-findings")
def get_sector_asf_findings(sector_id: int = Path(...)):
    """Aggregate ASF findings for all institutions in a sector."""
```

**Response shape:**
```json
{
  "sector_id": 1,
  "sector_name": "salud",
  "findings_by_year": [
    {"year": 2023, "amount_mxn": 12500000000.0, "institutions_audited": 8},
    {"year": 2022, "amount_mxn": 9800000000.0, "institutions_audited": 7}
  ],
  "top_institutions_by_amount": [
    {"institution_name": "IMSS", "total_mxn": 4500000000.0},
    {"institution_name": "ISSSTE", "total_mxn": 2100000000.0}
  ]
}
```

### 5.6 Frontend Changes

**File:** `frontend/src/pages/Sectors.tsx` (or equivalent sectors detail page)

Add an "ASF Audit Trail" section below the existing sector risk analysis:

```
[Existing: sector risk heatmap, top vendors, risk distribution]

[NEW: ASF Audit Findings — Execution Phase]
Subtitle: "Irregularities detected by ASF after contracts were awarded"

Chart: Grouped bar chart — RUBLI risk scores (award phase) vs ASF findings (execution phase)
       X-axis: years 2018–2024
       Left bars: avg RUBLI risk score for sector/year (from existing data)
       Right bars: ASF-reported irregularity amount (from asf_institution_findings)

Note: "High procurement risk + high ASF findings = double signal. High procurement
       risk + low ASF findings may indicate ASF hasn't audited this area yet."
```

**File:** `frontend/src/pages/VendorProfile.tsx` — "External Records" tab

Add institution ASF context: if a vendor's primary institution has ASF findings
in the same years as the vendor's contracts, surface that:

```tsx
{/* ASF Context for Primary Institution */}
<div className="text-xs text-text-muted border-t border-border/30 pt-3 mt-3">
  <span className="font-medium">Note:</span> ASF audit findings shown above are
  institution-level, not vendor-specific. A finding against IMSS does not mean
  this vendor was directly responsible — it indicates the institution had
  execution-phase irregularities during that period.
</div>
```

---

## 6. New Ground Truth Cases → v5.1 Model

**Priority: MEDIUM.** Three documented cases from 2024–2026 journalism/ASF.

### 6.1 Candidates

| Case ID | Case Name | Vendors | Sector | Source |
|---------|-----------|---------|--------|--------|
| 20 | IMSS Overpriced Medicines 2023-24 | Ethomedical, Abastecedora de Medicinas y Materiales | Salud (1) | MCCI |
| 21 | Tren Maya Direct Award Network | FONATUR subsidiaries + key contractors | Infraestructura (3) | ASF CP2024, PODER |
| 22 | Sedena Contractor Irregularities | Sedena commercial arm | Infraestructura (3) | ASF Nov 2025 |

### 6.2 Validation Queries (run before adding to training)

For each candidate, run this before adding to ground truth:

```sql
-- Step 1: Find the vendor
SELECT id, name, rfc FROM vendors
WHERE name LIKE '%ETHOMEDICAL%' OR name LIKE '%ABASTECEDORA DE MEDICINAS%';

-- Step 2: Count contracts (need ≥50)
SELECT v.id, v.name, COUNT(c.id) as contract_count, SUM(c.amount_mxn) as total_mxn
FROM vendors v
JOIN contracts c ON c.vendor_id = v.id
WHERE v.id IN (...)  -- IDs from Step 1
GROUP BY v.id;

-- Step 3: Confirm sector alignment
SELECT DISTINCT c.sector_id, COUNT(*) as cnt
FROM contracts c
WHERE c.vendor_id IN (...)
GROUP BY c.sector_id;

-- Step 4: Check year distribution (need enough post-2020 for test set)
SELECT contract_year, COUNT(*) FROM contracts
WHERE vendor_id IN (...)
GROUP BY contract_year ORDER BY contract_year;
```

### 6.3 Ground Truth INSERT Pattern

If validation passes (≥50 contracts, correct sector, post-2020 contracts exist):

```sql
-- Add the case
INSERT INTO ground_truth_cases
    (case_name, case_type, sector_id, description, year_start, year_end,
     total_amount_mxn, source_url, added_version)
VALUES
    ('IMSS Overpriced Medicines 2023-2024', 'overpricing', 1,
     'MCCI investigation: Ethomedical and Abastecedora de Medicinas y Materiales
      won IMSS contracts with prices up to 885% above market rate.',
     2021, 2024, NULL,
     'https://contralacorrupcion.mx/...',
     'v5.1');

-- Add each vendor
INSERT INTO ground_truth_vendors
    (case_id, vendor_id, vendor_name_source, match_method)
VALUES
    (20, <vendor_id>, 'Ethomedical', 'name_match');
```

### 6.4 Retraining Protocol

```bash
# BACKUP FIRST — always
cp backend/RUBLI_NORMALIZED.db backend/backups/RUBLI_pre_v5.1_$(date +%Y%m%d_%H%M%S).db

# Retrain
cd backend
python -m scripts.calibrate_risk_model_v5

# Review output before scoring all contracts:
# - Check: Train AUC ≥ 0.967
# - Check: Test AUC ≥ 0.960
# - Check: False negative rate ≤ 1.0% on existing 15 cases
# - Check: Each new case detection ≥ 90% medium+
# IF ANY CHECK FAILS: stop, investigate, do not score

# If all checks pass:
python -m scripts.calculate_risk_scores_v5 --batch-size 100000
python -m scripts.precompute_stats
```

### 6.5 Regression Guard

After scoring, run:
```sql
-- IPN Cartel de la Limpieza (Case 10) — canary for small-vendor detection
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
    ROUND(100.0 * SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) / COUNT(*), 1) as critical_pct
FROM contracts c
JOIN ground_truth_vendors gtv ON gtv.vendor_id = c.vendor_id
JOIN ground_truth_cases gtc ON gtc.id = gtv.case_id
WHERE gtc.case_name = 'IPN Cartel de la Limpieza';
-- Expected: critical_pct ≈ 64.6%
-- If critical_pct < 50%: REVERT IMMEDIATELY (this is the v5.0.2 regression signal)
```

---

## 7. New Integration: SFP SIDEC Complaints

**Priority: LOW.** Institution-level complaint volume as a supplementary risk signal.

### 7.1 Data Source

- **URL:** `https://datos.gob.mx/busca/dataset/quejas_denuncias_ciudadanas_sidec`
- **Format:** CSV, monthly, coverage 2024 onward only
- **Fields:** institution name, complaint type, reception date, state, channel

### 7.2 Database Schema

```sql
CREATE TABLE IF NOT EXISTS sidec_complaints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_name TEXT NOT NULL,
    institution_id  INTEGER REFERENCES institutions(id),
    -- NULL if not matched to RUBLI institution
    complaint_type  TEXT,
    complaint_date  TEXT,
    channel         TEXT,
    state           TEXT,
    loaded_at       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sidec_institution
    ON sidec_complaints(institution_id);
CREATE INDEX IF NOT EXISTS idx_sidec_date
    ON sidec_complaints(complaint_date);
```

### 7.3 New Script: `backend/scripts/load_sidec.py`

```
Purpose  : Download SIDEC CSV, match institutions, insert into sidec_complaints
CLI      : python -m scripts.load_sidec [--url URL] [--dry-run]
Logic    :
  1. Download CSV from datos.gob.mx
  2. For each row: fuzzy-match institution_name to RUBLI institutions table
  3. Store institution_id where match confidence > 0.8
  4. INSERT into sidec_complaints
```

### 7.4 API Changes

**Extend `GET /institutions/{id}` response** to include complaint volume:

```python
# Inside get_institution()
complaint_counts = cursor.execute("""
    SELECT
        strftime('%Y', complaint_date) as year,
        COUNT(*) as count
    FROM sidec_complaints
    WHERE institution_id = ?
    GROUP BY year ORDER BY year
""", (institution_id,)).fetchall()
institution["complaint_trend"] = [dict(r) for r in complaint_counts]
```

**Updated `InstitutionDetailResponse`:**
```python
class InstitutionDetailResponse(BaseModel):
    # ... existing fields ...
    complaint_trend: list[dict] = []  # [{year: "2024", count: 12}, ...]
```

### 7.5 Frontend Changes

**File:** Institution detail page (wherever institution profiles are shown)

Small sparkline below the institution name showing complaint volume by year:
```tsx
{institution.complaint_trend?.length > 0 && (
  <div className="flex items-center gap-2 text-xs text-text-muted">
    <span>Citizen complaints (SIDEC):</span>
    <MiniSparkline data={institution.complaint_trend} valueKey="count" />
  </div>
)}
```

---

## 8. Summary: All New Tables

| Table | Purpose | Script | Priority |
|-------|---------|--------|----------|
| `sfp_sanctions` | SFP blacklisted companies | `load_sfp_sanctions.py` | **DONE — just needs running** |
| `rupc_vendors` | RUPC compliance grades | `load_rupc.py` | **DONE — just needs running** |
| `sat_efos_vendors` | SAT ghost company list | `load_sat_efos.py` (to build) | HIGH |
| `vendor_name_variants` | QQW name dedup variants | `enrich_vendor_names_qqw.py` (to build) | MEDIUM |
| `asf_institution_findings` | ASF PDF findings | `parse_asf_mdb.py` (to build) | MEDIUM-HIGH |
| `asf_ramo_crosswalk` | ASF→RUBLI institution mapping | Created during `parse_asf_mdb.py` | MEDIUM-HIGH |
| `sidec_complaints` | SFP citizen complaints | `load_sidec.py` (to build) | LOW |

---

## 9. Summary: All New/Modified API Endpoints

| Method | Path | Change | File | Priority |
|--------|------|--------|------|----------|
| GET | `/vendors/{id}/external-flags` | Add `sat_efos` field | vendors.py | HIGH |
| GET | `/vendors/{id}` | Add `name_variants` field | vendors.py | MEDIUM |
| GET | `/vendors` | Search also in name_variants | vendors.py | MEDIUM |
| GET | `/institutions/{id}/asf-findings` | NEW endpoint | institutions.py | MEDIUM-HIGH |
| GET | `/sectors/{id}/asf-findings` | NEW endpoint | sectors.py | MEDIUM-HIGH |
| GET | `/institutions/{id}` | Add `complaint_trend` field | institutions.py | LOW |

---

## 10. Summary: All Frontend Changes

| File | Change | Depends On | Priority |
|------|--------|-----------|----------|
| `VendorProfile.tsx` | SAT EFOS badge in External Records tab | sat_efos_vendors table | HIGH |
| `VendorProfile.tsx` | Name variants in vendor header | vendor_name_variants table | MEDIUM |
| `api/types.ts` | Add `SATEFOSRecord`, update `VendorExternalFlags`, add `NameVariant` | Backend model changes | HIGH |
| `Sectors.tsx` | ASF audit trail chart (award risk vs execution findings) | asf_institution_findings | MEDIUM-HIGH |
| Institution detail page | Complaint volume sparkline | sidec_complaints | LOW |

---

## 11. Execution Order After Audit

```
WEEK 1
  Day 1  Complete v5.0 revert (rows 2.4M–3.1M) + precompute_stats + 251 tests green
  Day 2  Create sfp_sanctions + rupc_vendors in live DB
         Run load_sfp_sanctions.py + load_rupc.py
         Test External Records tab in browser
  Day 3  Build load_sat_efos.py
         Run + verify SAT ghost company matches
         Add sat_efos to /external-flags endpoint + frontend badge
  Day 4  Audit ComprasMX 2025 data (download + structure check)
         If same structure: run ETL on 2025 CSV

WEEK 2
  Day 5  Build enrich_vendor_names_qqw.py
         Run for top 3,000 RFC-matched vendors (ETA ~90 min with 0.5s sleep)
         Verify name_variants appear in VendorProfile header
  Day 6  Investigate Ethomedical + Abastecedora de Medicinas vendor IDs in RUBLI
         Validate contract count ≥ 50 and sector alignment
         If qualified: add as ground truth case 20

WEEK 3
  Day 7  Investigate FONATUR Tren Maya contractors in RUBLI
  Day 8  If ≥2 new cases qualified: backup + retrain v5.1
         Run regression guard query (IPN Cartel critical_pct ≥ 50%)
         If passes: score all contracts + precompute_stats

MONTH 2
  Week 5  Build parse_asf_mdb.py (add pdfplumber to requirements.txt)
          Download MDB_Consolidado.pdf for 2022, 2023, 2024
          Parse + build asf_ramo_crosswalk manually for unmatched institutions
  Week 6  Add /institutions/{id}/asf-findings endpoint
          Add ASF chart to Sectors page
  Week 7  Build load_sidec.py (low priority, do last)
```

---

## 12. Literature-Derived Features: Immediate (Week 1–2 Post-Audit)

*Source: RUBLI_LITERATURE_REVIEW.md, Part 8 — Prioritized Implementation.*
*All features in this section are computable from existing RUBLI data. No new data sources required.*

---

### 12.1 Election Year & Sexenio Position Flags

**Literature basis:** Persson & Tabellini (2003), Shi & Svensson (2006) — political budget cycles
empirically validated for presidential democracies. Mexico shows procurement volume and composition
shifts in election years and late-sexenio periods.

**Effort:** 1 day (DB computation) + 1 day (frontend overlay). Low complexity.

#### 12.1.1 Database Schema

Add two columns to `contracts` (or compute on-the-fly if preferred):

```sql
-- Option A: Precompute and store (faster queries, simpler frontend)
ALTER TABLE contracts ADD COLUMN is_election_year INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN sexenio_year INTEGER;  -- 1 through 6

-- Populate is_election_year
UPDATE contracts SET is_election_year = 1
WHERE contract_year IN (2006, 2012, 2018, 2024);

-- Populate sexenio_year (administration start years: 2000, 2006, 2012, 2018, 2024)
UPDATE contracts SET sexenio_year =
    CASE
        WHEN contract_year BETWEEN 2000 AND 2005 THEN (contract_year - 2000) + 1
        WHEN contract_year BETWEEN 2006 AND 2011 THEN (contract_year - 2006) + 1
        WHEN contract_year BETWEEN 2012 AND 2017 THEN (contract_year - 2012) + 1
        WHEN contract_year BETWEEN 2018 AND 2023 THEN (contract_year - 2018) + 1
        WHEN contract_year >= 2024             THEN (contract_year - 2024) + 1
        ELSE NULL
    END;
```

No new indexes needed — `contract_year` is already indexed.

#### 12.1.2 New `precomputed_stats` Entry

Add to `backend/scripts/precompute_stats.py`:

```python
# Political cycle: average risk score by election year vs. non-election year, by sexenio year
political_cycle_stats = conn.execute("""
    SELECT
        contract_year,
        is_election_year,
        sexenio_year,
        COUNT(*) as contract_count,
        ROUND(AVG(risk_score), 4) as avg_risk_score,
        ROUND(100.0 * SUM(is_direct_award) / COUNT(*), 1) as direct_award_pct,
        ROUND(100.0 * SUM(CASE WHEN risk_level IN ('critical','high') THEN 1 ELSE 0 END) / COUNT(*), 1) as high_risk_pct
    FROM contracts
    WHERE contract_year IS NOT NULL
    GROUP BY contract_year, is_election_year, sexenio_year
    ORDER BY contract_year
""").fetchall()

conn.execute("DELETE FROM precomputed_stats WHERE key LIKE 'political_cycle_%'")
for row in political_cycle_stats:
    conn.execute(
        "INSERT INTO precomputed_stats (key, value) VALUES (?, ?)",
        (f"political_cycle_{row['contract_year']}", json.dumps(dict(row)))
    )
```

#### 12.1.3 API Changes

**Extend `GET /stats/fast-dashboard`** (`backend/api/routers/stats.py`):

Add `political_cycle_summary` to `FastDashboardResponse`:

```python
class PoliticalCyclePoint(BaseModel):
    contract_year: int
    is_election_year: int
    sexenio_year: Optional[int]
    avg_risk_score: float
    high_risk_pct: float
    direct_award_pct: float

class FastDashboardResponse(BaseModel):
    # ... existing fields ...
    political_cycle: list[PoliticalCyclePoint] = []   # NEW
```

Fetch from `precomputed_stats`:
```python
political_cycle = [
    json.loads(row["value"])
    for row in cursor.execute(
        "SELECT value FROM precomputed_stats WHERE key LIKE 'political_cycle_%'"
    ).fetchall()
]
```

**New endpoint in `backend/api/routers/analysis.py`:**

```python
@router.get("/political-cycle")
def get_political_cycle_analysis():
    """Risk patterns by election year and sexenio position."""
```

Response shape:
```json
{
  "election_year_effect": {
    "election_years_avg_risk": 0.147,
    "non_election_years_avg_risk": 0.121,
    "difference": 0.026,
    "election_years": [2006, 2012, 2018, 2024]
  },
  "sexenio_year_breakdown": [
    {"sexenio_year": 1, "avg_risk": 0.118, "avg_direct_award_pct": 68.2},
    {"sexenio_year": 2, "avg_risk": 0.121, "avg_direct_award_pct": 70.1},
    {"sexenio_year": 6, "avg_risk": 0.148, "avg_direct_award_pct": 74.3}
  ],
  "q4_election_interaction": {
    "q4_election_year_avg_risk": 0.168,
    "q4_normal_year_avg_risk": 0.141,
    "note": "Q4 in election years vs non-election years"
  }
}
```

#### 12.1.4 Frontend Changes

**File:** `frontend/src/pages/Administrations.tsx`

In the existing Patterns tab (already has structural breaks and admin transition markers), add an electoral calendar layer:

```tsx
// Constants
const ELECTION_YEARS = [2006, 2012, 2018, 2024]

// In the existing ComposedChart:
{ELECTION_YEARS.map(year => (
  <ReferenceLine
    key={`election-${year}`}
    x={year}
    stroke="#f59e0b"
    strokeWidth={2}
    strokeDasharray="6 3"
    label={{ value: '🗳', position: 'top', fontSize: 14 }}
  />
))}
```

**Add a "Political Cycle" section** below the existing admin patterns chart:

```
[NEW: Political Budget Cycle — Empirical Test]
Source: Persson & Tabellini (2003), Shi & Svensson (2006)

Left card: Bar chart — Average risk score by sexenio year (1-6)
           "Does corruption peak in the final years of an administration?"

Right card: Bar chart — Election vs. non-election year comparison
            "Average direct award rate, Q4 spending share, high-risk contract %"

Callout box: The political budget cycle is empirically validated for Mexico's
             presidential system. RUBLI data [confirms / does not confirm] this
             pattern — year [X] shows the highest average risk score at [Y].
```

---

### 12.2 Publication Delay Z-Score

**Literature basis:** Prozorro analytics (Ukraine), Fazekas et al. — publication delay is a
transparency indicator. Long delays (>90 days) between award and COMPRANET publication suggest
retroactive data entry.

**Effort:** 2 days. Data already exists in COMPRANET. Low-medium complexity.

#### 12.2.1 Database / Computation

No new table. Compute as a z-score feature in `contract_z_features` by adding it
to `backend/scripts/compute_z_features.py`:

```python
# Add publication_delay_days to factor computation
# Source field: date_diff(publication_date, award_date) — field names vary by structure
# Structure D: fecha_publicacion - fecha_fallo
# Structure C: similar fields, check column mapping in etl_pipeline.py

# In compute_z_features.py, add to the feature extraction loop:
publication_delay = (
    publication_date - award_date
).days if (publication_date and award_date) else None

# Then z-score normalize vs sector/year baseline:
# z_publication_delay = (delay - mean_delay(sector, year)) / std_delay(sector, year)
```

**Flag extreme delays:**
```sql
-- Add to contracts table for direct querying:
ALTER TABLE contracts ADD COLUMN publication_delay_days INTEGER;

UPDATE contracts SET publication_delay_days =
    CAST(julianday(publication_date) - julianday(award_date) AS INTEGER)
WHERE publication_date IS NOT NULL AND award_date IS NOT NULL
  AND award_date < publication_date;  -- Sanity: only forward delays
```

#### 12.2.2 API Changes

**Extend `GET /contracts/{id}` response** in `backend/api/routers/contracts.py`:

Add `publication_delay_days` to the contract detail response. No new endpoint needed
if the field is stored in the contracts table.

**New aggregation endpoint** in `backend/api/routers/analysis.py`:

```python
@router.get("/transparency/publication-delays")
def get_publication_delay_analysis(
    sector_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None)
):
    """Distribution of publication delays — transparency health indicator."""
```

Response shape:
```json
{
  "summary": {
    "median_delay_days": 12,
    "pct_over_90_days": 3.2,
    "pct_same_day": 18.4,
    "worst_institution": {"name": "SEDENA", "median_delay": 187}
  },
  "distribution": [
    {"bucket": "0-7 days", "count": 450000, "pct": 14.5},
    {"bucket": "8-30 days", "count": 1200000, "pct": 38.6},
    {"bucket": "31-90 days", "count": 900000, "pct": 28.9},
    {"bucket": ">90 days", "count": 99000, "pct": 3.2}
  ],
  "by_sector": [...]
}
```

#### 12.2.3 Frontend Changes

**File:** `frontend/src/pages/Dashboard.tsx`

Add a "Transparency Health" card to the existing dashboard grid:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm">Publication Transparency</CardTitle>
    <p className="text-xs text-text-muted">
      Time between contract award and COMPRANET publication
    </p>
  </CardHeader>
  <CardContent>
    <div className="flex gap-4 text-center">
      <div>
        <p className="text-2xl font-mono">{stats.median_delay_days}d</p>
        <p className="text-xs text-text-muted">Median delay</p>
      </div>
      <div>
        <p className="text-2xl font-mono text-amber-400">
          {stats.pct_over_90_days}%
        </p>
        <p className="text-xs text-text-muted">Published >90 days late</p>
      </div>
    </div>
    <p className="text-xs text-text-muted mt-2">
      Prozorro (Ukraine) uses publication delay as a transparency red flag.
      Contracts published >90 days after award suggest retroactive data entry.
    </p>
  </CardContent>
</Card>
```

---

### 12.3 Fazekas-Style Institution Scatter Chart

**Literature basis:** Fazekas & Tóth (2016), Fazekas & Kocsis (2020) — the Corruption Risk Index
(CRI) computed at institution level is more predictive than contract-level scores. The canonical
visualization: direct award rate (X) vs. single bid rate (Y) per institution, bubble = total value.

**Effort:** 2 days. No new data — all fields already in contracts table. Pure frontend + API.

#### 12.3.1 API Changes

**New endpoint in `backend/api/routers/institutions.py`:**

```python
@router.get("/cri-scatter")
def get_institution_cri_scatter(
    year: Optional[int] = Query(None, description="Filter to specific year"),
    sector_id: Optional[int] = Query(None),
    min_contracts: int = Query(50, description="Minimum contracts for inclusion")
):
    """Fazekas-style Corruption Risk Index scatter data for all institutions."""
```

Response shape:
```json
{
  "year": 2023,
  "institutions": [
    {
      "institution_id": 42,
      "institution_name": "IMSS",
      "sector_id": 1,
      "direct_award_pct": 74.2,
      "single_bid_pct": 18.3,
      "total_value_mxn": 85000000000,
      "contract_count": 9200,
      "avg_risk_score": 0.312,
      "risk_level": "high"
    }
  ],
  "quadrant_thresholds": {
    "x_threshold": 50.0,
    "y_threshold": 15.0,
    "note": "Top-right quadrant = high direct award + high single bid = maximum CRI risk"
  }
}
```

SQL for the endpoint:
```sql
SELECT
    i.id as institution_id,
    i.name as institution_name,
    i.sector_id,
    ROUND(100.0 * SUM(c.is_direct_award) / COUNT(*), 1) as direct_award_pct,
    ROUND(100.0 * SUM(CASE WHEN c.is_single_bid = 1 AND c.is_direct_award = 0 THEN 1 ELSE 0 END)
          / NULLIF(SUM(CASE WHEN c.is_direct_award = 0 THEN 1 ELSE 0 END), 0), 1) as single_bid_pct,
    SUM(c.amount_mxn) as total_value_mxn,
    COUNT(*) as contract_count,
    ROUND(AVG(c.risk_score), 3) as avg_risk_score
FROM institutions i
JOIN contracts c ON c.institution_id = i.id
WHERE (? IS NULL OR c.contract_year = ?)
  AND (? IS NULL OR i.sector_id = ?)
GROUP BY i.id
HAVING contract_count >= ?
ORDER BY direct_award_pct DESC
```

#### 12.3.2 Frontend Changes

**File:** `frontend/src/pages/Sectors.tsx` (or a new `Institutions.tsx` overview page)

Add a "CRI Scatter" tab or section:

```tsx
// Uses recharts ScatterChart
<ScatterChart>
  <XAxis
    dataKey="direct_award_pct"
    name="Direct Award %"
    label={{ value: "Direct Award Rate (%)", position: "insideBottom" }}
  />
  <YAxis
    dataKey="single_bid_pct"
    name="Single Bid %"
    label={{ value: "Single Bid Rate (%)", angle: -90 }}
  />
  <Scatter
    data={criData.institutions}
    fill="#8b5cf6"
    name="Institutions"
    // bubble size = Math.sqrt(total_value_mxn) normalized
  />
  {/* Quadrant dividers */}
  <ReferenceLine x={50} stroke="#ffffff20" strokeDasharray="4 4" />
  <ReferenceLine y={15} stroke="#ffffff20" strokeDasharray="4 4" />
  <Tooltip content={<CRITooltip />} />
</ScatterChart>
```

Add a quadrant legend:
```
Top-right:  HIGH risk — above-average direct award + above-average single bid
Top-left:   MEDIUM — competitive but winner uncontested
Bottom-right: MEDIUM — direct awards without single-bid pattern
Bottom-left:  LOWER risk — competitive with multiple bidders
```

Attribution: "Visualization based on Fazekas & Tóth (2016) Corruption Risk Index methodology."

---

## 13. Literature-Derived Features: Medium-Term (Month 1–2 Post-Audit)

---

### 13.1 Vendor Tenure at Institution

**Literature basis:** Coviello & Gagliarducci (2017) — "Tenure in Office and Public Procurement."
*AEJ: Applied Economics.* Long-tenured vendors at a single institution show higher single-bid rates
and higher prices. RUBLI equivalent: years since a vendor's first contract at a given institution.

**Effort:** 1 week. Requires precomputation of first-contract year per vendor-institution pair.

#### 13.1.1 Database Schema

New precomputed table (don't compute per-query — 3.1M contracts × many vendor-institution pairs):

```sql
CREATE TABLE IF NOT EXISTS vendor_institution_tenure (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id       INTEGER NOT NULL REFERENCES vendors(id),
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    first_contract_year  INTEGER NOT NULL,
    last_contract_year   INTEGER NOT NULL,
    total_contracts INTEGER NOT NULL,
    total_amount_mxn     REAL,
    win_rate_at_institution REAL,  -- contracts won / procedures bid at this institution
    computed_at     TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vit_vendor_inst
    ON vendor_institution_tenure(vendor_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_vit_vendor
    ON vendor_institution_tenure(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vit_institution
    ON vendor_institution_tenure(institution_id);
```

New script: `backend/scripts/compute_vendor_tenure.py`

```
Purpose  : Precompute vendor-institution tenure for all vendor-institution pairs
CLI      : python -m scripts.compute_vendor_tenure [--min-contracts 3]
Logic    :
  1. SELECT vendor_id, institution_id, MIN(contract_year), MAX(contract_year),
           COUNT(*), SUM(amount_mxn)
     FROM contracts
     GROUP BY vendor_id, institution_id
     HAVING COUNT(*) >= 3
  2. INSERT OR REPLACE into vendor_institution_tenure
  3. Log: N pairs computed
Runtime  : ~5-10 minutes on 3.1M contracts
```

#### 13.1.2 New v5.1 Feature: `z_vendor_tenure`

Add to `backend/scripts/compute_z_features.py`:

```python
# For each contract, look up vendor-institution tenure
# tenure = contract_year - first_contract_year(vendor, institution)
# z_vendor_tenure = (tenure - mean_tenure(sector, year)) / std_tenure(sector, year)
```

This becomes feature 17 in the v5.1 model, replacing or augmenting `win_rate`.

#### 13.1.3 API Changes

**Extend `GET /vendors/{id}` response:**

Add a `top_institutions` array showing the vendor's longest tenures:

```json
{
  "top_institutions": [
    {
      "institution_id": 42,
      "institution_name": "IMSS",
      "tenure_years": 18,
      "total_contracts": 9366,
      "total_amount_mxn": 4500000000,
      "win_rate": 0.92
    }
  ]
}
```

**Extend `GET /institutions/{id}` response:**

Add a `longest_tenured_vendors` array:

```json
{
  "longest_tenured_vendors": [
    {
      "vendor_id": 15,
      "vendor_name": "PISA FARMACÉUTICA",
      "tenure_years": 22,
      "total_contracts": 9366,
      "risk_score_avg": 0.972
    }
  ]
}
```

#### 13.1.4 Frontend Changes

**File:** `frontend/src/pages/VendorProfile.tsx`

In the Overview tab, add a "Institutional Relationships" section:

```tsx
<div>
  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
    Institutional Relationships
  </h3>
  <div className="text-xs text-text-muted mb-1 italic">
    Based on Coviello & Gagliarducci (2017): long-tenured vendor relationships
    correlate with higher single-bid rates and prices.
  </div>
  {vendor.top_institutions?.map(inst => (
    <div key={inst.institution_id}
         className="flex items-center justify-between py-1 border-b border-border/20">
      <span>{inst.institution_name}</span>
      <span className="font-mono text-xs">
        {inst.tenure_years} yrs · {inst.total_contracts.toLocaleString()} contracts
      </span>
      {inst.tenure_years > 15 && (
        <span className="text-xs bg-amber-900/40 text-amber-300 px-1 rounded">
          LONG TENURE
        </span>
      )}
    </div>
  ))}
</div>
```

---

### 13.2 Co-Bidding Triangle Clustering Coefficient

**Literature basis:** Wachs, Fazekas & Kertész (2021) — triangles in co-bidding networks are more
predictive of active collusion than bilateral co-bidding rates. A vendor at the center of many
triangles is a ring coordinator.

**Effort:** 3 days. Extends existing `build_vendor_graph.py`.

#### 13.2.1 Database Changes

Add one column to `vendors` table (or a new table if we want history):

```sql
ALTER TABLE vendors ADD COLUMN cobid_clustering_coeff REAL;
ALTER TABLE vendors ADD COLUMN cobid_triangle_count INTEGER;
```

Update via new computation step in `build_vendor_graph.py`:

```python
import networkx as nx

# After building the co-bidding graph G_cobid:
clustering_coeffs = nx.clustering(G_cobid)
triangles = nx.triangles(G_cobid)

# Write back to DB
for vendor_id, coeff in clustering_coeffs.items():
    cursor.execute("""
        UPDATE vendors
        SET cobid_clustering_coeff = ?,
            cobid_triangle_count = ?
        WHERE id = ?
    """, (coeff, triangles[vendor_id], vendor_id))

# Note: nx.clustering() is O(m) for unweighted graphs. ~786K edges ≈ seconds.
```

#### 13.2.2 New v5.1 Feature: `z_cobid_clustering`

Add to `backend/scripts/compute_z_features.py`:

```python
# z_cobid_clustering = (coeff - mean_coeff(sector)) / std_coeff(sector)
# High clustering coefficient = central in tight co-bidding triangle = collusion ring
```

**Expected model impact:** In Wachs et al. (2021), clustering coefficient improved collusion
detection AUC by +0.04 beyond bilateral co-bidding rates. Since `co_bid_rate` is regularized
to zero in v5.0 (bilateral rate has no signal), the triangle-based clustering may succeed
where bilateral failed.

#### 13.2.3 API Changes

**Extend `/network/graph` endpoint** in `backend/api/routers/network.py`:

Add `clustering_coeff` and `triangle_count` to each vendor node in the graph response.

**Extend `GET /vendors/{id}` response:**

```json
{
  "network_stats": {
    "cobid_clustering_coeff": 0.73,
    "cobid_triangle_count": 187,
    "interpretation": "High clustering coefficient: this vendor appears in tight co-bidding triangles, suggesting coordinated bidding behavior."
  }
}
```

#### 13.2.4 Frontend Changes

**File:** `frontend/src/pages/NetworkGraph.tsx`

In the vendor SidePanel, add a "Network Position" section:

```tsx
{vendor.network_stats?.cobid_clustering_coeff > 0.5 && (
  <div className="text-xs p-2 rounded bg-red-950/30 border border-red-500/30">
    <strong>Triangle Hub Alert:</strong> This vendor appears in{' '}
    {vendor.network_stats.cobid_triangle_count} co-bidding triangles.
    High triangle density is a validated collusion ring indicator
    (Wachs, Fazekas & Kertész 2021).
  </div>
)}
```

---

### 13.3 Threshold Proximity Score

**Literature basis:** Coviello, Guglielmo & Spagnolo (2018), Szucs (2023) — contracts just below
the legal competitive procurement threshold are overrepresented, indicating threshold gaming.
Mexico's LAASSP sets specific value thresholds above which licitación pública is mandatory.

**Effort:** 1 week. Requires building a historical LAASSP threshold lookup table.

#### 13.3.1 LAASSP Threshold Reference Table

New static table (manually populated from LAASSP / SFP circulars):

```sql
CREATE TABLE IF NOT EXISTS laassp_thresholds (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    year            INTEGER NOT NULL,
    institution_type TEXT NOT NULL,
    -- 'federal_ministry', 'decentralized', 'state_enterprise'
    contract_type   TEXT NOT NULL,
    -- 'services', 'goods', 'public_works'
    direct_award_max_mxn   REAL NOT NULL,
    -- Max value for direct award without competition
    three_quotes_max_mxn   REAL,
    -- Max value for "tres cotizaciones" (invitation to 3) procedure
    open_required_above_mxn REAL NOT NULL
    -- Licitación pública required above this
);

-- Example values (verify from SFP annual circulars — these change yearly):
INSERT INTO laassp_thresholds VALUES
    (2024, 'federal_ministry', 'services',     320000, 2400000, 2400000),
    (2024, 'federal_ministry', 'goods',        520000, 3200000, 3200000),
    (2024, 'federal_ministry', 'public_works', 2300000, NULL, 7900000),
    (2023, 'federal_ministry', 'services',     300000, 2200000, 2200000);
    -- Continue for all years 2002-2024 and institution types
```

#### 13.3.2 Computation

New script: `backend/scripts/compute_threshold_proximity.py`

```
Purpose  : Compute threshold proximity score for each contract
CLI      : python -m scripts.compute_threshold_proximity
Logic    :
  1. For each contract: look up applicable threshold from laassp_thresholds
     using contract_year + institution_type + contract_category
  2. Compute: pct_below_threshold = (threshold - amount_mxn) / threshold
  3. Flag: is_threshold_gaming = 1 if 0 < pct_below_threshold < 0.05
             (contract within 5% below the licitación pública threshold)
  4. Store: UPDATE contracts SET threshold_proximity = pct_below_threshold,
                                  is_threshold_gaming = is_threshold_gaming
Note     : Only computable when contract amount is known and institution type is mapped.
           NULL for direct awards (which are already below threshold by definition).
```

Add columns to `contracts`:
```sql
ALTER TABLE contracts ADD COLUMN threshold_proximity REAL;
-- Fraction below threshold: 0.03 means 3% below the licitación threshold
-- NULL if not computable
ALTER TABLE contracts ADD COLUMN is_threshold_gaming INTEGER DEFAULT 0;
```

#### 13.3.3 New v5.1 Feature: `z_threshold_proximity`

Add to `compute_z_features.py`:

```python
# Only for competitive procedures (is_direct_award = 0)
# z_threshold_proximity computed vs sector/year baseline
# High score = contract very close to but below the threshold
```

#### 13.3.4 API & Frontend Changes

**Extend `GET /contracts/{id}`** to include `threshold_proximity` and `is_threshold_gaming`.

**In contract detail view** — add a flag:

```tsx
{contract.is_threshold_gaming === 1 && (
  <div className="text-xs p-1 bg-amber-900/20 text-amber-300 rounded">
    Threshold Alert: Contract value is within 5% of the licitación pública
    threshold. Regulatory threshold manipulation is a documented fraud mechanism.
  </div>
)}
```

**New `GET /analysis/threshold-gaming`** endpoint:

```json
{
  "total_flagged": 47203,
  "pct_of_competitive_procedures": 8.2,
  "by_sector": [
    {"sector": "infraestructura", "flagged_pct": 14.1, "estimated_value_mxn": 12000000000},
    {"sector": "salud", "flagged_pct": 9.8}
  ],
  "note": "Based on Szucs (2023): contracts clustered just below legal thresholds indicate systematic threshold gaming to avoid competitive bidding requirements."
}
```

---

### 13.4 Supplier Diversity Score (Institution Level)

**Literature basis:** Prozorro (Ukraine) analytics — supplier diversity as a market health indicator.
Fazekas CRI methodology — institution-level concentration is more predictive than contract-level.

**Effort:** 1 week. Compute HHI of vendor share at each institution, store in precomputed stats.

#### 13.4.1 Computation

New entry in `backend/scripts/precompute_stats.py`:

```python
# HHI (Herfindahl-Hirschman Index) of vendor concentration per institution per year
# HHI = sum of squared market shares. Range 0-10000. >2500 = highly concentrated.
hhi_query = """
    SELECT
        institution_id,
        contract_year,
        -- Sum of squared percentage shares
        ROUND(SUM(
            POWER(
                100.0 * vendor_total / institution_total,
                2
            )
        ), 1) as hhi,
        COUNT(DISTINCT vendor_id) as unique_vendors
    FROM (
        SELECT
            institution_id, contract_year, vendor_id,
            SUM(amount_mxn) as vendor_total,
            SUM(SUM(amount_mxn)) OVER (PARTITION BY institution_id, contract_year) as institution_total
        FROM contracts
        WHERE amount_mxn > 0
        GROUP BY institution_id, contract_year, vendor_id
    )
    GROUP BY institution_id, contract_year
    HAVING unique_vendors >= 3
"""
```

Store in `precomputed_stats` as `institution_hhi_{institution_id}_{year}`.

Also add to the `vendor_institution_tenure` computation script.

#### 13.4.2 API Changes

**Extend `GET /institutions/{id}` response:**

```python
# Institution detail response additions:
{
  "supplier_diversity": {
    "hhi_current_year": 4820,
    "hhi_5yr_avg": 3640,
    "unique_vendors_current_year": 12,
    "concentration_level": "high",  # <1000=low, 1000-2500=medium, >2500=high
    "trend": "increasing",           # HHI increasing over 3 years = less diverse
    "prozorro_note": "Ukraine's Prozorro flags institutions with HHI >4000 as concentrated purchasing."
  }
}
```

**New endpoint `GET /institutions/concentration-rankings`:**

```json
{
  "year": 2023,
  "most_concentrated": [
    {"institution_id": 5, "name": "SEDENA", "hhi": 8200, "unique_vendors": 3},
    {"institution_id": 19, "name": "IMSS", "hhi": 6100, "unique_vendors": 8}
  ],
  "most_diverse": [
    {"institution_id": 22, "name": "SEP", "hhi": 820, "unique_vendors": 450}
  ]
}
```

#### 13.4.3 Frontend Changes

**File:** `frontend/src/pages/Sectors.tsx`

Add a "Market Health" panel per sector:

```
[NEW: Market Health — Supplier Diversity]
Source: Prozorro (Ukraine) analytics; Fazekas CRI methodology

Chart: Line chart — Average HHI per sector over time
       "Increasing HHI = decreasing competition = warning signal"

Table: Top 5 most concentrated institutions in this sector (current year)
       Columns: Institution | HHI | Unique Vendors | Trend

Note: "HHI > 2,500 indicates a highly concentrated market.
       EU antitrust typically challenges mergers creating HHI > 2,500.
       In procurement, high HHI suggests limited effective competition."
```

---

## 14. Literature-Derived Features: Long-Term (Month 2–3 Post-Audit)

---

### 14.1 Isolation Forest on Full Z-Vector

**Literature basis:** Ouyang, Goh & Lim (2022) — Isolation Forest on the full feature vector
outperforms price-only detection by 23% recall. RUBLI already runs Isolation Forest on price only
(`compute_price_anomaly_scores.py`). Extend to the full 16-dimensional z-vector.

**Effort:** 1 week. The z-scores already exist in `contract_z_features`. Straightforward extension.

#### 14.1.1 New Script: `backend/scripts/compute_fullvector_anomalies.py`

```
Purpose  : Run Isolation Forest on full 16-feature z-score vector
CLI      : python -m scripts.compute_fullvector_anomalies [--contamination 0.05]
Logic    :
  1. Load all 16 z-score features from contract_z_features
  2. Impute NaN with 0 (z-score of 0 = exactly at sector mean)
  3. Fit IsolationForest(contamination=0.05, n_estimators=200, random_state=42)
  4. Predict anomaly scores (-1 to 1; lower = more anomalous)
  5. Convert to 0-1 scale: anomaly_score = (score + 1) / 2, invert for risk direction
  6. Store top-N anomalies per sector in contract_ml_anomalies table
     (same table as price-only anomalies, add a 'model' column)
Runtime  : ~20-30 min on 3.1M contracts with 200 trees
Note     : Use same batch approach as existing Isolation Forest script
```

#### 14.1.2 Database Changes

Extend `contract_ml_anomalies` table:

```sql
-- Add 'model' column if not already present (to distinguish price-only vs full-vector)
ALTER TABLE contract_ml_anomalies ADD COLUMN model TEXT DEFAULT 'price_only';
-- 'price_only' = existing score, 'full_z_vector' = new score

-- Add full-vector anomaly score to contracts for direct access:
ALTER TABLE contracts ADD COLUMN ml_anomaly_score_full REAL;
```

#### 14.1.3 API Changes

**Extend `GET /analysis/prices/ml-anomalies`** to accept a `model=full_z_vector` query param.

**Extend contract detail response** to include `ml_anomaly_score_full`.

**New comparison endpoint** `GET /analysis/anomaly-comparison`:

```json
{
  "contracts_flagged_by_price_only": 600,
  "contracts_flagged_by_full_vector": 950,
  "overlap": 420,
  "unique_to_full_vector": 530,
  "unique_to_price_only": 180,
  "interpretation": "Full-vector anomalies catch 530 contracts with unusual overall procurement patterns not visible in price alone."
}
```

#### 14.1.4 Frontend Changes

**File:** `frontend/src/pages/PriceIntelligence.tsx`

Add a toggle: "Price Anomalies Only" vs. "Full-Vector Anomalies (Ouyang et al. 2022)"

When full-vector selected, show the 530 contracts unique to this detection method with an
explanation: "These contracts are anomalous in their overall procurement pattern (not just price),
consistent with Isolation Forest analysis of the full 16-dimensional risk feature vector."

---

### 14.2 Official-Level Risk Profile

**Literature basis:** Coviello & Gagliarducci (2017) — official tenure is the most predictive
variable for single-bid rates in Italian procurement. Romania and Ukraine both score individual
signing officials. Mexico's COMPRANET records `servidor_publico_que_firmo` in Structures C/D.

**Effort:** 2 weeks. Significant analytical expansion. Only feasible for 2018+ data.

#### 14.2.1 Database Schema

```sql
CREATE TABLE IF NOT EXISTS official_risk_profiles (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    official_name       TEXT NOT NULL,
    institution_id      INTEGER REFERENCES institutions(id),
    first_contract_year INTEGER,
    last_contract_year  INTEGER,
    total_contracts     INTEGER,
    single_bid_pct      REAL,
    direct_award_pct    REAL,
    avg_risk_score      REAL,
    vendor_diversity    INTEGER,   -- Unique vendors this official has contracted with
    hhi_vendors         REAL,      -- HHI of vendor distribution (high = concentrated)
    computed_at         TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orp_institution
    ON official_risk_profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_orp_name
    ON official_risk_profiles(official_name COLLATE NOCASE);
```

#### 14.2.2 New Script: `backend/scripts/compute_official_profiles.py`

```
Purpose  : Compute risk profiles for all signing officials in Structures C/D (2018+)
CLI      : python -m scripts.compute_official_profiles [--min-contracts 10]
Logic    :
  1. SELECT oficial_firmante (or equivalent field), institution_id, risk metrics
     FROM contracts
     WHERE contract_year >= 2018 AND oficial_firmante IS NOT NULL
     GROUP BY oficial_firmante, institution_id
     HAVING COUNT(*) >= 10
  2. Compute: single_bid_pct, direct_award_pct, avg_risk_score, vendor HHI
  3. INSERT OR REPLACE into official_risk_profiles
  4. Log: N officials profiled, top 10 highest-risk officials
Note     : Official name normalization needed — many name variations. Apply same
           standardization as vendor name normalization (uppercase, remove accents).
```

#### 14.2.3 API Changes

**New endpoint in `backend/api/routers/institutions.py`:**

```python
@router.get("/{institution_id:int}/officials")
def get_institution_officials(
    institution_id: int = Path(...),
    min_contracts: int = Query(10),
    limit: int = Query(50)
):
    """Risk profiles for signing officials at this institution."""
```

Response shape:
```json
{
  "institution_id": 42,
  "officials": [
    {
      "official_name": "JUAN MARTINEZ LOPEZ",
      "total_contracts": 847,
      "single_bid_pct": 42.3,
      "direct_award_pct": 78.1,
      "avg_risk_score": 0.412,
      "vendor_diversity": 3,
      "hhi_vendors": 6800,
      "interpretation": "This official contracted with only 3 unique vendors, with high concentration (HHI 6800)."
    }
  ],
  "note": "Official-level analysis available for 2018+ contracts (COMPRANET Structure C/D)."
}
```

#### 14.2.4 Frontend Changes

**File:** `frontend/src/pages/VendorProfile.tsx` (Collusion Detection tab)

**Also:** New section in Institution detail page showing top signing officials with risk metrics.

---

### 14.3 Porter-Zona Bid Distribution Test

**Literature basis:** Porter & Zona (1993, 1999) — in competitive markets, bid distributions are
symmetric and independent. In collusive markets, cover bidders show higher bids with less variance
relative to cost. Conley & Decarolis (2016) extend this to within-group bid variance analysis.

**Effort:** 2 weeks. Requires losing-bid data — only available for licitaciones públicas in
COMPRANET, not direct awards. Feasibility depends on how much losing-bid data is in the DB.

#### 14.3.1 Feasibility Check (Run First)

```sql
-- How many procedures have multiple bidders?
SELECT COUNT(DISTINCT procedure_number) as procs_with_competition
FROM contracts
WHERE is_direct_award = 0
GROUP BY procedure_number
HAVING COUNT(DISTINCT vendor_id) > 1;

-- Distribution of bidder counts per procedure:
SELECT bidder_count, COUNT(*) as procedures
FROM (
    SELECT procedure_number, COUNT(DISTINCT vendor_id) as bidder_count
    FROM contracts WHERE is_direct_award = 0
    GROUP BY procedure_number
)
GROUP BY bidder_count ORDER BY bidder_count;
```

If fewer than 10,000 procedures have 2+ bidders → Porter-Zona is not feasible with current data
(insufficient sample). If 100,000+ → feasible. Decide based on this query result.

#### 14.3.2 Implementation (if feasible)

New script: `backend/scripts/compute_porter_zona.py`

```
Purpose  : Test for bid variance anomalies consistent with cover bidding
CLI      : python -m scripts.compute_porter_zona [--min-procedures 5]
Method   :
  For each vendor pair (A, B) that appear in ≥5 common procedures:
  1. Collect A's bids and B's bids in those procedures
  2. Compute coefficient of variation (CV) for each: std/mean
  3. Compute bid ratio rank correlation (do they consistently rank the same way?)
  4. Conley-Decarolis: within-community bid variance vs. cross-community bid variance
  5. Flag pairs where: A always wins, B always second with high CV (cover bidder pattern)
Output   : community_porter_zona table with suspicion scores per vendor pair/community
```

---

## 15. Dashboard Narrative Enhancements (Literature-Grounded)

*These are UI/UX changes that require no new data or backend changes — they improve
how existing scores and features are communicated to users.*

---

### 15.1 "Why This Score?" Explainer Cards

**Literature basis:** XAI (Explainable AI) research, OECD AI principles. The Romania study found
that simple explanations increased journalist and policymaker adoption.

**Effort:** 3 days. Pure frontend. JSON mapping from risk factor → explanation.

**File:** `frontend/src/components/RiskExplainer.tsx` (new component)

```typescript
// Factor explanations JSON — add to a constants file
export const FACTOR_EXPLANATIONS: Record<string, {
  title: string
  mechanism: string
  theory: string
  citation: string
  rubli_note?: string
}> = {
  vendor_concentration: {
    title: "Market Concentration",
    mechanism: "When one vendor captures a disproportionate share of an institution's contracts, it suggests either legitimate monopoly or exclusive access through corruption.",
    theory: "Principal-Agent Theory (Klitgaard 1988): Monopoly power is a primary enabling condition for corruption.",
    citation: "Fazekas & Kocsis (2020), British Journal of Political Science",
    rubli_note: "RUBLI's strongest predictor (+0.428 coefficient). Reflects documented cases where ghost company networks captured >90% of institutional spending."
  },
  price_volatility: {
    title: "Price Volatility",
    mechanism: "Vendors whose contract amounts vary wildly are inconsistent with normal market pricing. Either they are winning contracts far above or below market rates.",
    theory: "Rent-Seeking Theory (Tullock 1967): Rents are extracted through price inflation above competitive levels.",
    citation: "Porter & Zona (1993): Price manipulation is detectable in bid distributions.",
    rubli_note: "RUBLI's top predictor (+1.22 coefficient). New in v5.0."
  },
  direct_award: {
    title: "Direct Award (Non-Competitive)",
    mechanism: "Contracts awarded without competitive bidding remove the market check on price and vendor quality.",
    theory: "Principal-Agent Theory: Discretion is the second enabling condition. Direct awards maximize official discretion.",
    citation: "OECD (2016): Preventing Corruption in Public Procurement.",
    rubli_note: "Coefficient +0.182 (v5.0). Note: In Mexico, 70%+ of contracts are direct awards — the z-score normalizes this by sector/year baseline."
  }
  // ... add remaining 13 features
}
```

**Usage in contract detail / vendor profile:**

```tsx
<RiskFactorBadge
  factor="vendor_concentration"
  zScore={2.4}
  showExplainer={true}
/>
// On hover/click: shows the explanation card with theory, mechanism, citation
```

---

### 15.2 Limitations Page Enhancements

**Literature basis:** All parts of the review — each limitation maps to a literature-identified gap.

**File:** `frontend/src/pages/Limitations.tsx`

Add two new limitation cards:

**Card: "Contract Modifications Invisible"** (Bajari et al. 2009)
```
What RUBLI cannot see: Post-award contract modifications and renegotiations.
Why it matters: "Up to 50% of complex public works contracts are renegotiated,
with an average 14% cost overrun" (Bajari, McMillan & Tadelis 2009). In
corruption-prone contexts, the initial competitive bid understates the true
contract value by design — modifications are where the corruption occurs.
Impact on RUBLI scores: Large infrastructure projects (Tren Maya, Pemex
refinery construction) may appear clean in procurement data while showing
100%+ cost overruns in ASF audit reports. Scores for Infraestructura and
Energía sectors likely underestimate execution-phase corruption.
Workaround: Cross-reference with ASF Cuenta Pública findings (being
integrated in Phase 6 of our roadmap).
```

**Card: "Vendor Concentration is Mexico-Specific"**
```
RUBLI's top predictor vs. global literature:
RUBLI: vendor_concentration = strongest predictor (+0.428 global coefficient)
Global literature: single bidding = most universally validated predictor
                   (Fazekas & Tóth 2016, Charron et al. 2017)

This difference reflects RUBLI's training data — 79% of labeled corruption
contracts come from cases (IMSS, Segalmex, COVID) where large concentrated
vendors are the mechanism. In European datasets, single-bid rates are more
predictive because direct awards are less common. In Mexico, direct award
is the norm (~70%), so single-bid in competitive procedures is rare.

Implication: RUBLI is well-calibrated for Mexico's documented corruption
patterns. It may miss corruption forms common in European datasets
(cover bidding in competitive procedures) that are less prevalent in
Mexican procurement due to the structural preference for direct awards.
```

---

### 15.3 Risk Factor Reference Card (Glossary Enhancement)

**File:** `frontend/src/i18n/locales/en/glossary.json`

Add a new `risk_factors` section with evidence-level metadata for each of the 16 factors:

```json
{
  "risk_factors": {
    "vendor_concentration": {
      "label": "Vendor Concentration",
      "coefficient": "+0.428",
      "validation_strength": "Strong (multiple country datasets)",
      "key_citation": "Fazekas & Tóth (2016), PRQ",
      "mexico_note": "Strongest predictor in RUBLI. Reflects concentration-based corruption patterns in IMSS, Segalmex, COVID-19 cases."
    },
    "single_bid": {
      "label": "Single Bid",
      "coefficient": "+0.013",
      "validation_strength": "Strong globally, weak in Mexico",
      "key_citation": "Charron et al. (2017), Journal of Politics",
      "mexico_note": "Low coefficient because competitive procedures with 1 bidder are rare — direct award is used instead when competition is restricted."
    }
  }
}
```

Display this in the Glossary page as a "Risk Factors Evidence Base" table:
| Factor | RUBLI Coefficient | Global Evidence | Key Source |
|--------|------------------|-----------------|------------|
| vendor_concentration | +0.428 | Strong | Fazekas & Tóth 2016 |
| single_bid | +0.013 | Strong globally, weak Mexico | Charron et al. 2017 |
| etc. | | | |

---

## 16. Updated Summary: All Literature-Derived Additions

### New Tables (Literature Phase)

| Table | Purpose | Script | Priority |
|-------|---------|--------|----------|
| `vendor_institution_tenure` | Vendor-institution relationship tenure | `compute_vendor_tenure.py` | HIGH (v5.1 feature) |
| `official_risk_profiles` | Signing official risk metrics (2018+) | `compute_official_profiles.py` | MEDIUM |
| `laassp_thresholds` | LAASSP procurement thresholds by year | Manual insert | MEDIUM |
| Columns on `contracts`: `is_election_year`, `sexenio_year` | Political cycle | `precompute_stats.py` | HIGH |
| Columns on `contracts`: `publication_delay_days`, `is_threshold_gaming`, `threshold_proximity`, `ml_anomaly_score_full` | Transparency + threshold + ML features | Several scripts | MEDIUM |
| Columns on `vendors`: `cobid_clustering_coeff`, `cobid_triangle_count` | Network collusion triangles | `build_vendor_graph.py` | MEDIUM |

### New API Endpoints (Literature Phase)

| Method | Path | Purpose | File | Priority |
|--------|------|---------|------|----------|
| GET | `/analysis/political-cycle` | Election year risk patterns | analysis.py | HIGH |
| GET | `/analysis/transparency/publication-delays` | Transparency health | analysis.py | MEDIUM |
| GET | `/institutions/cri-scatter` | Fazekas CRI scatter data | institutions.py | HIGH |
| GET | `/institutions/{id}/officials` | Signing official risk profiles | institutions.py | MEDIUM |
| GET | `/institutions/concentration-rankings` | HHI by institution | institutions.py | MEDIUM |
| GET | `/analysis/threshold-gaming` | LAASSP threshold proximity analysis | analysis.py | MEDIUM |
| GET | `/analysis/anomaly-comparison` | Price-only vs. full-vector IF | analysis.py | LOW |

### New Frontend Components/Pages (Literature Phase)

| File | Change | Depends On | Priority |
|------|--------|-----------|----------|
| `Administrations.tsx` | Electoral calendar overlay + political cycle section | political_cycle endpoint | HIGH |
| `Sectors.tsx` | Fazekas CRI scatter chart, market health panel | cri-scatter endpoint + HHI data | HIGH |
| `VendorProfile.tsx` | Tenure display, triangle clustering badge | vendor_institution_tenure table | MEDIUM |
| `Dashboard.tsx` | Publication delay transparency card | publication_delay_days | MEDIUM |
| `Limitations.tsx` | 2 new limitation cards (modifications, Mexico-specific) | None | LOW (copy only) |
| `RiskExplainer.tsx` | New component for "Why This Score?" | None | MEDIUM |
| `glossary.json` (EN+ES) | Risk factors evidence base table | None | LOW |

---

## 17. Full Execution Order (Post-Audit, All Phases Combined)

```
WEEK 1 — Revert + External Flags (Sections 0, 1)
  Day 1  Complete v5.0 revert (rows 2.4M–3.1M) + precompute_stats + 251 tests green
  Day 2  Create sfp_sanctions + rupc_vendors in live DB
         Run load_sfp_sanctions.py + load_rupc.py
         Test External Records tab in browser
  Day 3  Build + run load_sat_efos.py
         Add sat_efos to /external-flags endpoint + frontend badge
  Day 4  Audit ComprasMX 2025 data (download + structure check)
         If same structure: run ETL on 2025 CSV
  Day 5  Add is_election_year + sexenio_year columns to contracts (UPDATE queries)
         Add publication_delay_days column (UPDATE queries)
         Add electoral overlay to Administrations.tsx

WEEK 2 — Literature Features: Immediate (Section 12)
  Day 6  Add /analysis/political-cycle endpoint (precomputed_stats)
         Add political cycle section to Administrations.tsx
  Day 7  Add /analysis/transparency/publication-delays endpoint
         Add transparency card to Dashboard.tsx
  Day 8  Add /institutions/cri-scatter endpoint
         Add Fazekas CRI scatter chart to Sectors.tsx
  Day 9  Add RiskExplainer.tsx component (JSON explanations, no backend needed)
         Add "Why This Score?" to VendorProfile + contract detail views
  Day 10 Build vendor_institution_tenure table + compute_vendor_tenure.py
         Add tenure display to VendorProfile.tsx Overview tab

WEEK 3 — Literature Features: Network + QQW + Ground Truth (Sections 13, 4, 6)
  Day 11 Add clustering_coeff to build_vendor_graph.py (nx.clustering)
         Add cobid_clustering_coeff + triangle_count columns to vendors
         Add triangle hub alert to NetworkGraph.tsx SidePanel
  Day 12 Build enrich_vendor_names_qqw.py
         Run for top 3,000 RFC-matched vendors (~90 min)
         Verify name_variants in VendorProfile header
  Day 13 Investigate Ethomedical + FONATUR ground truth candidates
         If ≥50 contracts: add as ground truth cases 20-21
  Day 14 Build laassp_thresholds table (manual data entry from SFP circulars)
         Build compute_threshold_proximity.py
         Run + verify threshold_gaming flags
  Day 15 If ≥2 new ground truth cases: backup + retrain v5.1
         Regression guard check (IPN Cartel critical_pct ≥ 50%)
         If passes: score + precompute_stats

MONTH 2 — ASF, Officials, Advanced Features (Sections 5, 13.4, 14)
  Week 5  Build compute_official_profiles.py (Structure C/D officials)
          Add /institutions/{id}/officials endpoint
          Check Porter-Zona feasibility (query on bidder count distribution)
  Week 6  Build parse_asf_mdb.py (add pdfplumber to requirements.txt)
          Download MDB_Consolidado.pdf 2022-2024
          Parse + build asf_ramo_crosswalk
  Week 7  Add /institutions/{id}/asf-findings endpoint
          Add ASF chart to Sectors page
          Add HHI supplier diversity to institution pages
  Week 8  Compute ml_anomaly_score_full (Isolation Forest full z-vector)
          Add anomaly comparison endpoint + toggle to PriceIntelligence.tsx
          Build load_sidec.py (low priority)

MONTH 3 — Glossary, Limitations, Polish
  Week 9  Add risk factors evidence table to Glossary (glossary.json updates)
          Add 2 new Limitations cards (modifications invisible, Mexico-specific)
          Add Limitations updates (ASF workaround note)
  Week 10 Literature review integration complete — documentation update
```

---

## 18. Literature Review Integration Notes

The academic and policy literature review (`RUBLI_LITERATURE_REVIEW.md`) informs every
section above. Key alignment between theory and RUBLI features:

| Literature Concept | RUBLI Implementation | Status |
|-------------------|---------------------|--------|
| Principal-agent: Monopoly | `vendor_concentration` | ✅ v5.0 |
| Principal-agent: Discretion | `direct_award`, `ad_period_days` | ✅ v5.0 |
| Principal-agent: Accountability | ASF data integration | 🔜 Phase 6 |
| Rent-seeking: Market exit | Competition trend (bidder pool decline) | 🔜 Section 13.2 |
| TCE: Contract renegotiation | Contract modification tracking | ⏳ Requires new data |
| Fazekas CRI: Institution level | CRI scatter chart, ICRR endpoint | 🔜 Section 12.3 |
| Political budget cycle | Election year flags + sexenio position | 🔜 Section 12.1 |
| Coviello & Gagliarducci: Tenure | Vendor tenure at institution | 🔜 Section 13.1 |
| Prozorro: Competition index | Bidder pool decline trend | 🔜 Section 13.2 |
| Prozorro: Publication delay | `publication_delay_days` | 🔜 Section 12.2 |
| Wachs et al.: Triangle clustering | Co-bid clustering coefficient | 🔜 Section 13.2 |
| Porter-Zona: Bid variance | Bid variance test | 🔜 Section 14.3 |
| ARACHNE: Company age | Requires company registration data | ❌ No data source |
| Katona & Fazekas: NLP tailored specs | Contract description NLP | ❌ v6.0+ scope |
| Romania: Simple 3-flag model | RiskExplainer UI cards | 🔜 Section 15.1 |

---

## 19. Case Library — Documented Procurement Corruption Cases

*Added: February 2026. 43 cases researched and structured.*

### 19.0 Narrative Positioning

RUBLI currently tells three stories:

| Feature | What it is | Table |
|---------|-----------|-------|
| **Ground Truth** | Documented cases used to *train the ML model* | `ground_truth_cases`, `ground_truth_vendors` |
| **Investigation Queue** | AI-generated leads from *statistical anomalies* | `investigation_cases`, `investigation_dossiers` |
| **Case Library** (NEW) | The *journalistic and legal record* — what we know happened | `procurement_scandals` |
| **Contracts** | The raw procurement data behind all of it | `contracts` |

The Case Library fills the gap between "we trained on 15 cases" and "here are 43 documented
corruption events that shaped 23 years of Mexican procurement." It is the context layer —
the difference between a risk score and a story.

**Narrative flow for a journalist using RUBLI:**
1. Dashboard → "This sector has elevated risk this year"
2. Case Library → "Here are the 6 documented cases we know about in this sector"
3. Investigation Queue → "Here are AI-generated leads that match those patterns"
4. Vendor Profile → "Here is the specific vendor the AI flagged"

**This is distinct from Ground Truth.** Ground truth is an ML artifact — it contains only
cases where vendors were matched and contracts were labeled. Case Library contains all 43
documented cases regardless of vendor match, COMPRANET visibility, or training use.

---

### 19.1 Database Schema

Add to the end of `backend/scripts/etl_create_schema.py`:

```sql
-- ============================================================
-- CASE LIBRARY: Documented procurement corruption cases
-- ============================================================

CREATE TABLE IF NOT EXISTS procurement_scandals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identification
    name_en             TEXT NOT NULL,
    -- "The Master Scam (La Estafa Maestra)"
    name_es             TEXT NOT NULL,
    -- "La Estafa Maestra"
    slug                TEXT NOT NULL UNIQUE,
    -- 'estafa-maestra' — used in URL routing

    -- Classification
    fraud_type          TEXT NOT NULL,
    -- ENUM: ghost_company | bid_rigging | overpricing | invoice_fraud
    --       bribery | conflict_of_interest | state_capture
    --       emergency_fraud | infrastructure_overrun
    --       cartel_infiltration | monopoly

    administration      TEXT NOT NULL,
    -- ENUM: fox | calderon | epn | amlo | sheinbaum | multiple
    -- The administration that AWARDED the contracts (not when discovered)

    sector_id           INTEGER REFERENCES sectors(id),
    -- NULL for multi-sector cases
    sector_ids_json     TEXT DEFAULT '[]',
    -- JSON array of all sector_ids for cross-sector cases: [1, 2, 8]

    -- Period
    contract_year_start INTEGER,  -- Year first contracts were awarded
    contract_year_end   INTEGER,  -- Year last contracts were awarded
    discovery_year      INTEGER,  -- Year the scandal became public

    -- Financial scale
    amount_mxn_low      REAL,
    -- Conservative estimate in MXN (NULL if unknown)
    amount_mxn_high     REAL,
    -- High estimate in MXN (NULL if point estimate — use amount_mxn_low)
    amount_note         TEXT,
    -- "USD 10.5M bribe; MXN 3,600M in contracts. USD converted at 2014 rate."

    -- Severity (for sorting and UI treatment)
    severity            INTEGER NOT NULL DEFAULT 2,
    -- 1 = minor (< 500M MXN, limited institutional impact)
    -- 2 = significant (500M–5B MXN, one institution affected)
    -- 3 = major (5B–50B MXN, multiple institutions or sectors)
    -- 4 = systemic (> 50B MXN, or structural/cross-administration)

    -- Legal outcome
    legal_status        TEXT NOT NULL,
    -- ENUM: convicted | fined | acquitted | impunity
    --       investigation | settled | ongoing
    legal_status_note   TEXT,
    -- "Rosario Robles acquitted by SCJN 2024. One mid-level official convicted."

    -- COMPRANET linkage
    compranet_visibility TEXT NOT NULL,
    -- ENUM: high | partial | low | none
    compranet_note      TEXT,
    -- "The university-to-government contracts appear; subcontracts to shells do not."

    -- Content
    summary_en          TEXT NOT NULL,  -- 2–3 sentence summary in English
    summary_es          TEXT,           -- Same in Spanish (can be NULL initially)

    key_actors_json     TEXT DEFAULT '[]',
    -- JSON: [{"name": "Rosario Robles", "role": "SEDESOL Secretary", "type": "official"},
    --        {"name": "GC Rogu SA de CV", "role": "Shell company", "type": "vendor"}]
    -- type ENUM: official | vendor | company | cartel | international

    sources_json        TEXT DEFAULT '[]',
    -- JSON: [{"label": "Animal Político / MCCI", "url": "https://..."}, ...]

    -- Cross-references to RUBLI internal data
    ground_truth_case_id INTEGER REFERENCES ground_truth_cases(id),
    -- NULL for cases not in ground truth (24 of 43)

    investigation_case_ids_json TEXT DEFAULT '[]',
    -- JSON array of investigation_cases.id values that match this scandal
    -- Populated lazily — left empty initially, filled when matches found

    -- Metadata
    is_verified         INTEGER NOT NULL DEFAULT 1,
    -- 0 = under investigation / unconfirmed, 1 = documented in multiple sources

    added_at            TEXT DEFAULT (datetime('now')),
    last_updated        TEXT DEFAULT (datetime('now'))
);

-- Indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_scandals_fraud_type
    ON procurement_scandals(fraud_type);
CREATE INDEX IF NOT EXISTS idx_scandals_administration
    ON procurement_scandals(administration);
CREATE INDEX IF NOT EXISTS idx_scandals_sector_id
    ON procurement_scandals(sector_id);
CREATE INDEX IF NOT EXISTS idx_scandals_legal_status
    ON procurement_scandals(legal_status);
CREATE INDEX IF NOT EXISTS idx_scandals_compranet
    ON procurement_scandals(compranet_visibility);
CREATE INDEX IF NOT EXISTS idx_scandals_severity
    ON procurement_scandals(severity DESC);
CREATE INDEX IF NOT EXISTS idx_scandals_gt_link
    ON procurement_scandals(ground_truth_case_id)
    WHERE ground_truth_case_id IS NOT NULL;
```

---

### 19.2 Seed Data Format

**File:** `backend/data/scandals_seed.json`

One JSON array with one object per case. The 43 cases from the research are pre-structured
here — this is the canonical source of truth for the Case Library content.

Each object matches the table columns exactly (snake_case). Example entry:

```json
[
  {
    "slug": "estafa-maestra",
    "name_en": "The Master Scam (La Estafa Maestra)",
    "name_es": "La Estafa Maestra",
    "fraud_type": "ghost_company",
    "administration": "epn",
    "sector_id": null,
    "sector_ids_json": "[8, 3, 2, 4, 11]",
    "contract_year_start": 2013,
    "contract_year_end": 2014,
    "discovery_year": 2017,
    "amount_mxn_low": 7670000000,
    "amount_mxn_high": null,
    "amount_note": "MXN 7,670M total; MXN 3,433M confirmed missing without deliverable",
    "severity": 4,
    "legal_status": "acquitted",
    "legal_status_note": "Rosario Robles acquitted by SCJN 2024. One mid-level official convicted. No senior conviction as of 2026.",
    "compranet_visibility": "partial",
    "compranet_note": "University-to-government contracts appear in COMPRANET. University-to-shell-company subcontracts are off-system — the scheme exploited this gap.",
    "summary_en": "Eleven federal agencies exploited a legal loophole allowing them to contract state universities without competitive bidding. The universities then subcontracted 186 companies — over 100 of which were phantoms with no operations. At least MXN 3.4 billion was extracted with no deliverables.",
    "summary_es": "Once agencias federales explotaron un vacío legal para contratar universidades estatales sin licitación. Las universidades subcontrataron a 186 empresas, más de 100 de las cuales eran fantasmas. Al menos 3,400 millones de pesos desaparecieron sin entrega de servicios.",
    "key_actors_json": "[{\"name\": \"Rosario Robles\", \"role\": \"Secretaria de Sedesol / Sedatu\", \"type\": \"official\"}, {\"name\": \"GC Rogu SA de CV\", \"role\": \"Empresa fantasma beneficiaria\", \"type\": \"vendor\"}, {\"name\": \"GC Cinco SA de CV\", \"role\": \"Empresa fantasma beneficiaria\", \"type\": \"vendor\"}, {\"name\": \"UAC, UAEM, UJAT\", \"role\": \"Universidades intermediarias\", \"type\": \"company\"}]",
    "sources_json": "[{\"label\": \"Animal Político / MCCI — La Estafa Maestra (Sep 2017)\", \"url\": \"https://www.animalpolitico.com/estafa-maestra\"}, {\"label\": \"ASF denuncias penales\", \"url\": \"https://www.asf.gob.mx\"}]",
    "ground_truth_case_id": 6,
    "investigation_case_ids_json": "[]",
    "is_verified": 1
  }
]
```

Full 43-case seed file will be created in `backend/data/scandals_seed.json`.

---

### 19.3 Loading Script

**File:** `backend/scripts/load_scandals.py`

```
Purpose  : Load procurement_scandals from seed JSON into the database
CLI      : python -m scripts.load_scandals [--dry-run] [--reset]
           --dry-run : print what would be inserted, no DB changes
           --reset   : DELETE all rows first, then re-insert (full refresh)
Logic    :
  1. Read backend/data/scandals_seed.json
  2. Validate required fields (slug, name_en, fraud_type, administration,
     legal_status, compranet_visibility, summary_en, severity)
  3. Validate enum values against allowed sets
  4. INSERT OR IGNORE on slug (idempotent — re-run safe)
  5. If --reset: DELETE FROM procurement_scandals; then INSERT all
  6. Log: N inserted, N skipped (already existed)
Error    : Any JSON parse error or missing required field → log + exit 1
```

**Enum validation sets (hardcoded in the script):**

```python
VALID_FRAUD_TYPES = {
    'ghost_company', 'bid_rigging', 'overpricing', 'invoice_fraud',
    'bribery', 'conflict_of_interest', 'state_capture',
    'emergency_fraud', 'infrastructure_overrun', 'cartel_infiltration',
    'monopoly'
}
VALID_ADMINISTRATIONS = {'fox', 'calderon', 'epn', 'amlo', 'sheinbaum', 'multiple'}
VALID_LEGAL_STATUSES = {
    'convicted', 'fined', 'acquitted', 'impunity',
    'investigation', 'settled', 'ongoing'
}
VALID_COMPRANET = {'high', 'partial', 'low', 'none'}
VALID_SEVERITIES = {1, 2, 3, 4}
```

---

### 19.4 Pydantic Models

**File:** `backend/api/models/scandal.py`

Following the exact pattern from `vendor.py` — separate List and Detail models:

```python
"""Pydantic models for the Case Library (procurement_scandals table)."""
from pydantic import BaseModel, Field
from typing import Optional, List


class KeyActor(BaseModel):
    name: str
    role: str
    type: str  # official | vendor | company | cartel | international


class ScandalSource(BaseModel):
    label: str
    url: Optional[str] = None


class ScandalListItem(BaseModel):
    """Minimal fields for the Case Library list view."""
    id: int
    slug: str
    name_en: str
    name_es: Optional[str] = None
    fraud_type: str
    administration: str
    sector_id: Optional[int] = None
    sector_ids: List[int] = Field(default_factory=list)
    contract_year_start: Optional[int] = None
    contract_year_end: Optional[int] = None
    discovery_year: Optional[int] = None
    amount_mxn_low: Optional[float] = None
    amount_mxn_high: Optional[float] = None
    severity: int
    legal_status: str
    compranet_visibility: str
    summary_en: str
    has_ground_truth: bool = False
    # True if ground_truth_case_id IS NOT NULL


class ScandalDetail(ScandalListItem):
    """Full detail fields for single case view."""
    summary_es: Optional[str] = None
    amount_note: Optional[str] = None
    legal_status_note: Optional[str] = None
    compranet_note: Optional[str] = None
    key_actors: List[KeyActor] = Field(default_factory=list)
    sources: List[ScandalSource] = Field(default_factory=list)
    ground_truth_case_id: Optional[int] = None
    investigation_case_ids: List[int] = Field(default_factory=list)
    is_verified: bool = True
    last_updated: Optional[str] = None
    # Related data (fetched by router, not stored fields)
    related_cases: List["ScandalListItem"] = Field(default_factory=list)
    # Same sector + overlapping years


class ScandalStats(BaseModel):
    """Aggregate statistics for the Case Library landing card."""
    total_cases: int
    by_fraud_type: List[dict]   # [{"fraud_type": "ghost_company", "count": 6}]
    by_administration: List[dict]
    by_legal_status: List[dict]
    by_compranet_visibility: List[dict]
    total_amount_mxn_low: float  # Sum of conservative estimates where known
    cases_with_ground_truth: int
    cases_high_compranet: int    # compranet_visibility = 'high' or 'partial'
```

---

### 19.5 API Router

**File:** `backend/api/routers/cases.py`

Follows the thin-router pattern from `investigation.py` — models imported from
`..models.scandal`, DB via `get_db_connection`.

**Mount in `backend/api/main.py`:**
```python
from .routers import cases
app.include_router(cases.router)
```

```python
"""
API router for the Case Library (documented procurement corruption cases).

Read-only endpoints — the data is loaded via load_scandals.py seed script.
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Path

from ..dependencies import get_db_connection
from ..models.scandal import ScandalListItem, ScandalDetail, ScandalStats
from ..models.common import PaginatedResponse, PaginationMeta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases", tags=["cases"])
```

#### `GET /cases` — Paginated list with filters

```python
@router.get("", response_model=PaginatedResponse[ScandalListItem])
def list_cases(
    fraud_type: Optional[str] = Query(None),
    administration: Optional[str] = Query(None),
    sector_id: Optional[int] = Query(None),
    legal_status: Optional[str] = Query(None),
    compranet_visibility: Optional[str] = Query(None),
    severity_min: Optional[int] = Query(None, ge=1, le=4),
    has_ground_truth: Optional[bool] = Query(None),
    q: Optional[str] = Query(None, description="Text search on name and summary"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("severity", regex="^(severity|contract_year_start|amount_mxn_low|discovery_year)$"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
):
    """List documented corruption cases with filters and pagination."""
```

Response shape:
```json
{
  "data": [
    {
      "id": 1,
      "slug": "estafa-maestra",
      "name_en": "The Master Scam (La Estafa Maestra)",
      "fraud_type": "ghost_company",
      "administration": "epn",
      "sector_id": null,
      "sector_ids": [8, 3, 2, 4, 11],
      "contract_year_start": 2013,
      "contract_year_end": 2014,
      "discovery_year": 2017,
      "amount_mxn_low": 7670000000,
      "amount_mxn_high": null,
      "severity": 4,
      "legal_status": "acquitted",
      "compranet_visibility": "partial",
      "summary_en": "Eleven federal agencies exploited...",
      "has_ground_truth": true
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 43,
    "total_pages": 3
  }
}
```

#### `GET /cases/stats` — Aggregate counts for filter chips and landing cards

```python
@router.get("/stats", response_model=ScandalStats)
def get_case_stats():
    """Aggregate statistics for Case Library filter chips and summary cards."""
```

Response shape:
```json
{
  "total_cases": 43,
  "by_fraud_type": [
    {"fraud_type": "ghost_company", "count": 6, "label": "Ghost Companies"},
    {"fraud_type": "bid_rigging", "count": 5, "label": "Bid Rigging"},
    {"fraud_type": "infrastructure_overrun", "count": 5, "label": "Infrastructure Overruns"}
  ],
  "by_administration": [
    {"administration": "epn", "count": 16},
    {"administration": "amlo", "count": 12},
    {"administration": "multiple", "count": 6},
    {"administration": "calderon", "count": 6},
    {"administration": "fox", "count": 3}
  ],
  "by_legal_status": [
    {"legal_status": "impunity", "count": 18},
    {"legal_status": "investigation", "count": 8},
    {"legal_status": "settled", "count": 5}
  ],
  "by_compranet_visibility": [
    {"compranet_visibility": "high", "count": 22},
    {"compranet_visibility": "partial", "count": 11},
    {"compranet_visibility": "low", "count": 8},
    {"compranet_visibility": "none", "count": 2}
  ],
  "total_amount_mxn_low": 1850000000000,
  "cases_with_ground_truth": 19,
  "cases_high_compranet": 33
}
```

#### `GET /cases/{slug}` — Single case detail

```python
@router.get("/{slug}", response_model=ScandalDetail)
def get_case(slug: str = Path(..., description="Case slug e.g. 'estafa-maestra'")):
    """Full detail for a single documented case."""
```

The router also fetches `related_cases` — other cases in the same sector with overlapping years:
```python
# In the router, after fetching the main case:
related = cursor.execute("""
    SELECT id, slug, name_en, fraud_type, administration,
           contract_year_start, severity, legal_status, compranet_visibility,
           summary_en
    FROM procurement_scandals
    WHERE id != ?
      AND (sector_id = ? OR sector_ids_json LIKE ?)
      AND slug != ?
    ORDER BY severity DESC
    LIMIT 5
""", (case["id"], case["sector_id"], f'%{case["sector_id"]}%', slug)).fetchall()
```

Response extends `ScandalDetail` with `related_cases` populated.

#### `GET /cases/by-sector/{sector_id}` — Cases in a sector

```python
@router.get("/by-sector/{sector_id:int}", response_model=PaginatedResponse[ScandalListItem])
def get_cases_by_sector(
    sector_id: int = Path(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
):
    """Documented cases in a given sector. Used by Sectors page sidebar."""
```

---

### 19.6 Frontend Integration

#### 19.6.1 New Page: `CaseLibrary.tsx`

**File:** `frontend/src/pages/CaseLibrary.tsx`
**Route:** `/cases`
**Lazy import:** `const CaseLibrary = lazy(() => import('@/pages/CaseLibrary'))`

**Layout concept** (three views):

```
┌─────────────────────────────────────────────────────────────┐
│  CASE LIBRARY                                               │
│  43 documented corruption cases, 2002–2025                  │
│                                                             │
│  [Ghost Companies ×6] [Bid Rigging ×5] [Overpricing ×6]   │
│  [Bribery ×4] [State Capture ×4] [Infrastructure ×5] ...  │
│                                ← Filter chips from /stats   │
│                                                             │
│  [EPN ×16] [AMLO ×12] [Multiple ×6] [Calderón ×6]         │
│                                ← Administration chips        │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ ● La Estafa      │  │ ● IMSS Ghost     │                 │
│  │ Maestra         │  │ Company Network  │                 │
│  │ SYSTEMIC | EPN  │  │ MAJOR | EPN/AMLO │                 │
│  │ 2013–14 → 2017  │  │ 2013–2019        │                 │
│  │ MXN 7.7B        │  │ MXN 18.4B        │                 │
│  │ ghost_company   │  │ ghost+overpricing│                 │
│  │ ACQUITTED       │  │ NO CHARGES       │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**Card color coding:**
- Severity 4 (systemic): `border-red-500/50 bg-red-950/20`
- Severity 3 (major): `border-amber-500/50 bg-amber-950/20`
- Severity 2 (significant): `border-border bg-surface-2`
- Severity 1 (minor): `border-border/50 bg-surface-1`

**Legal status badges:**
```tsx
const LEGAL_STATUS_CONFIG = {
  convicted:    { label: 'Convicted',    class: 'bg-green-900/40 text-green-300' },
  fined:        { label: 'Fined',        class: 'bg-blue-900/40 text-blue-300' },
  acquitted:    { label: 'Acquitted',    class: 'bg-amber-900/40 text-amber-300' },
  impunity:     { label: 'No Charges',   class: 'bg-red-900/40 text-red-300' },
  investigation:{ label: 'Under Review', class: 'bg-purple-900/40 text-purple-300' },
  settled:      { label: 'Settled',      class: 'bg-cyan-900/40 text-cyan-300' },
  ongoing:      { label: 'Ongoing',      class: 'bg-orange-900/40 text-orange-300' },
}
```

**State management** (URL-synced — survives refresh):
```typescript
// URL params: /cases?fraud_type=ghost_company&administration=epn&page=1
const [searchParams, setSearchParams] = useSearchParams()
const fraudType = searchParams.get('fraud_type') ?? undefined
const administration = searchParams.get('administration') ?? undefined
const page = parseInt(searchParams.get('page') ?? '1')
```

#### 19.6.2 New Page: `CaseDetail.tsx`

**File:** `frontend/src/pages/CaseDetail.tsx`
**Route:** `/cases/:slug`
**Lazy import:** `const CaseDetail = lazy(() => import('@/pages/CaseDetail'))`

**Layout concept:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Case Library                                             │
│                                                             │
│  La Estafa Maestra                       SYSTEMIC SEVERITY  │
│  "The Master Scam"                                          │
│  ghost_company · EPN · 2013–2014 · Discovered 2017         │
│                                                             │
│  ┌─ Financial Scale ──┐  ┌─ Legal Outcome ──┐              │
│  │ MXN 7.67B          │  │ ACQUITTED         │              │
│  │ (conservative est.)│  │ Rosario Robles    │              │
│  └────────────────────┘  │ acquitted SCJN    │              │
│                          │ 2024              │              │
│                          └───────────────────┘              │
│                                                             │
│  Summary                                                    │
│  Eleven federal agencies exploited...                       │
│                                                             │
│  COMPRANET Visibility: PARTIAL                              │
│  University-to-government contracts appear in COMPRANET...  │
│                                                             │
│  Key Actors                                                 │
│  [official] Rosario Robles — Secretaria de Sedesol         │
│  [vendor]   GC Rogu SA de CV — Shell company               │
│  [company]  UAC, UAEM, UJAT — Universities                 │
│                                                             │
│  ┌─ Model Connection ─────────────────────────────────────┐ │
│  │ ✓ This case is in RUBLI's ground truth training set.  │ │
│  │ It corresponds to ground truth case #6.               │ │
│  │ The model uses 10 contracts from GC Rogu / GC Cinco   │ │
│  │ to learn ghost company patterns.                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Sources                                                    │
│  · Animal Político / MCCI — La Estafa Maestra (Sep 2017)   │
│  · ASF denuncias penales                                    │
│                                                             │
│  Related Cases in This Sector                               │
│  [Segalmex] [Decoaro] [CONALITEG]                          │
└─────────────────────────────────────────────────────────────┘
```

#### 19.6.3 Sectors Page Integration

**File:** `frontend/src/pages/Sectors.tsx` (and `SectorProfile.tsx`)

Add a "Documented Cases" sidebar panel that fetches from
`GET /cases/by-sector/{sector_id}`:

```tsx
{/* Known cases in this sector */}
{sectorCases.data?.data?.length > 0 && (
  <div className="mt-4">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
      Documented Cases
    </h3>
    {sectorCases.data.data.map(c => (
      <Link key={c.slug} to={`/cases/${c.slug}`}
            className="flex items-center justify-between py-1.5 border-b border-border/20
                       hover:text-foreground transition-colors text-sm">
        <span className="truncate">{c.name_en}</span>
        <span className={cn("text-xs px-1.5 rounded font-mono ml-2 shrink-0",
          LEGAL_STATUS_CONFIG[c.legal_status].class)}>
          {LEGAL_STATUS_CONFIG[c.legal_status].label}
        </span>
      </Link>
    ))}
    <Link to={`/cases?sector_id=${sectorId}`}
          className="text-xs text-text-muted hover:text-foreground mt-1 block">
      View all →
    </Link>
  </div>
)}
```

#### 19.6.4 Investigation Queue Cross-Reference

**File:** `frontend/src/pages/InvestigationCaseDetail.tsx`

When `investigation_case_ids_json` is populated on a scandal, show a reverse link:
"This AI-generated lead matches documented case: La Estafa Maestra →"

Conversely, on the `CaseDetail` page, if `investigation_case_ids` is non-empty:
"The AI has generated [N] related investigation leads matching this case's patterns →"

#### 19.6.5 App Routes

**File:** `frontend/src/App.tsx`

```tsx
const CaseLibrary = lazy(() => import('@/pages/CaseLibrary'))
const CaseDetail  = lazy(() => import('@/pages/CaseDetail'))

// Inside <Route path="/" element={<MainLayout />}>:
<Route path="cases"         element={<CaseLibrary />} />
<Route path="cases/:slug"   element={<CaseDetail />} />
```

#### 19.6.6 Sidebar Navigation

**File:** `frontend/src/components/layout/Sidebar.tsx`

Add to `investigateSection` (the existing INVESTIGATE group):

```typescript
{
  sectionKey: 'sections.investigateSection',
  items: [
    { i18nKey: 'investigation',  href: '/investigation', icon: Crosshair },
    { i18nKey: 'caseLibrary',    href: '/cases',         icon: BookMarked },  // NEW
    { i18nKey: 'contracts',      href: '/contracts',     icon: FileText },
    { i18nKey: 'watchlist',      href: '/watchlist',     icon: Eye },
  ],
},
```

Import `BookMarked` from `lucide-react`.

#### 19.6.7 API Client

**File:** `frontend/src/api/client.ts`

```typescript
export const caseLibraryApi = {
  list: (params: CaseLibraryParams): Promise<PaginatedResponse<ScandalListItem>> =>
    apiClient.get('/cases', { params }),

  stats: (): Promise<ScandalStats> =>
    apiClient.get('/cases/stats'),

  detail: (slug: string): Promise<ScandalDetail> =>
    apiClient.get(`/cases/${slug}`),

  bySector: (sectorId: number): Promise<PaginatedResponse<ScandalListItem>> =>
    apiClient.get(`/cases/by-sector/${sectorId}`, { params: { per_page: 10 } }),
}
```

**File:** `frontend/src/api/types.ts`

```typescript
export type FraudType =
  | 'ghost_company' | 'bid_rigging' | 'overpricing' | 'invoice_fraud'
  | 'bribery' | 'conflict_of_interest' | 'state_capture'
  | 'emergency_fraud' | 'infrastructure_overrun'
  | 'cartel_infiltration' | 'monopoly'

export type Administration = 'fox' | 'calderon' | 'epn' | 'amlo' | 'sheinbaum' | 'multiple'
export type LegalStatus = 'convicted' | 'fined' | 'acquitted' | 'impunity' | 'investigation' | 'settled' | 'ongoing'
export type CompranetVisibility = 'high' | 'partial' | 'low' | 'none'

export interface ScandalListItem {
  id: number
  slug: string
  name_en: string
  name_es: string | null
  fraud_type: FraudType
  administration: Administration
  sector_id: number | null
  sector_ids: number[]
  contract_year_start: number | null
  contract_year_end: number | null
  discovery_year: number | null
  amount_mxn_low: number | null
  amount_mxn_high: number | null
  severity: 1 | 2 | 3 | 4
  legal_status: LegalStatus
  compranet_visibility: CompranetVisibility
  summary_en: string
  has_ground_truth: boolean
}

export interface KeyActor { name: string; role: string; type: string }
export interface ScandalSource { label: string; url: string | null }

export interface ScandalDetail extends ScandalListItem {
  summary_es: string | null
  amount_note: string | null
  legal_status_note: string | null
  compranet_note: string | null
  key_actors: KeyActor[]
  sources: ScandalSource[]
  ground_truth_case_id: number | null
  investigation_case_ids: number[]
  is_verified: boolean
  last_updated: string | null
  related_cases: ScandalListItem[]
}

export interface ScandalStats {
  total_cases: number
  by_fraud_type: Array<{ fraud_type: string; count: number; label?: string }>
  by_administration: Array<{ administration: string; count: number }>
  by_legal_status: Array<{ legal_status: string; count: number }>
  by_compranet_visibility: Array<{ compranet_visibility: string; count: number }>
  total_amount_mxn_low: number
  cases_with_ground_truth: number
  cases_high_compranet: number
}

export interface CaseLibraryParams {
  fraud_type?: FraudType
  administration?: Administration
  sector_id?: number
  legal_status?: LegalStatus
  compranet_visibility?: CompranetVisibility
  severity_min?: number
  has_ground_truth?: boolean
  q?: string
  page?: number
  per_page?: number
  sort_by?: 'severity' | 'contract_year_start' | 'amount_mxn_low' | 'discovery_year'
  sort_dir?: 'asc' | 'desc'
}
```

---

### 19.7 i18n

**File:** `frontend/src/i18n/locales/en/cases.json` (new file)

```json
{
  "title": "Case Library",
  "subtitle": "{{count}} documented procurement corruption cases, 2002–2025",
  "filters": {
    "allTypes": "All Types",
    "allAdmins": "All Administrations",
    "allStatuses": "All Outcomes",
    "allVisibility": "All COMPRANET"
  },
  "fraudTypes": {
    "ghost_company": "Ghost Companies",
    "bid_rigging": "Bid Rigging",
    "overpricing": "Overpricing",
    "invoice_fraud": "Invoice Fraud",
    "bribery": "Bribery",
    "conflict_of_interest": "Conflict of Interest",
    "state_capture": "State Capture",
    "emergency_fraud": "Emergency Procurement",
    "infrastructure_overrun": "Infrastructure Overrun",
    "cartel_infiltration": "Cartel Infiltration",
    "monopoly": "Monopoly"
  },
  "administrations": {
    "fox": "Fox (2000–2006)",
    "calderon": "Calderón (2006–2012)",
    "epn": "Peña Nieto (2012–2018)",
    "amlo": "AMLO (2018–2024)",
    "sheinbaum": "Sheinbaum (2024–)",
    "multiple": "Multiple Administrations"
  },
  "legalStatus": {
    "convicted": "Convicted",
    "fined": "Fined",
    "acquitted": "Acquitted",
    "impunity": "No Charges",
    "investigation": "Under Investigation",
    "settled": "Settled (DOJ/SEC)",
    "ongoing": "Ongoing"
  },
  "severity": {
    "1": "Minor",
    "2": "Significant",
    "3": "Major",
    "4": "Systemic"
  },
  "compranet": {
    "high": "High — contracts fully in COMPRANET",
    "partial": "Partial — some contracts visible",
    "low": "Low — minimal COMPRANET presence",
    "none": "None — off-system"
  },
  "detail": {
    "keyActors": "Key Actors",
    "sources": "Sources",
    "modelConnection": "Model Connection",
    "modelConnectionText": "This case is in RUBLI's ground truth training set (Case #{{id}}). The v5.0 model learned corruption patterns from {{contracts}} contracts associated with this case.",
    "relatedCases": "Related Cases in This Sector",
    "compranetNote": "COMPRANET Visibility",
    "noGroundTruth": "This case has not been matched to COMPRANET vendor records and is not part of the risk model's training data.",
    "investigationLeads": "{{count}} AI investigation lead(s) match patterns from this case →"
  },
  "noResults": "No cases match the selected filters.",
  "note": "Cases marked \"No Charges\" reflect documented corruption where no prosecution occurred. The absence of conviction does not mean the events did not happen."
}
```

**File:** `frontend/src/i18n/locales/es/cases.json` — Spanish version (same structure).

**File:** `frontend/src/i18n/locales/en/nav.json` — add `"caseLibrary": "Case Library"`.

---

### 19.8 Backend Tests

**File:** `backend/tests/test_cases.py`

```python
"""Tests for Case Library endpoints."""
import pytest
from fastapi.testclient import TestClient

def test_list_cases_returns_paginated(client: TestClient):
    resp = client.get("/api/v1/cases")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert "pagination" in data
    assert data["pagination"]["total"] >= 0

def test_list_cases_fraud_type_filter(client: TestClient):
    resp = client.get("/api/v1/cases?fraud_type=ghost_company")
    assert resp.status_code == 200
    for item in resp.json()["data"]:
        assert item["fraud_type"] == "ghost_company"

def test_get_case_stats(client: TestClient):
    resp = client.get("/api/v1/cases/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_cases" in data
    assert "by_fraud_type" in data
    assert "by_administration" in data

def test_get_case_detail_valid_slug(client: TestClient):
    # Only runs if seed data is loaded — skip gracefully if empty table
    resp = client.get("/api/v1/cases/estafa-maestra")
    if resp.status_code == 404:
        pytest.skip("Seed data not loaded")
    assert resp.status_code == 200
    data = resp.json()
    assert "slug" in data
    assert "key_actors" in data
    assert "sources" in data

def test_get_case_detail_invalid_slug_returns_404(client: TestClient):
    resp = client.get("/api/v1/cases/this-case-does-not-exist")
    assert resp.status_code == 404

def test_get_cases_by_sector(client: TestClient):
    resp = client.get("/api/v1/cases/by-sector/1")  # salud
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
```

---

### 19.9 Execution Order (Post-Audit)

```
Week 1, Day 2 (after v5.0 revert is confirmed clean):

  Step 1: Create table in live DB via MCP write_query
          (paste the CREATE TABLE SQL from Section 19.1 directly)

  Step 2: Create backend/data/scandals_seed.json (43 entries)
          — This is data authoring, not code. Can do in any session.

  Step 3: Create backend/scripts/load_scandals.py (load script)

  Step 4: Run with --dry-run first:
          python -m scripts.load_scandals --dry-run
          Verify: 43 cases printed, no validation errors

  Step 5: Run for real:
          python -m scripts.load_scandals
          Verify: 43 rows inserted

  Step 6: Create backend/api/models/scandal.py
  Step 7: Create backend/api/routers/cases.py
  Step 8: Mount in backend/api/main.py
  Step 9: Add backend/tests/test_cases.py
          python -m pytest backend/tests/test_cases.py -v
          Expected: 6 tests passing

  Step 10: Add TypeScript types to frontend/src/api/types.ts
  Step 11: Add API client to frontend/src/api/client.ts
  Step 12: Create frontend/src/pages/CaseLibrary.tsx
  Step 13: Create frontend/src/pages/CaseDetail.tsx
  Step 14: Add routes to frontend/src/App.tsx
  Step 15: Add sidebar item to Sidebar.tsx
  Step 16: Create i18n files (en/cases.json, es/cases.json)
           Update nav.json
  Step 17: npx tsc --noEmit → 0 errors
  Step 18: Add by-sector panel to Sectors.tsx

Total estimated effort: 2 days (mostly data authoring for the seed JSON)
```

---

### 19.10 Summary of New Files

| File | Type | Notes |
|------|------|-------|
| `backend/data/scandals_seed.json` | Data | 43 cases, hand-authored |
| `backend/scripts/load_scandals.py` | Script | Idempotent seed loader |
| `backend/api/models/scandal.py` | Model | `ScandalListItem`, `ScandalDetail`, `ScandalStats` |
| `backend/api/routers/cases.py` | Router | 4 endpoints, read-only |
| `backend/tests/test_cases.py` | Test | 6 tests |
| `frontend/src/pages/CaseLibrary.tsx` | Page | List + filter view |
| `frontend/src/pages/CaseDetail.tsx` | Page | Single case detail |
| `frontend/src/i18n/locales/en/cases.json` | i18n | English strings |
| `frontend/src/i18n/locales/es/cases.json` | i18n | Spanish strings |

**Modified files:**
- `backend/scripts/etl_create_schema.py` — add `procurement_scandals` table
- `backend/api/main.py` — mount `cases.router`
- `frontend/src/App.tsx` — add 2 lazy routes
- `frontend/src/components/layout/Sidebar.tsx` — add `caseLibrary` nav item
- `frontend/src/api/client.ts` — add `caseLibraryApi`
- `frontend/src/api/types.ts` — add scandal types
- `frontend/src/i18n/locales/en/nav.json` — add `caseLibrary` key
- `frontend/src/i18n/locales/es/nav.json` — add `caseLibrary` key
- `frontend/src/pages/Sectors.tsx` — add documented cases sidebar panel

---

*End of technical specification.*
*Current state: v5.0 (72% reverted), 251 tests, TypeScript 0 errors.*
*Do not run any scripts until the 5-tier backend audit is complete.*
*Literature review integrated: February 2026. Sections 12–18 added.*
*Case Library section added: February 2026. Section 19. 43 cases researched.*
