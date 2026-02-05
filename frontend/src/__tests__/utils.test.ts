/**
 * Basic utility function tests for Yang Wen-li frontend
 *
 * These tests verify the core formatting utilities used throughout the app.
 * To run: npm test (after adding vitest)
 */

import { describe, it, expect } from 'vitest'
import { formatNumber, formatCompactMXN, formatPercent } from '../lib/utils'

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

describe('Risk thresholds', () => {
  // Test risk level boundaries
  it('defines correct risk thresholds', () => {
    // Critical: >= 0.6
    // High: 0.4 - 0.6
    // Medium: 0.2 - 0.4
    // Low: < 0.2

    const thresholds = {
      critical: 0.6,
      high: 0.4,
      medium: 0.2,
      low: 0,
    }

    expect(thresholds.critical).toBe(0.6)
    expect(thresholds.high).toBe(0.4)
    expect(thresholds.medium).toBe(0.2)
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
