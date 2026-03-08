"""Write ARIA investigation memos for GT cases 208-213."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    (45114, 'MEDAM IMSS Biomedical Waste Ring — 1.67B MXN, 765c, 62.3%DA at IMSS',
     'Medam S de RL de CV (VID=45114, sin RFC) operates as a biomedical waste management '
     'company (RPBI: Residuos Peligrosos Biologico Infecciosos) supplying IMSS, SSISSSTE, '
     'and ISSSTE since 2010.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- IMSS: 308 contracts, 881M MXN, 62.3%DA (2010-2025)\n'
     '- SSISSSTE: 17 contracts, 521M MXN, 76.5%DA (2023-2025)\n'
     '- ISSSTE: 265 contracts, 120M MXN, 48.7%DA (2010-2025)\n'
     '- BIRMEX: 12 contracts, 26M MXN, 33.3%DA\n'
     '- SEDENA: 10 contracts, 23M MXN, 60%DA\n\n'
     'WHY SUSPICIOUS: RPBI disposal services are a regulated but competitive market with '
     'multiple SEMARNAT-certified providers (Stericycle Mexico, GHPE, Tecmed, regional operators). '
     '62.3%DA at IMSS over 308 contracts for 15 years, escalating to 76.5%DA at the new SSISSSTE '
     'subsidiary (2023-2025), with no RFC for a billion-peso waste management company. '
     'ISSSTE shows 48.7%DA — lower, confirming IMSS-system-specific capture.\n\n'
     'COMPARISON: Same structural pattern as IMSS supply ring members: Rogeri (Case 190, 73.2%DA), '
     'Comercializadora Reactivos (Case 193, 85.6%DA), Indaljim (Case 196, 84.1%DA). '
     'The 765 total contracts make Medam one of the most prolific ring members by volume.\n\n'
     'RECOMMENDED ACTION: Investigate IMSS regional RPBI contracts for DA justification documents. '
     'Cross-reference with SEMARNAT RPBI license registry to verify Medam has actual disposal '
     'facilities vs. subcontracting to licensed operators.'),

    (173854, 'VANTAGE INSABI/IMSS Pharma Logistics — 2.35B MXN, 241c, 95.7%DA at INSABI',
     'Vantage Servicios Integrales de Salud SA de CV (VID=173854, sin RFC) provides pharmaceutical '
     'logistics and distribution services to federal health institutions since 2016.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- INSABI: 23 contracts, 861M MXN, 95.7%DA (2019-2022)\n'
     '- IMSS: 32 contracts, 769M MXN, 65.6%DA (2016-2025)\n'
     '- Morelos state health: 1 contract, 567M MXN, 0%DA (2017, LP)\n'
     '- ISSSTE: 21 contracts, 85M MXN, 66.7%DA (2018-2023)\n'
     '- SSISSSTE: 17 contracts, 24M MXN, 35.3%DA (2025)\n\n'
     'WHY SUSPICIOUS: 95.7%DA at INSABI during the chaotic 2019-2022 transition period when '
     'INSABI replaced Seguro Popular. Pharma logistics has multiple providers (DHL Supply Chain, '
     'PBF Logistica, Miebach). The 567M LP win at Morelos demonstrates competitive capability — '
     'making the near-total DA at INSABI institution-specific. '
     'IMSS 65.6%DA and ISSSTE 66.7%DA extend the pattern across federal health.\n\n'
     'MITIGATING FACTORS: INSABI era (2019-2022) was characterized by widespread DA across '
     'all suppliers due to institutional dysfunction and COVID emergency procurement. '
     'SSISSSTE 2025 rate dropped to 35.3%DA, suggesting normalization.\n\n'
     'RECOMMENDED ACTION: Review INSABI DA justification documents (Art. 41 invocations) '
     'for Vantage contracts. Compare with other pharma logistics vendors at INSABI to determine '
     'if 95.7%DA was vendor-specific or institution-wide practice.'),

    (41094, 'FOREFRONT MEDICA Multi-Institution Neurosurgery DA — 1.08B MXN, 352c, 79.8%DA',
     'Forefront Medica Mexico SA de CV (VID=41094, sin RFC) supplies neurosurgery equipment '
     'and consumables across 5+ health/defense institutions since 2009.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- SEDENA: 2 contracts, 571M MXN, 50%DA (2019-2021)\n'
     '- Marina: 109 contracts, 187M MXN, 89.9%DA (2010-2020)\n'
     '- Hospital Juarez: 16 contracts, 82M MXN, 68.8%DA (2012-2025)\n'
     '- ISSSTE: 155 contracts, 76M MXN, 83.2%DA (2010-2025)\n'
     '- Inst. Nac. Neurologia: 23 contracts, 73M MXN, 60.9%DA (2010-2024)\n\n'
     'WHY SUSPICIOUS: 79.8%DA OVERALL across 352 contracts — every single institution shows '
     '>50%DA. Marina 89.9%DA (98 of 109 contracts) and ISSSTE 83.2%DA (129 of 155) are the '
     'strongest signals. Neurosurgery supplies have multiple global suppliers with Mexican '
     'distribution (Medtronic, Stryker Neurovascular, B. Braun, Integra LifeSciences). '
     'The "Servicio Integral de Neurocirugia" bundled model (equipment lease + consumables + '
     'technical support) is the DA justification vehicle, but does not constitute true sole-source.\n\n'
     'UNIQUE PATTERN: Unlike most IMSS ring members who concentrate at one institution, '
     'Forefront achieves systematic DA capture across 5+ institutions simultaneously. '
     'This suggests a vendor-driven DA strategy rather than institutional dysfunction.\n\n'
     'RECOMMENDED ACTION: Investigate DA justification files at Marina and ISSSTE. '
     'Check if Forefront has exclusive distribution agreements with a specific OEM manufacturer '
     'that could partially justify DA. If not, the multi-institution 80%DA pattern is '
     'strong evidence of systematic procurement fraud.'),

    (84409, 'CODEQUIM CENAPRECE Insecticide Monopoly — 1.07B MXN, 56c, 100%DA at CENAPRECE',
     'Codequim SA de CV (VID=84409, sin RFC) supplies public health insecticides for vector '
     'control programs (dengue, Zika, malaria) primarily to CENAPRECE since 2010.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- CENAPRECE: 15 contracts, 526M MXN, 100%DA (2012-2022)\n'
     '- Secretaria de Salud: 6 contracts, 421M MXN, 66.7%DA (2023-2024, post-restructuring)\n'
     '- CENAPRECE new: 1 contract, 39M MXN, 100%DA (2025)\n'
     '- SSPC: 6 contracts, 27M MXN, 100%DA (2021-2022)\n'
     '- IMSS: 10 contracts, 21M MXN, 80%DA (2010-2021)\n\n'
     'WHY SUSPICIOUS: 100%DA at CENAPRECE for 10 consecutive years (2012-2022). '
     'After CENAPRECE restructured under SSA (2023), the DA relationship continued: '
     '66.7%DA at SSA and 100%DA at the new CENAPRECE entity in 2025. '
     'The insecticide market has multiple WHO-prequalified manufacturers and distributors '
     '(Bayer CropScience, BASF, Syngenta, Sumitomo Chemical, plus domestic manufacturers). '
     'Vector control insecticides are standardized commodity products — a 10-year 100%DA '
     'sole-source relationship is unjustifiable.\n\n'
     'ADDITIONAL CONCERN: SSPC (security ministry) also shows 100%DA (6c, 27M) for '
     'insecticides/pest control, extending the DA monopoly beyond health sector.\n\n'
     'RECOMMENDED ACTION: Request CENAPRECE Art. 41 DA justification files for 2012-2022 '
     'insecticide purchases. Cross-reference with WHO prequalified insecticide list and '
     'COFEPRIS registered alternatives. Verify whether Codequim is a manufacturer or '
     'intermediary — "Codequim" (Compania de Quimicos) suggests chemical distributor, '
     'not manufacturer.'),

    (13414, 'KBN MEDICAL ISSSTE Orthopedic Implants — 1.26B MXN, 13c, 50%DA at ISSSTE',
     'KBN Medical SA de CV (VID=13414, sin RFC) provides integrated orthopedic implant '
     'services (osteosynthesis and endoprosthetics) primarily to ISSSTE since 2003.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- ISSSTE: 6 contracts, 1.238B MXN, 50%DA (2003-2025)\n'
     '- CRAE Chiapas: 4 contracts, 19M MXN, 75%DA (2020-2022)\n'
     '- SSISSSTE: 1 contract, 1M MXN, 100%DA (2023)\n'
     '- Other: 2 contracts, 3M MXN, 0%DA\n\n'
     'Largest contracts: ISSSTE 537M LP (2020), ISSSTE 339M DA (2022), '
     'ISSSTE 180M LP (2025), ISSSTE 162M DA (2024).\n\n'
     'WHY SUSPICIOUS: Only 13 contracts but 1.26B total, almost exclusively ISSSTE. '
     'The "Servicio Integral de Osteosintesis y Endoprotesis Ortopedicas" bundled model '
     'combines implant supply with surgical support, enabling DA justification. '
     'Orthopedic implants have major global suppliers with Mexican distribution '
     '(Smith & Nephew, Stryker, DePuy Synthes, Zimmer Biomet, Medartis). '
     'No RFC for a 22-year orthopedic implant supplier.\n\n'
     'MITIGATING: 50%DA at ISSSTE means the vendor also wins LP contracts (537M in 2020, '
     '180M in 2025). This is lower than clear ring cases (80%+DA). '
     'The orthopedic "Servicio Integral" model may have partial technical justification '
     '(surgeon training on specific implant systems).\n\n'
     'RECOMMENDED ACTION: Verify if KBN Medical is an exclusive distributor for a specific '
     'implant manufacturer (which could justify DA for continuity-of-care). '
     'If KBN distributes multiple brands, the DA justification collapses.'),

    (40859, 'SOLOMED SSISSSTE/IMSS Pharma Supply — 2.33B MXN, 111c, 63.6%DA at SSISSSTE 2025',
     'Solomed SA de CV (VID=40859, sin RFC) distributes consolidated pharmaceutical supplies '
     'to federal health institutions since 2009.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- IMSS: 11 contracts, 1.742B MXN, 36.4%DA (2009-2025)\n'
     '- SSISSSTE: 33 contracts, 473M MXN, 63.6%DA (2025 only)\n'
     '- ISSSTE: 6 contracts, 66M MXN, 50%DA (2010-2025)\n'
     '- Hospital Gea Gonzalez: 4 contracts, 19M MXN, 50%DA (2025)\n'
     '- Hospital General Mexico: 4 contracts, 11M MXN, 50%DA (2025)\n\n'
     'WHY SUSPICIOUS: Sudden concentration at SSISSSTE in 2025: 33 contracts at 63.6%DA '
     'in a single year. The new SSISSSTE entity (IMSS subsidiary created 2023) appears to '
     'have weaker procurement controls. Simultaneously, 50%DA at two major hospitals in 2025. '
     'Consolidated pharma supply ("Compra Consolidada de Medicamentos") has hundreds of '
     'potential distributors. No RFC over 16 years.\n\n'
     'MITIGATING: IMSS historical DA rate is only 36.4% (4 of 11 contracts DA) — relatively '
     'clean. The 2025 SSISSSTE surge could reflect institutional dysfunction at the new entity '
     'rather than vendor corruption. Need 2026 data to confirm if pattern persists.\n\n'
     'RECOMMENDED ACTION: Monitor SSISSSTE 2026 procurement data for Solomed. '
     'Compare Solomed DA rates at SSISSSTE with other pharmaceutical distributors at the '
     'same entity to determine if this is vendor-specific or institution-wide DA practice.'),
]

updated = 0
for vid, title, memo in memos:
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vid,)).fetchone()
    if not row:
        print(f'VID={vid} NOT IN aria_queue')
        continue
    full_memo = f'[ARIA AUTO-MEMO — GT CONFIRMED]\n\n{title}\n\n{memo}\n\nGenerated: {now}'
    conn.execute('''UPDATE aria_queue SET
        memo_text=?, memo_generated_at=?, review_status="needs_review"
        WHERE vendor_id=?''', (full_memo, now, vid))
    conn.commit()
    nm = title[:60]
    print(f'VID={vid}: memo written ({len(full_memo)} chars) - {nm}')
    updated += 1

gt_linked = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
needs_rev = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'\nARIA Summary: {gt_linked} GT-linked | {confirmed} confirmed_corrupt | {needs_rev} needs_review')
print(f'Memos written: {updated}')
conn.close()
