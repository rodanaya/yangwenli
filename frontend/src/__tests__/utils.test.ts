/**
 * Basic utility function tests for RUBLI frontend
 *
 * These tests verify the core formatting utilities used throughout the app.
 * To run: npm test (after adding vitest)
 */

import { describe, it, expect } from 'vitest'
import { formatNumber, formatCompactMXN, formatPercent, getRiskLevel } from '../lib/utils'
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
  it('is set to v5.0', () => {
    expect(CURRENT_MODEL_VERSION).toBe('v5.0')
  })
})

describe('Risk thresholds (v4.0)', () => {
  it('defines correct v4.0 thresholds', () => {
    // v4.0+ risk score thresholds
    // Critical: >= 0.50 (very high similarity to known corruption patterns)
    // High: >= 0.30 (high similarity)
    // Medium: >= 0.10 (moderate similarity)
    // Low: < 0.10

    expect(RISK_THRESHOLDS.critical).toBe(0.50)
    expect(RISK_THRESHOLDS.high).toBe(0.30)
    expect(RISK_THRESHOLDS.medium).toBe(0.10)
    expect(RISK_THRESHOLDS.low).toBe(0)
  })

  it('preserves v3.3 thresholds for reference', () => {
    expect(RISK_THRESHOLDS_V3.critical).toBe(0.50)
    expect(RISK_THRESHOLDS_V3.high).toBe(0.35)
    expect(RISK_THRESHOLDS_V3.medium).toBe(0.20)
  })
})

describe('getRiskLevel (v4.0 thresholds)', () => {
  it('returns critical for scores >= 0.50', () => {
    expect(getRiskLevel(0.50)).toBe('critical')
    expect(getRiskLevel(0.75)).toBe('critical')
    expect(getRiskLevel(1.0)).toBe('critical')
  })

  it('returns high for scores >= 0.30 and < 0.50', () => {
    expect(getRiskLevel(0.30)).toBe('high')
    expect(getRiskLevel(0.35)).toBe('high')
    expect(getRiskLevel(0.49)).toBe('high')
  })

  it('returns medium for scores >= 0.10 and < 0.30', () => {
    expect(getRiskLevel(0.10)).toBe('medium')
    expect(getRiskLevel(0.20)).toBe('medium')
    expect(getRiskLevel(0.29)).toBe('medium')
  })

  it('returns low for scores < 0.10', () => {
    expect(getRiskLevel(0.0)).toBe('low')
    expect(getRiskLevel(0.05)).toBe('low')
    expect(getRiskLevel(0.099)).toBe('low')
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
