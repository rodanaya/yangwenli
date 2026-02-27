import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Eye,
  Users,
  Database,
  TrendingUp,
  Building2,
  Search,
  GitMerge,
  BarChart3,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react'

// ============================================================================
// Data
// ============================================================================

const LIMITATIONS = [
  {
    id: 'execution-phase',
    icon: Eye,
    title: 'Procurement-Phase Only — Execution Fraud Is Invisible',
    severity: 'high',
    summary: 'The platform sees contract award data only. Fraud that occurs after a contract is signed cannot be detected.',
    body: [
      'RUBLI analyzes data from COMPRANET at the moment of contract award. It cannot see what happens during project execution — cost overruns, ghost workers, material substitution, inflated invoicing, or kickback payments.',
      'This is the primary reason Building Construction (1.1T MXN, #1 by value) shows only 3.4% average risk despite being Mexico\'s historically most corrupt procurement sector. Grupo Higa\'s Casa Blanca scandal, Odebrecht\'s bribery of PEMEX officials, and overruns on the Tren Maya all involved fraud mechanisms entirely invisible to procurement records.',
    ],
    blind_spots: [
      'Cost overruns billed after contract award',
      'Ghost workers / undelivered goods marked as complete',
      'Material substitution during construction',
      'Subcontracting to shell companies during execution',
      'Kickbacks negotiated outside the procurement system',
    ],
    sectors_most_affected: ['Infrastructure', 'Energy (oil & gas)', 'Large civil works'],
    workaround: 'Cross-reference high-value construction contracts with Auditoría Superior de la Federación (ASF) audit reports, which cover execution-phase irregularities.',
  },
  {
    id: 'training-bias',
    icon: BarChart3,
    title: 'Training Data Bias — Three Cases Dominate',
    severity: 'high',
    summary: 'The risk model was trained on 15 documented corruption cases, but 79% of training contracts come from just three mega-cases in health and agriculture.',
    body: [
      'The v5.0 model improved significantly over v4.0 by diversifying from 9 to 15 ground truth cases across all 12 sectors. However, the training signal is still concentrated:',
      'IMSS Ghost Companies (9,366 contracts) + Segalmex (6,326) + COVID-19 Procurement (5,371) = ~21,000 of ~27,000 labeled contracts. These three cases all involve large, concentrated vendors in the health/agriculture sectors. The model has effectively learned: large vendor + high concentration + same institution = risk.',
      'Corruption that doesn\'t match this pattern is systematically underdetected. A local official awarding contracts to a family member\'s new shell company — few contracts, small amounts, not concentrated — may score low because it doesn\'t resemble IMSS Pisa.',
    ],
    blind_spots: [
      'Small-vendor corruption (new shell companies, low contract volume)',
      'Distributed corruption across many small contracts',
      'Collusion that doesn\'t involve market concentration',
      'Corruption in defense, environment, and labor sectors (few training cases)',
    ],
    sectors_most_affected: ['Defensa', 'Ambiente', 'Trabajo', 'Gobernación'],
    workaround: 'When investigating specific institutions or officials, do not rely on risk scores alone. Use the Contracts filter to find direct awards and single-bid contracts regardless of score.',
  },
  {
    id: 'vendor-deduplication',
    icon: GitMerge,
    title: 'Vendor Deduplication — The Unsolved Identity Problem',
    severity: 'high',
    summary: 'The same company appears under hundreds of name variations. Without a canonical vendor identity, concentration and network analysis undercount market share for pre-2018 data.',
    body: [
      'COMPRANET stores vendor names as free-text strings entered by different government agencies across 23 years. The same company routinely appears as dozens of different strings:',
      '"FARMACEUTICOS MAYPO S.A DE CV" / "FARMACEUTICOS MAYPO SA DE CV" / "FARMACEUTICOS MAYPO S.A. DE C.V." / "FARMACEUTICOS MAYPO" — these are the same vendor, but the platform counts them separately without an RFC to link them.',
      'The platform uses RFC (Mexican tax ID) as the primary match key when available. But RFC coverage is 0.1% (2002–2010), 15.7% (2010–2017), 30.3% (2018–2022), 47.4% (2023–2025). Half the database has no RFC.',
    ],
    why_hard: [
      { label: 'RFC coverage is partial', detail: 'Only 47% of current data has RFC; 2002–2010 data has almost none.' },
      { label: 'Fuzzy matching creates false merges', detail: '"DISTRIBUIDORA LA IDEAL" and "DISTRIBUIDORA LA IDEAL JALISCO" may be unrelated regional companies.' },
      { label: 'Shell company names are intentionally similar', detail: 'La Estafa Maestra used "GC ROGU" and "GC CINCO" to look like variants. Merging them destroys the network signal you are trying to detect.' },
      { label: 'Companies restructure to escape blacklists', detail: 'A sanctioned vendor reappears under a new entity. Merging obscures the fresh start; not merging understates their history.' },
      { label: 'No canonical business registry', detail: 'Mexico has no publicly accessible, machine-readable vendor registry that maps all RFC variations to a canonical entity.' },
    ],
    impact: 'True vendor concentration and market share is higher than displayed for 2002–2017 data. The "Top Vendor" shown per category is the single name-string with the most contracts — the real dominant vendor may be spread across multiple name variants.',
    workaround: 'When investigating a specific vendor, search by partial name to find all variants. Use the RFC displayed on the vendor profile to identify the canonical entity.',
  },
  {
    id: 'cobidding-zero',
    icon: Users,
    title: 'Co-Bidding Signal — Regularized to Zero',
    severity: 'medium',
    summary: 'The model learned that co-bidding patterns don\'t discriminate between corrupt and clean vendors in our training data. Bid rotation and cover bidding are not reflected in the risk score.',
    body: [
      'The co_bid_rate feature was regularized to exactly 0.000 in both the global and all 12 per-sector models. This means that vendors who consistently appear in the same procedures — even when one always loses to let the other win — receive no additional risk penalty in their score.',
      'The reason is structural: the documented corruption cases used for training involve large established vendors (LICONSA, Pisa, DIQN) that win through market concentration and volume, not through coordinated bidding rings. The model learned what it was shown.',
      'The Collusion Detection feature on vendor profiles uses a separate heuristic (shared procedures, win/loss ratio analysis), but this analysis does not feed back into the contract-level risk score.',
    ],
    blind_spots: [
      'Cover bidding (partner bids high to let the winner win)',
      'Bid rotation (A wins this month, B wins next month)',
      'Market allocation by geography or institution',
      'Complementary bidding with identical errors or pricing',
    ],
    workaround: 'Use the Vendor Profile → Collusion Detection tab to analyze specific vendors for co-bidding patterns. This is a separate analysis from the risk score.',
  },
  {
    id: 'data-quality',
    icon: Database,
    title: 'Data Quality Degrades for Pre-2010 Records',
    severity: 'medium',
    summary: 'COMPRANET data from 2002–2010 has 0.1% RFC coverage, many missing fields, and systematic encoding corruption. Risk scores for this period are directional, not precise.',
    body: [
      'COMPRANET changed its data structure four times between 2002 and 2025. The earliest structure (2002–2010) has the fewest fields and the lowest data quality:',
    ],
    table: [
      { structure: 'A (2002–2010)', rfc: '0.1%', quality: 'Lowest', notes: 'Missing procedure numbers, dates; encoding corruption (ý instead of ó/í)' },
      { structure: 'B (2010–2017)', rfc: '15.7%', quality: 'Better', notes: 'ALL CAPS text; 72.2% direct award flags (may be structural)' },
      { structure: 'C (2018–2022)', rfc: '30.3%', quality: 'Good', notes: 'Mixed case; 78.4% direct award rate' },
      { structure: 'D (2023–2025)', rfc: '47.4%', quality: 'Best', notes: '100% Partida codes; most complete' },
    ],
    workaround: 'Apply greater skepticism to risk scores on pre-2011 contracts. Use year filters to compare patterns within the same data structure era.',
  },
  {
    id: 'causal',
    icon: Search,
    title: 'Correlation, Not Causation',
    severity: 'medium',
    summary: 'A high risk score means statistical similarity to known corrupt contracts — not proof of corruption. A low score does not mean a contract is clean.',
    body: [
      'The risk score is a calibrated probability: a score of 0.85 means the contract\'s statistical characteristics resemble those of contracts from documented corruption cases. It does not mean the contract is corrupt.',
      'A legitimate bulk medicine purchase by IMSS from a major pharmaceutical supplier will score high for the same reasons a fraudulent one does — large amount, concentrated vendor, same institution. The model cannot distinguish intent from structure.',
      'Similarly, a low-scoring contract is not certified clean. New corruption patterns — ones the model has never seen — will score low until a documented case is added to the ground truth.',
    ],
    workaround: 'Treat risk scores as investigation triage, not verdicts. High scores indicate where to look; investigation and external evidence establish what happened.',
  },
  {
    id: 'structural-concentration',
    icon: Building2,
    title: 'Structural Concentration — Some Sectors Have Legitimate Monopolies',
    severity: 'low',
    summary: 'Certain sectors have quasi-monopolies driven by regulation, clearance requirements, or market structure — not corruption. The model partially corrects for this but not completely.',
    body: [
      'The z-score normalization compares each contract to sector and year baselines, which partially handles structural concentration. But some patterns remain:',
      'Energía: CFE and PEMEX have preferred suppliers for specialized equipment due to technical certification requirements, not favoritism. Edenred and Sodexo hold ~90% of the meal voucher market in Mexico — a near-duopoly that predates COMPRANET.',
      'Defensa: Security clearance requirements legally limit competition. Single-bid rates in defense are structurally high and do not indicate irregularity.',
      'Insurance (29.5% avg risk): The insurance market for government contracts is dominated by 5-6 carriers. Concentration is regulatory, not corrupt.',
    ],
    workaround: 'Compare risk scores within the same sector and vendor type, not across sectors. A construction vendor with a 0.40 score is more suspicious than an insurance carrier with the same score.',
  },
  {
    id: 'data-pipeline',
    icon: Database,
    title: 'Data Pipeline Disruption — CompraNet Abolished April 2025',
    severity: 'high',
    summary: 'The platform that supplied this entire database was abolished in April 2025. Future data continuity is uncertain, and historical records are already disappearing from official public access.',
    body: [
      'COMPRANET — Mexico\'s federal procurement portal, operational since 1996 — was abolished by Congress on April 10, 2025, and replaced by ComprasMX. The transition creates three concrete risks for procurement research.',
      'First: before any law changed, 1.9 million contracts from 2012–2023 (representing 4.7 trillion MXN) were silently removed from COMPRANET\'s public interface in August 2024. These records may exist only in offline archives and in databases that captured them before the deletion.',
      'Second: the new Ley de Adquisiciones (April 2025) contains a 5-year data retention clause. Under this rule, contracts older than five years could be legally deleted from the official platform — potentially eliminating records of 2.6 million contracts worth 9.9 trillion MXN from public view.',
      'Third: INAI — the independent transparency body citizens could appeal to when agencies refused information requests — was constitutionally abolished in December 2024. Its replacement, "Transparencia para el Pueblo," operates under the same executive branch it is meant to oversee, with approximately 2% of INAI\'s former budget.',
    ],
    blind_spots: [
      'Contracts from 2012–2023 already removed from CompraNet in August 2024',
      'Future contracts on ComprasMX may use different data structure or coverage',
      'Historical records subject to deletion under the 5-year retention rule',
      'No independent watchdog remains to appeal information denials',
    ],
    sectors_most_affected: ['All sectors — systemic platform risk'],
    workaround: 'The 3.1M contracts in this database were captured before the transition. For future research, monitor datos.gob.mx for archived CompraNet exports. For current contracts, ComprasMX is at upcp-compranet.buengobierno.gob.mx. Cross-reference findings with MCCI (contralacorrupcion.mx) which maintains independent archives.',
  },
  {
    id: 'temporal',
    icon: TrendingUp,
    title: 'Temporal Stationarity — Model May Become Stale',
    severity: 'low',
    summary: 'The model was trained on contracts through 2020. Corruption patterns may evolve, and new patterns in 2021–2025 data may go undetected.',
    body: [
      'The v5.0 model uses a temporal train/test split: trained on contracts ≤2020, tested on ≥2021. The test AUC of 0.960 (vs train 0.967) confirms good generalization to the near future.',
      'However, the model assumes corruption patterns are relatively stable over time — that what was corrupt in 2018 is structured similarly to what is corrupt in 2024. If a new administration introduces fundamentally different procurement fraud mechanisms, the model may be slow to detect them.',
      'Recalibration with new ground truth cases should occur when major new corruption cases are documented.',
    ],
    workaround: 'Monitor the Ground Truth page for newly added cases. After major scandals are documented, the model should be retrained to incorporate the new patterns.',
  },
  {
    id: 'contract-modifications',
    icon: Search,
    title: 'Contract Modifications Invisible — Renegotiation Is Where Corruption Hides',
    severity: 'medium',
    summary: 'RUBLI cannot see post-award contract renegotiations and modifications. In complex infrastructure, up to 50% of contracts are renegotiated — and the cost overruns are often where corruption occurs.',
    body: [
      'RUBLI analyzes contract award data only. After a contract is signed, modifications — cost overruns, scope changes, extended timelines, substituted deliverables — are not recorded in COMPRANET in a format this system can track.',
      'Bajari, McMillan & Tadelis (2009) documented that up to 50% of complex public works contracts are renegotiated after award, with an average 14% cost overrun. In corruption-prone contexts, the initial competitive bid is intentionally lowball — modifications are planned from the start to extract the true rent.',
      'This means RUBLI\'s risk scores for large infrastructure projects reflect the procurement phase only. A contract that scored clean at award can represent a significant corruption outcome once modifications are applied. The Tren Maya (tourist train), Pemex refinery construction, and major hospital projects in Mexico have all shown 100%+ cost overruns in ASF (Auditoría Superior de la Federación) audit reports — while their original procurement contracts appear normal.',
    ],
    blind_spots: [
      'Post-award cost overruns billed via contract amendments',
      'Scope expansions that inflate the real contract value after competitive award',
      'Substitution of contracted goods/services during execution',
      'Multi-year projects where year 1 appears clean but years 2–5 are corrupt',
    ],
    sectors_most_affected: ['Infraestructura', 'Energía (PEMEX, CFE)', 'Large civil works, hospital construction'],
    workaround: 'Cross-reference RUBLI findings with ASF Cuenta Pública reports (asf.gob.mx). The ASF audits execution phase and routinely documents cost overruns. Integration of ASF findings into RUBLI scores is a planned Phase 6 enhancement.',
  },
  {
    id: 'mexico-concentration',
    icon: BarChart3,
    title: 'Vendor Concentration Is Mexico-Specific — A Calibration Caveat',
    severity: 'low',
    summary: 'RUBLI\'s strongest predictor (vendor concentration) differs from the globally dominant predictor (single bidding). This reflects Mexico\'s structural preference for direct awards rather than competitive procedures.',
    body: [
      'In the global procurement corruption literature, single bidding — a competitive procedure with only one vendor — is the most universally validated warning indicator (Fazekas & Tóth 2016; Charron et al. 2017). In European datasets, this pattern has the strongest predictive power.',
      'In RUBLI (trained on Mexico\'s 3.1M contracts), vendor concentration is the strongest predictor (+0.428 global coefficient), while single bidding has a near-zero coefficient (+0.013). This divergence is not a modeling error — it reflects Mexico\'s procurement structure.',
      'In Mexico, roughly 70% of contracts are direct awards. When direct award is the norm, single-bid competitive procedures are rare even for clean procurement. The z-score normalization accounts for this baseline. But the training data (79% from IMSS, Segalmex, COVID-19 cases) reinforces concentration as the dominant signal because these cases involved large vendors capturing institutional monopolies.',
      'Implication: RUBLI is well-calibrated for Mexico\'s documented corruption patterns — concentration-based capture is the primary mechanism. It may underperform on corruption forms more common in European datasets: cover bidding in competitive procedures and bid rotation rings, which are less prevalent in Mexico\'s direct-award-heavy system.',
    ],
    impact: 'RUBLI\'s high-risk flags are most reliable for identifying vendor capture and market concentration. For collusion detection in competitive procedures, supplement with the Vendor Profile → Collusion Detection tab.',
    workaround: 'When investigating bid-rigging in competitive procedures, use the Co-bidding analysis tool rather than relying on risk scores alone. Risk scores are calibrated for Mexico\'s dominant corruption form (concentration), not for collusion rings.',
  },
] as const

const SEVERITY_COLORS = {
  high: 'text-risk-critical',
  medium: 'text-risk-high',
  low: 'text-risk-medium',
} as const

const SEVERITY_BG = {
  high: 'bg-risk-critical/10 border-risk-critical/20',
  medium: 'bg-risk-high/10 border-risk-high/20',
  low: 'bg-risk-medium/10 border-risk-medium/20',
} as const

const SEVERITY_LABELS: Record<string, string> = {
  high: 'High Impact',
  medium: 'Medium Impact',
  low: 'Low Impact',
}

// ============================================================================
// Summary Table Data
// ============================================================================

const SUMMARY_ROWS = [
  { limitation: 'Execution-phase fraud invisible', impact: 'Construction/infrastructure underscored', fixable: 'partial', fix: 'Requires ASF audit data integration' },
  { limitation: 'Training bias (3 dominant cases)', impact: 'Small-vendor & multi-sector corruption underdetected', fixable: 'yes', fix: 'Add more labeled ground truth cases' },
  { limitation: 'Vendor deduplication unsolved', impact: 'True concentration understated pre-2018', fixable: 'partial', fix: 'RFC + address blocking (partial fix only)' },
  { limitation: 'Co-bidding signal = zero', impact: 'Bid rotation & cover bidding not in risk score', fixable: 'yes', fix: 'Need collusion-specific ground truth' },
  { limitation: 'CompraNet abolished, data pipeline disrupted', impact: 'Future data unavailable; 1.9M historical contracts already deleted', fixable: 'no', fix: 'Dependent on government platform decisions' },
  { limitation: 'Pre-2010 data quality', impact: '25% of records less reliable', fixable: 'no', fix: 'Structural COMPRANET limitation' },
  { limitation: 'Correlation ≠ causation', impact: 'Scores require investigative follow-up', fixable: 'no', fix: 'By design — model informs, not concludes' },
  { limitation: 'Structural concentration', impact: 'Some sectors over-flagged', fixable: 'yes', fix: 'Sector-specific priors or exclusion lists' },
  { limitation: 'Temporal stationarity', impact: 'New fraud patterns may be undetected', fixable: 'yes', fix: 'Periodic retraining with new cases' },
  { limitation: 'Contract modifications invisible', impact: 'Infrastructure/energy execution-phase costs untracked', fixable: 'partial', fix: 'Requires ASF audit data integration (Phase 6)' },
  { limitation: 'Mexico-specific concentration model', impact: 'Bid-rotation collusion in competitive procedures underdetected', fixable: 'yes', fix: 'Add collusion-ring ground truth cases to training data' },
] as const

// ============================================================================
// Components
// ============================================================================

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      SEVERITY_BG[severity],
      SEVERITY_COLORS[severity]
    )}>
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

function FixableIcon({ fixable }: { fixable: 'yes' | 'partial' | 'no' }) {
  if (fixable === 'yes') return <CheckCircle2 className="h-3.5 w-3.5 text-risk-low shrink-0" />
  if (fixable === 'partial') return <MinusCircle className="h-3.5 w-3.5 text-risk-medium shrink-0" />
  return <XCircle className="h-3.5 w-3.5 text-risk-critical shrink-0" />
}

const LimitationCard = memo(function LimitationCard({ lim }: { lim: typeof LIMITATIONS[number] }) {
  const { t } = useTranslation('limitations')
  const Icon = lim.icon
  return (
    <Card id={lim.id} className="scroll-mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-background-card border border-border/50 shrink-0">
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <SeverityBadge severity={lim.severity as 'high' | 'medium' | 'low'} />
            </div>
            <CardTitle className="text-sm font-semibold leading-snug">{lim.title}</CardTitle>
            <p className="text-xs text-text-muted mt-1">{lim.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Body paragraphs */}
        <div className="space-y-2">
          {lim.body.map((p, i) => (
            <p key={i} className="text-xs text-text-primary leading-relaxed">{p}</p>
          ))}
        </div>

        {/* Blind spots list */}
        {'blind_spots' in lim && lim.blind_spots && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">{t('whatThisMisses')}</p>
            <ul className="space-y-1">
              {(lim.blind_spots as readonly string[]).map((s) => (
                <li key={s} className="flex items-start gap-2 text-xs text-text-primary">
                  <XCircle className="h-3 w-3 text-risk-high shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Why hard (vendor dedup) */}
        {'why_hard' in lim && lim.why_hard && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">{t('whyHardToFix')}</p>
            <div className="space-y-2">
              {(lim.why_hard as readonly { label: string; detail: string }[]).map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-text-primary shrink-0">{item.label}:</span>
                  <span className="text-text-muted">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact note */}
        {'impact' in lim && lim.impact && (
          <div className="p-3 rounded-md bg-border/20 border border-border/40">
            <p className="text-xs text-text-primary"><span className="font-medium">{t('impact')}: </span>{lim.impact}</p>
          </div>
        )}

        {/* Data quality table */}
        {'table' in lim && lim.table && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left text-text-muted font-medium">{t('cards.dataQuality.table.period')}</th>
                  <th className="px-2 py-1.5 text-right text-text-muted font-medium">{t('cards.dataQuality.table.rfcCoverage')}</th>
                  <th className="px-2 py-1.5 text-left text-text-muted font-medium">{t('cards.dataQuality.table.quality')}</th>
                  <th className="px-2 py-1.5 text-left text-text-muted font-medium hidden sm:table-cell">{t('cards.dataQuality.table.notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(lim.table as readonly { structure: string; rfc: string; quality: string; notes: string }[]).map((row) => (
                  <tr key={row.structure}>
                    <td className="px-2 py-1.5 font-mono text-text-primary">{row.structure}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-text-muted">{row.rfc}</td>
                    <td className="px-2 py-1.5 text-text-muted">{row.quality}</td>
                    <td className="px-2 py-1.5 text-text-muted hidden sm:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sectors affected */}
        {'sectors_most_affected' in lim && lim.sectors_most_affected && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">{t('mostAffected')}:</span>
            {(lim.sectors_most_affected as readonly string[]).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded bg-border/30 text-text-muted border border-border/40">{s}</span>
            ))}
          </div>
        )}

        {/* Workaround */}
        {'workaround' in lim && lim.workaround && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-accent/5 border border-accent/15">
            <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-text-primary">
              <span className="font-medium text-accent">{t('workaround')}: </span>
              {lim.workaround}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// ============================================================================
// Page
// ============================================================================

export default function Limitations() {
  const { t } = useTranslation('limitations')

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4.5 w-4.5 text-risk-high" />
          <h2 className="text-lg font-bold tracking-tight">{t('pageTitle')}</h2>
        </div>
        <p className="text-xs text-text-muted">
          {t('pageDescription')}
        </p>
      </div>

      {/* Quick-nav chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {LIMITATIONS.map((lim) => (
          <a
            key={lim.id}
            href={`#${lim.id}`}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors',
              'bg-background-card border-border/50 text-text-muted hover:text-text-primary hover:border-border'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', {
              'bg-risk-critical': lim.severity === 'high',
              'bg-risk-high': lim.severity === 'medium',
              'bg-risk-medium': lim.severity === 'low',
            })} />
            {lim.title.split('—')[0].trim()}
          </a>
        ))}
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('summary')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('summaryTable.limitation')}</th>
                  <th className="px-4 py-2.5 text-left text-text-muted font-medium hidden md:table-cell">{t('summaryTable.impact')}</th>
                  <th className="px-4 py-2.5 text-center text-text-muted font-medium w-16">{t('summaryTable.fixable')}</th>
                  <th className="px-4 py-2.5 text-left text-text-muted font-medium hidden lg:table-cell">{t('summaryTable.pathToFix')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {SUMMARY_ROWS.map((row) => (
                  <tr key={row.limitation} className="hover:bg-accent/[0.03]">
                    <td className="px-4 py-2 text-text-primary">{row.limitation}</td>
                    <td className="px-4 py-2 text-text-muted hidden md:table-cell">{row.impact}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center">
                        <FixableIcon fixable={row.fixable as 'yes' | 'partial' | 'no'} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-text-muted hidden lg:table-cell">{row.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border/40 text-xs text-text-muted">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-risk-low" /> {t('fixableWithData')}</span>
              <span className="flex items-center gap-1.5"><MinusCircle className="h-3 w-3 text-risk-medium" /> {t('partialFix')}</span>
              <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-risk-critical" /> {t('structuralConstraint')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limitation cards */}
      <div className="space-y-4">
        {LIMITATIONS.map((lim) => (
          <LimitationCard key={lim.id} lim={lim} />
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="p-4 rounded-lg border border-border/50 bg-background-card/50">
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="font-medium text-text-primary">{t('interpretationGuidance')}: </span>
          {t('interpretationText')}
        </p>
      </div>
    </div>
  )
}
