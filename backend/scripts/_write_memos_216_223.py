"""Write ARIA investigation memos for GT cases 216-223."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

memos = [
    (256792, 'ALTUM TECNOLOGIC — IT DA Monopoly at AEFCM (High Confidence)',
     'VENDOR: Altum Tecnologic SA de CV (VID=256792, RFC: ATE180426DU6)\n'
     'TOTAL: 1.10B MXN across 25 contracts, 48% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- Autoridad Educativa Federal CDMX (AEFCM): 720M MXN, 2 contracts, 100% DA (2022-2025)\n'
     '  - Pluriannual computer leasing contracts via direct award\n'
     '- Servicio Postal Mexicano (SEPOMEX): 168M MXN, 4 contracts, 75% DA (2021-2025)\n'
     '- Secretaria de Economia: 105M MXN, 1 contract, 0% DA (2020)\n'
     '- CNSF: 51M MXN, 3 contracts, 67% DA (2021-2025)\n\n'
     'RED FLAGS:\n'
     '1. Company founded 2018 (RFC date ATE180426) — new entity winning large government DA\n'
     '2. 640M single DA contract at AEFCM for computer leasing — largest contract is 100% DA\n'
     '3. Wins LP at Secretaria de Economia (105M) proving competitive capability,\n'
     '   but AEFCM uses DA exclusively for the same IT leasing services\n'
     '4. Computer leasing has many competitors — no technical exclusivity for DA justification\n\n'
     'PATTERN MATCH: IT monopoly via DA at education authority. Matches Cases 12 (TOKA National IT,\n'
     '1.95B at SEP/AEFCM), 19 (MAINBIT SEGOB, 604M at SEGOB), 205 (METRO NET Data Center).\n\n'
     'RECOMMENDED ACTION: Cross-reference AEFCM contracting officers 2022-2025.\n'
     'Check if ALTUM principals have connections to AEFCM officials.\n'
     'Verify whether LP was attempted and failed or DA was sole-sourced directly.'),

    (43734, 'GOTT UND GLUCK — Cleaning Services DA Ring at Education/Fiscal Agencies (High Confidence)',
     'VENDOR: Gott und Gluck SA de CV (VID=43734, No RFC)\n'
     'TOTAL: 1.05B MXN across 77 contracts, 62.3% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- SEP: 279M MXN, 6 contracts, 33% DA (2016-2021)\n'
     '- IPN: 202M MXN, 5 contracts, 80% DA (2019)\n'
     '- AEFCM: 180M MXN, 6 contracts, 83% DA (2018-2021)\n'
     '- SAT: 93M MXN, 3 contracts, 33% DA (2018-2019)\n'
     '- SHCP: 79M MXN, 3 contracts, 67% DA (2016-2019)\n\n'
     'RED FLAGS:\n'
     '1. No RFC on file — opacity for a company with 1B+ in government contracts\n'
     '2. Unusual German name ("God and Luck") for a Mexican cleaning company\n'
     '3. IPN contracts 80% DA — same institution as Case 10 (IPN Cartel de la Limpieza)\n'
     '4. AEFCM contracts 83% DA — education authority uses DA for commodity cleaning services\n'
     '5. Peak year 2019: 374M MXN across 20 contracts at 80% DA — surge pattern\n'
     '6. Wins LP at SEP/SAT (33% DA) but exclusively DA at IPN/AEFCM — institutional capture\n'
     '7. Cleaning services are commodity with many competitors — no DA justification\n\n'
     'PATTERN MATCH: Cleaning services DA ring at education agencies. Directly parallels\n'
     'IPN Cartel de la Limpieza (Case 10, VID=48). Same institution (IPN), same service type,\n'
     'same DA dominance pattern. May be part of the same cartel or a successor.\n\n'
     'RECOMMENDED ACTION: Check if GOTT UND GLUCK principals overlap with IPN Cartel de la\n'
     'Limpieza entities. Cross-reference AEFCM cleaning DA with other cleaning vendors.\n'
     'Verify company registration and real operational capacity for 374M/year cleaning.'),

    (44822, 'OFI STORE — IT Managed Services DA Monopoly at CAPUFE/ISSSTE (Medium Confidence)',
     'VENDOR: Ofi Store SA de CV (VID=44822, No RFC)\n'
     'TOTAL: 1.58B MXN across 44 contracts, 70.5% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- ISSSTE: 527M MXN, 2 contracts, 100% DA (2011)\n'
     '- CAPUFE: 452M MXN, 10 contracts, 80% DA (2014-2025)\n'
     '- Secretaria de Salud: 187M MXN, 3 contracts, 33% DA (2011-2014)\n'
     '- PEMEX Corporativo: 146M MXN, 2 contracts, 0% DA (2012-2013)\n'
     '- SRE: 88M MXN, 1 contract, 100% DA (2014)\n\n'
     'RED FLAGS:\n'
     '1. No RFC on file for 1.58B government vendor\n'
     '2. ISSSTE 527M in 2 contracts at 100% DA — extremely large DA per contract\n'
     '3. CAPUFE 10-year DA relationship (2014-2025) at 80% DA for IT equipment services\n'
     '4. Wins LP at PEMEX (146M, 0% DA) — can compete, but CAPUFE/ISSSTE use DA exclusively\n'
     '5. "Servicios administrados de bienes informaticos" is commodity IT — many competitors\n\n'
     'PATTERN MATCH: IT managed services DA monopoly. Long-term DA at CAPUFE (toll highways)\n'
     'suggests captured contracting. Similar to TOKA/MAINBIT pattern but at CAPUFE.\n'
     'Medium confidence because CAPUFE is specialized infrastructure (toll systems),\n'
     'which provides some DA justification for continuity of IT services.\n\n'
     'RECOMMENDED ACTION: Verify whether CAPUFE attempted LP for IT services.\n'
     'Check if other IT vendors bid against OFI STORE at CAPUFE. Review ISSSTE 2011 DA.'),

    (57242, 'TECNO ALTA DISTRIBUCION — Vehicle Transport DA Monopoly at INAH (Medium Confidence)',
     'VENDOR: Tecno Alta Distribucion SA de CV (VID=57242, No RFC)\n'
     'TOTAL: 1.56B MXN across 51 contracts, 92.2% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- SEP: 497M MXN, 2 contracts, 50% DA (2010-2011)\n'
     '- PEMEX Corporativo: 430M MXN, 2 contracts, 50% DA (2011-2012)\n'
     '- INAH: 408M MXN, 11 contracts, 100% DA (2015-2024)\n'
     '- PEMEX Refinacion: 82M MXN, 2 contracts, 100% DA (2012-2014)\n'
     '- IMSS: 69M MXN, 1 contract, 100% DA (2016)\n\n'
     'RED FLAGS:\n'
     '1. No RFC for a 1.56B government vendor\n'
     '2. Name says "Tecno Alta Distribucion" (tech distribution) but services are\n'
     '   vehicle transportation/fleet management — misleading business name\n'
     '3. INAH 100% DA for 10 consecutive years (2015-2024) — 408M vehicle fleet services\n'
     '4. 92.2% DA overall — almost no competitive procedures\n'
     '5. Vehicle rental/transport has abundant competitors — no technical exclusivity\n'
     '6. From 2012 onwards, 100% DA at every agency — zero LP contracts after 2011\n\n'
     'PATTERN MATCH: Vehicle transport DA monopoly. Matches Case 200 (Casanova Rent Volks,\n'
     'FGR fleet 100% DA). INAH is cultural heritage — needs vehicles for site inspections\n'
     'but 10 years of 100% DA at a single agency for commodity transport is anomalous.\n\n'
     'RECOMMENDED ACTION: Cross-reference INAH contracting officers for transport services.\n'
     'Check if LP was ever attempted for vehicle services at INAH during 2015-2024.'),

    (218413, 'SCONTINUIDAD LATAM — Data Center DA at IPICYT Research Institute (Medium Confidence)',
     'VENDOR: SContinuidad LATAM SA de CV (VID=218413, RFC: SLA970110SB2)\n'
     'TOTAL: 2.01B MXN across 23 contracts, 52.2% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- FIFOMI (Financiera Rural): 750M MXN, 1 contract, LP (2019)\n'
     '- IPICYT (Research Institute SLP): 634M MXN, 5 contracts, 80% DA (2021-2024)\n'
     '- SAT: 526M MXN, 2 contracts, LP (2021-2022)\n'
     '- CNSF: 44M MXN, 3 contracts, LP (2019-2025)\n'
     '- TFJA: 25M MXN, 1 contract, LP (2024)\n\n'
     'RED FLAGS:\n'
     '1. IPICYT is a small research institute in San Luis Potosi spending 634M on\n'
     '   data center/cloud services via 80% DA — disproportionate for its size\n'
     '2. Same vendor wins LP at much larger agencies (SAT 526M, FIFOMI 750M)\n'
     '   but IPICYT uses DA — suggests captured contracting at IPICYT\n'
     '3. "Infraestructura Logica de Migracion en la Nube" at DA — cloud migration\n'
     '   is commodity IT service with many providers\n\n'
     'MITIGATING FACTORS:\n'
     '- Has RFC (SLA970110SB2) — transparent company\n'
     '- Wins LP at major agencies (52% of business is competitive)\n'
     '- Data center services require some continuity (vendor lock-in is partial justification)\n\n'
     'PATTERN MATCH: Data center DA at small institution. The anomaly is specifically at IPICYT.\n'
     'Medium confidence because data center services have some vendor lock-in justification,\n'
     'but 80% DA at a tiny research institute is disproportionate.\n\n'
     'RECOMMENDED ACTION: Verify IPICYT budget for IT infrastructure.\n'
     'Check if 634M is reasonable for a research institute data center.'),

    (19883, 'SOLUCIONES TECNOLOGICAS ESPECIALIZADAS — IT DA at Welfare Agencies (Medium Confidence)',
     'VENDOR: Soluciones Tecnologicas Especializadas SA de CV (VID=19883, No RFC)\n'
     'TOTAL: 2.93B MXN across 147 contracts, 62.6% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- IMSS: 845M MXN, 6 contracts, 0% DA (2007-2016)\n'
     '- Secretaria de Bienestar: 321M MXN, 4 contracts, 100% DA (2016-2021)\n'
     '- Becas para el Bienestar: 257M MXN, 2 contracts, 50% DA (2020-2021)\n'
     '- ISSSTE: 212M MXN, 13 contracts, 38.5% DA (2005-2025)\n'
     '- Diconsa: 208M MXN, 5 contracts, 80% DA (2016-2021)\n\n'
     'RED FLAGS:\n'
     '1. No RFC for a 2.93B government vendor across 20 years\n'
     '2. Wins IMSS contracts at 0% DA (845M, competitive) but Bienestar at 100% DA (321M)\n'
     '3. Diconsa 80% DA (208M) for IT services at food distribution agency\n'
     '4. IT services (compute leasing, PinPad terminals, digitalization) have many competitors\n'
     '5. Pattern: competitive at large agencies, DA-monopoly at smaller welfare agencies\n\n'
     'MITIGATING FACTORS:\n'
     '- 20-year operating history (2005-2025) suggests real company\n'
     '- Major LP wins at IMSS (845M) prove legitimate competitive capability\n'
     '- IT leasing sometimes has continuity justifications\n\n'
     'PATTERN MATCH: IT DA monopoly at welfare agencies. DA concentration at Bienestar/Diconsa\n'
     'while winning LP at IMSS suggests selective institutional capture at smaller agencies.\n'
     'Medium confidence due to mixed DA/LP portfolio and long operating history.\n\n'
     'RECOMMENDED ACTION: Investigate Bienestar and Diconsa IT contracting officers 2016-2021.\n'
     'Check if PinPad terminals have vendor lock-in justification for DA at Telecomm.'),

    (152690, 'GRUPO ESTUDIAT — School Supplies DA at Diconsa/Impresora Progreso (Medium Confidence)',
     'VENDOR: Grupo Estudiat SA de CV (VID=152690, No RFC)\n'
     'TOTAL: 1.15B MXN across 71 contracts, 73.2% DA overall.\n\n'
     'INSTITUTION BREAKDOWN:\n'
     '- CONAFE: 503M MXN, 10 contracts, 20% DA (2019-2025)\n'
     '- Impresora y Encuadernadora Progreso: 343M MXN, 11 contracts, 91% DA (2017-2018)\n'
     '- Diconsa: 275M MXN, 40 contracts, 100% DA (2017-2022)\n'
     '- Gro-Secretaria Finanzas: 19M MXN, 1 contract, LP (2016)\n'
     '- QRO-Servicios Educacion: 9M MXN, 6 contracts, LP (2015)\n\n'
     'RED FLAGS:\n'
     '1. No RFC for 1.15B government vendor\n'
     '2. Diconsa 275M at 100% DA (40 contracts, 2017-2022) — Diconsa is a FOOD DISTRIBUTION\n'
     '   agency buying school supplies (calculators, notebooks, colored pencils) via DA\n'
     '3. Impresora Progreso 343M at 91% DA (2017-2018) — government printing entity\n'
     '   buying school supplies via DA\n'
     '4. School supplies are commodity products with thousands of competitors\n'
     '5. Wins LP at CONAFE (503M, 20% DA) — can compete at education entities\n'
     '6. DA concentration at non-education entities buying education supplies\n\n'
     'PATTERN MATCH: Supply distribution DA at welfare agencies. Diconsa buying school supplies\n'
     'via 100% DA is anomalous — these are Bienestar welfare program supplies routed through\n'
     'Diconsa (same pattern as food program DA chains). Impresora Progreso 91% DA is also\n'
     'suspect for commodity supplies.\n\n'
     'RECOMMENDED ACTION: Verify why Diconsa (food distribution) is buying school supplies.\n'
     'Check if these are welfare program educational kits distributed through Diconsa network.\n'
     'If so, verify whether LP was attempted for the supply contracts.'),
]

updated = 0
for vid, title, memo in memos:
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vid,)).fetchone()
    if not row:
        print(f'VID={vid} NOT IN aria_queue')
        continue
    full_memo = f'[ARIA AUTO-MEMO -- GT CONFIRMED]\n\n{title}\n\n{memo}\n\nGenerated: {now}'
    conn.execute('''UPDATE aria_queue SET
        memo_text=?, memo_generated_at=?, review_status="needs_review"
        WHERE vendor_id=?''', (full_memo, now, vid))
    conn.commit()
    char_count = len(full_memo)
    print(f'VID={vid}: memo written ({char_count} chars)')
    updated += 1

# Also write memos for structural FPs
fp_memos = [
    (271567, 'HYOSUNG SOLUTIONS — Structural FP: Korean ATM OEM',
     'VENDOR: Hyosung Solutions S de RL de CV (VID=271567, RFC: HSO200602PH2)\n'
     'TOTAL: 1.62B MXN across 9 contracts, 77.8% DA.\n\n'
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE — Legitimate OEM manufacturer.\n\n'
     'Hyosung TNS is a Korean multinational and one of the top 3 global ATM manufacturers.\n'
     'Contracts are for ATM hardware supply and maintenance at government banks\n'
     '(SEDENA, Banco del Bienestar, BANJERCITO). DA is justified because:\n'
     '1. ATM maintenance must be performed by the OEM or authorized service provider\n'
     '2. Hardware compatibility requires same-brand replacement parts\n'
     '3. Has RFC (HSO200602PH2) — transparent Mexican subsidiary\n'
     '4. Global multinational with verifiable corporate structure\n\n'
     'No further investigation needed.'),

    (44843, 'SHARP CORPORATION MEXICO — Structural FP: Global Electronics OEM',
     'VENDOR: Sharp Corporation Mexico (VID=44843, No RFC)\n'
     'TOTAL: 1.24B MXN across 116 contracts, 51.7% DA.\n\n'
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE — Legitimate OEM manufacturer.\n\n'
     'Sharp Corporation is a Japanese multinational electronics manufacturer.\n'
     'Contracts are for managed print services (printing, photocopying, scanning)\n'
     'at multiple agencies (INEA, TFJA, INEGI, Diconsa). DA is partially justified:\n'
     '1. OEM-specific managed print services require brand-specific maintenance\n'
     '2. 48.3% LP shows competitive participation\n'
     '3. Global multinational with verifiable corporate structure\n'
     '4. Services spread across many agencies (not institution-captured)\n\n'
     'No further investigation needed.'),

    (18436, 'SGS DE MEXICO — Structural FP: Swiss Testing/Certification Multinational',
     'VENDOR: SGS de Mexico SA de CV (VID=18436, No RFC)\n'
     'TOTAL: 1.13B MXN across 116 contracts, 88.8% DA.\n\n'
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE — Legitimate global certification body.\n\n'
     'SGS SA (Societe Generale de Surveillance) is the world\'s largest testing,\n'
     'inspection, and certification company, headquartered in Geneva, Switzerland.\n'
     'Contracts: construction supervision (SCT 820M), ISO certification, lab testing.\n'
     '1. SCT 820M is LP (0% DA) — largest contracts are competitive\n'
     '2. Certification/inspection requires accredited bodies — limited competition by design\n'
     '3. ISO audit services require certified auditor firms (regulatory barrier)\n'
     '4. Global multinational with verifiable corporate structure\n\n'
     'High DA rate (88.8%) is skewed by many small certification contracts that are\n'
     'legitimately sole-sourced (only accredited bodies can perform the service).\n\n'
     'No further investigation needed.'),

    (31696, 'IQSEC — Structural FP: Established Cybersecurity Firm, Mostly LP',
     'VENDOR: IQSEC SA de CV (VID=31696, No RFC)\n'
     'TOTAL: 1.28B MXN across 86 contracts, 47.7% DA.\n\n'
     'CLASSIFICATION: STRUCTURAL FALSE POSITIVE — Legitimate cybersecurity firm.\n\n'
     'IQSEC is an established Mexican cybersecurity company providing security\n'
     'operations center (SOC), anti-DDoS, database firewall, and fraud detection.\n'
     '1. Large contracts are predominantly LP: ISSSTE 156M (0% DA), FONACOT 209M/134M/118M\n'
     '   (0% DA), SEP 383M (33% DA)\n'
     '2. Only 47.7% DA overall — below average for IT sector\n'
     '3. Cybersecurity services have limited qualified providers (specialized domain)\n'
     '4. 14-year operating history (2010-2024) with consistent revenue\n'
     '5. INM DA (147M, 100% DA) is the only institution with concerning DA rate\n\n'
     'Legitimate cybersecurity specialist. INM DA alone does not warrant GT classification.\n\n'
     'No further investigation needed.'),

    (17174, 'SOLUCIONES INTELIGENTES TECNOLOGICAS — Skip: Single Large LP Contract',
     'VENDOR: Soluciones Inteligentes Tecnologicas SA de CV (VID=17174, No RFC)\n'
     'TOTAL: 2.15B MXN across 22 contracts, 50% DA.\n\n'
     'CLASSIFICATION: SKIP — Single large LP contract inflates total.\n\n'
     'The 2.125B figure is dominated by ONE contract (id=689136, 2010) at\n'
     'Secretaria de Finanzas y Administracion de Baja California — a STATE-level\n'
     'agency, won via LP (not DA). Remaining 21 contracts total only 25M MXN.\n'
     '1. Single state-level LP contract accounts for 99% of total value\n'
     '2. Not DA-concentrated\n'
     '3. Remaining portfolio is tiny state/municipal contracts\n'
     '4. The 2.125B LP contract may itself be a data anomaly (extremely large for state IT)\n\n'
     'Does not fit IT DA monopoly pattern. No further investigation needed.'),
]

for vid, title, memo in fp_memos:
    row = conn.execute('SELECT id FROM aria_queue WHERE vendor_id=?', (vid,)).fetchone()
    if not row:
        print(f'VID={vid} NOT IN aria_queue (FP memo)')
        continue
    full_memo = f'[ARIA AUTO-MEMO -- STRUCTURAL FP]\n\n{title}\n\n{memo}\n\nGenerated: {now}'
    conn.execute('''UPDATE aria_queue SET
        memo_text=?, memo_generated_at=?, review_status="false_positive"
        WHERE vendor_id=?''', (full_memo, now, vid))
    conn.commit()
    char_count = len(full_memo)
    print(f'VID={vid} (FP): memo written ({char_count} chars)')
    updated += 1

gt_linked = conn.execute('SELECT COUNT(*) FROM aria_queue WHERE in_ground_truth=1').fetchone()[0]
confirmed = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='confirmed_corrupt'").fetchone()[0]
needs_rev = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='needs_review'").fetchone()[0]
fp_count = conn.execute("SELECT COUNT(*) FROM aria_queue WHERE review_status='false_positive'").fetchone()[0]
print(f'\nARIA Summary: {gt_linked} GT-linked | {confirmed} confirmed_corrupt | {needs_rev} needs_review | {fp_count} false_positive')
conn.close()
