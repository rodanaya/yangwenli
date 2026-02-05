#!/usr/bin/env python3
"""
Mass Vendor Classification Script
Part of the Grand Classification Expansion

Classifies 320K+ vendors by:
1. Industry (from name patterns)
2. Company type (from legal suffix)
3. Size class (from MIPYME field)
4. Individual vs company status
"""

import sqlite3
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# ============================================================================
# INDUSTRY CLASSIFICATION PATTERNS
# Ordered by specificity (more specific patterns first)
# Format: (pattern, industry_id, industry_code, confidence)
# ============================================================================

INDUSTRY_PATTERNS = [
    # ========================================================================
    # TIER 1: HIGH SPECIFICITY PATTERNS (0.95 confidence)
    # ========================================================================

    # Pharmaceutical - very specific
    (r'FARMACEUTIC|FARMAC[EI]A|PHARMA', 21, 'farmaceutico', 0.95),
    (r'MEDICAMENT|MEDICINAS', 21, 'farmaceutico', 0.95),
    (r'VACUNAS?|BIOLOGICOS', 21, 'farmaceutico', 0.95),
    (r'DROGUERIA', 21, 'farmaceutico', 0.90),

    # Medical Equipment - specific
    (r'EQUIPO\s*MEDICO|EQUIPOS\s*MEDICOS', 22, 'equipo_medico', 0.95),
    (r'INSTRUMENTAL\s*MEDICO|MATERIAL\s*MEDICO', 22, 'equipo_medico', 0.95),
    (r'DISPOSITIVOS\s*MEDICOS', 22, 'equipo_medico', 0.95),
    (r'ORTOPEDI[AC]|PROTESIS', 22, 'equipo_medico', 0.90),
    (r'RADIOLOG|RAYOS\s*X|TOMOGRAF', 22, 'equipo_medico', 0.90),
    (r'DENTAL|ODONTOLOG', 22, 'equipo_medico', 0.85),

    # Laboratory
    (r'LABORATORIO[S]?\s*(CLINICO|DE\s*ANALISIS|MEDICO)', 23, 'laboratorio', 0.95),
    (r'LABORATORIO[S]?\b', 23, 'laboratorio', 0.85),
    (r'REACTIVOS|DIAGNOSTICO\s*CLINICO', 23, 'laboratorio', 0.90),

    # Hospital/Healthcare facilities
    (r'HOSPITAL\b|SANATORIO|CLINICA\s*(MEDICA|DE\s*SALUD)?', 24, 'hospital', 0.95),
    (r'CENTRO\s*(MEDICO|DE\s*SALUD|HOSPITALARIO)', 24, 'hospital', 0.90),

    # Construction - specific types
    (r'CONSTRUCTORA[S]?\b|CONSTRUCCION(ES)?\b', 10, 'construccion', 0.95),
    (r'EDIFICADORA|EDIFICACIONES', 12, 'construccion_edificacion', 0.95),
    (r'URBANIZADORA|DESARROLLOS?\s*URBANOS?', 12, 'construccion_edificacion', 0.90),
    (r'PAVIMENTADORA|PAVIMENTOS|ASFALTO', 11, 'construccion_civil', 0.95),
    (r'PERFORADORA|PERFORACION(ES)?', 11, 'construccion_civil', 0.90),
    (r'CIMENTACION|ESTRUCTURAS?\s*METALICAS?', 10, 'construccion', 0.90),

    # Real Estate
    (r'INMOBILIARIA[S]?\b|BIENES\s*RAICES', 13, 'inmobiliario', 0.95),
    (r'DESARROLLO[S]?\s*INMOBILIARIO', 13, 'inmobiliario', 0.95),
    (r'FRACCIONAMIENTO|VIVIENDA', 13, 'inmobiliario', 0.85),

    # Architecture
    (r'ARQUITECTO[S]?|ARQUITECTURA', 14, 'arquitectura', 0.95),
    (r'PROYECTOS?\s*ARQUITECTONICO', 14, 'arquitectura', 0.90),

    # Software/IT - specific
    (r'SOFTWARE\b', 31, 'software', 0.95),
    (r'DESARROLLO\s*DE\s*SISTEMAS', 31, 'software', 0.95),
    (r'PROGRAMACION|APLICACIONES?\s*(MOVILES?|WEB)', 31, 'software', 0.90),
    (r'SOLUCIONES?\s*(TECNOLOGICAS?|DE\s*TI|INFORMATICAS?)', 31, 'software', 0.85),

    # Hardware/Computing
    (r'COMPUTACION|COMPUTO|COMPUTADORAS?', 32, 'hardware', 0.90),
    (r'HARDWARE\b|SERVIDORES?|REDES?\s*(DE\s*DATOS)?', 32, 'hardware', 0.90),
    (r'EQUIPO[S]?\s*DE\s*COMPUTO', 32, 'hardware', 0.95),

    # Telecommunications
    (r'TELECOMUNICACION(ES)?|TELECOM\b', 33, 'telecomunicaciones', 0.95),
    (r'TELEFONI[AC]|COMUNICACION(ES)?\s*MOVIL', 33, 'telecomunicaciones', 0.90),
    (r'RADIOCOMUNICACION|SATELIT(AL|E)', 33, 'telecomunicaciones', 0.90),
    (r'FIBRA\s*OPTICA|CABLEADO', 33, 'telecomunicaciones', 0.85),

    # Systems/IT General
    (r'SISTEMAS?\s*(DE\s*INFORMACION|INTEGRALES?)', 34, 'sistemas', 0.90),
    (r'TECNOLOGIA[S]?\s*(DE\s*INFORMACION|INFORMATICA)', 34, 'sistemas', 0.90),
    (r'INFORMATICA\b|DIGITALIZACION', 34, 'sistemas', 0.85),

    # Consulting
    (r'CONSULTORIA[S]?\b|CONSULTOR(ES|A)?\b', 41, 'consultoria', 0.90),
    (r'ASESORI[AC][S]?\b|ASESORES?\b', 41, 'consultoria', 0.85),
    (r'DESPACHO\s*(DE\s*)?(CONSULTORIA|ASESORIA)', 41, 'consultoria', 0.90),

    # Security
    (r'SEGURIDAD\s*PRIVADA|VIGILANCIA', 42, 'seguridad', 0.95),
    (r'CUSTODIA|PROTECCION\s*(EJECUTIVA|PERSONAL)', 42, 'seguridad', 0.90),
    (r'GUARDIAS?|ESCOLTAS?', 42, 'seguridad', 0.80),

    # Cleaning
    (r'LIMPIEZA[S]?\b|ASEO\b', 43, 'limpieza', 0.95),
    (r'HIGIENE\s*(INDUSTRIAL)?|SANITIZACION', 43, 'limpieza', 0.90),
    (r'FUMIGACION|CONTROL\s*DE\s*PLAGAS', 43, 'limpieza', 0.85),

    # Maintenance
    (r'MANTENIMIENTO[S]?\b', 44, 'mantenimiento', 0.90),
    (r'CONSERVACION\s*(Y\s*MANTENIMIENTO)?', 44, 'mantenimiento', 0.85),
    (r'REPARACION(ES)?|INSTALACION(ES)?', 44, 'mantenimiento', 0.80),

    # Logistics/Transportation
    (r'LOGISTICA[S]?\b', 45, 'logistica', 0.95),
    (r'ALMACEN(AMIENTO|AJE)?|BODEGA[S]?', 45, 'logistica', 0.85),
    (r'TRANSPORTE[S]?\b(?!\s*PUBLICO)', 102, 'transporte', 0.90),
    (r'AUTOTRANSPORTE|FLETEO?|CARGA', 102, 'transporte', 0.90),
    (r'MUDANZA[S]?|PAQUETERIA', 102, 'transporte', 0.85),
    (r'MENSAJERIA|COURIER', 102, 'transporte', 0.80),

    # Advertising/Marketing
    (r'PUBLICIDAD\b|PUBLICITARI[OA]', 46, 'publicidad', 0.95),
    (r'MARKETING|MERCADOTECNIA', 46, 'publicidad', 0.90),
    (r'AGENCIA\s*(DE\s*)?(PUBLICIDAD|MEDIOS)', 46, 'publicidad', 0.95),
    (r'PRODUCCION\s*(AUDIOVISUAL|DE\s*VIDEO)', 46, 'publicidad', 0.85),

    # Distribution
    (r'DISTRIBUIDORA[S]?\b|DISTRIBUCION(ES)?\b', 51, 'distribucion', 0.90),
    (r'ABASTO[S]?|PROVEEDORA?', 51, 'distribucion', 0.80),
    (r'COMERCIALIZADORA[S]?\b', 50, 'comercio', 0.85),
    (r'IMPORTADORA|EXPORTADORA', 52, 'importacion', 0.90),

    # Oil & Gas
    (r'PETROLEO\b|PETROLERA[S]?|PETROLEOS', 61, 'petroleo', 0.95),
    (r'HIDROCARBUROS?|REFINACION', 61, 'petroleo', 0.95),
    (r'GAS\s*(NATURAL|LP)|GASODUCTO', 61, 'petroleo', 0.90),
    (r'PERFORACION\s*(PETROLERA|DE\s*POZOS)', 61, 'petroleo', 0.95),

    # Electrical
    (r'ELECTRICA[S]?\b|ELECTRICO[S]?\b', 62, 'electricidad', 0.85),
    (r'ELECTRICIDAD|INSTALACION(ES)?\s*ELECTRICAS?', 62, 'electricidad', 0.90),
    (r'SUBESTACION|TRANSFORMADOR', 62, 'electricidad', 0.90),
    (r'ILUMINACION|ALUMBRADO', 62, 'electricidad', 0.80),

    # Chemicals
    (r'QUIMICA[S]?\b|QUIMICO[S]?\b', 71, 'quimicos', 0.90),
    (r'PRODUCTOS?\s*QUIMICOS?', 71, 'quimicos', 0.95),
    (r'PETROQUIMICA|AGROQUIMICO', 71, 'quimicos', 0.90),

    # Food/Agriculture
    (r'ALIMENTO[S]?\b|ALIMENTICIA', 72, 'alimentos', 0.90),
    (r'EMPACADORA|PROCESADORA\s*(DE\s*ALIMENTOS)?', 72, 'alimentos', 0.85),
    (r'LACTEOS?|CARNICOS?|FRUTAS?\s*Y\s*VERDURAS?', 72, 'alimentos', 0.90),
    (r'AGRICOLA[S]?\b|AGROPECUARI[OA]', 100, 'agricultura', 0.95),
    (r'GANADERI[AO]|AVICOLA|PORCICOLA', 100, 'agricultura', 0.90),
    (r'SEMILLAS?|FERTILIZANTE', 100, 'agricultura', 0.85),

    # Textiles
    (r'TEXTIL(ES)?\b|CONFECCION(ES)?', 73, 'textiles', 0.95),
    (r'UNIFORMES?|VESTUARIO', 73, 'textiles', 0.85),
    (r'BORDADO|SERIGRAFIA', 73, 'textiles', 0.80),

    # Metal/Mechanical
    (r'METALMECANICA?|METALURGICA?', 74, 'metalmecanico', 0.95),
    (r'HERRERIA|SOLDADURA', 74, 'metalmecanico', 0.85),
    (r'MAQUINADO|TORNO|FRESADORA', 74, 'metalmecanico', 0.85),

    # Banking/Financial
    (r'BANCO\b|BANCARI[OA]|BANCA\b', 81, 'banca', 0.95),
    (r'FINANCIER[OA][S]?\b|CREDITO', 80, 'financiero', 0.90),
    (r'SOFOM\b|SOFIPO\b|SOFOL\b', 80, 'financiero', 0.95),

    # Insurance
    (r'ASEGURADORA[S]?\b|SEGUROS?\b(?!.*SEGURIDAD)', 82, 'seguros', 0.95),
    (r'AFIANZADORA|FIANZAS?', 82, 'seguros', 0.90),
    (r'REASEGURO', 82, 'seguros', 0.95),

    # Leasing
    (r'ARRENDADORA[S]?\b|ARRENDAMIENTO', 83, 'arrendamiento', 0.95),
    (r'LEASING|RENTING', 83, 'arrendamiento', 0.95),

    # Publishing/Editorial
    (r'EDITORIAL(ES)?\b|EDICIONES?', 91, 'editorial', 0.95),
    (r'IMPRENTA[S]?\b|IMPRESION(ES)?', 91, 'editorial', 0.90),
    (r'LITOGRAFIA|ENCUADERNACION', 91, 'editorial', 0.85),
    (r'LIBRERIA[S]?\b|LIBROS?', 91, 'editorial', 0.80),

    # Education/Training
    (r'CAPACITACION(ES)?\b|ENTRENAMIENTO', 92, 'capacitacion', 0.90),
    (r'EDUCACION\b|EDUCATIV[OA]', 90, 'educacion', 0.90),
    (r'ESCUELA[S]?\b|COLEGIO[S]?\b|INSTITUTO\s*EDUCATIVO', 90, 'educacion', 0.85),
    (r'UNIVERSIDAD|CENTRO\s*DE\s*ESTUDIOS', 90, 'educacion', 0.90),

    # Tourism/Hospitality
    (r'TURISMO\b|TURISTIC[OA]', 101, 'turismo', 0.95),
    (r'HOTEL(ES|ERIA)?\b|HOSPED(AJE|ERIA)', 101, 'turismo', 0.95),
    (r'AGENCIA\s*DE\s*VIAJES?|VIAJES?\s*(Y\s*TURISMO)?', 101, 'turismo', 0.90),
    (r'RESTAURANTE?[S]?\b|BANQUETE[S]?', 101, 'turismo', 0.85),
    (r'CATERING|ALIMENTOS?\s*Y\s*BEBIDAS?', 101, 'turismo', 0.80),

    # Environmental
    (r'AMBIENTAL(ES)?\b|MEDIO\s*AMBIENTE', 103, 'ambiental', 0.95),
    (r'ECOLOGI[AC]|SUSTENTAB', 103, 'ambiental', 0.90),
    (r'TRATAMIENTO\s*(DE\s*)?(AGUA|RESIDUOS)', 103, 'ambiental', 0.90),
    (r'RECICLAJE|RECICLADO', 103, 'ambiental', 0.85),

    # Engineering
    (r'INGENIER[IO][AS]?\b', 104, 'ingenieria', 0.85),
    (r'INGENIERIA\s*(CIVIL|MECANICA|ELECTRICA|INDUSTRIAL)', 104, 'ingenieria', 0.95),
    (r'PROYECTOS?\s*DE\s*INGENIERIA', 104, 'ingenieria', 0.90),
    (r'ESTUDIOS?\s*Y\s*PROYECTOS?', 104, 'ingenieria', 0.80),

    # ========================================================================
    # TIER 2: GENERIC SERVICE PATTERNS (0.75 confidence)
    # These are catch-alls, applied last
    # ========================================================================
    (r'SERVICIO[S]?\b', 40, 'servicios', 0.75),
    (r'COMERCIAL(ES)?\b', 50, 'comercio', 0.70),
    (r'TECNOLOGIA[S]?\b', 30, 'tecnologia', 0.70),
    (r'GRUPO\s*(EMPRESARIAL|INDUSTRIAL)', 199, 'otros', 0.50),
]

# ============================================================================
# COMPANY TYPE CLASSIFICATION
# ============================================================================

COMPANY_TYPES = {
    # Corporations
    'SA DE CV': ('corporation', 'SA DE CV'),
    'S.A. DE C.V.': ('corporation', 'SA DE CV'),
    'SADE CV': ('corporation', 'SA DE CV'),
    'SA': ('corporation', 'SA'),
    'S.A.': ('corporation', 'SA'),
    'SAB': ('corporation', 'SAB'),
    'SAB DE CV': ('corporation', 'SAB DE CV'),
    'SAPI DE CV': ('corporation', 'SAPI DE CV'),
    'SAPI': ('corporation', 'SAPI'),

    # Limited liability
    'SRL DE CV': ('partnership', 'SRL DE CV'),
    'S.R.L. DE C.V.': ('partnership', 'SRL DE CV'),
    'SRL': ('partnership', 'SRL'),
    'S.R.L.': ('partnership', 'SRL'),
    'S DE RL DE CV': ('partnership', 'S DE RL DE CV'),

    # Partnerships
    'SC': ('partnership', 'SC'),
    'S.C.': ('partnership', 'SC'),
    'SCP': ('partnership', 'SCP'),
    'S EN C': ('partnership', 'S EN C'),
    'S EN NC': ('partnership', 'S EN NC'),

    # Associations
    'AC': ('association', 'AC'),
    'A.C.': ('association', 'AC'),
    'IAP': ('association', 'IAP'),
    'I.A.P.': ('association', 'IAP'),
    'ABP': ('association', 'ABP'),

    # Cooperatives
    'SCL': ('cooperative', 'SCL'),
    'SC DE RL': ('cooperative', 'SC DE RL'),
    'SCAP': ('cooperative', 'SCAP'),
    'SPR': ('cooperative', 'SPR'),

    # Financial
    'SOFOM ENR': ('financial', 'SOFOM ENR'),
    'SOFOM ER': ('financial', 'SOFOM ER'),
    'SOFIPO': ('financial', 'SOFIPO'),
    'SOFOL': ('financial', 'SOFOL'),
}

# ============================================================================
# SIZE CLASSIFICATION NORMALIZATION
# ============================================================================

SIZE_NORMALIZATION = {
    'MICRO': 'micro',
    'MICROEMPRESA': 'micro',
    # Handle encoding issues
    'PEQUE': 'small',
    'PEQUEÑA': 'small',
    'PEQUENA': 'small',
    'MEDIANA': 'medium',
    'GRANDE': 'large',
    'NO MIPYME': 'large',
    'NO MYPIME': 'large',
}


def classify_vendors():
    """Main classification function."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 70)
    print("MASS VENDOR CLASSIFICATION")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Get all vendors
    cursor.execute('''
        SELECT id, name, legal_suffix, size_stratification,
               is_individual, country_code, total_amount_mxn
        FROM vendors
    ''')
    vendors = cursor.fetchall()
    print(f"Loaded {len(vendors):,} vendors")

    # Compile patterns
    compiled_patterns = []
    for pattern, ind_id, ind_code, conf in INDUSTRY_PATTERNS:
        try:
            compiled_patterns.append((re.compile(pattern, re.IGNORECASE), ind_id, ind_code, conf))
        except re.error as e:
            print(f"  Warning: Invalid pattern {pattern}: {e}")
    print(f"Compiled {len(compiled_patterns)} industry patterns")

    # Classification counters
    stats = defaultdict(int)
    batch_size = 10000
    classifications = []

    for i, vendor in enumerate(vendors):
        vid, name, legal_suffix, size_strat, is_individual, country_code, total_value = vendor

        # Initialize classification
        classification = {
            'vendor_id': vid,
            'industry_id': 199,  # Default to 'otros'
            'industry_code': 'otros',
            'industry_confidence': 0.0,
            'industry_source': None,
            'industry_rule': None,
            'company_type': 'unknown',
            'company_subtype': None,
            'size_class': 'unknown',
            'size_source': None,
            'is_domestic': 1 if (country_code == 'MX' or country_code is None) else 0,
            'is_international': 1 if (country_code and country_code != 'MX') else 0,
            'is_individual': is_individual or 0,
            'is_government': 0,
        }

        # 1. INDUSTRY CLASSIFICATION (from name patterns)
        if name:
            name_upper = name.upper()

            # Check for government entities first
            if any(kw in name_upper for kw in ['SECRETARIA', 'GOBIERNO', 'MUNICIPIO', 'AYUNTAMIENTO',
                                                'INSTITUTO NACIONAL', 'COMISION FEDERAL', 'COMISION NACIONAL']):
                classification['industry_id'] = 105
                classification['industry_code'] = 'gobierno'
                classification['industry_confidence'] = 0.95
                classification['industry_source'] = 'name_pattern'
                classification['industry_rule'] = 'GOVERNMENT_KEYWORDS'
                classification['is_government'] = 1
                stats['government'] += 1
            else:
                # Try industry patterns
                for compiled, ind_id, ind_code, conf in compiled_patterns:
                    if compiled.search(name_upper):
                        if conf > classification['industry_confidence']:
                            classification['industry_id'] = ind_id
                            classification['industry_code'] = ind_code
                            classification['industry_confidence'] = conf
                            classification['industry_source'] = 'name_pattern'
                            classification['industry_rule'] = compiled.pattern[:100]
                        break  # Stop at first match (patterns are ordered by priority)

        # 2. COMPANY TYPE CLASSIFICATION (from legal suffix)
        if legal_suffix and legal_suffix.upper() in COMPANY_TYPES:
            ctype, csubtype = COMPANY_TYPES[legal_suffix.upper()]
            classification['company_type'] = ctype
            classification['company_subtype'] = csubtype
            stats[f'type_{ctype}'] += 1
        elif is_individual:
            classification['company_type'] = 'individual'
            classification['company_subtype'] = 'persona_fisica'
            stats['type_individual'] += 1
        else:
            stats['type_unknown'] += 1

        # 3. SIZE CLASSIFICATION
        if size_strat:
            size_upper = size_strat.upper()
            for key, normalized in SIZE_NORMALIZATION.items():
                if key in size_upper:
                    classification['size_class'] = normalized
                    classification['size_source'] = 'mipyme_field'
                    stats[f'size_{normalized}'] += 1
                    break
            else:
                stats['size_unknown'] += 1
        else:
            # Infer from contract value
            if total_value:
                if total_value > 100_000_000_000:  # >100B = very large
                    classification['size_class'] = 'large'
                    classification['size_source'] = 'contract_value'
                elif total_value > 10_000_000_000:  # >10B = large
                    classification['size_class'] = 'large'
                    classification['size_source'] = 'contract_value'
                elif total_value > 1_000_000_000:  # >1B = medium
                    classification['size_class'] = 'medium'
                    classification['size_source'] = 'contract_value'
            stats['size_unknown'] += 1

        # Track industry stats
        if classification['industry_confidence'] >= 0.7:
            stats[f'industry_{classification["industry_code"]}'] += 1
            stats['industry_classified'] += 1
        else:
            stats['industry_unclassified'] += 1

        classifications.append(classification)

        # Batch insert
        if len(classifications) >= batch_size:
            _insert_batch(cursor, classifications)
            conn.commit()
            print(f"  Processed {i+1:,} / {len(vendors):,} vendors ({100*(i+1)/len(vendors):.1f}%)")
            classifications = []

    # Insert remaining
    if classifications:
        _insert_batch(cursor, classifications)
        conn.commit()

    print()
    print("=" * 70)
    print("CLASSIFICATION RESULTS")
    print("=" * 70)

    # Industry summary
    print("\nINDUSTRY CLASSIFICATION:")
    print(f"  Classified (>=70% conf): {stats['industry_classified']:,}")
    print(f"  Unclassified: {stats['industry_unclassified']:,}")
    print(f"  Government entities: {stats['government']:,}")

    # Top industries
    industry_counts = [(k, v) for k, v in stats.items() if k.startswith('industry_') and k != 'industry_classified' and k != 'industry_unclassified']
    industry_counts.sort(key=lambda x: -x[1])
    print("\n  Top Industries:")
    for ind, count in industry_counts[:15]:
        print(f"    {ind.replace('industry_', ''):20}: {count:>8,}")

    # Company type summary
    print("\nCOMPANY TYPE CLASSIFICATION:")
    for key in ['type_corporation', 'type_partnership', 'type_association', 'type_cooperative',
                'type_financial', 'type_individual', 'type_unknown']:
        if key in stats:
            print(f"  {key.replace('type_', ''):15}: {stats[key]:>8,}")

    # Size summary
    print("\nSIZE CLASSIFICATION:")
    for key in ['size_micro', 'size_small', 'size_medium', 'size_large', 'size_unknown']:
        if key in stats:
            print(f"  {key.replace('size_', ''):15}: {stats[key]:>8,}")

    conn.close()
    print()
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


def _insert_batch(cursor, classifications):
    """Insert a batch of classifications."""
    cursor.executemany('''
        INSERT OR REPLACE INTO vendor_classifications (
            vendor_id, industry_id, industry_code, industry_confidence,
            industry_source, industry_rule, company_type, company_subtype,
            size_class, size_source, is_domestic, is_international,
            is_individual, is_government, last_updated
        ) VALUES (
            :vendor_id, :industry_id, :industry_code, :industry_confidence,
            :industry_source, :industry_rule, :company_type, :company_subtype,
            :size_class, :size_source, :is_domestic, :is_international,
            :is_individual, :is_government, datetime('now')
        )
    ''', classifications)


if __name__ == "__main__":
    classify_vendors()
