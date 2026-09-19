/**
 * useDirectAwardData — the live cuts behind «La regla del 82 por ciento»
 * (SD-09).
 *
 * ## The window starts in 2010, and that is what broke the story's first number
 *
 * COMPRANET does not code procedure type before 2010: `direct_award_pct` reads
 * 0.00 for every year of Structure A (2002-2009). A term average taken over a
 * president's full calendar span therefore divides real direct awards by a
 * denominator that includes three years the register scored as fully
 * competitive. That is exactly what the story's Calderón figure did — 42.3%
 * over 2007-2012, where 2007, 2008 and 2009 contribute 152,605 contracts at a
 * recorded rate of ~0.0%. Measured over the years the register can actually
 * see, 2010-2012, Calderón's contract-weighted share is **61.90%**.
 *
 * So `readTerms` clips every term to `CODED_FROM` and marks the ones it had to
 * clip, rather than averaging across a seam the data cannot cross.
 *
 * ## What the endpoints say (prod, probed 2026-09-19)
 *
 *   - Term shares: Calderón (2010-2012) 61.90% · Peña Nieto 73.10% · AMLO
 *     79.41% · Sheinbaum (2025, partial) 68.26%.
 *   - The run at or above 60% is **fifteen** years, 2010-2024, not fourteen.
 *     Its floor is 60.05% in 2011.
 *   - Peak 82.18% in 2023; 2024 settles at 79.35%.
 *   - COVID moved the rate +0.29 points (77.80 → 78.09). The three years after
 *     it moved the rate +4.09 more.
 *   - 1,935,898 direct awards across 2010-2024, out of 2,608,022 contracts.
 *
 * ## Two endpoints publish a per-sector direct-award rate; one of them is wrong
 *
 * `/sectors?year=2023` returns Hacienda at **125.21%** — a direct-award count
 * of 9,466 against 7,561 contracts — and its per-sector contract counts do not
 * sum to the year's total. `/analysis/sector-year-breakdown` returns 91.10% for
 * the same cell, and its twelve sectors sum to exactly the 168,972 contracts
 * `year-over-year` reports for 2023. F4 reads the second one. The first is
 * logged as a QC item; SD-02's 2019/2020 cut of it is clean.
 */
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { ADMINISTRATIONS, ADMIN_DISPLAY_ACCENTED, type AdministrationKey } from '@/lib/administrations'
import { SECTORS } from '@/lib/constants'
import type { SectorYearItem, YearOverYearChange } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** The first year COMPRANET codes procedure type. Before it, every rate is 0. */
export const CODED_FROM = 2010
/** The last complete year — the federal feed froze at 2025-09-28. */
export const LAST_FULL_YEAR = 2024
/**
 * The direct-award line the story argues against.
 *
 * European Commission, Single Market Scoreboard — a direct-award share at or
 * above 10% is rated unsatisfactory (5% or under is satisfactory). External to
 * RUBLI and never presented as something the register measures; every figure
 * that draws it says whose line it is. The 25-30% "OECD ceiling" earlier
 * editions carried could not be traced to a published OECD instrument.
 */
export const EU_DIRECT_AWARD_LINE = 10
/** The floor of the run the headline claims. */
export const RULE_FLOOR = 60
/** The dumbbell's two cuts: the first coded year against the peak year. */
export const SHIFT_FROM = 2010
export const SHIFT_TO = 2023

/**
 * A year holding fewer contracts than this is a register artefact, not a year.
 * The table carries rows dated 2000 (1 contract), 2001 (19) and 2004 (7). SD-07
 * and SD-08 hit the same rows.
 */
export const MIN_YEAR_CONTRACTS = 1000

// ── queries ───────────────────────────────────────────────────────────────

/**
 * F1, F2, F3 and F5 — one request, four figures.
 *
 * Imported from SD-02 rather than re-declared: it is the same endpoint under
 * the same query key, so the two stories (and `/explore`, and the dashboard)
 * share one cache entry.
 */
export { useYearOverYear } from './useEmergencyData'

/** F4 — every sector × year in one call, rather than two `/sectors?year=`. */
export function useSectorYears(enabled = true) {
  return useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: HOUR,
    enabled,
    select: (r: { data: SectorYearItem[] }) => r.data,
  })
}

// ── derived readings ──────────────────────────────────────────────────────

export interface DaYear {
  year: number
  contracts: number
  value: number
  /** Direct awards as a percent of the year's contracts. */
  rate: number
  /** The count behind the rate — F5's bars. */
  directAwards: number
  /** Procedure type is coded for this year; before 2010 it is not. */
  coded: boolean
  /** 2025 stops at the register's horizon, 2025-09-28. */
  partial: boolean
}

/**
 * The annual series.
 *
 * `year-over-year` reports a percentage, so the count is reconstructed as
 * contracts × rate. The percentage carries two decimals, which puts each year
 * within a few contracts of the register's own SUM — the same reconstruction
 * SD-08's F5 uses, and it cross-checked there against the monthly breakdowns to
 * 0.005%.
 */
export function readYears(rows: YearOverYearChange[]): DaYear[] {
  return rows
    .filter((r) => r.contracts >= MIN_YEAR_CONTRACTS)
    .map((r) => ({
      year: r.year,
      contracts: r.contracts,
      value: r.total_value,
      rate: r.direct_award_pct,
      directAwards: Math.round((r.contracts * r.direct_award_pct) / 100),
      coded: r.year >= CODED_FROM && r.direct_award_pct >= 0.5,
      partial: r.year > LAST_FULL_YEAR,
    }))
    .sort((a, b) => a.year - b.year)
}

/** The comparable window: 2010 onwards, where procedure type is coded. */
export const inWindow = (r: DaYear) => r.year >= CODED_FROM

/** The highest rate in the window, partial years excluded. */
export function readPeak(years: DaYear[]): DaYear | undefined {
  const full = years.filter((r) => inWindow(r) && !r.partial)
  return full.length ? full.reduce((a, b) => (b.rate > a.rate ? b : a)) : undefined
}

export interface Run {
  from: number
  to: number
  length: number
  /** The lowest rate inside the run, and the year that set it. */
  floor: DaYear
}

/** The longest unbroken stretch at or above `threshold`, partial years aside. */
export function readRun(years: DaYear[], threshold = RULE_FLOOR): Run | undefined {
  const full = years.filter((r) => inWindow(r) && !r.partial)
  let best: DaYear[] = []
  let cur: DaYear[] = []
  for (const r of full) {
    if (r.rate >= threshold) cur.push(r)
    else {
      if (cur.length > best.length) best = cur
      cur = []
    }
  }
  if (cur.length > best.length) best = cur
  if (!best.length) return undefined
  return {
    from: best[0].year,
    to: best[best.length - 1].year,
    length: best.length,
    floor: best.reduce((a, b) => (b.rate < a.rate ? b : a)),
  }
}

/** Direct awards summed across an inclusive year range. */
export function sumDirectAwards(years: DaYear[], from: number, to: number): number {
  return years.filter((r) => r.year >= from && r.year <= to).reduce((s, r) => s + r.directAwards, 0)
}

/** Contracts summed across an inclusive year range. */
export function sumContracts(years: DaYear[], from: number, to: number): number {
  return years.filter((r) => r.year >= from && r.year <= to).reduce((s, r) => s + r.contracts, 0)
}

export interface TermReading {
  key: AdministrationKey
  name: string
  /** The term's first year the register can score — never before 2010. */
  from: number
  to: number
  contracts: number
  directAwards: number
  value: number
  /** `directAwards / contracts`, percent — the contract-weighted share. */
  share: number
  /** The term began before 2010, so its early years are not scoreable. */
  clipped: boolean
  /** The term is still running, or its last year stops at the feed's horizon. */
  unfinished: boolean
}

/**
 * Direct-award share per administration, contract-weighted.
 *
 * Σ direct awards ÷ Σ contracts over the term's scoreable years — not the mean
 * of the yearly rates, which would give 2011's 43,773 contracts the same weight
 * as 2010's 217,139. Terms with no scoreable year at all (Fox, 2000-2006) drop
 * out rather than reporting the 0.0% the register literally holds.
 */
export function readTerms(years: DaYear[]): TermReading[] {
  const byYear = new Map(years.map((r) => [r.year, r]))
  return ADMINISTRATIONS.map((a) => {
    const from = Math.max(a.yearStart, CODED_FROM)
    const rows: DaYear[] = []
    for (let y = from; y <= a.yearEnd; y += 1) {
      const r = byYear.get(y)
      if (r) rows.push(r)
    }
    if (!rows.length) return null
    const contracts = rows.reduce((s, r) => s + r.contracts, 0)
    const directAwards = rows.reduce((s, r) => s + r.directAwards, 0)
    return {
      key: a.key,
      name: ADMIN_DISPLAY_ACCENTED[a.key],
      from,
      to: rows[rows.length - 1].year,
      contracts,
      directAwards,
      value: rows.reduce((s, r) => s + r.value, 0),
      share: contracts > 0 ? (directAwards / contracts) * 100 : 0,
      clipped: a.yearStart < CODED_FROM,
      unfinished: rows.some((r) => r.partial) || rows[rows.length - 1].year < a.yearEnd,
    } satisfies TermReading
  }).filter((t): t is TermReading => t != null)
}

/**
 * Whether every finished term reads higher than the one before it.
 *
 * The story asserts "every government used less competition than the last". The
 * three complete terms do climb; the fourth is nine months of 2025, which is
 * not a term and is not counted here. F1 prints whichever of the two sentences
 * this returns.
 */
export function termsAscend(terms: TermReading[]): boolean {
  const finished = terms.filter((t) => !t.unfinished)
  return finished.every((t, i) => i === 0 || t.share > finished[i - 1].share)
}

export interface SectorShift {
  sectorId: number
  name: string
  color: string
  before: number
  after: number
  /** Percentage points, `after - before`. */
  delta: number
  contractsBefore: number
  contractsAfter: number
}

/**
 * Direct-award share per sector at two cuts, sorted by the change.
 *
 * Rows whose sector is missing from either year are dropped rather than drawn
 * against a zero.
 */
export function readSectorShift(
  rows: SectorYearItem[],
  from: number,
  to: number,
  lang: 'en' | 'es',
): SectorShift[] {
  const pick = (year: number) => new Map(rows.filter((r) => r.year === year).map((r) => [r.sector_id, r]))
  const a = pick(from)
  const b = pick(to)
  return SECTORS.map((s): SectorShift | null => {
    const ra = a.get(s.id)
    const rb = b.get(s.id)
    if (!ra || !rb) return null
    return {
      sectorId: s.id,
      name: lang === 'es' ? s.name : s.nameEN,
      color: s.color,
      before: ra.direct_award_pct,
      after: rb.direct_award_pct,
      delta: rb.direct_award_pct - ra.direct_award_pct,
      contractsBefore: ra.contracts,
      contractsAfter: rb.contracts,
    }
  })
    .filter((r): r is SectorShift => r != null)
    .sort((x, y) => y.delta - x.delta)
}
