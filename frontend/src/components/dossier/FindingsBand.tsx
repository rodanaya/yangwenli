/**
 * FindingsBand — the canonical Archetype-B "§ EL SALDO / HALLAZGOS" card row.
 *
 * Hoisted 2026-06-09 from the hand-rolled findings band in
 * `pages/CategoriesIndex.tsx` so Aria / Cases / Captura / Dashboard get the same
 * finding-first rhythm and PAGE_CHARTER invariant #12 becomes checkable by
 * import-presence. NO verdict seal (an index/collection has no single verdict).
 *
 * Each finding = mono eyebrow + EntityIdentityChip (the place to look) +
 * Garamond-italic-800 anchor number (colour via `style`, NEVER hex-in-className)
 * + proof bar + mono deck. Grid 3/4-up desktop, 1-up mobile.
 *
 * The band is entity-agnostic: a caller computes `Finding[]` over whatever
 * collection it owns and passes the EntityIdentityChip descriptor inline.
 */
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import type { EntityType } from '@/lib/entity/format'
import { SECTOR_COLORS } from '@/lib/constants'

// Sector accent for the card's left rule. Imported as a value so the hex never
// lands in a className (it is silently stripped there).
function SECTOR_FILL(code: string | null | undefined): string {
  return (code && SECTOR_COLORS[code]) || SECTOR_COLORS.otros
}

export interface Finding {
  key: string
  eyebrowEs: string
  eyebrowEn: string
  /** EntityIdentityChip descriptor — the entity this finding points the reader at. */
  entity: {
    type: EntityType
    id: string | number
    nameEs: string
    nameEn: string
    sectorCode?: string | null
    riskScore?: number | null
  }
  /** The anchor number, already formatted (e.g. "82%", "41"). */
  anchor: string
  /** Anchor colour — a var(--…) token or a hex passed via style (never className). */
  anchorColor: string
  /** Proof-bar fill, 0–100. */
  proofPct: number
  /** Proof-bar colour — var(--…) token or hex via style. */
  proofColor: string
  deckEs: string
  deckEn: string
}

export function FindingCard({ finding, lang }: { finding: Finding; lang: 'en' | 'es' }) {
  const e = finding.entity
  return (
    <article
      className="p-3.5 flex flex-col gap-2"
      style={{
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
        borderRadius: 3,
        borderLeft: `3px solid ${SECTOR_FILL(e.sectorCode)}`,
      }}
    >
      <p
        className="font-mono"
        style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
      >
        {lang === 'es' ? finding.eyebrowEs : finding.eyebrowEn}
      </p>
      <div className="min-w-0">
        <EntityIdentityChip
          type={e.type}
          id={e.id}
          name={lang === 'es' ? e.nameEs : e.nameEn}
          size="sm"
          sectorCode={e.sectorCode ?? null}
          riskScore={e.riskScore ?? null}
        />
      </div>
      <div
        className="tabular-nums"
        style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1, color: finding.anchorColor }}
      >
        {finding.anchor}
      </div>
      <div
        className="relative overflow-hidden"
        style={{ height: 4, background: 'var(--color-border)', borderRadius: 999 }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${Math.max(3, Math.min(100, finding.proofPct))}%`,
            background: finding.proofColor,
            borderRadius: 999,
          }}
        />
      </div>
      <p className="font-mono" style={{ fontSize: 9.5, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        {lang === 'es' ? finding.deckEs : finding.deckEn}
      </p>
    </article>
  )
}

export function FindingsBand({
  findings,
  lang,
  kickerEs,
  kickerEn,
}: {
  findings: Finding[]
  lang: 'en' | 'es'
  kickerEs: string
  kickerEn: string
}) {
  if (findings.length === 0) return null
  const cols = findings.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
  return (
    <section
      className="mb-6 pb-6 border-b border-border"
      aria-label={lang === 'es' ? kickerEs : kickerEn}
    >
      <p
        className="font-mono mb-3"
        style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
      >
        § {lang === 'es' ? kickerEs : kickerEn}
      </p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols} gap-3`}>
        {findings.map((f) => (
          <FindingCard key={f.key} finding={f} lang={lang} />
        ))}
      </div>
    </section>
  )
}
