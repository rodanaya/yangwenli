#!/usr/bin/env python3
"""
Classify known companies by brand name patterns.
Part of the Grand Classification Expansion - Phase 4.
"""

import sqlite3
import re
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Known company patterns: (pattern, industry_id, industry_code, confidence)
KNOWN_COMPANIES = [
    # Major Pharma Companies
    ('PFIZER', 21, 'farmaceutico', 0.98),
    ('ROCHE', 21, 'farmaceutico', 0.98),
    ('BAYER', 21, 'farmaceutico', 0.98),
    ('SANOFI', 21, 'farmaceutico', 0.98),
    ('NOVARTIS', 21, 'farmaceutico', 0.98),
    ('MERCK', 21, 'farmaceutico', 0.98),
    ('ASTRAZENECA', 21, 'farmaceutico', 0.98),
    ('GLAXOSMITHKLINE', 21, 'farmaceutico', 0.98),
    ('ABBOTT', 21, 'farmaceutico', 0.98),
    ('BRISTOL', 21, 'farmaceutico', 0.95),
    ('LILLY', 21, 'farmaceutico', 0.95),
    ('BOEHRINGER', 21, 'farmaceutico', 0.98),
    ('AMGEN', 21, 'farmaceutico', 0.98),
    ('GILEAD', 21, 'farmaceutico', 0.98),
    ('TAKEDA', 21, 'farmaceutico', 0.98),
    ('NORDISK', 21, 'farmaceutico', 0.98),
    ('FRESENIUS', 21, 'farmaceutico', 0.95),
    ('BAXTER', 22, 'equipo_medico', 0.95),
    ('MEDTRONIC', 22, 'equipo_medico', 0.98),
    ('BECTON', 22, 'equipo_medico', 0.98),
    ('GRIFOLS', 21, 'farmaceutico', 0.98),
    ('BEHRING', 21, 'farmaceutico', 0.98),
    ('KEDRION', 21, 'farmaceutico', 0.98),
    ('PROBIOMED', 21, 'farmaceutico', 0.95),
    ('LANDSTEINER', 21, 'farmaceutico', 0.95),
    ('JANSSEN', 21, 'farmaceutico', 0.98),
    ('ABBVIE', 21, 'farmaceutico', 0.98),

    # Oil & Gas Service Companies
    ('SCHLUMBERGER', 61, 'petroleo', 0.98),
    ('HALLIBURTON', 61, 'petroleo', 0.98),
    ('WEATHERFORD', 61, 'petroleo', 0.98),
    ('NABORS', 61, 'petroleo', 0.98),
    ('PRIDE', 61, 'petroleo', 0.90),
    ('ENSCO', 61, 'petroleo', 0.98),
    ('MEXDRILL', 61, 'petroleo', 0.95),
    ('COTEMAR', 61, 'petroleo', 0.95),
    ('OCEANOGRAFIA', 61, 'petroleo', 0.95),
    ('REPSOL', 61, 'petroleo', 0.98),
    ('PRAXAIR', 71, 'quimicos', 0.95),
    ('NALCO', 71, 'quimicos', 0.95),
    ('NOBLE', 61, 'petroleo', 0.85),
    ('GLENCORE', 61, 'petroleo', 0.95),
    ('LARSEN', 61, 'petroleo', 0.85),
    ('BERGESEN', 102, 'transporte', 0.85),

    # Tech Companies
    ('HEWLETT', 32, 'hardware', 0.95),
    ('PACKARD', 32, 'hardware', 0.90),
    ('MICROSOFT', 31, 'software', 0.98),
    ('ORACLE', 31, 'software', 0.98),
    ('CISCO', 32, 'hardware', 0.98),
    ('DELL', 32, 'hardware', 0.90),
    ('INTEL', 32, 'hardware', 0.95),
    ('SIEMENS', 34, 'sistemas', 0.90),
    ('SOFTTEK', 31, 'software', 0.95),
    ('SIXSIGMA', 33, 'telecomunicaciones', 0.90),
    ('TRIARA', 34, 'sistemas', 0.85),
    ('MAINBIT', 34, 'sistemas', 0.85),
    ('SCITUM', 34, 'sistemas', 0.90),
    ('UNINET', 33, 'telecomunicaciones', 0.90),
    ('AXTEL', 33, 'telecomunicaciones', 0.95),
    ('TELMEX', 33, 'telecomunicaciones', 0.98),
    ('TELEVISA', 46, 'publicidad', 0.95),
    ('BCONNECT', 34, 'sistemas', 0.85),

    # Construction/Engineering
    ('ALSTOM', 102, 'transporte', 0.95),
    ('BOMBARDIER', 102, 'transporte', 0.95),
    ('MOTA', 10, 'construccion', 0.90),
    ('CURRIE', 41, 'consultoria', 0.85),
    ('CEMEX', 10, 'construccion', 0.98),
    ('ABENGOA', 60, 'energia', 0.95),
    ('CICSA', 10, 'construccion', 0.95),
    ('TRADECO', 10, 'construccion', 0.95),
    ('URBANISSA', 10, 'construccion', 0.90),
    ('MARHNOS', 10, 'construccion', 0.95),
    ('COCONAL', 10, 'construccion', 0.90),
    ('CONDUX', 62, 'electricidad', 0.85),
    ('VISE', 10, 'construccion', 0.80),
    ('LAMAT', 10, 'construccion', 0.85),
    ('ARKOSTECTUM', 10, 'construccion', 0.90),

    # Financial/Insurance
    ('METLIFE', 82, 'seguros', 0.98),
    ('AGROASEMEX', 82, 'seguros', 0.95),
    ('EDENRED', 80, 'financiero', 0.95),
    ('EFECTIVALE', 80, 'financiero', 0.95),
    ('TOKA', 80, 'financiero', 0.85),

    # Consumer Goods
    ('NESTLE', 72, 'alimentos', 0.98),
    ('SORIANA', 50, 'comercio', 0.98),
    ('LICONSA', 72, 'alimentos', 0.95),
    ('MOLINOS', 72, 'alimentos', 0.85),
    ('COSMOPOLITANA', 72, 'alimentos', 0.85),

    # Medical Distributors (Mexico specific)
    ('VITALMEX', 22, 'equipo_medico', 0.90),
    ('SELECCIONES', 22, 'equipo_medico', 0.85),
    ('FALCON', 22, 'equipo_medico', 0.80),
    ('IMPROMED', 22, 'equipo_medico', 0.90),
    ('DICIPA', 51, 'distribucion', 0.85),
    ('RALCA', 51, 'distribucion', 0.80),
    ('DEGASA', 51, 'distribucion', 0.80),
    ('CENTRUM', 51, 'distribucion', 0.75),
    ('HEMOSER', 22, 'equipo_medico', 0.90),
    ('ABALAT', 51, 'distribucion', 0.80),
    ('PROQUIGAMA', 71, 'quimicos', 0.85),
    ('INFRA', 71, 'quimicos', 0.80),
    ('ETHOMEDICAL', 22, 'equipo_medico', 0.90),
    ('VITASANITAS', 22, 'equipo_medico', 0.85),
    ('NOVAG', 21, 'farmaceutico', 0.85),
    ('SEREL', 51, 'distribucion', 0.75),
    ('DIBITER', 51, 'distribucion', 0.75),
    ('PAPELERO', 91, 'editorial', 0.80),

    # Car Rental/Leasing
    ('JET VAN', 83, 'arrendamiento', 0.90),

    # Government/Public Entities
    ('FONATUR', 105, 'gobierno', 0.98),
    ('SEGALMEX', 105, 'gobierno', 0.98),
    ('AEROMEXICO', 102, 'transporte', 0.95),
    ('AEROVIAS', 102, 'transporte', 0.90),

    # Railway/Transport
    ('AZVINDI', 102, 'transporte', 0.90),
    ('FERROVIARIO', 102, 'transporte', 0.90),

    # Generic high-value patterns
    ('PRODUCTOS', 70, 'manufactura', 0.70),
    ('INDUSTRIAL', 70, 'manufactura', 0.70),
    ('INDUSTRIAS', 70, 'manufactura', 0.70),
    ('CORPORATIVO', 199, 'otros', 0.50),
    ('EQUIPOS', 70, 'manufactura', 0.65),
    ('PROYECTOS', 104, 'ingenieria', 0.65),
    ('SOLUCIONES', 40, 'servicios', 0.65),
    ('DESARROLLO', 13, 'inmobiliario', 0.55),
    ('CONSORCIO', 10, 'construccion', 0.60),
    ('ASOCIADOS', 41, 'consultoria', 0.55),
    ('CONSTRUCTORES', 10, 'construccion', 0.85),
    ('CONSTRUCTOR', 10, 'construccion', 0.85),
    ('CONTROL', 34, 'sistemas', 0.60),
]


def classify_known_companies():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 70)
    print("CLASSIFYING KNOWN COMPANIES")
    print("=" * 70)

    # Get all vendors with current classification
    cursor.execute('''
        SELECT v.id, v.name, vc.industry_confidence
        FROM vendors v
        JOIN vendor_classifications vc ON v.id = vc.vendor_id
    ''')
    vendors = cursor.fetchall()
    print(f"Loaded {len(vendors):,} vendors")

    # Process each pattern
    updates = []
    for pattern, ind_id, ind_code, conf in KNOWN_COMPANIES:
        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error:
            continue

        for vid, name, current_conf in vendors:
            if name and current_conf < conf:
                if regex.search(name.upper()):
                    updates.append((ind_id, ind_code, conf, pattern[:100], vid))

    print(f"Found {len(updates):,} vendors to update")

    # Batch update
    cursor.executemany('''
        UPDATE vendor_classifications
        SET industry_id = ?,
            industry_code = ?,
            industry_confidence = ?,
            industry_source = 'known_company',
            industry_rule = ?,
            last_updated = datetime('now')
        WHERE vendor_id = ?
    ''', updates)

    conn.commit()

    # Show updated stats
    cursor.execute('''
        SELECT industry_code, COUNT(*) as cnt
        FROM vendor_classifications
        WHERE industry_confidence >= 0.7
        GROUP BY industry_code
        ORDER BY cnt DESC
    ''')

    print()
    print("UPDATED INDUSTRY DISTRIBUTION (>=70% confidence):")
    total_classified = 0
    for code, count in cursor.fetchall():
        print(f"  {code:25}: {count:>8,}")
        total_classified += count

    print(f"\nTotal classified: {total_classified:,}")
    cursor.execute('SELECT COUNT(*) FROM vendor_classifications')
    total = cursor.fetchone()[0]
    print(f"Total vendors: {total:,}")
    print(f"Classification rate: {100*total_classified/total:.1f}%")

    conn.close()


if __name__ == "__main__":
    classify_known_companies()
