/**
 * useScatterClusters — the single source of truth for the faithful Observatory
 * bubble data (ScatterCluster[]), shared by /atlas and the /dashboard § 1 map.
 *
 * Prefers LIVE per-cluster aggregates from `/atlas/cluster-stats` (patterns +
 * sectors, backed by the covering indexes so it's fast even cold); falls back
 * to the static meta tables while loading or for lenses the endpoint doesn't
 * serve (categories / sexenios). Mirrors the logic that used to live inline in
 * Atlas.tsx so both surfaces stay in lockstep.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { atlasApi } from '@/api/client'
import {
  buildPatternMeta,
  buildSectorMeta,
  buildSexenioMeta,
  type ClusterMeta,
  type ConstellationMode,
} from '@/components/charts/ConcentrationConstellation'
import type { ScatterCluster } from '@/components/atlas/ObservatoryScatter'

/**
 * Static category meta for the Observatory's CATEGORIES lens. The
 * `/cluster-stats` endpoint only serves patterns + sectors, so categories
 * render from this hand-curated table (fx/fy positions are used by the legacy
 * constellation; the faithful scatter ignores them and plots scale × risk).
 */
export function buildAtlasCategoriesMeta(isEs: boolean): ClusterMeta[] {
  return [
    // Health (top-left cluster)
    { code: 'medicamentos',   label: isEs ? 'Medicamentos' : 'Pharmaceuticals',     desc: isEs ? '1.1B MXN · IMSS captura · Grupo Farmacos cartel' : '1.1B MXN · IMSS capture · Grupo Farmacos cartel',          color: '#dc2626', vendors: 8200,  t1: 42, highRiskPct: 0.55, fx: 0.10, fy: 0.16 },
    { code: 'equipo_medico',  label: isEs ? 'Equipo Médico' : 'Medical Equipment',  desc: isEs ? '380B MXN · IMSS/ISSSTE · sobreprecio histórico' : '380B MXN · IMSS/ISSSTE · historical overpricing',           color: '#dc2626', vendors: 4500,  t1: 22, highRiskPct: 0.52, fx: 0.20, fy: 0.10 },
    { code: 'consumibles',    label: isEs ? 'Consumibles Médicos' : 'Medical Consumables', desc: isEs ? '180B MXN · suturas, gasas, jeringas' : '180B MXN · sutures, gauze, syringes',                          color: '#dc2626', vendors: 6100,  t1: 14, highRiskPct: 0.48, fx: 0.32, fy: 0.10 },
    { code: 'serv_salud',     label: isEs ? 'Servicios de Salud' : 'Health Services', desc: isEs ? '160B MXN · subrogación, traslados' : '160B MXN · subcontracting, transfers',                                color: '#dc2626', vendors: 1900,  t1: 9,  highRiskPct: 0.43, fx: 0.42, fy: 0.06 },

    // Energy (top-center)
    { code: 'combustibles',   label: isEs ? 'Combustibles' : 'Fuel & Energy',       desc: isEs ? '980B MXN · PEMEX/CFE · monopolio estructural' : '980B MXN · PEMEX/CFE · structural monopoly',                color: '#eab308', vendors: 1400,  t1: 18, highRiskPct: 0.42, fx: 0.55, fy: 0.10 },
    { code: 'serv_petroleros', label: isEs ? 'Servicios Petroleros' : 'Oil Services', desc: isEs ? '420B MXN · Cotemar · 100% T1' : '420B MXN · Cotemar · 100% T1',                                              color: '#eab308', vendors: 280,   t1: 21, highRiskPct: 0.78, fx: 0.66, fy: 0.06 },
    { code: 'electricidad',   label: isEs ? 'Equipo Eléctrico' : 'Electrical Equipment', desc: isEs ? '210B MXN · transformadores, cables' : '210B MXN · transformers, cables',                                  color: '#eab308', vendors: 950,   t1: 8,  highRiskPct: 0.40, fx: 0.76, fy: 0.10 },
    { code: 'energias_renov', label: isEs ? 'Energías Renovables' : 'Renewable Energy', desc: isEs ? '85B MXN · solar, eólica · alto crecimiento' : '85B MXN · solar, wind · high growth',                       color: '#eab308', vendors: 380,   t1: 4,  highRiskPct: 0.35, fx: 0.86, fy: 0.06 },

    // Tech (top-right)
    { code: 'tic',            label: isEs ? 'Tecnología (TIC)' : 'IT Services',     desc: isEs ? '620B MXN · Toka, Mainbit · monopolios documentados' : '620B MXN · Toka, Mainbit · documented monopolies',     color: '#8b5cf6', vendors: 3100,  t1: 29, highRiskPct: 0.68, fx: 0.92, fy: 0.20 },
    { code: 'telecom',        label: isEs ? 'Telecomunicaciones' : 'Telecommunications', desc: isEs ? '210B MXN · enlaces, internet, datos' : '210B MXN · links, internet, data',                                color: '#8b5cf6', vendors: 950,   t1: 9,  highRiskPct: 0.49, fx: 0.94, fy: 0.32 },
    { code: 'software',       label: isEs ? 'Software y Licencias' : 'Software & Licensing', desc: isEs ? '95B MXN · ERP, ofimática, especializado' : '95B MXN · ERP, productivity, specialized',                color: '#8b5cf6', vendors: 1200,  t1: 6,  highRiskPct: 0.44, fx: 0.92, fy: 0.46 },

    // Infrastructure (middle band)
    { code: 'obra_publica',   label: isEs ? 'Obra Pública' : 'Public Works',        desc: isEs ? '870B MXN · SCT · fraude ejecución invisible' : '870B MXN · SCT · invisible execution fraud',                  color: '#ea580c', vendors: 6800,  t1: 36, highRiskPct: 0.51, fx: 0.16, fy: 0.32 },
    { code: 'materiales',     label: isEs ? 'Materiales de Construcción' : 'Construction Materials', desc: isEs ? '320B MXN · cemento, acero, agregados' : '320B MXN · cement, steel, aggregates',                color: '#ea580c', vendors: 3200,  t1: 12, highRiskPct: 0.42, fx: 0.28, fy: 0.30 },
    { code: 'vehiculos',      label: isEs ? 'Vehículos y Transporte' : 'Vehicles & Transport', desc: isEs ? '410B MXN · ambulancias, autobuses' : '410B MXN · ambulances, buses',                                color: '#ea580c', vendors: 2900,  t1: 14, highRiskPct: 0.46, fx: 0.40, fy: 0.34 },
    { code: 'maquinaria',     label: isEs ? 'Maquinaria Pesada' : 'Heavy Machinery', desc: isEs ? '195B MXN · grúas, excavadoras, perforadoras' : '195B MXN · cranes, excavators, drills',                       color: '#ea580c', vendors: 720,   t1: 6,  highRiskPct: 0.39, fx: 0.51, fy: 0.30 },
    { code: 'mantenimiento',  label: isEs ? 'Mantenimiento' : 'Maintenance Services', desc: isEs ? '275B MXN · servicios continuos, hidráulico' : '275B MXN · ongoing services, hydraulic',                       color: '#ea580c', vendors: 4100,  t1: 18, highRiskPct: 0.45, fx: 0.62, fy: 0.34 },
    { code: 'agua',           label: isEs ? 'Agua y Drenaje' : 'Water & Sewerage',   desc: isEs ? '140B MXN · CONAGUA · contratos rotativos' : '140B MXN · CONAGUA · rotating contracts',                          color: '#10b981', vendors: 1100,  t1: 8,  highRiskPct: 0.51, fx: 0.74, fy: 0.30 },

    // Government services (middle-right)
    { code: 'serv_prof',      label: isEs ? 'Servicios Profesionales' : 'Professional Services', desc: isEs ? '540B MXN · Estafa Maestra origen' : '540B MXN · Estafa Maestra origin',                            color: '#be123c', vendors: 12000, t1: 31, highRiskPct: 0.59, fx: 0.85, fy: 0.62 },
    { code: 'consultoria',    label: isEs ? 'Consultoría Jurídica' : 'Legal Consulting', desc: isEs ? '180B MXN · litigio, fiscal' : '180B MXN · litigation, fiscal',                                              color: '#be123c', vendors: 2400,  t1: 7,  highRiskPct: 0.44, fx: 0.92, fy: 0.74 },
    { code: 'publicidad',     label: isEs ? 'Publicidad Oficial' : 'Official Publicity', desc: isEs ? '95B MXN · medios, propaganda' : '95B MXN · media, propaganda',                                              color: '#be123c', vendors: 1800,  t1: 9,  highRiskPct: 0.55, fx: 0.86, fy: 0.84 },
    { code: 'imprenta',       label: isEs ? 'Imprenta' : 'Printing',                  desc: isEs ? '38B MXN · oficial, electoral' : '38B MXN · official, electoral',                                                color: '#be123c', vendors: 950,   t1: 4,  highRiskPct: 0.41, fx: 0.93, fy: 0.92 },

    // Other / commercial
    { code: 'vales',          label: isEs ? 'Vales y Monederos' : 'Vouchers & E-cards', desc: isEs ? '240B MXN · Edenred 96.7% · monopolio' : '240B MXN · Edenred 96.7% · monopoly',                              color: '#16a34a', vendors: 80,    t1: 6,  highRiskPct: 0.71, fx: 0.10, fy: 0.50 },
    { code: 'seguros',        label: isEs ? 'Seguros' : 'Insurance',                  desc: isEs ? '125B MXN · de bienes, gastos médicos' : '125B MXN · property, medical',                                        color: '#16a34a', vendors: 240,   t1: 3,  highRiskPct: 0.32, fx: 0.20, fy: 0.50 },
    { code: 'arrendamiento',  label: isEs ? 'Arrendamiento' : 'Leasing',              desc: isEs ? '180B MXN · vehicular, equipo TI' : '180B MXN · vehicle, IT equipment',                                          color: '#16a34a', vendors: 540,   t1: 5,  highRiskPct: 0.40, fx: 0.30, fy: 0.50 },
    { code: 'limpieza',       label: isEs ? 'Limpieza y Vigilancia' : 'Cleaning & Security', desc: isEs ? '180B MXN · servicios bajo escrutinio' : '180B MXN · low-scrutiny services',                              color: '#64748b', vendors: 5600,  t1: 11, highRiskPct: 0.43, fx: 0.40, fy: 0.50 },
    { code: 'papeleria',      label: isEs ? 'Papelería y Oficina' : 'Office Supplies', desc: isEs ? '95B MXN · alta volumen, baja revisión' : '95B MXN · high volume, low scrutiny',                                color: '#64748b', vendors: 7200,  t1: 8,  highRiskPct: 0.38, fx: 0.50, fy: 0.50 },
    { code: 'mobiliario',     label: isEs ? 'Mobiliario' : 'Furniture',               desc: isEs ? '52B MXN · escolar, oficina, hospital' : '52B MXN · school, office, hospital',                                  color: '#64748b', vendors: 1900,  t1: 4,  highRiskPct: 0.35, fx: 0.60, fy: 0.50 },
    { code: 'uniformes',      label: isEs ? 'Uniformes y Textiles' : 'Uniforms & Textiles', desc: isEs ? '68B MXN · escolar, militar, médico' : '68B MXN · school, military, medical',                              color: '#64748b', vendors: 1450,  t1: 5,  highRiskPct: 0.37, fx: 0.70, fy: 0.50 },

    // Bottom row — agriculture / education
    { code: 'alimentos',      label: isEs ? 'Alimentos' : 'Food & Distribution',     desc: isEs ? '290B MXN · Segalmex · MX$15B desviados' : '290B MXN · Segalmex · MX$15B diverted',                              color: '#22c55e', vendors: 1800,  t1: 17, highRiskPct: 0.66, fx: 0.10, fy: 0.84 },
    { code: 'agric_insumos',  label: isEs ? 'Insumos Agrícolas' : 'Agricultural Inputs', desc: isEs ? '110B MXN · fertilizantes, semillas' : '110B MXN · fertilizers, seeds',                                      color: '#22c55e', vendors: 920,   t1: 6,  highRiskPct: 0.46, fx: 0.22, fy: 0.86 },
    { code: 'libros',         label: isEs ? 'Libros y Textos' : 'Textbooks',         desc: isEs ? '78B MXN · SEP · concentración alta' : '78B MXN · SEP · high concentration',                                    color: '#3b82f6', vendors: 380,   t1: 5,  highRiskPct: 0.49, fx: 0.36, fy: 0.86 },
    { code: 'becas',          label: isEs ? 'Becas y Subsidios' : 'Scholarships & Subsidies', desc: isEs ? '210B MXN · transferencias directas' : '210B MXN · direct transfers',                                  color: '#3b82f6', vendors: 220,   t1: 2,  highRiskPct: 0.28, fx: 0.50, fy: 0.86 },
    { code: 'capacitacion',   label: isEs ? 'Capacitación' : 'Training Services',    desc: isEs ? '54B MXN · talleres, certificación' : '54B MXN · workshops, certification',                                     color: '#3b82f6', vendors: 1600,  t1: 3,  highRiskPct: 0.34, fx: 0.62, fy: 0.86 },
  ]
}

/** Static meta for the active lens (the faithful-scatter fallback source). */
function activeMetaFor(mode: ConstellationMode, lang: 'en' | 'es'): ClusterMeta[] {
  const isEs = lang === 'es'
  if (mode === 'sectors') return buildSectorMeta(isEs)
  if (mode === 'sexenios') return buildSexenioMeta(isEs)
  if (mode === 'categories') return buildAtlasCategoriesMeta(isEs)
  return buildPatternMeta(isEs)
}

/**
 * Faithful-Observatory cluster data for a lens. Live aggregates win; static
 * meta is the graceful fallback (and the only source for categories/sexenios).
 */
export function useScatterClusters(mode: ConstellationMode, lang: 'en' | 'es'): ScatterCluster[] {
  const { data: clusterStats } = useQuery({
    queryKey: ['atlas-cluster-stats', mode],
    queryFn: () => atlasApi.getClusterStats(mode),
    enabled: mode === 'patterns' || mode === 'sectors',
    staleTime: 10 * 60 * 1000,
  })

  const activeMeta = useMemo(() => activeMetaFor(mode, lang), [mode, lang])

  return useMemo(() => {
    const live = clusterStats?.clusters
    if (live && live.length > 0) {
      return live.map((c) => ({
        code: c.code,
        label: lang === 'es' ? c.label_es : c.label_en,
        vendors: c.vendors,
        t1: c.t1,
        highRiskPct: c.high_risk_rate,
      }))
    }
    return activeMeta.map((m) => ({
      code: m.code, label: m.label, vendors: m.vendors, t1: m.t1, highRiskPct: m.highRiskPct,
    }))
  }, [clusterStats, activeMeta, lang])
}
