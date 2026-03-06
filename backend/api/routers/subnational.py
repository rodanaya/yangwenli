"""
subnational.py — State & Municipal Expenditure Analysis

Endpoints:
  GET /subnational/states              — all 32 states with summary stats
  GET /subnational/states/{code}       — detail: institutions, year trend, risk dist
  GET /subnational/states/{code}/vendors — top vendors with local-concentration flag

Coverage note (served in every response):
  Data covers only federally-funded contracts reported to COMPRANET (LAASSP Art. 1 §6).
  State and municipal own-revenue procurement is not reported to COMPRANET.
"""

import logging
import time as _time
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..dependencies import get_db

# ── Module-level response cache ───────────────────────────────────────────────
_states_cache: dict[str, Any] = {}
_STATES_CACHE_TTL = 3600  # 1 hour

log = logging.getLogger(__name__)

router = APIRouter(prefix="/subnational", tags=["subnational"])

# ── Data coverage disclaimer ──────────────────────────────────────────────────
COVERAGE_NOTE = (
    "Data covers federally-funded contracts only (LAASSP Art. 1 §6). "
    "State and municipal own-revenue procurement is not reported to COMPRANET."
)

# ── State code → full name mapping ───────────────────────────────────────────
STATE_NAMES: dict[str, str] = {
    'AGS':  'Aguascalientes',
    'BC':   'Baja California',
    'BCS':  'Baja California Sur',
    'CAMP': 'Campeche',
    'CHIS': 'Chiapas',
    'CHIH': 'Chihuahua',
    'COAH': 'Coahuila',
    'COL':  'Colima',
    'CDMX': 'Ciudad de México',
    'DGO':  'Durango',
    'GTO':  'Guanajuato',
    'GRO':  'Guerrero',
    'HGO':  'Hidalgo',
    'JAL':  'Jalisco',
    'MEX':  'Estado de México',
    'MICH': 'Michoacán',
    'MOR':  'Morelos',
    'NAY':  'Nayarit',
    'NL':   'Nuevo León',
    'OAX':  'Oaxaca',
    'PUE':  'Puebla',
    'QRO':  'Querétaro',
    'QROO': 'Quintana Roo',
    'SLP':  'San Luis Potosí',
    'SIN':  'Sinaloa',
    'SON':  'Sonora',
    'TAB':  'Tabasco',
    'TAMPS':'Tamaulipas',
    'TLAX': 'Tlaxcala',
    'VER':  'Veracruz',
    'YUC':  'Yucatán',
    'ZAC':  'Zacatecas',
}


# ── Pydantic models ──────────────────────────────────────────────────────────

class StateSummary(BaseModel):
    state_code: str
    state_name: str
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float
    institution_count: int
    vendor_count: int
    direct_award_rate: float
    single_bid_rate: float
    top_institution: Optional[str]
    top_institution_value_mxn: Optional[float]
    years_active: list[int]


class StateListResponse(BaseModel):
    data: list[StateSummary]
    total_states: int
    total_contracts: int
    total_value_mxn: float
    coverage_note: str


class YearTrend(BaseModel):
    year: int
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float
    direct_award_rate: float


class InstitutionSummary(BaseModel):
    institution_id: int
    institution_name: str
    institution_type: str
    gobierno_nivel: Optional[str]
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float
    direct_award_rate: float


class RiskDistribution(BaseModel):
    critical: int
    high: int
    medium: int
    low: int
    critical_pct: float
    high_pct: float


class StateDetailResponse(BaseModel):
    state_code: str
    state_name: str
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float
    institution_count: int
    vendor_count: int
    direct_award_rate: float
    single_bid_rate: float
    risk_distribution: RiskDistribution
    year_trend: list[YearTrend]
    top_institutions: list[InstitutionSummary]
    coverage_note: str


class VendorConcentration(BaseModel):
    vendor_id: int
    vendor_name: str
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float
    state_share_pct: float       # % of this state's contracts won by this vendor
    state_concentration_pct: float  # % of vendor's TOTAL contracts that are in this state
    is_local_dominant: bool      # >70% of their work is in this one state
    direct_award_rate: float


class StateVendorResponse(BaseModel):
    state_code: str
    state_name: str
    vendors: list[VendorConcentration]
    local_dominant_count: int    # vendors whose work is 70%+ in this state
    year: Optional[int]
    coverage_note: str


class StateInstitutionItem(BaseModel):
    institution_name: str
    total_contracts: int
    total_value_mxn: float
    avg_risk_score: float
    direct_award_pct: float


class StateInstitutionsResponse(BaseModel):
    state_code: str
    state_name: str
    year: Optional[int]
    institutions: list[StateInstitutionItem]
    coverage_note: str


class StateSectorItem(BaseModel):
    sector_id: int
    sector_code: str
    sector_name: str
    sector_color: str
    contract_count: int
    total_value_mxn: float
    avg_risk_score: float
    pct_of_state_total: float


class StateSectorsResponse(BaseModel):
    state_code: str
    state_name: str
    sectors: list[StateSectorItem]
    total_value_mxn: float
    coverage_note: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _validate_state(code: str) -> str:
    code = code.upper()
    if code not in STATE_NAMES:
        raise HTTPException(status_code=404, detail=f"State code '{code}' not found")
    return code


def _state_filter_clause() -> str:
    """SQL fragment to join contracts → institutions by state_code."""
    return "i.state_code = ?"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/states", response_model=StateListResponse)
async def list_states(
    min_contracts: int = Query(10, ge=1, description="Minimum contracts to include a state"),
    year: Optional[int] = Query(None, ge=2002, le=2025, description="Filter by contract year"),
):
    """
    All 32 states with subnational procurement summary.
    Reads from precomputed subnational_state_stats table — instant response.
    Run precompute_stats.py after ETL to refresh.
    """
    import json as _json

    cache_key = f"{min_contracts}:{year}"
    cached = _states_cache.get(cache_key)
    if cached and (_time.time() - cached["ts"]) < _STATES_CACHE_TTL:
        return cached["data"]

    year_key = year if year is not None else 0

    with get_db() as conn:
        rows = conn.execute(
            '''SELECT * FROM subnational_state_stats
               WHERE year = ? AND contract_count >= ?
               ORDER BY total_value_mxn DESC''',
            (year_key, min_contracts),
        ).fetchall()

        # Fall back to live query if precomputed table is empty (e.g. first deploy)
        if not rows:
            log.warning("subnational_state_stats empty for year=%s — falling back to live query", year)
            return await _list_states_live(conn, min_contracts, year)

    states = []
    for r in rows:
        years_active: list[int] = []
        if r['years_active']:
            try:
                years_active = _json.loads(r['years_active'])
            except Exception:
                pass
        states.append(StateSummary(
            state_code=r['state_code'],
            state_name=r['state_name'],
            contract_count=r['contract_count'],
            total_value_mxn=r['total_value_mxn'],
            avg_risk_score=r['avg_risk_score'],
            institution_count=r['institution_count'],
            vendor_count=r['vendor_count'],
            direct_award_rate=r['direct_award_rate'],
            single_bid_rate=r['single_bid_rate'],
            top_institution=r['top_institution'],
            top_institution_value_mxn=r['top_institution_value_mxn'],
            years_active=years_active,
        ))

    total_contracts = sum(s.contract_count for s in states)
    total_value = sum(s.total_value_mxn for s in states)

    response = StateListResponse(
        data=states,
        total_states=len(states),
        total_contracts=total_contracts,
        total_value_mxn=total_value,
        coverage_note=COVERAGE_NOTE,
    )
    _states_cache[cache_key] = {"ts": _time.time(), "data": response}
    return response


async def _list_states_live(conn: Any, min_contracts: int, year: Optional[int]) -> StateListResponse:
    """Fallback live query used only when precomputed table is missing/empty."""
    import json as _json
    year_clause = "AND c.contract_year = ?" if year is not None else ""
    year_params = (year,) if year is not None else ()

    rows = conn.execute(f'''
        SELECT i.state_code,
               COUNT(c.id) AS contract_count,
               COALESCE(SUM(c.amount_mxn), 0) AS total_value_mxn,
               COALESCE(AVG(c.risk_score), 0) AS avg_risk_score,
               COUNT(DISTINCT c.institution_id) AS institution_count,
               COUNT(DISTINCT c.vendor_id) AS vendor_count,
               COALESCE(AVG(CASE WHEN c.is_direct_award=1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_rate,
               COALESCE(AVG(CASE WHEN c.is_single_bid=1   THEN 1.0 ELSE 0.0 END), 0) AS single_bid_rate,
               GROUP_CONCAT(DISTINCT c.contract_year) AS years_csv
        FROM contracts c
        JOIN institutions i ON c.institution_id = i.id
        WHERE i.state_code IS NOT NULL AND i.state_code != ''
          AND i.gobierno_nivel IN ('GE','GM','GEM')
          {year_clause}
        GROUP BY i.state_code
        HAVING contract_count >= ?
        ORDER BY total_value_mxn DESC
    ''', year_params + (min_contracts,)).fetchall()

    top_inst = conn.execute(f'''
        SELECT i.state_code, i.name AS institution_name, SUM(c.amount_mxn) AS inst_value
        FROM contracts c
        JOIN institutions i ON c.institution_id = i.id
        WHERE i.state_code IS NOT NULL AND i.state_code != ''
          AND i.gobierno_nivel IN ('GE','GM','GEM')
          {year_clause}
        GROUP BY i.state_code, i.id
        ORDER BY i.state_code, inst_value DESC
    ''', year_params).fetchall()

    top_by_state: dict[str, tuple] = {}
    for r in top_inst:
        if r['state_code'] not in top_by_state:
            top_by_state[r['state_code']] = (r['institution_name'], r['inst_value'])

    states = []
    for r in rows:
        code = r['state_code']
        top = top_by_state.get(code)
        years_active = sorted(
            int(y) for y in (r['years_csv'] or '').split(',') if y.strip().isdigit()
        )
        states.append(StateSummary(
            state_code=code,
            state_name=STATE_NAMES.get(code, code),
            contract_count=r['contract_count'],
            total_value_mxn=r['total_value_mxn'],
            avg_risk_score=round(r['avg_risk_score'], 4),
            institution_count=r['institution_count'],
            vendor_count=r['vendor_count'],
            direct_award_rate=round(r['direct_award_rate'], 4),
            single_bid_rate=round(r['single_bid_rate'], 4),
            top_institution=top[0] if top else None,
            top_institution_value_mxn=top[1] if top else None,
            years_active=years_active,
        ))

    return StateListResponse(
        data=states,
        total_states=len(states),
        total_contracts=sum(s.contract_count for s in states),
        total_value_mxn=sum(s.total_value_mxn for s in states),
        coverage_note=COVERAGE_NOTE,
    )


@router.get("/states/{code}", response_model=StateDetailResponse)
async def get_state_detail(code: str):
    """
    Full detail for one state: year trend, institutions breakdown, risk distribution.
    """
    code = _validate_state(code)

    with get_db() as conn:
        # Summary
        summary = conn.execute('''
            SELECT
                COUNT(c.id)                                   AS contract_count,
                COALESCE(SUM(c.amount_mxn), 0)               AS total_value_mxn,
                COALESCE(AVG(c.risk_score), 0)               AS avg_risk_score,
                COUNT(DISTINCT c.institution_id)             AS institution_count,
                COUNT(DISTINCT c.vendor_id)                  AS vendor_count,
                COALESCE(AVG(CASE WHEN c.is_direct_award=1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_rate,
                COALESCE(AVG(CASE WHEN c.is_single_bid=1   THEN 1.0 ELSE 0.0 END), 0) AS single_bid_rate,
                SUM(CASE WHEN c.risk_level='critical' THEN 1 ELSE 0 END) AS n_critical,
                SUM(CASE WHEN c.risk_level='high'     THEN 1 ELSE 0 END) AS n_high,
                SUM(CASE WHEN c.risk_level='medium'   THEN 1 ELSE 0 END) AS n_medium,
                SUM(CASE WHEN c.risk_level='low'      THEN 1 ELSE 0 END) AS n_low
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
        ''', (code,)).fetchone()

        if not summary or summary['contract_count'] == 0:
            raise HTTPException(status_code=404, detail=f"No subnational data for state '{code}'")

        # Year trend
        year_rows = conn.execute('''
            SELECT
                c.contract_year                              AS year,
                COUNT(c.id)                                  AS contract_count,
                COALESCE(SUM(c.amount_mxn), 0)              AS total_value_mxn,
                COALESCE(AVG(c.risk_score), 0)              AS avg_risk_score,
                COALESCE(AVG(CASE WHEN c.is_direct_award=1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_rate
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
              AND c.contract_year IS NOT NULL
            GROUP BY c.contract_year
            ORDER BY c.contract_year
        ''', (code,)).fetchall()

        # Top institutions
        inst_rows = conn.execute('''
            SELECT
                i.id                                         AS institution_id,
                i.name                                       AS institution_name,
                i.institution_type,
                i.gobierno_nivel,
                COUNT(c.id)                                  AS contract_count,
                COALESCE(SUM(c.amount_mxn), 0)              AS total_value_mxn,
                COALESCE(AVG(c.risk_score), 0)              AS avg_risk_score,
                COALESCE(AVG(CASE WHEN c.is_direct_award=1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_rate
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
            GROUP BY i.id
            ORDER BY total_value_mxn DESC
            LIMIT 20
        ''', (code,)).fetchall()

    n_total = summary['contract_count'] or 1
    risk_dist = RiskDistribution(
        critical=summary['n_critical'],
        high=summary['n_high'],
        medium=summary['n_medium'],
        low=summary['n_low'],
        critical_pct=round(100 * summary['n_critical'] / n_total, 1),
        high_pct=round(100 * summary['n_high'] / n_total, 1),
    )

    return StateDetailResponse(
        state_code=code,
        state_name=STATE_NAMES[code],
        contract_count=summary['contract_count'],
        total_value_mxn=summary['total_value_mxn'],
        avg_risk_score=round(summary['avg_risk_score'], 4),
        institution_count=summary['institution_count'],
        vendor_count=summary['vendor_count'],
        direct_award_rate=round(summary['direct_award_rate'], 4),
        single_bid_rate=round(summary['single_bid_rate'], 4),
        risk_distribution=risk_dist,
        year_trend=[YearTrend(
            year=r['year'],
            contract_count=r['contract_count'],
            total_value_mxn=r['total_value_mxn'],
            avg_risk_score=round(r['avg_risk_score'], 4),
            direct_award_rate=round(r['direct_award_rate'], 4),
        ) for r in year_rows],
        top_institutions=[InstitutionSummary(
            institution_id=r['institution_id'],
            institution_name=r['institution_name'],
            institution_type=r['institution_type'] or '',
            gobierno_nivel=r['gobierno_nivel'],
            contract_count=r['contract_count'],
            total_value_mxn=r['total_value_mxn'],
            avg_risk_score=round(r['avg_risk_score'], 4),
            direct_award_rate=round(r['direct_award_rate'], 4),
        ) for r in inst_rows],
        coverage_note=COVERAGE_NOTE,
    )


@router.get("/states/{code}/vendors", response_model=StateVendorResponse)
async def get_state_vendors(
    code: str,
    year: Optional[int] = Query(None, ge=2002, le=2025),
    limit: int = Query(30, ge=5, le=100),
):
    """
    Top vendors in a state with local-concentration signal.
    is_local_dominant = vendor has >70% of their total contracts in this state.
    state_share_pct = vendor's share of THIS state's total contracts.
    Optional year filter applies to state queries but NOT to national totals
    (national totals remain unfiltered to preserve concentration context).
    """
    code = _validate_state(code)

    year_clause = "AND c.contract_year = ?" if year is not None else ""
    year_params_single = (year,) if year is not None else ()

    with get_db() as conn:
        # Total contracts in state (denominator for state_share_pct)
        state_total = conn.execute(f'''
            SELECT COUNT(c.id) AS n
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
              {year_clause}
        ''', (code,) + year_params_single).fetchone()['n'] or 1

        # Top vendors in this state
        vendor_rows = conn.execute(f'''
            SELECT
                c.vendor_id,
                v.name                                        AS vendor_name,
                COUNT(c.id)                                  AS state_contracts,
                COALESCE(SUM(c.amount_mxn), 0)              AS total_value_mxn,
                COALESCE(AVG(c.risk_score), 0)              AS avg_risk_score,
                COALESCE(AVG(CASE WHEN c.is_direct_award=1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_rate
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            JOIN vendors v ON c.vendor_id = v.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
              AND c.vendor_id IS NOT NULL
              {year_clause}
            GROUP BY c.vendor_id
            ORDER BY state_contracts DESC
            LIMIT ?
        ''', (code,) + year_params_single + (limit,)).fetchall()

        # Total contracts nationwide for these vendors (unfiltered — national context)
        vendor_ids = [r['vendor_id'] for r in vendor_rows]
        if not vendor_ids:
            return StateVendorResponse(
                state_code=code,
                state_name=STATE_NAMES[code],
                vendors=[],
                local_dominant_count=0,
                year=year,
                coverage_note=COVERAGE_NOTE,
            )

        placeholders = ','.join('?' * len(vendor_ids))
        national_rows = conn.execute(f'''
            SELECT vendor_id, COUNT(*) AS total_contracts
            FROM contracts
            WHERE vendor_id IN ({placeholders})
            GROUP BY vendor_id
        ''', vendor_ids).fetchall()

    national_totals = {r['vendor_id']: r['total_contracts'] for r in national_rows}

    vendors = []
    for r in vendor_rows:
        vid = r['vendor_id']
        state_n = r['state_contracts']
        nat_n = national_totals.get(vid, state_n)
        state_concentration = round(100 * state_n / nat_n, 1) if nat_n > 0 else 0.0
        vendors.append(VendorConcentration(
            vendor_id=vid,
            vendor_name=r['vendor_name'] or f'Vendor #{vid}',
            contract_count=state_n,
            total_value_mxn=r['total_value_mxn'],
            avg_risk_score=round(r['avg_risk_score'], 4),
            state_share_pct=round(100 * state_n / state_total, 2),
            state_concentration_pct=state_concentration,
            is_local_dominant=state_concentration >= 70.0,
            direct_award_rate=round(r['direct_award_rate'], 4),
        ))

    local_dominant = sum(1 for v in vendors if v.is_local_dominant)

    return StateVendorResponse(
        state_code=code,
        state_name=STATE_NAMES[code],
        vendors=vendors,
        local_dominant_count=local_dominant,
        year=year,
        coverage_note=COVERAGE_NOTE,
    )


@router.get("/states/{code}/institutions", response_model=StateInstitutionsResponse)
async def get_state_institutions(
    code: str,
    year: Optional[int] = Query(None, ge=2002, le=2025),
    limit: int = Query(20, ge=5, le=100),
):
    """
    Top institutions (by contract value) operating in a state.
    """
    code = _validate_state(code)

    year_clause = "AND c.contract_year = ?" if year is not None else ""
    params: tuple = (code,) + ((year,) if year is not None else ()) + (limit,)

    with get_db() as conn:
        rows = conn.execute(f'''
            SELECT
                i.name                                       AS institution_name,
                COUNT(*)                                     AS total_contracts,
                COALESCE(SUM(c.amount_mxn), 0)              AS total_value_mxn,
                AVG(COALESCE(c.risk_score, 0))              AS avg_risk_score,
                ROUND(
                    100.0 * SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END)
                    / COUNT(*),
                    1
                )                                            AS direct_award_pct
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
              {year_clause}
            GROUP BY i.id, i.name
            ORDER BY total_value_mxn DESC
            LIMIT ?
        ''', params).fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No subnational institution data for state '{code}'"
            + (f" in year {year}" if year else ""),
        )

    return StateInstitutionsResponse(
        state_code=code,
        state_name=STATE_NAMES[code],
        year=year,
        institutions=[
            StateInstitutionItem(
                institution_name=r['institution_name'] or '',
                total_contracts=r['total_contracts'],
                total_value_mxn=r['total_value_mxn'],
                avg_risk_score=round(r['avg_risk_score'], 4),
                direct_award_pct=r['direct_award_pct'] or 0.0,
            )
            for r in rows
        ],
        coverage_note=COVERAGE_NOTE,
    )


@router.get("/states/{code}/sectors", response_model=StateSectorsResponse)
async def get_state_sectors(
    code: str,
    year: Optional[int] = Query(None, ge=2002, le=2025),
):
    """
    Sector breakdown for a state (by contract value, federally-funded only).
    """
    code = _validate_state(code)

    year_clause = "AND c.contract_year = ?" if year is not None else ""
    params: tuple = (code,) + ((year,) if year is not None else ())

    with get_db() as conn:
        rows = conn.execute(f'''
            SELECT
                s.id                                         AS sector_id,
                s.code                                       AS sector_code,
                s.name_es                                    AS sector_name,
                s.color                                      AS sector_color,
                COUNT(c.id)                                  AS contract_count,
                COALESCE(SUM(c.amount_mxn), 0)              AS total_value_mxn,
                AVG(COALESCE(c.risk_score, 0))              AS avg_risk_score
            FROM contracts c
            JOIN institutions i ON c.institution_id = i.id
            JOIN sectors s      ON c.sector_id = s.id
            WHERE i.state_code = ? AND i.gobierno_nivel IN ('GE','GM','GEM')
              {year_clause}
            GROUP BY s.id, s.code, s.name_es, s.color
            ORDER BY total_value_mxn DESC
        ''', params).fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No subnational sector data for state '{code}'",
        )

    state_total = sum(r['total_value_mxn'] for r in rows)
    return StateSectorsResponse(
        state_code=code,
        state_name=STATE_NAMES[code],
        total_value_mxn=state_total,
        sectors=[
            StateSectorItem(
                sector_id=r['sector_id'],
                sector_code=r['sector_code'],
                sector_name=r['sector_name'],
                sector_color=r['sector_color'],
                contract_count=r['contract_count'],
                total_value_mxn=r['total_value_mxn'],
                avg_risk_score=round(r['avg_risk_score'], 4),
                pct_of_state_total=round(100 * r['total_value_mxn'] / state_total, 1) if state_total else 0.0,
            )
            for r in rows
        ],
        coverage_note=COVERAGE_NOTE,
    )
