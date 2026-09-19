/**
 * useEraData — the live cuts behind «El Libro Mayor de Cinco Sexenios» (SD-10).
 *
 * ## What the endpoints say, and what the story used to say (prod, 2026-09-19)
 *
 * The thesis holds: every administration through AMLO scored a higher share of
 * high-risk contracts than the one before it. Four of the numbers carrying it
 * did not.
 *
 *  - **AMLO is 12.53%, not 12.62%.** The Sep 18 gap refresh added rows: the
 *    term now holds 1,050,552 contracts, not 1,043,097. The drift from Fox is
 *    **+5.0 pp**, not +5.1.
 *  - **Sheinbaum is 11.18%, not 12.9%.** Her nine months land level with Peña
 *    Nieto's full term — 11.180 against 11.179, a gap of one thousandth of a
 *    point, which is not a difference — and below AMLO. The first term in the
 *    book that does not read higher than its predecessor.
 *  - **The sector ledger is wrong in every row.** The typed figures came from
 *    an April query whose sector mapping does not match the register's. The
 *    directions all survive; the magnitudes do not. Infrastructure fell 45%,
 *    not 65%. Hacienda rose 20%, not 70%. Defence rose 203%, not 186%.
 *  - **SEDENA's climb is not monotonic.** The army's contracting fell in 2019
 *    (9.69B against 2018's 9.94B) and fell on both readings in 2022 (12.49B,
 *    2.18% against 2021's 18.00B and 3.62%). The end points hold — 2.23% in
 *    2018 to 5.43% in 2024, 5.1× the 2015 share — but "every year of the AMLO
 *    sexenio expanded the army's footprint" is false, and so is the chapter
 *    title that called the climb monotonic.
 *
 * ## What the register cannot carry, and what this story stopped claiming
 *
 *  - **No per-category high-risk rate by term.** `/categories/sexenio` carries
 *    `avg_risk` — the mean risk indicator — and nothing else per administration.
 *    The story's "Food procurement ran at 32.4 percent high-risk" had no live
 *    source, and an indicator cannot be set against the OECD's 2-15% *rate*
 *    band the way the retired figure did. F4 draws the indicator and says so.
 *  - **No direct-award value split.** `year-over-year` publishes a direct-award
 *    *rate* over contracts and a total value; it does not split value by
 *    procedure type. "1,063 of 2,758 billion pesos without competition" cannot
 *    be rebuilt from it and is gone. The 79.41% count rate and the 2.758T term
 *    total both hold and stay.
 *  - **Segalmex and TOKA.** `/institutions/3667` holds 537 Segalmex contracts
 *    worth 19.70B at a 0.339 mean indicator — not the "1,258 contracts at a
 *    1.000 risk score" the story printed. `/vendors/102627` holds TOKA at 1,944
 *    contracts, 51.81B and a 0.988 indicator across 2013-2025, and the vendor
 *    contract endpoint ignores `year_from`, so no AMLO-only cut of it exists to
 *    check "40.6B, 897 contracts, 0.78" against. Both sentences now print the
 *    register's own lifetime readings.
 *  - **`/analysis/admin-breakdown` is not used here.** Its era table is off by
 *    one year against `lib/administrations.ts` (fox 2002-05, calderon 2006-11,
 *    pena_nieto 2012-17, amlo 2018-24). Every term figure on this page is
 *    rolled up from the annual series against the canonical ranges instead.
 */
import { useQuery } from '@tanstack/react-query'
import { categoriesApi, institutionApi } from '@/api/client'
import { ADMINISTRATIONS, ADMIN_DISPLAY_ACCENTED, type AdministrationKey } from '@/lib/administrations'
import { SECTORS } from '@/lib/constants'
import type { YearOverYearChange, SectorYearItem } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** The first year the register holds a real volume of contracts. */
export const FIRST_YEAR = 2002
/** The last complete year — the federal feed froze at 2025-09-28. */
export const LAST_FULL_YEAR = 2024
/**
 * The OECD's 2-15% band for the share of contracts a functioning system should
 * flag. External to RUBLI, carried with the story's citation (OECD 2023,
 * Public Procurement Performance Report: Mexico), and never presented as
 * something the register measures.
 */
export const OECD_FLOOR = 2
export const OECD_CEILING = 15
/**
 * A year holding fewer contracts than this is a register artefact, not a year:
 * the table carries rows dated 2000 (1 contract), 2001 (19) and 2004 (7).
 * SD-07, SD-08 and SD-09 all hit the same rows.
 */
export const MIN_YEAR_CONTRACTS = 1000

/** SECRETARÍA DE LA DEFENSA NACIONAL. */
export const SEDENA_ID = 384
/** F3's window — four pre-AMLO years to read the climb against. */
export const SEDENA_FROM = 2015

/** The two terms F2 and F4 set against each other. */
export const LEDGER_BEFORE: AdministrationKey = 'epn'
export const LEDGER_AFTER: AdministrationKey = 'amlo'
/** `/categories/sexenio` names its administrations; these are its two keys. */
const CAT_BEFORE = 'Peña Nieto'
const CAT_AFTER = 'AMLO'
/** F4 draws the ten largest AMLO-era categories by value. */
export const CATEGORY_ROWS = 10

// ── queries ───────────────────────────────────────────────────────────────

/**
 * F1, F3 and F5 — one request, three figures.
 *
 * Imported rather than re-declared: same endpoint, same query key, so this
 * story shares one cache entry with SD-02, SD-08, SD-09 and the dashboard.
 */
export { useYearOverYear } from './useEmergencyData'
/** F2 — every sector × year in one call. Shared with SD-09's F4. */
export { useSectorYears } from './useDirectAwardData'

/** F3 — SEDENA's own annual series, divided by the federal total. */
export function useSedenaTimeline(enabled = true) {
  return useQuery({
    queryKey: ['institution', SEDENA_ID, 'risk-timeline'],
    queryFn: () => institutionApi.getRiskTimeline(SEDENA_ID),
    staleTime: HOUR,
    enabled,
  })
}

/** F4 — every category's value and mean indicator, per administration. */
export function useCategorySexenio(enabled = true) {
  return useQuery({
    queryKey: ['categories', 'sexenio'],
    queryFn: () => categoriesApi.getSexenio(),
    staleTime: HOUR,
    enabled,
    select: (r) => r.data,
  })
}

// ── derived readings ──────────────────────────────────────────────────────

export interface EraYear {
  year: number
  contracts: number
  value: number
  /** Contracts the model scores high-risk, as a percent of the year's total. */
  rate: number
  /** The count behind the rate. */
  flagged: number
  /** 2025 stops at the register's horizon, 2025-09-28. */
  partial: boolean
}

/**
 * The annual series.
 *
 * `year-over-year` publishes a percentage, so the count is reconstructed as
 * contracts × rate. The percentage carries two decimals, which puts each year
 * within a few contracts of the register's own SUM.
 */
export function readEraYears(rows: YearOverYearChange[]): EraYear[] {
  return rows
    .filter((r) => r.contracts >= MIN_YEAR_CONTRACTS && r.year >= FIRST_YEAR)
    .map((r) => ({
      year: r.year,
      contracts: r.contracts,
      value: r.total_value,
      rate: r.high_risk_pct,
      flagged: Math.round((r.contracts * r.high_risk_pct) / 100),
      partial: r.year > LAST_FULL_YEAR,
    }))
    .sort((a, b) => a.year - b.year)
}

export interface TermReading {
  key: AdministrationKey
  name: string
  from: number
  to: number
  contracts: number
  flagged: number
  value: number
  /** `flagged / contracts`, percent — the contract-weighted share. */
  rate: number
  /** Direct awards as a percent of the term's contracts. */
  directAwardRate: number
  /** The term is still running, or its last year stops at the feed's horizon. */
  unfinished: boolean
}

/**
 * High-risk share per administration, contract-weighted.
 *
 * Σ flagged ÷ Σ contracts across the term's years, not the mean of the annual
 * rates: 2011 contributes 43,773 contracts and 2010 contributes 217,139, and
 * averaging by year would weigh them alike.
 *
 * Unlike SD-09's direct-award reading, no year is clipped. `high_risk_pct` is a
 * model output and is populated for every year the register scores, including
 * all of Structure A — the caveat there is coverage (0.1% RFC), not a missing
 * field, and F1 prints it rather than dropping the term.
 */
export function readTerms(years: EraYear[], rows: YearOverYearChange[]): TermReading[] {
  const byYear = new Map(years.map((r) => [r.year, r]))
  const daByYear = new Map(rows.map((r) => [r.year, r.direct_award_pct]))
  return ADMINISTRATIONS.map((a) => {
    const span: EraYear[] = []
    for (let y = a.yearStart; y <= a.yearEnd; y += 1) {
      const r = byYear.get(y)
      if (r) span.push(r)
    }
    if (!span.length) return null
    const contracts = span.reduce((s, r) => s + r.contracts, 0)
    const flagged = span.reduce((s, r) => s + r.flagged, 0)
    const directAwards = span.reduce((s, r) => s + (r.contracts * (daByYear.get(r.year) ?? 0)) / 100, 0)
    return {
      key: a.key,
      name: ADMIN_DISPLAY_ACCENTED[a.key],
      from: span[0].year,
      to: span[span.length - 1].year,
      contracts,
      flagged,
      value: span.reduce((s, r) => s + r.value, 0),
      rate: contracts > 0 ? (flagged / contracts) * 100 : 0,
      directAwardRate: contracts > 0 ? (directAwards / contracts) * 100 : 0,
      unfinished: span.some((r) => r.partial) || span[span.length - 1].year < a.yearEnd,
    } satisfies TermReading
  }).filter((t): t is TermReading => t != null)
}

/**
 * Whether every finished term reads higher than the one before it.
 *
 * The story's thesis. The finished terms do climb; Sheinbaum's nine months are
 * not a term and are not counted here.
 */
export function termsAscend(terms: TermReading[]): boolean {
  const finished = terms.filter((t) => !t.unfinished)
  return finished.every((t, i) => i === 0 || t.rate > finished[i - 1].rate)
}

export interface LedgerRow {
  sectorId: number
  code: string
  name: string
  color: string
  before: number
  after: number
  /** Percent change, `after` against `before`. */
  delta: number
}

/**
 * Σ `total_value` per sector across two terms, sorted by the change.
 *
 * This is the figure that replaces the story's April ledger. Every magnitude in
 * it moved; see the file header.
 */
export function readSectorLedger(
  rows: SectorYearItem[],
  before: { yearStart: number; yearEnd: number },
  after: { yearStart: number; yearEnd: number },
  lang: 'en' | 'es',
): LedgerRow[] {
  const sum = (from: number, to: number) => {
    const m = new Map<number, number>()
    for (const r of rows) {
      if (r.year < from || r.year > to) continue
      m.set(r.sector_id, (m.get(r.sector_id) ?? 0) + r.total_value)
    }
    return m
  }
  const a = sum(before.yearStart, before.yearEnd)
  const b = sum(after.yearStart, after.yearEnd)
  return SECTORS.map((s): LedgerRow | null => {
    const p = a.get(s.id)
    const q = b.get(s.id)
    if (p == null || q == null || p <= 0) return null
    return {
      sectorId: s.id,
      code: s.code,
      name: lang === 'es' ? s.name : s.nameEN,
      color: s.color,
      before: p,
      after: q,
      delta: ((q - p) / p) * 100,
    }
  })
    .filter((r): r is LedgerRow => r != null)
    .sort((x, y) => y.delta - x.delta)
}

/** A term's total across the sector ledger — the two sums F2 prints. */
export function sumLedger(rows: LedgerRow[], side: 'before' | 'after'): number {
  return rows.reduce((s, r) => s + r[side], 0)
}

export interface SedenaYear {
  year: number
  value: number
  contracts: number
  /** SEDENA's value as a percent of the federal total that year. */
  share: number
  partial: boolean
}

/**
 * SEDENA's annual contracting and its share of the federal total.
 *
 * Years the federal series does not carry are dropped rather than divided by
 * zero, and years below `SEDENA_FROM` are outside F3's window.
 */
export function readSedena(
  timeline: Array<{ year: number; contract_count: number; total_value: number }>,
  years: EraYear[],
  from = SEDENA_FROM,
): SedenaYear[] {
  const fed = new Map(years.map((r) => [r.year, r]))
  return timeline
    .filter((r) => r.year >= from)
    .map((r) => {
      const f = fed.get(r.year)
      if (!f || f.value <= 0) return null
      return {
        year: r.year,
        value: r.total_value,
        contracts: r.contract_count,
        share: (r.total_value / f.value) * 100,
        partial: f.partial,
      }
    })
    .filter((r): r is SedenaYear => r != null)
    .sort((a, b) => a.year - b.year)
}

/** Years whose value or share fell against the year before — F3 labels them. */
export function readSedenaDips(rows: SedenaYear[]): SedenaYear[] {
  return rows.filter((r, i) => i > 0 && !r.partial && r.share < rows[i - 1].share)
}

export interface CategoryShift {
  categoryId: number
  name: string
  sectorCode: string | null
  /** AMLO-era contracted value — the sort key. */
  value: number
  contracts: number
  /** Mean risk indicator, 0-1. NOT a high-risk rate; see the file header. */
  before: number
  after: number
  delta: number
}

/**
 * The ten largest AMLO-era categories by value, with their mean risk indicator
 * under Peña Nieto and under AMLO.
 *
 * Rows missing either administration are dropped rather than drawn against a
 * zero, which would read as an indicator of 0.000 rather than as no data.
 */
export function readCategoryShift(
  rows: Array<{
    category_id: number
    name_es: string
    name_en: string
    sector_code: string | null
    administrations: Record<string, { value: number; contracts: number; avg_risk: number }>
  }>,
  lang: 'en' | 'es',
  limit = CATEGORY_ROWS,
): CategoryShift[] {
  return rows
    .map((r): CategoryShift | null => {
      const a = r.administrations[CAT_AFTER]
      const b = r.administrations[CAT_BEFORE]
      if (!a || !b || a.avg_risk == null || b.avg_risk == null) return null
      return {
        categoryId: r.category_id,
        name: lang === 'es' ? r.name_es : r.name_en,
        sectorCode: r.sector_code,
        value: a.value,
        contracts: a.contracts,
        before: b.avg_risk,
        after: a.avg_risk,
        delta: a.avg_risk - b.avg_risk,
      }
    })
    .filter((r): r is CategoryShift => r != null)
    .sort((x, y) => y.value - x.value)
    .slice(0, limit)
    .sort((x, y) => y.after - x.after)
}
