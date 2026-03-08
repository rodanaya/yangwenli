"""
Batch C: Insert 4 high-value energy/infrastructure vendor cases into ground truth.
All are legitimate multinationals flagged due to extreme concentration in PEMEX/CFE/SCT.
Confidence: low. Status: needs_review.
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding='utf-8')

DB = os.path.join(os.path.dirname(__file__), '..', 'RUBLI_NORMALIZED.db')
conn = sqlite3.connect(DB)
c = conn.cursor()

CASES = [
    {
        'case_id': 'IPC_PEMEX_CONCENTRATION',
        'case_name': 'Industrial Perforadora de Campeche — Concentración PEMEX',
        'case_type': 'concentration',
        'confidence_level': 'low',
        'estimated_fraud_mxn': 0,
        'notes': 'Empresa legítima de perforación petrolera en Campeche. 11 contratos 2002-2009, 25.4B MXN, '
                 '100% Licitación Pública con PEMEX Exploración y Producción y CFE. '
                 'IPC es una empresa de perforación reconocida en la Sonda de Campeche. '
                 'Concentración extrema (RS=1.0) es artefacto del modelo — el sector de perforación costa afuera '
                 'tiene naturalmente pocos proveedores calificados. Riesgo real: bajo.',
        'vendors': [
            (8392, 'INDUSTRIAL PERFORADORA DE CAMPECHE, S.A. DE C.V.', 'low', 'vendor_id'),
        ],
        'memo': (
            '## Investigación: Industrial Perforadora de Campeche SA de CV (VID 8392)\n\n'
            '**Monto total:** 25.4B MXN | **Contratos:** 11 (2002-2009) | **Risk Score:** 1.0\n'
            '**Instituciones:** PEMEX Exploración y Producción, CFE\n\n'
            '### Hallazgos\n'
            '- Todos los contratos son Licitación Pública (0% adjudicación directa)\n'
            '- Empresa de perforación petrolera especializada en la Sonda de Campeche\n'
            '- Contrato más grande: 10.4B MXN (2007) — plausible para servicios de perforación multi-pozo\n'
            '- Sin RFC registrado (datos Structure A, 2002-2010, cobertura 0.1%)\n'
            '- El sector de perforación costa afuera tiene barreras técnicas altas y pocos competidores\n\n'
            '### VEREDICTO: FALSO POSITIVO PROBABLE\n'
            'La concentración extrema refleja la estructura oligopólica natural del mercado de perforación '
            'petrolera offshore, no corrupción. IPC es una empresa reconocida del sector. '
            'El risk score de 1.0 es un artefacto del modelo v5.1 que penaliza vendor_concentration. '
            'Se recomienda verificar con auditorías ASF de PEMEX 2002-2009 antes de descartar completamente.'
        ),
    },
    {
        'case_id': 'NOBLE_PEMEX_OFFSHORE',
        'case_name': 'Noble Contracting SARL — Concentración PEMEX Offshore',
        'case_type': 'concentration',
        'confidence_level': 'low',
        'estimated_fraud_mxn': 0,
        'notes': 'Noble Corporation (ahora Valaris plc), empresa global de perforación offshore registrada en Luxemburgo. '
                 '17 contratos 2006-2009, 18.9B MXN, 100% Licitación Pública con PEMEX Exploración y Producción. '
                 'Noble Corp es una de las empresas de perforación offshore más grandes del mundo (NYSE: VAL). '
                 'La estructura SARL es estándar para operaciones en Luxemburgo. RS alto por concentración, no por corrupción.',
        'vendors': [
            (27502, 'NOBLE CONTRACTING SARL', 'low', 'vendor_id'),
        ],
        'memo': (
            '## Investigación: Noble Contracting SARL (VID 27502)\n\n'
            '**Monto total:** 18.9B MXN | **Contratos:** 17 (2006-2009) | **Risk Score:** 0.62 avg\n'
            '**Instituciones:** PEMEX Exploración y Producción (100%)\n\n'
            '### Hallazgos\n'
            '- Noble Corporation (ahora Valaris plc, NYSE: VAL) — empresa global de perforación offshore\n'
            '- Registrada en Luxemburgo como SARL — estructura corporativa estándar, no evasión\n'
            '- Todos los contratos son Licitación Pública (competitivos)\n'
            '- Operó plataformas de perforación en la Sonda de Campeche para PEMEX 2006-2009\n'
            '- Contratos individuales de 600M a 2.0B MXN — consistente con arrendamiento de plataformas\n'
            '- Sin RFC (entidad extranjera, Structure A)\n\n'
            '### VEREDICTO: FALSO POSITIVO\n'
            'Noble Corp es una de las 5 empresas de perforación offshore más grandes del mundo. '
            'Su concentración en PEMEX refleja que México tenía un monopolio estatal petrolero (antes de la Reforma Energética 2013). '
            'Todos los grandes perforadores offshore (Noble, Transocean, Diamond, Ensco) tenían a PEMEX como único cliente en México. '
            'No hay indicios de irregularidad.'
        ),
    },
    {
        'case_id': 'COBRA_PEMEX_CFE_INFRA',
        'case_name': 'Cobra Instalaciones México — Concentración Energía/Infraestructura',
        'case_type': 'concentration',
        'confidence_level': 'low',
        'estimated_fraud_mxn': 0,
        'notes': 'Subsidiaria mexicana de Cobra (Grupo ACS, España), una de las mayores empresas de ingeniería e '
                 'instalaciones del mundo. 21 contratos 2005-2010, 13.5B MXN. Clientes: PEMEX, CFE, SEP, Pemex Gas. '
                 '100% Licitación Pública. El contrato de 10.1B con PEMEX (2007) es grande pero plausible para '
                 'instalaciones industriales a gran escala. ACS Group cotiza en IBEX35 (MC:ACS).',
        'vendors': [
            (18406, 'COBRA INSTALACIONES MÉXICO, S.A. DE C.V.', 'low', 'vendor_id'),
        ],
        'memo': (
            '## Investigación: Cobra Instalaciones México SA de CV (VID 18406)\n\n'
            '**Monto total:** 13.5B MXN | **Contratos:** 21 (2005-2010) | **Risk Score:** 0.578 avg\n'
            '**Instituciones:** PEMEX, CFE, SEP, Pemex Gas, Pemex Refinación (5 instituciones, 2 sectores)\n\n'
            '### Hallazgos\n'
            '- Cobra Instalaciones es subsidiaria de Grupo ACS (IBEX35: ACS), multinacional española\n'
            '- ACS es la mayor empresa de infraestructura de España y una de las más grandes del mundo\n'
            '- 100% Licitación Pública — todos los contratos fueron competitivos\n'
            '- Diversificación a 5 instituciones (PEMEX, CFE, SEP, Pemex Gas, Pemex Refinación)\n'
            '- Contrato más grande: 10.1B MXN con PEMEX (2007) — instalaciones industriales a gran escala\n'
            '- Segundo contrato grande: 1.3B MXN con SEP (2006) — infraestructura educativa\n'
            '- Sin RFC (Structure A, cobertura 0.1%)\n\n'
            '### VEREDICTO: FALSO POSITIVO PROBABLE\n'
            'Cobra/ACS es una multinacional de primer nivel con presencia global en infraestructura energética. '
            'Su concentración en PEMEX/CFE refleja que estas eran las únicas grandes empresas de energía en México '
            'antes de la Reforma Energética. Los montos son altos pero consistentes con proyectos de instalación '
            'industrial a escala nacional. Se recomienda verificar el contrato de 10.1B MXN con auditorías ASF.'
        ),
    },
    {
        'case_id': 'CAF_SCT_FERROVIARIO',
        'case_name': 'CAF México — Concentración Transporte Ferroviario',
        'case_type': 'concentration',
        'confidence_level': 'low',
        'estimated_fraud_mxn': 0,
        'notes': 'CAF (Construcciones y Auxiliar de Ferrocarriles), fabricante español de trenes y material rodante. '
                 'Cotiza en BME:CAF. 2 contratos: 11.7B MXN con SCT (2014, probable compra de trenes/metro) y '
                 '1.2M MXN con Sistema de Transporte Colectivo de NL (2006). RS=1.0 por concentración extrema en '
                 'solo 2 contratos. CAF fabrica trenes para metros de Ciudad de México, Guadalajara, y otros sistemas.',
        'vendors': [
            (28815, 'CAF MEXICO, S.A. DE C.V.', 'low', 'vendor_id'),
        ],
        'memo': (
            '## Investigación: CAF Mexico SA de CV (VID 28815)\n\n'
            '**Monto total:** 11.7B MXN | **Contratos:** 2 (2006, 2014) | **Risk Score:** 1.0\n'
            '**Instituciones:** SCT, Sistema de Transporte Colectivo del Estado de Nuevo León\n\n'
            '### Hallazgos\n'
            '- CAF = Construcciones y Auxiliar de Ferrocarriles (BME:CAF), fabricante vasco de trenes\n'
            '- Fundada en 1917, opera en 25+ países, fabrica metros, trenes de cercanías y alta velocidad\n'
            '- Contrato principal: 11.7B MXN con SCT (2014) — Licitación Pública\n'
            '  - Monto consistente con compra de trenes/material rodante para expansión del metro\n'
            '  - En 2014 se adjudicaron varios proyectos ferroviarios (Línea 3 Metro GDL, Tren Suburbano)\n'
            '- Contrato menor: 1.2M MXN con Metrorrey (2006) — probable mantenimiento/refacciones\n'
            '- RS=1.0 es artefacto: solo 2 contratos con concentración total\n\n'
            '### VEREDICTO: FALSO POSITIVO\n'
            'CAF es uno de los 5 mayores fabricantes de trenes del mundo. El mercado de material rodante '
            'ferroviario tiene muy pocos competidores globales (CAF, Alstom, Siemens, Bombardier/Alstom, CRRC). '
            'Un contrato de 11.7B MXN para compra de trenes es consistente con precios internacionales. '
            'Ambos contratos fueron por Licitación Pública. No hay indicios de irregularidad. '
            'NOTA: Verificar si el contrato de 2014 corresponde a la Línea 3 del Metro de Guadalajara o '
            'al Tren Suburbano, para contexto adicional.'
        ),
    },
]

conn.execute('BEGIN')

for case in CASES:
    # Insert case
    c.execute('''INSERT OR IGNORE INTO ground_truth_cases
        (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
        VALUES (?, ?, ?, ?, ?, ?)''',
        (case['case_id'], case['case_name'], case['case_type'],
         case['confidence_level'], case['notes'], case['estimated_fraud_mxn']))

    case_db_id = c.lastrowid
    if case_db_id == 0:
        case_db_id = c.execute('SELECT id FROM ground_truth_cases WHERE case_id=?',
                               (case['case_id'],)).fetchone()[0]

    print(f"Case {case['case_id']} → DB id={case_db_id}")

    # Insert vendors
    for vid, vname, strength, method in case['vendors']:
        c.execute('''INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)''',
            (case_db_id, vid, vname, strength, method))
        print(f"  Vendor {vid}: {vname}")

    # Insert contracts
    contract_ids = [r[0] for r in c.execute(
        'SELECT id FROM contracts WHERE vendor_id=?', (case['vendors'][0][0],))]
    for cid in contract_ids:
        c.execute('INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)',
                  (case_db_id, cid))
    print(f"  Contracts: {len(contract_ids)}")

    # Upsert memo into aria_queue
    vid = case['vendors'][0][0]
    memo = case['memo']
    c.execute('''UPDATE aria_queue SET memo_text=?, review_status='needs_review'
        WHERE vendor_id=?''', (memo, vid))
    if c.rowcount == 0:
        c.execute('''INSERT INTO aria_queue
            (vendor_id, vendor_name, ips_tier, ips_final, primary_pattern, memo_text, review_status)
            VALUES (?, ?, 3, 0.5, 'concentrated_monopoly', ?, 'needs_review')''',
            (vid, case['vendors'][0][1], memo))
    print(f"  Memo written to aria_queue")

conn.commit()

# Final counts
total_cases = c.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = c.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = c.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f"\n=== FINAL GT COUNTS ===")
print(f"Cases: {total_cases}")
print(f"Vendors: {total_vendors}")
print(f"Contracts: {total_contracts}")

conn.close()
print("Done.")
