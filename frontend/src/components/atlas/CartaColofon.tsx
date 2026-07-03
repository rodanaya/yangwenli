import { Link } from 'react-router-dom'
import { formatNumber } from '@/lib/utils'

interface CartaColofonProps {
  lang: 'en' | 'es'
  totalContracts: number | null
}

interface Clause {
  roman: string
  en: string
  es: string
}

export function CartaColofon({ lang, totalContracts }: CartaColofonProps) {
  const clauseI: Clause = {
    roman: '(i)',
    en:
      totalContracts != null
        ? `This survey is an index of the sky, not the sky: each body summarizes a vendor cohort; no mark on the wide view is a contract. The register's ${formatNumber(totalContracts)} contracts live one click deeper.`
        : `This survey is an index of the sky, not the sky: each body summarizes a vendor cohort; no mark on the wide view is a contract. The register's contracts live one click deeper.`,
    es:
      totalContracts != null
        ? `Esta carta es un índice del cielo, no el cielo: cada cuerpo resume una cohorte de proveedores; ningún punto de la vista general es un contrato. Los ${formatNumber(totalContracts)} contratos del padrón viven detrás de cada clic.`
        : `Esta carta es un índice del cielo, no el cielo: cada cuerpo resume una cohorte de proveedores; ningún punto de la vista general es un contrato. Los contratos del padrón viven detrás de cada clic.`,
  }

  const clauses: Clause[] = [
    clauseI,
    {
      roman: '(ii)',
      en: 'Two plates are computed live (patterns and sectors); two are archival (categories and terms): hand-curated aggregates, live computation pending. Each plate declares which it is, on its tab and in its caption.',
      es: 'Dos láminas se calculan en vivo (patrones y sectores); dos son de archivo (categorías y sexenios): agregados curados a mano, pendientes de cómputo en vivo. Cada lámina lo declara en su pestaña y en su pie.',
    },
    {
      roman: '(iii)',
      en: "Positions are real aggregates — scale, high-risk rate, T1 files — but bodies that would overlap are gently pushed apart for legibility: position is faithful to within a body's radius.",
      es: 'Las posiciones son agregados reales — escala, tasa de alto riesgo, expedientes T1 — pero los cuerpos que se encimarían se separan suavemente para legibilidad: la posición es fiel dentro del radio del cuerpo.',
    },
    {
      roman: '(iv)',
      en: 'Flying into a body plots its 30 highest-indicator vendors; the full index (▤) loads the rest. When a cohort shares nearly the same risk, the vertical fan asserts no order that does not exist.',
      es: 'Al entrar a un cuerpo, la lámina traza sus 30 proveedores de mayor indicador; el índice completo (▤) carga el resto. Cuando una cohorte comparte casi el mismo riesgo, el abanico vertical no afirma un orden que no existe.',
    },
    {
      roman: '(v)',
      en: 'Color and altitude come from model v0.8.5 (test AUC 0.785). It is a risk indicator, not a probability of corruption; a low, cold body does not certify integrity.',
      es: 'El color y la altura provienen del modelo v0.8.5 (AUC de prueba 0.785). Es un indicador de riesgo, no una probabilidad de corrupción; un cuerpo bajo y frío no certifica integridad.',
    },
    {
      roman: '(vi)',
      en: 'The itineraries are editorial: they cite documented cases (COFECE, ASF, the press), but the pacing and the camera are staging, not evidence.',
      es: 'Los itinerarios son editoriales: citan casos documentados (COFECE, ASF, prensa), pero el ritmo y la cámara son puesta en escena, no evidencia.',
    },
    {
      roman: '(vii)',
      en: 'The source (COMPRANET) froze on September 28, 2025; 2025 is a partial year. RFC coverage is 0.1% for 2002–2010: the early sky is underexposed.',
      es: 'La fuente (COMPRANET) quedó congelada el 28 de septiembre de 2025; 2025 es un año parcial. La cobertura de RFC es de 0.1% en 2002–2010: el cielo temprano está subexpuesto.',
    },
  ]

  return (
    <section
      style={{ borderTop: '3px double var(--color-text-muted)' }}
      className="w-full py-6"
    >
      <div
        className="mb-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted"
      >
        {lang === 'en' ? 'SURVEYOR’S NOTE · METHOD AND LIMITS' : 'FE DE CARTA · MÉTODO Y LÍMITES'}
      </div>

      <ol className="space-y-2">
        {clauses.map((clause) => (
          <li key={clause.roman} className="flex gap-2">
            <span className="shrink-0 font-mono text-[13px] text-text-muted">
              {clause.roman}
            </span>
            <span
              className="text-[12.5px] text-text-secondary"
              style={{ fontFamily: '"EB Garamond", Georgia, serif', lineHeight: 1.5 }}
            >
              {lang === 'en' ? clause.en : clause.es}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 font-mono text-[13px] text-text-muted">
        {lang === 'en' ? (
          <>
            model v0.8.5 &middot; test AUC 0.785 &middot;{' '}
            <Link to="/methodology" style={{ textDecoration: 'underline' }}>
              methodology &#8599;
            </Link>
          </>
        ) : (
          <>
            modelo v0.8.5 &middot; AUC de prueba 0.785 &middot;{' '}
            <Link to="/methodology" style={{ textDecoration: 'underline' }}>
              metodolog&iacute;a &#8599;
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
