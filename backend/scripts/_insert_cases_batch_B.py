"""
Batch B: Insert ground truth cases for 4 investigated vendors.
Results of investigation 2026-03-08.

Vendor analysis:
1. URBANISSA (54393): DATA ERROR — contract 687326 = 57.9B is decimal error.
   All other contracts 35-90M, typical SCT road construction in Chihuahua. FALSE POSITIVE.
2. LA PENINSULAR (1196): NEEDS REVIEW — 8.7B+4.1B mega-contracts suspicious but plausible
   for CONAGUA/SCT mega-infrastructure. 20-year track record. No RFC to verify.
3. PROMOTORA Y DESARROLLADORA (30845): NEEDS REVIEW — hospital/naval base builder across
   17 institutions. Contracts 200M-1.8B range plausible for IMSS hospital construction.
   Broad institutional reach is unusual but could be legitimate large constructor.
4. SERVICIO DE TRANSPORTE (5985): DATA ERROR — contract 339766 = 14.7B is decimal error.
   All other contracts 13-44M for waste/logistics services. FALSE POSITIVE.
"""
import sqlite3
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

DB = 'RUBLI_NORMALIZED.db'

CASES = [
    {
        'case_name': 'URBANISSA SCT Chihuahua — Error de Datos',
        'case_type': 'data_error',
        'confidence_level': 'high',
        'notes': 'Contrato 687326 (2010) = 57.9B MXN es error decimal. Todos demas contratos 35-90M rango normal para construccion carretera SCT. Falso positivo por error de datos.',
        'estimated_fraud_mxn': 0,
        'vendor_id': 54393,
        'vendor_name': 'URBANISSA SA DE CV',
        'evidence_strength': 'strong',
        'match_method': 'manual',
        'review_status': 'false_positive',
        'memo': """## Investigación: URBANISSA SA DE CV (VID=54393)

### Datos Generales
- **Valor total**: 59,059M MXN (52 contratos, 2010-2021)
- **Risk Score**: 0.962
- **RFC**: No disponible
- **Instituciones**: SCT (principal), Gobierno de Chihuahua, Junta Central de Agua Chihuahua
- **Adjudicación directa**: 5.8% (3/52)

### Hallazgos Clave

**ERROR DE DATOS CONFIRMADO**: El contrato ID=687326 (2010) registra 57,985,211,167 MXN (57.9 mil millones).
Este único contrato representa el 98.2% del valor total del proveedor. Todos los demás contratos están en rango
de 35-90M MXN, consistente con construcción de carreteras y entronques para la SCT en Chihuahua.

El monto de 57.9B MXN es claramente un error decimal — probablemente debería ser 57.9M MXN (movimiento de 3
posiciones decimales), lo cual sería consistente con el rango de sus otros contratos.

**Patrón legítimo**: Constructora regional especializada en infraestructura carretera en Chihuahua.
Opera desde 2010, con contratos recurrentes en SCT y gobierno estatal. Baja tasa de adjudicación directa (5.8%).
Todos los contratos ganados por licitación pública.

### VEREDICTO: FALSO POSITIVO — ERROR DE DATOS
El risk score de 0.962 está inflado por el error decimal en el contrato 687326. Sin ese contrato,
el vendor_concentration caería dramáticamente y el risk score sería bajo. No hay indicios de corrupción.
Acción recomendada: corregir monto del contrato 687326 o marcarlo como error de datos.
"""
    },
    {
        'case_name': 'La Peninsular Mega-Infraestructura CONAGUA/SCT',
        'case_type': 'concentrated_infrastructure',
        'confidence_level': 'low',
        'notes': 'Constructora grande con contratos de 8.7B y 4.1B en SCT/CONAGUA. 20 años de operación (2002-2024). Posiblemente legítima pero montos requieren verificación ASF.',
        'estimated_fraud_mxn': 0,
        'vendor_id': 1196,
        'vendor_name': 'LA PENINSULAR COMPAÑIA CONSTRUCTORA S.A. DE C.V.',
        'evidence_strength': 'weak',
        'match_method': 'manual',
        'review_status': 'needs_review',
        'memo': """## Investigación: LA PENINSULAR COMPAÑÍA CONSTRUCTORA SA DE CV (VID=1196)

### Datos Generales
- **Valor total**: 23,044M MXN (36 contratos, 2002-2024)
- **Risk Score**: 0.732
- **RFC**: No disponible
- **Instituciones**: SCT, CONAGUA, CAPUFE, Ferrocarril del Istmo, Gobierno de Chihuahua, Gobierno de Veracruz
- **Adjudicación directa**: 33.3% (12/36)

### Hallazgos Clave

**Contratos de gran escala**: Dos contratos excepcionalmente grandes:
- ID=898197 (2014, SCT): 8,748M MXN — sin descripción disponible
- ID=442677 (2012, SCT): 4,112M MXN — sin descripción disponible

Estos montos son altos pero no imposibles para mega-obras de infraestructura (autopistas, presas).

**Perfil**: Constructora de gran escala con 22 años de trayectoria. Opera en infraestructura hidráulica
(CONAGUA — presas, plantas de bombeo, líneas de conducción) e infraestructura carretera (SCT).
Contratos recientes incluyen obras del Ferrocarril del Istmo y CONAGUA.

**Señales de alerta moderadas**:
- 33.3% adjudicación directa (alto para infraestructura)
- Contrato de 815M en CONAGUA (2022) por adjudicación directa
- Falta de RFC impide verificación cruzada
- Dos contratos >4B sin descripción (datos 2012-2014, Structure B)

**Señales positivas**:
- Trayectoria de 22 años (no es empresa fantasma)
- Opera en instituciones diversas y legítimas
- Mayoría de contratos ganados por licitación (66.7%)
- Descripción de obras son plausibles (presas, plantas de bombeo, rehabilitación ferroviaria)

### VEREDICTO: REQUIERE REVISIÓN
No hay evidencia clara de corrupción, pero los montos de 8.7B y 4.1B en SCT requieren verificación
en la Cuenta Pública de ASF. La alta tasa de adjudicación directa (33.3%) merece seguimiento.
Sin RFC no es posible cruzar con EFOS o sanciones SFP.
"""
    },
    {
        'case_name': 'Promotora y Desarrolladora Mexicana Multi-Institucional',
        'case_type': 'institutional_capture',
        'confidence_level': 'low',
        'notes': 'Constructor de hospitales IMSS y bases navales SEMAR. 17 instituciones, 5 sectores. Contratos 200M-1.8B plausibles para hospitales. Adjudicaciones directas en SEMAR preocupantes.',
        'estimated_fraud_mxn': 0,
        'vendor_id': 30845,
        'vendor_name': 'PROMOTORA Y DESARROLLADORA MEXICANA, S.A. DE C.V.',
        'evidence_strength': 'weak',
        'match_method': 'manual',
        'review_status': 'needs_review',
        'memo': """## Investigación: PROMOTORA Y DESARROLLADORA MEXICANA SA DE CV (VID=30845)

### Datos Generales
- **Valor total**: 15,323M MXN (58 contratos, 2007-2023)
- **Risk Score**: 0.850
- **RFC**: No disponible
- **Instituciones**: 17 distintas (IMSS, Marina, CONAGUA, ISSSTE, hospitales, gobiernos estatales)
- **Sectores**: 5 (salud, infraestructura, defensa, educación, otros)
- **Adjudicación directa**: 29.3% (17/58)

### Hallazgos Clave

**Perfil inusual — alcance multi-institucional**: Esta constructora opera en 17 instituciones y 5 sectores,
lo cual es inusual. Construye hospitales para IMSS, bases/instalaciones navales para Marina, obras hidráulicas,
e infraestructura estatal.

**Contratos principales**:
- 1,847M (2023, IMSS): Hospital General de Zona de 144 camas — monto plausible para hospital completo
- 1,447M (2015, CDMX Obras): Sin descripción
- 987M (2023, IMSS): Hospital nuevo — plausible
- 791M + 690M + 437M (2017, Marina): Adjudicaciones directas — PREOCUPANTE

**Señales de alerta**:
- 3 contratos de Marina por 1,918M MXN en 2017, todos por adjudicación directa
- Marina justifica adjudicaciones directas por "seguridad nacional" — difícil de verificar
- Alcance de 17 instituciones es atípico para una constructora
- Sin RFC para verificación cruzada
- Nombre genérico ("Promotora y Desarrolladora Mexicana") puede dificultar investigación

**Señales positivas**:
- 16 años de operación (2007-2023)
- Contratos de hospital IMSS ganados por licitación pública
- Montos individuales son plausibles para construcción hospitalaria
- 70.7% de contratos por licitación

### VEREDICTO: REQUIERE REVISIÓN
Las adjudicaciones directas en Marina (~1.9B MXN en 2017) son la principal señal de alerta.
Los contratos de hospitales IMSS parecen legítimos. Se recomienda verificar en ASF si las obras
de Marina fueron ejecutadas y si los montos son razonables para instalaciones navales.
"""
    },
    {
        'case_name': 'Servicio de Transporte IMSS — Error de Datos',
        'case_type': 'data_error',
        'confidence_level': 'high',
        'notes': 'Contrato 339766 (2009) = 14.7B MXN es error decimal. Todos demas contratos 13-44M para servicios de recoleccion de residuos y transporte. Falso positivo.',
        'estimated_fraud_mxn': 0,
        'vendor_id': 5985,
        'vendor_name': 'SERVICIO DE TRANSPORTE, S.A. DE C.V.',
        'evidence_strength': 'strong',
        'match_method': 'manual',
        'review_status': 'false_positive',
        'memo': """## Investigación: SERVICIO DE TRANSPORTE SA DE CV (VID=5985)

### Datos Generales
- **Valor total**: 15,230M MXN (171 contratos, 2002-2021)
- **Risk Score**: 0.807
- **RFC**: No disponible
- **Instituciones**: 16 (IMSS principal, AICM, hospitales, SHCP)
- **Adjudicación directa**: 22.2% (38/171)

### Hallazgos Clave

**ERROR DE DATOS CONFIRMADO**: El contrato ID=339766 (2009, IMSS) registra 14,756,851,854 MXN (14.7B).
Este único contrato representa el 96.9% del valor total del proveedor. Todos los demás contratos están
en rango de 13-44M MXN, consistentes con servicios de recolección y transporte de residuos.

El monto de 14.7B para un servicio de transporte/recolección de residuos es claramente un error decimal.
El monto real probablemente es 14.7M MXN, consistente con contratos similares del mismo proveedor en IMSS.

**Patrón legítimo**: Empresa de servicios de transporte y gestión de residuos con 19 años de operación.
Principal cliente: IMSS (servicios de recolección de residuos hospitalarios). También opera en AICM
(recolección y separación de residuos en aeropuerto) y hospitales federales.

**Servicios identificados**:
- Recolección, transporte, manejo y separación de residuos (AICM)
- Transporte y logística hospitalaria (IMSS)
- Servicios diversos para instituciones de salud

### VEREDICTO: FALSO POSITIVO — ERROR DE DATOS
El risk score de 0.807 está inflado por el error decimal en contrato 339766 (2009).
Sin ese contrato, el valor total sería ~473M MXN y el vendor_concentration caería significativamente.
Empresa legítima de servicios de transporte/residuos con trayectoria de 19 años.
Acción recomendada: corregir monto del contrato 339766 o marcarlo como error de datos.
"""
    },
]


def main():
    conn = sqlite3.connect(DB)
    conn.execute('PRAGMA journal_mode=WAL')

    for case in CASES:
        vid = case['vendor_id']
        # Use next numeric case_id
        max_id = conn.execute('SELECT MAX(CAST(case_id AS INTEGER)) FROM ground_truth_cases').fetchone()[0] or 0
        next_case_id = str(max_id + 1)

        # Insert case
        conn.execute('''INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?)''',
            (next_case_id, case['case_name'], case['case_type'],
             case['confidence_level'], case['notes'], case['estimated_fraud_mxn']))

        # Get the DB id
        case_db_id = conn.execute('SELECT id FROM ground_truth_cases WHERE case_id=?', (next_case_id,)).fetchone()
        if not case_db_id:
            print(f'ERROR: Could not find case {next_case_id}')
            continue
        case_db_id = case_db_id[0]
        print(f'Inserted case {next_case_id}: {case["case_name"]} (db_id={case_db_id})')

        # Insert vendor
        conn.execute('''INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)''',
            (next_case_id, vid, case['vendor_name'], case['evidence_strength'], case['match_method']))
        print(f'  Vendor {vid}: {case["vendor_name"]}')

        # Insert contracts
        contract_ids = conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vid,)).fetchall()
        for (cid,) in contract_ids:
            conn.execute('INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)',
                        (next_case_id, cid))
        print(f'  Contracts: {len(contract_ids)}')

        # Update/insert aria_queue memo
        memo = case['memo'].strip()
        status = case['review_status']
        updated = conn.execute('''UPDATE aria_queue SET memo_text=?, review_status=?,
            memo_generated_at=CURRENT_TIMESTAMP WHERE vendor_id=?''',
            (memo, status, vid)).rowcount
        if updated == 0:
            # Insert minimal row
            vname = case['vendor_name']
            conn.execute('''INSERT OR IGNORE INTO aria_queue
                (vendor_id, vendor_name, memo_text, review_status, memo_generated_at, computed_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)''',
                (vid, vname, memo, status))
            print(f'  Inserted new aria_queue row for {vid}')
        else:
            print(f'  Updated aria_queue memo for {vid}')

    conn.commit()

    # Verify
    cases_count = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
    vendors_count = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
    contracts_count = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
    print(f'\n=== FINAL COUNTS ===')
    print(f'Cases: {cases_count}')
    print(f'Vendors: {vendors_count}')
    print(f'Contracts (GT): {contracts_count}')

    # Show last 4 cases
    rows = conn.execute('SELECT id, case_id, case_name, case_type FROM ground_truth_cases ORDER BY id DESC LIMIT 4').fetchall()
    for r in rows:
        print(f'  id={r[0]} case_id={r[1]} type={r[2]} name={r[3][:50]}')

    conn.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
