/**
 * Evidence marks — «Las marcas de evidencia» (§3.5 network-la-trama-fable spec).
 *
 * Pure builder: computes up to 4 predicated evidence marks (E1..E4) from a
 * live CommunityGraphResponse. No fabrication — a predicate whose set is
 * empty simply yields no entry for that mark. E1 (hub) is always present
 * (every non-trivial community has a max-pagerank node).
 */
import type { CommunityGraphResponse, CommunityGraphNode } from '@/api/client'
import { formatEntityName } from '@/lib/entity/format'

export interface EvidenceMark {
  id: string // 'E1'…'E4'
  vendorId?: number // node mark
  edge?: [number, number] // edge mark (midpoint of endpoints)
}

export interface EvidenceEntry extends EvidenceMark {
  clause_es: string
  clause_en: string
  focusVendorId: number // what clicking selects (edge → higher-pagerank endpoint)
}

function nodeName(node: CommunityGraphNode): string {
  return formatEntityName('vendor', node.name, 'sm')
}

/**
 * buildEvidenceMarks — computes E1 (hub), E2 (heaviest flagged pair),
 * E3 (highest-pagerank sanctioned node), E4 (highest-pagerank documented-case
 * node) from a live community graph. Both locale clauses are pre-built so the
 * caller can switch language without recomputation.
 */
export function buildEvidenceMarks(graph: CommunityGraphResponse): EvidenceEntry[] {
  const entries: EvidenceEntry[] = []
  const nodes = graph.nodes ?? []
  const edges = graph.edges ?? []
  if (nodes.length === 0) return entries

  const byId = new Map<number, CommunityGraphNode>()
  for (const n of nodes) byId.set(n.vendor_id, n)

  // E1 — hub: max pagerank node
  const hub = nodes.reduce((best, n) => (n.pagerank > best.pagerank ? n : best), nodes[0])
  const hubName = nodeName(hub)
  entries.push({
    id: 'E1',
    vendorId: hub.vendor_id,
    focusVendorId: hub.vendor_id,
    clause_es: `Firma eje — ${hubName}: la mayor centralidad del nudo (${hub.degree} conexiones).`,
    clause_en: `Hub firm — ${hubName}: the knot's highest centrality (${hub.degree} ties).`,
  })

  // E2 — heaviest flagged pair: max shared_procedures among collusion-flagged edges
  const flaggedEdges = edges.filter((e) => e.is_potential_collusion)
  if (flaggedEdges.length > 0) {
    const heaviest = flaggedEdges.reduce((best, e) => (e.shared_procedures > best.shared_procedures ? e : best), flaggedEdges[0])
    const nodeA = byId.get(heaviest.a)
    const nodeB = byId.get(heaviest.b)
    if (nodeA && nodeB) {
      const nameA = nodeName(nodeA)
      const nameB = nodeName(nodeB)
      const focusVendorId = nodeA.pagerank >= nodeB.pagerank ? nodeA.vendor_id : nodeB.vendor_id
      entries.push({
        id: 'E2',
        edge: [heaviest.a, heaviest.b],
        focusVendorId,
        clause_es: `Par señalado — ${nameA} ↔ ${nameB}: ${heaviest.shared_procedures} procedimientos compartidos, marcado por el motor de colusión.`,
        clause_en: `Flagged pair — ${nameA} ↔ ${nameB}: ${heaviest.shared_procedures} shared procedures, flagged by the collusion engine.`,
      })
    }
  }

  // E3 — sanctioned: highest-pagerank node with is_sanctioned === true
  const sanctionedNodes = nodes.filter((n) => n.is_sanctioned === true)
  if (sanctionedNodes.length > 0) {
    const topSanctioned = sanctionedNodes.reduce((best, n) => (n.pagerank > best.pagerank ? n : best), sanctionedNodes[0])
    const name = nodeName(topSanctioned)
    const k = sanctionedNodes.length
    const suffixEs = k > 1 ? ` (+${k - 1} más en el nudo)` : ''
    const suffixEn = k > 1 ? ` (+${k - 1} more in the knot)` : ''
    entries.push({
      id: 'E3',
      vendorId: topSanctioned.vendor_id,
      focusVendorId: topSanctioned.vendor_id,
      clause_es: `Sancionado — ${name}${suffixEs}: figura en el registro de sancionados de la SFP.`,
      clause_en: `Sanctioned — ${name}${suffixEn}: appears in the SFP sanction registry.`,
    })
  }

  // E4 — documented case: highest-pagerank node with gt_case_count > 0
  const documentedNodes = nodes.filter((n) => n.gt_case_count > 0)
  if (documentedNodes.length > 0) {
    const topDocumented = documentedNodes.reduce((best, n) => (n.pagerank > best.pagerank ? n : best), documentedNodes[0])
    const name = nodeName(topDocumented)
    entries.push({
      id: 'E4',
      vendorId: topDocumented.vendor_id,
      focusVendorId: topDocumented.vendor_id,
      clause_es: `Caso documentado — ${name}: vinculado a ${topDocumented.gt_case_count} caso(s) de la verdad fundamental.`,
      clause_en: `Documented case — ${name}: linked to ${topDocumented.gt_case_count} ground-truth case(s).`,
    })
  }

  return entries.slice(0, 4)
}
