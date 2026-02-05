"""
Migrate institutions table to v2.0 taxonomy.

This script:
1. Adds missing columns (institution_type_id, size_tier, autonomy_level, etc.)
2. Migrates v1.0 types to v2.0 (especially splitting "decentralized")
3. Populates foreign key references

Usage:
    python -m backend.scripts.migrate_institutions_v2
"""

import sqlite3
import re
import sys
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Mapping from old v1.0 types to new v2.0 types
V1_TO_V2_DIRECT_MAP = {
    'municipal': ('municipal', 13),
    'state_agency': ('state_agency', 12),
    'educational': ('educational', 18),
    'federal_secretariat': ('federal_secretariat', 1),
    'federal_agency': ('federal_agency', 2),
    'judicial': ('judicial', 14),
    'state_government': ('state_government', 11),
    'legislative': ('legislative', 15),
    'military': ('military', 16),
    'other': ('other', 19),
    # Renames
    'autonomous': ('autonomous_constitutional', 3),
    'health': ('health_institution', 17),
}

# Patterns to split "decentralized" into v2.0 subtypes
# Note: Using [AÁÀÄ] etc. to handle accented characters
DECENTRALIZED_SPLITS = [
    # Social Security (IMSS, ISSSTE, ISSFAM, FONACOT)
    # Includes state-level ISSSTE variants and FONACOT
    (r'INSTITUTO MEXICANO DEL SEGURO SOCIAL|^IMSS\b|ISSSTE|ISSFAM|'
     r'SEGURO SOCIAL.*TRABAJADORES|INSTITUTO DE SEGURIDAD SOCIAL|'
     r'INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES.*TRABAJADORES|'
     r'INSTITUTO DEL FONDO NACIONAL PARA EL CONSUMO|FONACOT|INFONACOT|'
     r'[A-Z]{2,3}-INSTITUTO DE SEGURIDAD Y SERVICIOS',
     'social_security', 4),

    # State Enterprise - Energy (CFE, PEMEX, PMI)
    (r'COMISI[OÓ]N FEDERAL DE ELECTRICIDAD|^CFE\b|PETR[OÓ]LEOS MEXICANOS|^PEMEX\b|'
     r'LUZ Y FUERZA|INSTITUTO.*PETR[OÓ]LEO|CENAGAS|CENACE|PETROQU[IÍ]MICA|'
     r'INSTITUTO NACIONAL DE ELECTRICIDAD|INEEL|IIE\b|'
     r'SERVICIO GEOL[OÓ]GICO|COMISI[OÓ]N NACIONAL DE ENERG[IÍ]A|'
     r'COMPA[NÑ][IÍ]A MEXICANA DE EXPLORACIONES|'
     r'P\.?M\.?I\.?\s*COMERCIO INTERNACIONAL|PMI COMERCIO|'
     r'CENTRO NACIONAL DE CONTROL DE ENERG[IÍ]A|'
     r'CENTRO NACIONAL DE CONTROL DEL GAS',
     'state_enterprise_energy', 5),

    # State Enterprise - Finance (NAFIN, BANOBRAS, etc.)
    (r'NACIONAL FINANCIERA|^NAFIN\b|BANOBRAS|BANJERCITO|BANSEFI|'
     r'BANCO DEL BIENESTAR|LOTER[IÍ]A NACIONAL|PRON[OÓ]STICOS|'
     r'SOCIEDAD HIPOTECARIA|AGROASEMEX|CASA DE MONEDA|'
     r'FINANCIERA.*DESARROLLO|FINANCIERA RURAL|FINANCIERA.*BIENESTAR|'
     r'BANCO NACIONAL.*OBRAS|BANCO NACIONAL.*EJ[EÉ]RCITO|'
     r'BANCO NACIONAL.*COMERCIO EXTERIOR|BANCOMEXT|'
     r'BANCO DEL AHORRO|FIDEICOMISO.*FOMENTO MINERO|FIFOMI',
     'state_enterprise_finance', 6),

    # State Enterprise - Infrastructure (CAPUFE, ASA, airports, ports, TELECOMM)
    (r'CAMINOS Y PUENTES FEDERALES|^CAPUFE\b|AEROPUERTOS Y SERVICIOS|^ASA\b|'
     r'FONATUR|FONDO NACIONAL DE FOMENTO AL TURISMO|'
     r'AEROPUERTO INTERNACIONAL|AEROPUERTO DE CUERNAVACA|'
     r'SERVICIOS AEROPORTUARIOS DE LA CIUDAD DE M[EÉ]XICO|'
     r'ADMINISTRACI[OÓ]N PORTUARIA|'
     r'SISTEMA PORTUARIO|FERROCARRIL|SEPOMEX|'
     r'TELECOMUNICACIONES DE M[EÉ]XICO|TELECOMM|'
     r'GRUPO AEROPORTUARIO|FONHAPO|CORREDOR INTEROCEAN|TREN MAYA|'
     r'INSTITUTO MEXICANO DE LA RADIO|IMER|'
     r'SISTEMA P[UÚ]BLICO DE RADIODIFUSI[OÓ]N|TELEVISI[OÓ]N METROPOLITANA|'
     r'NOTIMEX|TALLERES GR[AÁ]FICOS|ESTUDIOS CHURUBUSCO|'
     r'SERVICIOS.*NAVEGACI[OÓ]N.*ESPACIO A[EÉ]REO|SENEAM|'
     r'SISTEMA DE AUTOPISTAS.*AEROPUERTOS.*SERVICIOS|'
     r'LABORATORIOS DE BIOL[OÓ]GICOS Y REACTIVOS|BIRMEX',
     'state_enterprise_infra', 7),

    # Research & Education (CONACYT, CINVESTAV, cultural/research institutions)
    (r'CONSEJO NACIONAL DE CIENCIA|^CONACYT\b|CONAHCYT|CINVESTAV|'
     r'INSTITUTO POLIT[EÉ]CNICO NACIONAL|^IPN\b|'
     r'CENTRO DE INVESTIGACI[OÓ]N|INSTITUTO.*INVESTIGACI[OÓ]N|'
     r'INSTITUTO NACIONAL DE ASTROF[IÍ]SICA|INSTITUTO MORA|'
     r'INSTITUTO.*ECOLOG[IÍ]A|CENTRO NACIONAL DE METROLOG[IÍ]A|'
     r'FONDO DE CULTURA ECON[OÓ]MICA|CONALITEG|CONAFE|'
     r'INAH\b|INBA\b|IMCINE|CINETECA|'
     r'INSTITUTO NACIONAL DE ANTROPOLOG[IÍ]A E HISTORIA|'
     r'INSTITUTO NACIONAL DE BELLAS ARTES|'
     r'INSTITUTO MEXICANO DE CINEMATOGRAF[IÍ]A|'
     r'INSTITUTO MEXICANO DE TECNOLOG[IÍ]A DEL AGUA|IMTA|'
     r'TECNOL[OÓ]GICO NACIONAL DE M[EÉ]XICO|TecNM|'
     r'CENTRO DE CAPACITACI[OÓ]N CINEMATOGR[AÁ]FICA|'
     r'COMISI[OÓ]N DE OPERACI[OÓ]N Y FOMENTO.*ACAD[EÉ]MICAS|COFAA|'
     r'INSTITUTO NACIONAL DE LENGUAS IND[IÍ]GENAS|INALI|'
     r'INSTITUTO NACIONAL PARA LA EDUCACI[OÓ]N|INEA|'
     r'INFOTEC|EDUCAL|'
     r'COMISI[OÓ]N NACIONAL DE LIBROS|'
     r'IMPRESORA Y ENCUADERNADORA PROGRESO|'
     r'XE-?IPN.*CANAL|XEIPN.*CANAL|CANAL 11.*IPN|'
     r'RADIO EDUCACI[OÓ]N|'
     r'CORPORACI[OÓ]N MEXICANA DE INVESTIGACI[OÓ]N EN MATERIALES|COMIMSA|'
     r'FONDO DE INFORMACI[OÓ]N Y DOCUMENTACI[OÓ]N|INFOTEC|'
     r'INSTITUTO NACIONAL.*INFRAESTRUCTURA F[IÍ]SICA EDUCATIVA|INIFED|'
     r'INSTITUTO NACIONAL PARA EL DESARROLLO DE CAPACIDADES.*RURAL|INCA RURAL',
     'research_education', 8),

    # Social Programs (DICONSA, LICONSA, DIF, state-level DIF, etc.)
    (r'DICONSA|LICONSA|SEGURIDAD ALIMENTARIA|ALIMENTACI[OÓ]N PARA EL BIENESTAR|'
     r'SISTEMA NACIONAL.*DESARROLLO INTEGRAL.*FAMILIA|^DIF\b|'
     r'[A-Z]{2,3}-SISTEMA.*DESARROLLO INTEGRAL.*FAMILIA|'
     r'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA|'
     r'INAPAM|INSTITUTO NACIONAL DE LAS PERSONAS ADULTAS|'
     r'CONADE|COMISI[OÓ]N NACIONAL DE CULTURA F[IÍ]SICA Y DEPORTE|'
     r'IMJUVE|INSTITUTO MEXICANO DE LA JUVENTUD|'
     r'INSTITUTO NACIONAL DE.*PUEBLOS IND[IÍ]GENAS|^INPI\b|CDI\b|'
     r'COMISI[OÓ]N NACIONAL PARA EL DESARROLLO DE LOS PUEBLOS IND[IÍ]GENAS|'
     r'INMUJERES|INSTITUTO NACIONAL DE LAS MUJERES|'
     r'CONAPRED|CONSEJO NACIONAL PARA PREVENIR LA DISCRIMINACI[OÓ]N|'
     r'PROSPERA|FONAES|FONART|FONDO NACIONAL PARA EL FOMENTO DE LAS ARTESAN[IÍ]AS|'
     r'INAES|INSTITUTO NACIONAL DE LA ECONOM[IÍ]A SOCIAL|'
     r'INDESOL|INSTITUTO NACIONAL DE DESARROLLO SOCIAL|'
     r'CONADIS|CONSEJO NACIONAL PARA EL DESARROLLO.*INCLUSI[OÓ]N.*PERSONAS|'
     r'COORDINACI[OÓ]N NACIONAL.*BECAS|'
     r'CENTROS DE INTEGRACI[OÓ]N JUVENIL|'
     r'FONDO NACIONAL DE APOYO.*EMPRESAS.*SOLIDARIDAD',
     'social_program', 9),

    # Regulatory Agency (CRE, CNH, COFECE, COFEPRIS)
    (r'COMISI[OÓ]N REGULADORA DE ENERG[IÍ]A|^CRE\b|'
     r'COMISI[OÓ]N NACIONAL DE HIDROCARBUROS|^CNH\b|'
     r'COMISI[OÓ]N FEDERAL DE COMPETENCIA|^COFECE\b|^COFECO\b|'
     r'COFEPRIS|COMISI[OÓ]N NACIONAL BANCARIA|^CNBV\b|'
     r'CONSAR|CNSF|CONDUSEF|CONAMED|PROFECO|CONAMER|'
     r'COMISI[OÓ]N NACIONAL DE [AÁ]REAS NATURALES|CONANP|'
     r'PROCURADUR[IÍ]A FEDERAL DE PROTECCI[OÓ]N|PROFEPA|'
     r'COMISI[OÓ]N NACIONAL FORESTAL|CONAFOR',
     'regulatory_agency', 10),

    # Federal Agencies that were miscategorized as decentralized
    (r'APOYOS Y SERVICIOS.*COMERCIALIZACI[OÓ]N|ASERCA|'
     r'AGENCIA DE SERVICIOS A LA COMERCIALIZACI[OÓ]N|'
     r'COMISI[OÓ]N NACIONAL DE ACUACULTURA|CONAPESCA|'
     r'SERVICIO NACIONAL DE SANIDAD|SENASICA|'
     r'INSTITUTO NACIONAL DE PESCA|INSTITUTO NACIONAL DE LA PESCA|INAPESCA|'
     r'REGISTRO AGRARIO NACIONAL|RAN\b|'
     r'FIDEICOMISO.*RIESGO COMPARTIDO|FIRCO|'
     r'PRODUCTORA NACIONAL DE BIOL[OÓ]GICOS|PRONABIVE|'
     r'SERVICIO NACIONAL DE INSPECCI[OÓ]N|SNICS|'
     r'COMISI[OÓ]N NACIONAL DE LAS? ZONAS [AÁ]RIDAS|CONAZA|'
     r'COMISI[OÓ]N PARA LA REGULARIZACI[OÓ]N|CORETT|'
     r'FIDEICOMISO FONDO NACIONAL DE FOMENTO EJIDAL|FIFONAFE|'
     r'ARCHIVO GENERAL DE LA NACI[OÓ]N|'
     r'COMISI[OÓ]N NACIONAL DEL AGUA|CONAGUA|'
     r'CONSEJO.*PROMOCI[OÓ]N TUR[IÍ]STICA|'
     r'CONSEJO NACIONAL.*CULTURA.*ARTES|CONACULTA|'
     r'FONDO DE CAPITALIZACI[OÓ]N|FOCIR|'
     r'FIDEICOMISO.*CAPACITACI[OÓ]N.*MARINA|'
     r'COMIT[EÉ].*DESARROLLO.*PAPALOAPAN|'
     r'COMIT[EÉ].*DESARROLLO SUSTENTABLE.*CA[NÑ]A|CONADESUCA|'
     r'ADMINISTRACI[OÓ]N DEL PATRIMONIO.*BENEFICENCIA|'
     r'INSTITUTO NACIONAL DE CARDIOLOG[IÍ]A|'
     r'COMISI[OÓ]N NACIONAL DE BIO[EÉ]TICA|'
     r'SERVICIO POSTAL MEXICANO|'
     r'INSTITUTO NACIONAL DE MIGRACI[OÓ]N|INM\b|'
     r'SERVICIO DE ADMINISTRACI[OÓ]N Y ENAJENACI[OÓ]N DE BIENES|SAE\b',
     'federal_agency', 2),

    # More Research & Education
    (r'CONSEJO NACIONAL DE FOMENTO EDUCATIVO|CONAFE|'
     r'CENTRO NACIONAL.*TRANSFUSI[OÓ]N|'
     r'COMPA[NÑ][IÍ]A OPERADORA DEL CENTRO CULTURAL|CECUT|'
     r'EL COLEGIO DE M[EÉ]XICO|COLMEX|'
     r'EL COLEGIO DE LA FRONTERA|COLEF|ECOSUR|'
     r'EL COLEGIO DE MICHOAC[AÁ]N|'
     r'EL COLEGIO DE SAN LUIS|'
     r'CENTRO DE INVESTIGACI[OÓ]N CIENT[IÍ]FICA DE YUCAT[AÁ]N|CICY|'
     r'CENTRO DE INVESTIGACI[OÓ]N EN ALIMENTACI[OÓ]N|CIAD|'
     r'INSTITUTO POTOSINO|IPICYT|'
     r'CIATEC|CIATEQ|CIDESI|CIMAV|CIMAT|CIQA|COMIMSA',
     'research_education', 8),

    # More Social Programs
    (r'FONDO DE FOMENTO Y GARANT[IÍ]A.*CONSUMO.*TRABAJADORES|'
     r'INSTITUTO NACIONAL INDIGENISTA',
     'social_program', 9),

    # More State Enterprise Energy
    (r'EXPORTADORA DE SAL|'
     r'INSTITUTO NACIONAL DE INVESTIGACIONES NUCLEARES|ININ',
     'state_enterprise_energy', 5),

    # More State Enterprise Infrastructure
    (r'FIDEICOMISO FONDO NACIONAL DE HABITACIONES|FONHAPO|'
     r'ORGANISMO PROMOTOR DE INVERSIONES.*TELECOMUNICACIONES|PROMTEL|'
     r'FIDEICOMISO.*CINETECA',
     'state_enterprise_infra', 7),

    # Health Institutions (decentralized health centers)
    (r'CENTRO NACIONAL PARA LA PREVENCI[OÓ]N.*VIH|CENSIDA|'
     r'CENTRO NACIONAL PARA LA PREVENCI[OÓ]N Y.*CONTROL.*VIH',
     'health_institution', 17),
]


def add_missing_columns(conn: sqlite3.Connection) -> None:
    """Add v2.0 columns to institutions table if they don't exist."""
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(institutions)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    new_columns = [
        ("institution_type_id", "INTEGER"),
        ("size_tier", "VARCHAR(20)"),
        ("size_tier_id", "INTEGER"),
        ("autonomy_level", "VARCHAR(30)"),
        ("autonomy_level_id", "INTEGER"),
        ("is_legally_decentralized", "INTEGER DEFAULT 0"),
        ("updated_at", "TIMESTAMP"),
    ]

    added = 0
    for col_name, col_type in new_columns:
        if col_name not in existing_cols:
            print(f"  Adding column: {col_name}")
            cursor.execute(f"ALTER TABLE institutions ADD COLUMN {col_name} {col_type}")
            added += 1
        else:
            print(f"  Column already exists: {col_name}")

    # Create indexes
    indexes = [
        ("idx_inst_type_id", "institution_type_id"),
        ("idx_inst_size_tier", "size_tier"),
        ("idx_inst_autonomy", "autonomy_level"),
        ("idx_inst_decentralized", "is_legally_decentralized"),
    ]

    for idx_name, col_name in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON institutions({col_name})")
        except sqlite3.OperationalError:
            pass  # Index might already exist

    conn.commit()
    print(f"Added {added} new columns")


def migrate_direct_types(conn: sqlite3.Connection) -> dict:
    """Migrate v1.0 types that map directly to v2.0 types."""
    cursor = conn.cursor()
    stats = {}

    for old_type, (new_type, type_id) in V1_TO_V2_DIRECT_MAP.items():
        if old_type != new_type:
            # This is a rename
            cursor.execute("""
                UPDATE institutions
                SET institution_type = ?,
                    institution_type_id = ?,
                    updated_at = ?
                WHERE institution_type = ?
            """, (new_type, type_id, datetime.now().isoformat(), old_type))
            count = cursor.rowcount
            if count > 0:
                print(f"  Renamed: {old_type} -> {new_type} ({count} rows)")
                stats[f"{old_type}->{new_type}"] = count
        else:
            # Just set institution_type_id
            cursor.execute("""
                UPDATE institutions
                SET institution_type_id = ?,
                    updated_at = ?
                WHERE institution_type = ?
                  AND (institution_type_id IS NULL OR institution_type_id != ?)
            """, (type_id, datetime.now().isoformat(), old_type, type_id))
            count = cursor.rowcount
            if count > 0:
                print(f"  Set type_id: {old_type} = {type_id} ({count} rows)")
                stats[f"{old_type}_id"] = count

    conn.commit()
    return stats


def migrate_decentralized(conn: sqlite3.Connection) -> dict:
    """Split "decentralized" type into v2.0 functional subtypes."""
    cursor = conn.cursor()
    stats = {}

    # Get all decentralized institutions
    cursor.execute("""
        SELECT id, name, name_normalized
        FROM institutions
        WHERE institution_type = 'decentralized'
    """)
    decentralized = cursor.fetchall()

    if not decentralized:
        print("  No 'decentralized' institutions to migrate")
        return stats

    print(f"  Found {len(decentralized)} decentralized institutions to split")

    updates = []
    unmatched = []

    for inst_id, name, name_norm in decentralized:
        search_name = (name_norm or name or '').upper()
        matched = False

        for pattern, new_type, type_id in DECENTRALIZED_SPLITS:
            if re.search(pattern, search_name, re.IGNORECASE):
                updates.append((new_type, type_id, 1, inst_id))  # is_legally_decentralized = 1
                stats[new_type] = stats.get(new_type, 0) + 1
                matched = True
                break

        if not matched:
            unmatched.append((inst_id, name))
            stats['unmatched'] = stats.get('unmatched', 0) + 1

    # Apply updates
    if updates:
        cursor.executemany("""
            UPDATE institutions
            SET institution_type = ?,
                institution_type_id = ?,
                is_legally_decentralized = ?,
                updated_at = ?
            WHERE id = ?
        """, [(t, tid, dec, datetime.now().isoformat(), iid) for t, tid, dec, iid in updates])
        conn.commit()

    # Report unmatched
    if unmatched:
        print(f"\n  WARNING: {len(unmatched)} decentralized institutions could not be subtyped:")
        for inst_id, name in unmatched[:10]:
            print(f"    - [{inst_id}] {name[:60]}")
        if len(unmatched) > 10:
            print(f"    ... and {len(unmatched) - 10} more")

    # Print split results
    print("\n  Decentralized split results:")
    for new_type, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"    {new_type}: {count}")

    return stats


def set_legally_decentralized_flag(conn: sqlite3.Connection) -> int:
    """Set is_legally_decentralized flag based on institution type."""
    cursor = conn.cursor()

    # Types that are legally "organismo descentralizado"
    decentralized_types = (
        'social_security',
        'state_enterprise_energy',
        'state_enterprise_finance',
        'state_enterprise_infra',
        'research_education',
        'social_program',
    )

    cursor.execute(f"""
        UPDATE institutions
        SET is_legally_decentralized = 1,
            updated_at = ?
        WHERE institution_type IN ({','.join('?' * len(decentralized_types))})
          AND (is_legally_decentralized IS NULL OR is_legally_decentralized = 0)
    """, (datetime.now().isoformat(), *decentralized_types))

    count = cursor.rowcount
    conn.commit()
    return count


def verify_migration(conn: sqlite3.Connection) -> None:
    """Print verification statistics."""
    cursor = conn.cursor()

    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    # Check for remaining "decentralized" type
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE institution_type = 'decentralized'")
    decentralized_count = cursor.fetchone()[0]
    print(f"\n'decentralized' remaining: {decentralized_count}")
    if decentralized_count > 0:
        print("  WARNING: Some 'decentralized' institutions were not migrated!")

    # Check for remaining old types (autonomous, health)
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE institution_type IN ('autonomous', 'health')")
    old_types_count = cursor.fetchone()[0]
    print(f"Old types (autonomous, health) remaining: {old_types_count}")

    # Check institution_type_id coverage
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE institution_type_id IS NULL")
    null_type_id = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM institutions")
    total = cursor.fetchone()[0]
    print(f"\ninstitution_type_id populated: {total - null_type_id}/{total} ({100 * (total - null_type_id) / total:.1f}%)")

    # Distribution by type
    print("\nDistribution by institution_type:")
    cursor.execute("""
        SELECT institution_type, COUNT(*) as cnt,
               AVG(classification_confidence) as avg_conf
        FROM institutions
        GROUP BY institution_type
        ORDER BY cnt DESC
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:<30} {row[1]:>5} (conf: {row[2]:.3f})")

    # Distribution by legally decentralized
    cursor.execute("""
        SELECT is_legally_decentralized, COUNT(*)
        FROM institutions
        GROUP BY is_legally_decentralized
    """)
    print("\nLegally decentralized distribution:")
    for row in cursor.fetchall():
        status = "Yes" if row[0] == 1 else "No" if row[0] == 0 else "NULL"
        print(f"  {status}: {row[1]}")


def main():
    """Run the migration."""
    print(f"Database: {DB_PATH}")
    print("=" * 60)
    print("PHASE 2: Institution Classification v2.0 Migration")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Step 1: Add missing columns
        print("\n1. Adding missing columns...")
        add_missing_columns(conn)

        # Step 2: Migrate direct mappings
        print("\n2. Migrating direct type mappings...")
        direct_stats = migrate_direct_types(conn)

        # Step 3: Split decentralized
        print("\n3. Splitting 'decentralized' into functional subtypes...")
        decentralized_stats = migrate_decentralized(conn)

        # Step 4: Set legally decentralized flag
        print("\n4. Setting is_legally_decentralized flag...")
        flag_count = set_legally_decentralized_flag(conn)
        print(f"  Set flag on {flag_count} institutions")

        # Verify
        verify_migration(conn)

        print("\n" + "=" * 60)
        print("Migration complete!")
        print("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
