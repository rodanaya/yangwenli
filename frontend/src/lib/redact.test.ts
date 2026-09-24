import { describe, expect, it } from 'vitest'
import { redactRfc } from './redact'

describe('redactRfc', () => {
  it('drops the labelled RFC segment and masks bare tokens', () => {
    expect(redactRfc('RFC: ABC061004F65 | Vendor ID: 29277')).toBe('Vendor ID: 29277')
    expect(redactRfc('proveedor ABCD800101XY1 citado')).toBe('proveedor ABC··· citado')
    expect(redactRfc('sin RFC aquí')).toBe('sin RFC aquí')
    expect(redactRfc('x\nRFC ABC061004F65\ny')).not.toMatch(/\d{6}/)
  })
})
