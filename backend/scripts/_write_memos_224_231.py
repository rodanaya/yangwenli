"""Write ARIA investigation memos for GT cases 224-225 + structural FP notes."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    # ── GT Cases ───────────────────────────────────────────────────────────
    (33177, 'ARRENMOVIL DE MEXICO — Vehicle Rental DA Monopoly (GT Case 224)',
     'CLASSIFICATION: GROUND TRUTH — Monopoly / Institution Capture\n\n'
     'SUMMARY: Arrenmovil de Mexico SA de CV is a vehicle rental company with 2.57B MXN '
     'in federal contracts (2007-2020), 60.9% via direct award across 12+ federal agencies.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- ISSSTE: 735M, 2 contracts, 100% DA (655M single DA in 2012 + 80M DA in 2016)\n'
     '- CISEN (intelligence): 294M, 1 contract, 100% DA (2015)\n'
     '- INEA: 280M, 3 contracts, 100% DA (2014-2018)\n'
     '- IMSS: 109M, 1 contract, 100% DA (2015)\n'
     '- IPN: 99M, 2 contracts, 50% DA\n'
     '- Financiera Nacional: 72M, 8 contracts, 87.5% DA\n'
     '- SAT: 42M, 1 contract, 100% DA\n'
     '- SRE: 32M, 1 contract, 100% DA\n'
     '- IMP: 22M, 5 contracts, 100% DA\n'
     '- CAPUFE: 304M, 10 contracts, 30% DA (competitive here)\n'
     '- SHCP: 347M, 2 contracts, 0% DA (competitive here)\n\n'
     'KEY EVIDENCE:\n'
     '1. Multi-institution DA pattern: 100% DA at ISSSTE, CISEN, INEA, IMSS, SAT, SRE, IMP '
     '— each institution independently chose DA for vehicle rental\n'
     '2. Vehicle rental is a competitive market: Hertz, AVIS, ARSA, Budget, Europcar, and '
     'multiple Mexican fleet companies (Casanova, JET VAN, etc.) operate nationwide\n'
     '3. Pattern matches Case 200 (Casanova Rent Volks): 100% DA vehicle transport at FGR\n'
     '4. Wins competitively at CAPUFE (30% DA) and SHCP (0% DA), proving LP is feasible\n'
     '5. No RFC available — opacity indicator\n'
     '6. 655M single DA contract at ISSSTE (2012) is the largest — vehicle rental should not '
     'require direct award at this scale\n\n'
     'COMPARISON TO GT PATTERNS:\n'
     '- Case 200 (Casanova Rent Volks): FGR 100% DA transport monopoly — IDENTICAL pattern\n'
     '- Case 12 (TOKA): IT services 100% DA across SEP/SEGOB — similar multi-institution DA capture\n\n'
     'CONFIDENCE: Medium — clear DA pattern across many institutions, but no direct evidence of '
     'kickbacks or bid suppression. The sheer breadth of 100% DA across 9+ independent agencies '
     'strongly suggests coordinated preference rather than independent procurement decisions.\n\n'
     'ESTIMATED FRAUD: 1.6B MXN (DA portion of total value).\n'
     'RECOMMENDED ACTION: Cross-reference with ASF audits at ISSSTE 2012 and CISEN 2015.'),

    (33716, 'DLG INDUSTRIAS — Ferrocarril del Istmo Railroad Supply 100% DA (GT Case 225)',
     'CLASSIFICATION: GROUND TRUTH — Institution Capture\n\n'
     'SUMMARY: DLG Industrias SA de CV supplies railroad materials to Ferrocarril del Istmo '
     'de Tehuantepec (FIT) with 3.12B MXN across 5 contracts, ALL via direct award (100% DA), '
     'spanning 2014-2025.\n\n'
     'FIT CONTRACTS (ALL DIRECT AWARD):\n'
     '- 1,161.8M DA 2024 — railroad materials\n'
     '- 1,067.5M DA 2025 — railroad materials\n'
     '- 759.4M DA 2024 — railroad materials\n'
     '- 127.0M DA 2024 — railroad materials\n'
     '- (1 more contract 2014)\n\n'
     'OTHER INSTITUTIONS (COMPETITIVE):\n'
     '- SCT: 176M LP 2010\n'
     '- API Altamira: 69M, 25% DA (2010-2012)\n'
     '- API Veracruz: 29M, 50% DA (2008-2011)\n'
     '- SICT: 26M, 0% DA (2022)\n\n'
     'SUPPLY TYPES: Durmientes de madera de encino (railroad ties), soldadura aluminotermica '
     '(thermite rail welding), tolvas cerradas para pellet (pellet hoppers), contenedores '
     'maritimos (maritime containers).\n\n'
     'KEY EVIDENCE:\n'
     '1. 100% DA at FIT across 3.12B — zero competitive processes for billion-peso supplies\n'
     '2. Commodity supplies: railroad ties, welding materials, and hoppers are NOT sole-source '
     'items — multiple suppliers exist in Mexico and internationally\n'
     '3. Wins competitively at SCT (LP), API Altamira (LP), SICT (LP) — proving market '
     'competition exists for the same types of supplies\n'
     '4. Concentration in 2024-2025: 3 contracts totaling 2.05B DA in just 2 years\n'
     '5. FIT is part of the Corredor Interoceanico del Istmo de Tehuantepec (CIIT) megaproject '
     '— a high-priority 4T infrastructure initiative with reduced oversight pressure\n'
     '6. No RFC available\n\n'
     'COMPARISON TO GT PATTERNS:\n'
     '- Case: Pegsa Construcciones ASIPONA Dos Bocas DA — similar port/transport infrastructure '
     'DA capture at 4T priority project\n'
     '- Case: Carrey CFE 568M DA 2014 — single institution energy infrastructure DA\n\n'
     'CONFIDENCE: Medium — 100% DA at single institution for commodity supplies is a clear red '
     'flag. The competitive wins elsewhere prove DA is not technically necessary. However, FIT '
     'may argue operational urgency for CIIT timeline.\n\n'
     'ESTIMATED FRAUD: 3.1B MXN (entire FIT DA portfolio).\n'
     'RECOMMENDED ACTION: Cross-reference with ASF audits on CIIT/FIT procurement 2024-2025.'),

    # ── Structural FPs ────────────────────────────────────────────────────
    (5658, 'VIAJES PREMIER — Structural FP: Government Travel Agency',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Viajes Premier SA (6.18B, 734 contracts, 57.5% DA, 2002-2025) is a major government '
     'travel agency providing reservation, expedition, and delivery of airline tickets.\n\n'
     'WHY NOT GT:\n'
     '1. Spread across many institutions (INM, SEP, SEGOB, Cultura, INEA, Guardia Nacional) '
     '— not concentrated at a single agency\n'
     '2. Large contracts are mostly LP: SEP 384M LP 2008, Guardia Nacional 155M LP 2022, '
     'Cultura 153M LP 2019, SEP 144M LP 2022\n'
     '3. DA pattern comes from smaller routine travel bookings — standard for government '
     'travel procurement below LP thresholds\n'
     '4. Travel agency services are inherently aggregated — one vendor books thousands of '
     'individual trips, inflating total contract value\n'
     '5. 20+ year track record across administrations suggests legitimate market position\n\n'
     'DA at INM (100%) is the most suspicious element but only 11 contracts.'),

    (3978, 'EL MUNDO ES TUYO — Structural FP: Government Travel Agency',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'El Mundo es Tuyo SA de CV (5.58B, 1043 contracts, 52% DA, 2003-2025) is a government '
     'travel agency providing airline ticket reservation and event logistics.\n\n'
     'WHY NOT GT:\n'
     '1. Highly diversified client base: CONAGUA, IMSS, SEP, CFE, SRE, SEDENA, and many more\n'
     '2. Largest contracts: SEDENA 163M LP 2022, SRE 125M LP 2020 — competitive wins\n'
     '3. Only CFE 336M DA 2013 is a suspicious single large DA contract\n'
     '4. 1,043 contracts over 22 years = ~47 per year, typical for a major travel agency\n'
     '5. 52% DA is within normal range for travel services (many small bookings below LP threshold)\n'
     '6. CONAGUA (largest client by count) is only 24.4% DA'),

    (6751, 'ARTMEX VIAJES — Structural FP: Government Travel/Events Agency',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Artmex Viajes SA de CV (5.55B, 392 contracts, 51.5% DA, 2002-2025) is a travel and '
     'events agency serving SEP and Secretaria de Cultura primarily.\n\n'
     'WHY NOT GT:\n'
     '1. SEP (largest client 2.63B) is only 30% DA — majority competitive\n'
     '2. Largest contracts are all LP: SEP 1,156M LP 2005, SEP 639M LP 2008, SEP 300M LP 2011\n'
     '3. Provides "servicios integrales para eventos, boletaje aereo y terrestre" — integrated '
     'event + travel services where scale justifies large contracts\n'
     '4. Cultura 66% DA but at smaller amounts (113M LP 2024 largest)\n'
     '5. 23-year track record with consistent LP wins = legitimate market position'),

    (2967, 'CENTRO DE PRODUCTIVIDAD AVANZADA — Structural FP: IT/Consulting',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Centro de Productividad Avanzada SA de CV (4.99B, 110 contracts, 46.4% DA, 2002-2022) '
     'provides IT services, consulting, and training to federal agencies.\n\n'
     'WHY NOT GT:\n'
     '1. SEP 1.52B is 0% DA — all competitive (LP)\n'
     '2. SCT 1.31B is 10% DA — almost all competitive\n'
     '3. Only Bienestar (354M DA 2013) and PROSPERA (144M DA 2013) show high DA\n'
     '4. Total DA rate 46.4% but the large-value contracts are overwhelmingly LP\n'
     '5. Services include IT procurement, training (capacitacion ITIL), and consulting — '
     'competitive market with many providers'),

    (31221, 'INTERMEX COMERCIALIZADORA — Structural FP: Pre-2021 Outsourcing',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Intermex Comercializadora Internacional SA de CV (3.00B, 33 contracts, 60.6% DA, '
     '2007-2017) provided outsourcing and commercialization services.\n\n'
     'WHY NOT GT:\n'
     '1. Largest contract: Cia Mex Exploraciones 985M LP 2015 — competitive\n'
     '2. CAPUFE: 969M total but mix of LP/DA (largest 507M DA 2011, but also 250M LP 2016)\n'
     '3. Pre-2021 outsourcing was legal in Mexico before labor reform banned it\n'
     '4. Only 33 contracts across 10 years — not high-frequency DA churning\n'
     '5. No descriptions available to verify service type, but client mix (IMP, CAPUFE, '
     'Financiera) suggests legitimate infrastructure/energy outsourcing'),

    (134555, 'LORE SOLUCIONES INTEGRALES — Structural FP: Pre-2021 Outsourcing',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Lore Soluciones Integrales Empresariales de Sinaloa SA de CV (2.68B, 77 contracts, '
     '59.7% DA, 2015-2020) provided payroll administration and outsourcing services.\n\n'
     'WHY NOT GT:\n'
     '1. Descriptions: "Administracion de nomina para personal subcontratado", "servicio '
     'de limpieza integral", "prestacion de servicios en sitio" — standard outsourcing\n'
     '2. Largest contract: Financiera Nacional 594M LP 2017 — competitive\n'
     '3. Cultura: 507M total, 0% DA — all competitive\n'
     '4. Pre-2021 outsourcing legal framework; company operated 2015-2020\n'
     '5. Based in Sinaloa — regional outsourcing firm serving research centers and '
     'financial institutions'),

    (189695, 'WE KEEP ON MOVING — Structural FP: Pre-2021 Outsourcing',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'We Keep on Moving SA de CV (2.57B, 47 contracts, 51.1% DA, 2016-2021) provided '
     'outsourcing and specialized staffing services.\n\n'
     'WHY NOT GT:\n'
     '1. Descriptions: "outsourcing para Red de Centros Mexico Conectado", "subcontratacion '
     'de personal", "gestion integral de recursos humanos" — standard outsourcing\n'
     '2. Largest contract: Financiera Nacional 694M LP 2019 — competitive\n'
     '3. SRE: 380M total, 50% DA — mixed competitive/direct\n'
     '4. GACM (airport): 230M LP 2020 — competitive\n'
     '5. Pre-2021 outsourcing legal framework; 47 contracts across 5 years = moderate volume'),

    (172407, 'NEGOCIOS UNIVERSAL TD2 — Structural FP: Pre-2021 Outsourcing',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Negocios Universal TD2 S de RL de CV (1.67B, 17 contracts, 47.1% DA, 2016-2018) '
     'provided specialized consulting and staffing services.\n\n'
     'WHY NOT GT:\n'
     '1. Descriptions: "servicios especializados con terceros", "apoyo gerencial, tecnico '
     'y administrativo" — standard consulting/outsourcing\n'
     '2. Largest contracts: Cia Mex Exploraciones 276M LP, SE 216M LP, ISSSTE 207M LP — '
     'majority competitive\n'
     '3. Only 17 contracts, 47.1% DA — nearly half competitive\n'
     '4. INBA 194M DA 2018 is the main suspicious contract\n'
     '5. Short operating window (2016-2018) consistent with pre-reform outsourcing firm'),

    (42852, 'CUERPO DE VIGILANCIA AUXILIAR EDO MEX — Structural FP: State Security Entity',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Cuerpo de Vigilancia Auxiliar y Urbana del Estado de Mexico (1.76B, 148 contracts, '
     '59.5% DA, 2011-2022) is a state government auxiliary security force.\n\n'
     'WHY NOT GT:\n'
     '1. This is a GOVERNMENT ENTITY (Estado de Mexico), not a private company\n'
     '2. Provides intramuros vigilance, transport custody (Liconsa milk delivery), '
     'railroad security (FIT), and institutional protection\n'
     '3. ISSSTE 641M DA 2017 is largest but also wins LP at ISSSTE (134M LP 2019)\n'
     '4. State auxiliary police forces are quasi-governmental — DA is common for '
     'inter-governmental security agreements\n'
     '5. Liconsa contracts (34 contracts, 73.5% DA) are for milk transport custody — '
     'specialized service requiring armed escort'),

    (11178, 'CODIGO EMPRESARIAL — Structural FP: IT Services Mostly LP',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Codigo Empresarial SA de CV (1.72B, 23 contracts, 52.2% DA, 2008-2017) provided '
     'IT and technology services.\n\n'
     'WHY NOT GT:\n'
     '1. SCT 1.47B (4 contracts) is 75% LP — largest contracts competitive\n'
     '2. Largest: SCT 1,006M LP 2015, SCT 393M LP 2014 — major LP wins\n'
     '3. Only Hospital General 202M DA 2011 is a suspicious single DA\n'
     '4. Only 23 contracts over 9 years — not high-volume DA churning\n'
     '5. No descriptions available but SCT LP pattern suggests legitimate IT services'),

    (57831, 'GRUPO ARMAZO — Structural FP: CFE LP + Small Events DA',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Grupo Armazo SA de CV (1.43B, 57 contracts, 77.2% DA, 2010-2020) shows misleading '
     'DA statistics.\n\n'
     'WHY NOT GT:\n'
     '1. CFE contracts (1.39B, 97% of value) are LP: two 691.5M LP contracts in 2014\n'
     '2. The 77.2% DA rate comes from many SMALL contracts at DIF, INECC, SNDIF '
     '(events, printing, workshops) — all under 5M each\n'
     '3. Descriptions: "taller regional sobre contaminantes", "campana responsabilidad '
     'social", "impresion de materiales" — event logistics, not construction\n'
     '4. By VALUE, the company is ~97% LP (CFE) and ~3% DA (small events)\n'
     '5. The DA% is inflated by contract COUNT not VALUE'),

    (119361, 'MANTENIMIENTO Y CONSTRUCCION DE ACUEDUCTOS — Structural FP: Specialized Infrastructure',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Mantenimiento y Construccion de Acueductos SA de CV (1.38B, 51 contracts, 72.5% DA, '
     '2013-2025) is a specialized aqueduct maintenance company.\n\n'
     'WHY NOT GT:\n'
     '1. Exclusive CONAGUA client (50 of 51 contracts) — specialized in federal aqueduct systems\n'
     '2. Largest contracts are LP: 602M LP 2024, 450M LP 2023 — competitive at scale\n'
     '3. DA contracts are smaller emergency repairs: "trabajos urgentes de reparacion de fugas", '
     '"proteccion de estabilidad del acueducto" — legitimate emergency DA justification\n'
     '4. Services: aqueduct leak repair, pipe replacement, system stabilization — highly '
     'specialized requiring specific equipment and expertise\n'
     '5. Very limited competition for federal aqueduct maintenance — structural concentration'),

    (30434, 'SERVICIOS AUDIO REPRESENTACIONES Y ARTISTAS — Structural FP: Events/Entertainment',
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE\n\n'
     'Servicios Audio Representaciones y Artistas SA de CV (1.03B, 151 contracts, 62.9% DA, '
     '2010-2025) provides audio, lighting, video, and event production services.\n\n'
     'WHY NOT GT:\n'
     '1. Primary client Secretaria de Cultura: 665M, 53% DA — nearly half competitive\n'
     '2. Largest contracts are LP: Cultura 112M LP 2021, Cultura 70M LP 2024\n'
     '3. Services: "audio, iluminacion, video escenarios y rigging, backline" — specialized '
     'event production requiring specific technical capabilities\n'
     '4. Grupo Aeroportuario 133M (67% DA) — airport events, limited supplier market\n'
     '5. ProMexico 60M total, 50% DA — trade promotion events\n'
     '6. 15-year track record with consistent LP wins at primary client'),
]

updated = 0
for vid, title, memo in memos:
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vid,)).fetchone()
    if not row:
        print(f'VID={vid} NOT IN aria_queue')
        continue
    full_memo = f'[ARIA AUTO-MEMO]\n\n{title}\n\n{memo}\n\nGenerated: {now}'
    conn.execute('''UPDATE aria_queue SET
        memo_text=?, memo_generated_at=?, review_status="needs_review"
        WHERE vendor_id=?''', (full_memo, now, vid))
    conn.commit()
    nm_row = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()
    nm = nm_row[0][:50] if nm_row else '?'
    print(f'VID={vid} {nm}: memo written ({len(full_memo)} chars)')
    updated += 1

print(f'\nTotal memos written: {updated}')

gt_linked = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
needs_rev = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
print(f'ARIA Summary: {gt_linked} GT-linked | {confirmed} confirmed_corrupt | {needs_rev} needs_review')
conn.close()
