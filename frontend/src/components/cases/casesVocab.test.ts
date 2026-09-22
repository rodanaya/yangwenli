import { describe, it, expect } from 'vitest'
import { leadFinding } from './casesVocab'
import type { ScandalDetail, ScandalListItem } from '@/api/types'

/**
 * The lone-conviction clause (DAY-05b § Change 2). Amount omitted and
 * severity below 4 so the conviction candidate is the primary finding.
 */
const listItem = (id: number, legal_status: string): ScandalListItem => ({
  id,
  name_en: `Case ${id}`,
  name_es: `Caso ${id}`,
  slug: `case-${id}`,
  fraud_type: 'other',
  administration: 'amlo',
  sector_ids: [4],
  severity: 3,
  legal_status,
  compranet_visibility: 'not_visible',
  summary_en: '',
  is_verified: 1,
} as unknown as ScandalListItem)

const detail = (item: ScandalListItem): ScandalDetail =>
  ({ ...item, key_actors: [], sources: [], investigation_case_ids: [], linked_vendors: [] }) as ScandalDetail

describe('leadFinding — conviction rarity', () => {
  const archive = [listItem(1, 'convicted'), listItem(2, 'impunity'), listItem(3, 'ongoing')]

  it('reads as the singular in English when there is one conviction', () => {
    const f = leadFinding(detail(archive[0]), archive, 'en')
    expect(f.primaryText).toBe('the only conviction in 3 documented cases')
    expect(f.emphasis[0]).toBe('only conviction')
  })

  it('reads as the singular in Spanish when there is one conviction', () => {
    const f = leadFinding(detail(archive[0]), archive, 'es')
    expect(f.primaryText).toBe('la única condena en 3 casos documentados')
    expect(f.emphasis[0]).toBe('única condena')
  })

  it('keeps the plural wording above one conviction', () => {
    const many = [...archive, listItem(4, 'convicted')]
    expect(leadFinding(detail(many[0]), many, 'en').primaryText)
      .toBe('one of only 2 convictions in 4 documented cases')
    expect(leadFinding(detail(many[0]), many, 'es').primaryText)
      .toBe('una de solo 2 condenas en 4 casos documentados')
  })
})
