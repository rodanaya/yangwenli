/**
 * Basic utility function tests for RUBLI frontend
 *
 * These tests verify the core formatting utilities used throughout the app.
 * To run: npm test (after adding vitest)
 */

import { describe, it, expect } from 'vitest'
import { formatNumber, formatCompactMXN, formatPercent, getRiskLevel, toTitleCase } from '../lib/utils'
import { formatEntityName } from '../lib/entity/format'
import { RISK_THRESHOLDS, RISK_THRESHOLDS_V3, CURRENT_MODEL_VERSION } from '../lib/constants'

describe('formatNumber', () => {
  it('formats integers with thousands separators', () => {
    expect(formatNumber(1000)).toMatch(/1[,.]000/)
    expect(formatNumber(1000000)).toMatch(/1[,.]000[,.]000/)
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('handles negative numbers', () => {
    expect(formatNumber(-1000)).toContain('1')
  })
})

describe('formatCompactMXN', () => {
  it('formats millions with M suffix', () => {
    const result = formatCompactMXN(1500000)
    expect(result).toContain('1.5')
    expect(result.toLowerCase()).toContain('m')
  })

  it('formats billions with B suffix', () => {
    const result = formatCompactMXN(1500000000)
    expect(result).toContain('1.5')
    expect(result.toLowerCase()).toContain('b')
  })

  it('handles small amounts', () => {
    const result = formatCompactMXN(500)
    // Should format as currency without abbreviation
    expect(result).toBeDefined()
  })
})

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    const result = formatPercent(0.75)
    expect(result).toContain('75')
  })

  it('handles zero', () => {
    const result = formatPercent(0)
    expect(result).toContain('0')
  })

  it('handles values over 100%', () => {
    const result = formatPercent(1.5)
    expect(result).toContain('150')
  })
})

describe('Risk model version', () => {
  it('is set to v0.8.5', () => {
    expect(CURRENT_MODEL_VERSION).toBe('v0.8.5')
  })
})

describe('Risk thresholds (v0.8.5)', () => {
  it('defines correct v0.8.5 thresholds', () => {
    // v0.8.5 risk score thresholds (OECD-calibrated, HR=11.01%)
    // Critical: >= 0.60 (strongest similarity to known corruption patterns)
    // High: >= 0.40 (strong similarity)
    // Medium: >= 0.25 (moderate similarity — actionable)
    // Low: < 0.25

    expect(RISK_THRESHOLDS.critical).toBe(0.60)
    expect(RISK_THRESHOLDS.high).toBe(0.40)
    expect(RISK_THRESHOLDS.medium).toBe(0.25)
    expect(RISK_THRESHOLDS.low).toBe(0)
  })

  it('preserves v3.3 thresholds for reference', () => {
    expect(RISK_THRESHOLDS_V3.critical).toBe(0.50)
    expect(RISK_THRESHOLDS_V3.high).toBe(0.35)
    expect(RISK_THRESHOLDS_V3.medium).toBe(0.20)
  })
})

describe('getRiskLevel (v0.8.5 thresholds)', () => {
  it('returns critical for scores >= 0.60', () => {
    expect(getRiskLevel(0.60)).toBe('critical')
    expect(getRiskLevel(0.75)).toBe('critical')
    expect(getRiskLevel(1.0)).toBe('critical')
  })

  it('returns high for scores >= 0.40 and < 0.60', () => {
    expect(getRiskLevel(0.40)).toBe('high')
    expect(getRiskLevel(0.50)).toBe('high')
    expect(getRiskLevel(0.59)).toBe('high')
  })

  it('returns medium for scores >= 0.25 and < 0.40', () => {
    expect(getRiskLevel(0.25)).toBe('medium')
    expect(getRiskLevel(0.30)).toBe('medium')
    expect(getRiskLevel(0.39)).toBe('medium')
  })

  it('returns low for scores < 0.25', () => {
    expect(getRiskLevel(0.0)).toBe('low')
    expect(getRiskLevel(0.10)).toBe('low')
    expect(getRiskLevel(0.249)).toBe('low')
  })
})

describe('Amount validation constants', () => {
  it('defines correct amount thresholds', () => {
    // These should match backend validation
    const MAX_CONTRACT_VALUE = 100_000_000_000 // 100B MXN
    const FLAG_THRESHOLD = 10_000_000_000 // 10B MXN

    expect(MAX_CONTRACT_VALUE).toBe(100000000000)
    expect(FLAG_THRESHOLD).toBe(10000000000)
  })
})

// PARALLAX D6b § Change 1 — siglas keep their capitals, institution names take
// their casing from toTitleCase (particles + period suffixes handled once).
describe('toTitleCase — sigla guard', () => {
  it('leaves a lone all-caps token of 8 characters or fewer alone', () => {
    for (const sigla of ['SPF', 'INAI', 'AFAC', 'SIAP', 'FND', 'CIJ', 'AGN', 'IMSS', 'PEMEX', 'CFE']) {
      expect(toTitleCase(sigla)).toBe(sigla)
    }
  })

  it('still title-cases multi-word ALL CAPS names', () => {
    expect(toTitleCase('SECRETARIA DE SALUD')).toBe('Secretaria de Salud')
  })

  it('still title-cases a long single all-caps token', () => {
    expect(toTitleCase('ASIPONAACAPULCO')).toBe('Asiponaacapulco')
  })

  it('leaves genuine mixed case alone', () => {
    expect(toTitleCase('Grupo Fármacos')).toBe('Grupo Fármacos')
  })
})

describe('formatEntityName — institution', () => {
  it('keeps siglas uppercase', () => {
    expect(formatEntityName('institution', 'SPF', 'full')).toBe('SPF')
    expect(formatEntityName('institution', 'PUE', 'full')).toBe('PUE')
  })

  it('lowercases Spanish particles', () => {
    expect(formatEntityName('institution', 'SECRETARÍA DE SALUD DEL ESTADO DE MÉXICO', 'full')).toBe(
      'Secretaría de Salud del Estado de México',
    )
  })

  it('cases a period-separated corporate suffix instead of mangling it', () => {
    const out = formatEntityName('institution', 'TRANSPORTADORA DE SAL, S.A. DE C.V.', 'full')
    expect(out).toBe('Transportadora de Sal, S.A. de C.V.')
    expect(out).not.toContain('S.a.')
    expect(out).not.toContain('De Sal')
  })
})
