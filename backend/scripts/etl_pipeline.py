"""
RUBLI Unified ETL Pipeline
===========================
Main pipeline to create RUBLI_NORMALIZED.db from all COMPRANET data sources.

Processes:
1. XLSX files (2002-2022) - Structures A, B, C
2. CSV files (2023-2025) - Structure D

Author: RUBLI Project
Date: 2026-01-05
"""

import sqlite3
import pandas as pd
import os
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict

# Import our modules
from etl_create_schema import main as create_schema_main, DB_PATH
from etl_classify import (
    classify_contract, normalize_vendor_name, normalize_text,
    normalize_contract_type, normalize_procedure_type
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, 'original_data')

BATCH_SIZE = 10000

# =============================================================================
# DATA QUALITY VALIDATION
# =============================================================================

# Maximum contract value (100 billion MXN)
# Mexico's largest infrastructure projects are ~50-80B MXN
# Anything over 100B is likely a data entry error
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN

# Threshold for flagging (contracts over 10B need manual review)
FLAG_THRESHOLD = 10_000_000_000  # 10B MXN

# Track rejected/flagged contracts
VALIDATION_STATS = {
    'rejected': 0,
    'flagged': 0,
    'total': 0
}

# =============================================================================
# COLUMN MAPPINGS FOR EACH STRUCTURE
# =============================================================================

# Structure A: Old Format (2002-2010) - 13 columns
MAPPING_A = {
    'institution_name': ['DEPENDENCIA / ENTIDAD', 'DEPENDENCIA'],
    'unit_name': ['NOMBRE UC'],
    'unit_code': ['CLAVE UC'],
    'procedure_number': ['NÚMERO DE PROCEDIMIENTO', 'NUMERO DE PROCEDIMIENTO'],
    'procedure_type': ['TIPO DE PROCEDIMIENTO'],
    'contract_type': ['TIPO CONTRATACIÓN', 'TIPO CONTRATACION'],
    'procedure_character': ['CARACTER', 'CARÁCTER'],
    'contract_number': ['NÚMERO DE CONTRATO', 'NUMERO DE CONTRATO'],
    'contract_title': ['REFERENCIA DE LA CONTRATACIÓN', 'REFERENCIA DE LA CONTRATACION'],
    'contract_date': ['FECHA DE SUSCRIPCIÓN DE CONTRATO', 'FECHA DE SUSCRIPCION DE CONTRATO'],
    'amount': ['IMPORTE MN SIN IVA'],
    'vendor_name': ['RAZÓN SOCIAL', 'RAZON SOCIAL'],
    'url': ['URL DEL CONTRATO'],
}

# Structure B: Middle Format (2010-2017) - 45 columns UPPERCASE
MAPPING_B = {
    'government_level': ['GOBIERNO'],
    'institution_code': ['SIGLAS'],
    'institution_name': ['DEPENDENCIA'],
    'unit_code': ['CLAVEUC'],
    'unit_name': ['NOMBRE_DE_LA_UC'],
    'responsible_person': ['RESPONSABLE'],
    'expedient_code': ['CODIGO_EXPEDIENTE'],
    'expedient_title': ['TITULO_EXPEDIENTE'],
    'procedure_number': ['NUMERO_PROCEDIMIENTO'],
    'award_date': ['EXP_F_FALLO'],
    'publication_date': ['PROC_F_PUBLICACION'],
    'procedure_character': ['CARACTER'],
    'contract_type': ['TIPO_CONTRATACION'],
    'procedure_type': ['TIPO_PROCEDIMIENTO'],
    'participation_form': ['FORMA_PROCEDIMIENTO'],
    'contract_number': ['CODIGO_CONTRATO'],
    'contract_title': ['TITULO_CONTRATO'],
    'start_date': ['FECHA_INICIO'],
    'end_date': ['FECHA_FIN'],
    'amount': ['IMPORTE_CONTRATO'],
    'currency': ['MONEDA'],
    'contract_status': ['ESTATUS_CONTRATO'],
    'framework_contract': ['CONTRATO_MARCO'],
    'consolidated_purchase': ['COMPRA_CONSOLIDADA'],
    'multiannual': ['PLURIANUAL'],
    'vendor_rfc': ['FOLIO_RUPC'],
    'vendor_name': ['PROVEEDOR_CONTRATISTA'],
    'vendor_size': ['ESTRATIFICACION_MPC'],
    'vendor_country': ['SIGLAS_PAIS'],
    'url': ['ANUNCIO'],
    'contract_date': ['FECHA_CELEBRACION'],
}

# Structure C: New Format (2018-2022) - 45 columns Mixed Case
MAPPING_C = {
    'government_level': ['Orden de gobierno'],
    'institution_code': ['Siglas de la Institución', 'Siglas de la Institucion'],
    'institution_name': ['Institución', 'Institucion'],
    'unit_code': ['Clave de la UC'],
    'unit_name': ['Nombre de la UC'],
    'responsible_person': ['Responsable de la UC'],
    'expedient_code': ['Código del expediente', 'Codigo del expediente'],
    'expedient_reference': ['Referencia del expediente'],
    'expedient_title': ['Título del expediente', 'Titulo del expediente'],
    'procedure_number': ['Número del procedimiento', 'Numero del procedimiento'],
    'award_date': ['Fecha de fallo'],
    'publication_date': ['Fecha de publicación', 'Fecha de publicacion'],
    'opening_date': ['Fecha de apertura'],
    'procedure_character': ['Carácter del procedimiento', 'Caracter del procedimiento'],
    'contract_type': ['Tipo de contratación', 'Tipo de contratacion'],
    'procedure_type': ['Tipo de procedimiento'],
    'participation_form': ['Forma de participación', 'Forma de participacion'],
    'contract_number': ['Código del contrato', 'Codigo del contrato'],
    'contract_title': ['Título del contrato', 'Titulo del contrato'],
    'contract_description': ['Descripción del contrato', 'Descripcion del contrato'],
    'start_date': ['Fecha de inicio del contrato'],
    'end_date': ['Fecha de fin del contrato'],
    'amount': ['Importe del contrato'],
    'currency': ['Moneda del contrato'],
    'contract_status': ['Estatus del contrato'],
    'framework_contract': ['Contrato marco'],
    'consolidated_purchase': ['Compra consolidada'],
    'multiannual': ['Contrato plurianual'],
    'vendor_rfc': ['RFC', 'Folio en el RUPC'],
    'vendor_name': ['Proveedor o contratista'],
    'vendor_size': ['Estratificación de la empresa', 'Estratificacion de la empresa'],
    'vendor_country': ['Clave del país de la empresa', 'Clave del pais de la empresa'],
    'rfc_sat_verified': ['RFC verificado en el SAT'],
    'url': ['Dirección del anuncio', 'Direccion del anuncio'],
    'contract_date': ['Fecha de firma del contrato'],
}

# Structure D: 2023-2025 CSV Format - 73 columns
MAPPING_D = {
    'government_level': ['Orden de gobierno'],
    'clave_ramo': ['Clave Ramo'],
    'descripcion_ramo': ['Descripción Ramo', 'Descripcion Ramo'],
    'tipo_institucion': ['Tipo de Institución', 'Tipo de Institucion'],
    'clave_institucion': ['Clave Institución', 'Clave Institucion'],
    'institution_code': ['Siglas de la Institución', 'Siglas de la Institucion'],
    'institution_name': ['Institución', 'Institucion'],
    'unit_code': ['Clave de la UC'],
    'unit_name': ['Nombre de la UC'],
    'expedient_code': ['Código del expediente', 'Codigo del expediente'],
    'expedient_reference': ['Referencia del expediente'],
    'expedient_title': ['Título del expediente', 'Titulo del expediente'],
    'partida_especifica': ['Partida específica', 'Partida especifica'],
    'legal_basis': ['Ley'],
    'procedure_type': ['Tipo Procedimiento'],
    'exception_article': ['Artículo de excepción', 'Articulo de excepcion'],
    'framework_contract': ['Contrato marco'],
    'consolidated_purchase': ['Compra consolidada'],
    'procedure_number': ['Número de procedimiento', 'Numero de procedimiento'],
    'contract_type': ['Tipo de contratación', 'Tipo de contratacion'],
    'procedure_character': ['Carácter del procedimiento', 'Caracter del procedimiento'],
    'participation_form': ['Forma de participación', 'Forma de participacion'],
    'publication_date': ['Fecha de publicación', 'Fecha de publicacion'],
    'opening_date': ['Fecha de apertura'],
    'award_date': ['Fecha de fallo'],
    'contract_number': ['Código del contrato', 'Codigo del contrato'],
    'contract_control': ['Núm. del contrato', 'Num. del contrato'],
    'contract_title': ['Título del contrato', 'Titulo del contrato'],
    'contract_description': ['Descripción del contrato', 'Descripcion del contrato'],
    'multiannual': ['Contrato plurianual'],
    'start_date': ['Fecha de inicio del contrato'],
    'end_date': ['Fecha de fin del contrato'],
    'contract_date': ['Fecha de firma del contrato'],
    'amount_drc': ['Importe DRC'],
    'currency': ['Moneda'],
    'contract_status': ['Estatus Contrato'],
    'contract_type_2': ['Tipo de contrato'],
    'amount_min': ['Monto sin imp./mínimo', 'Monto sin imp./minimo'],
    'amount_max': ['Monto sin imp./máximo', 'Monto sin imp./maximo'],
    'vendor_rfc': ['rfc', 'RFC'],
    'vendor_name': ['Proveedor o contratista'],
    'rupc_folio': ['Folio en el RUPC'],
    'vendor_country': ['País de la empresa', 'Pais de la empresa'],
    'vendor_nationality': ['Nacionalidad proveedor o contratista'],
    'vendor_size': ['Estratificación', 'Estratificacion'],
    'url': ['Dirección del anuncio', 'Direccion del anuncio'],
}


# =============================================================================
# STRUCTURE DETECTION
# =============================================================================

def detect_structure(df: pd.DataFrame) -> str:
    """Detect which structure a DataFrame has."""
    cols = set(df.columns)
    col_count = len(cols)

    # Structure A: 13-15 columns, old format
    if col_count <= 15:
        return 'A'

    # Check for Structure D markers (CSV 2023-2025)
    d_markers = ['Clave Ramo', 'Partida específica', 'Partida especifica',
                 'Descripción Ramo', 'Descripcion Ramo']
    if any(marker in cols for marker in d_markers):
        return 'D'

    # Check for Structure C markers (2018-2022, mixed case)
    c_markers = ['Institución', 'Institucion', 'Proveedor o contratista',
                 'Tipo de procedimiento', 'Importe del contrato']
    if any(marker in cols for marker in c_markers):
        return 'C'

    # Check for Structure B markers (2010-2017, UPPERCASE)
    b_markers = ['DEPENDENCIA', 'PROVEEDOR_CONTRATISTA', 'TIPO_PROCEDIMIENTO',
                 'IMPORTE_CONTRATO', 'NOMBRE_DE_LA_UC']
    if any(marker in cols for marker in b_markers):
        return 'B'

    # Default
    return 'B' if col_count >= 40 else 'A'


def find_column(df_columns: List[str], options: List[str]) -> Optional[str]:
    """Find the first matching column from options."""
    for opt in options:
        for col in df_columns:
            if col == opt or col.lower() == opt.lower():
                return col
            # Handle encoding issues
            normalized_opt = opt.replace('ó', 'o').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ú', 'u').replace('ñ', 'n')
            normalized_col = col.replace('ó', 'o').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ú', 'u').replace('ñ', 'n')
            if normalized_col.lower() == normalized_opt.lower():
                return col
    return None


def get_value(row: pd.Series, df_columns: List[str], options: List[str]) -> Optional[str]:
    """Get value from row using first matching column."""
    col = find_column(df_columns, options)
    if col and col in row.index:
        val = row[col]
        if pd.notna(val):
            return str(val) if not isinstance(val, str) else val
    return None


# =============================================================================
# DATA TRANSFORMATION
# =============================================================================

def parse_date(value) -> Optional[str]:
    """Parse various date formats to YYYY-MM-DD string."""
    if pd.isna(value):
        return None

    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d')

    if isinstance(value, str):
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%y']:
            try:
                return datetime.strptime(value.strip(), fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue

    try:
        return pd.to_datetime(value).strftime('%Y-%m-%d')
    except:
        return None


def parse_amount(value) -> float:
    """Parse various amount formats to float."""
    if pd.isna(value):
        return 0.0

    if isinstance(value, (int, float)):
        amount = float(value)
    elif isinstance(value, str):
        cleaned = re.sub(r'[,$\s]', '', value)
        try:
            amount = float(cleaned)
        except ValueError:
            return 0.0
    else:
        return 0.0

    # VALIDATION: Check for unreasonable values
    VALIDATION_STATS['total'] += 1

    if amount > MAX_CONTRACT_VALUE:
        # Reject values over 100B MXN - these are data entry errors
        print(f"    [REJECTED] Contract value {amount:,.0f} MXN exceeds maximum ({MAX_CONTRACT_VALUE:,.0f})")
        VALIDATION_STATS['rejected'] += 1
        return 0.0  # Return 0 to exclude from analytics

    if amount > FLAG_THRESHOLD:
        # Flag values over 10B for review (but include them)
        VALIDATION_STATS['flagged'] += 1

    return amount


def extract_year_from_filename(filename: str) -> Optional[int]:
    """Extract year from filename."""
    match = re.search(r'(\d{4})', filename)
    if match:
        return int(match.group(1))
    return None


def is_bool_true(value) -> bool:
    """Check if a value represents true."""
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    s = str(value).lower().strip()
    return s in ['si', 'sí', 'yes', '1', 'true', 's']


# =============================================================================
# VENDOR/INSTITUTION CACHE
# =============================================================================

class EntityCache:
    """Cache for vendors and institutions to enable deduplication."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.vendor_cache: Dict[str, int] = {}  # normalized_name -> id
        self.vendor_rfc_cache: Dict[str, int] = {}  # rfc -> id
        self.institution_cache: Dict[str, int] = {}  # normalized_name -> id
        self.next_vendor_id = 1
        self.next_institution_id = 1

    def get_or_create_vendor(
        self,
        name: str,
        rfc: Optional[str] = None,
        size: Optional[str] = None,
        country: Optional[str] = None,
        sat_verified: bool = False
    ) -> int:
        """Get vendor ID, creating if needed."""
        if not name:
            return None

        # Check RFC first (highest priority for deduplication)
        if rfc and rfc in self.vendor_rfc_cache:
            return self.vendor_rfc_cache[rfc]

        # Check normalized name
        normalized = normalize_vendor_name(name)
        if normalized in self.vendor_cache:
            vendor_id = self.vendor_cache[normalized]
            # Update RFC cache if we have RFC
            if rfc:
                self.vendor_rfc_cache[rfc] = vendor_id
            return vendor_id

        # Create new vendor
        vendor_id = self.next_vendor_id
        self.next_vendor_id += 1

        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO vendors (id, rfc, name, name_normalized, size_stratification,
                                country_code, is_verified_sat)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (vendor_id, rfc, name, normalized, size, country or 'MX',
              1 if sat_verified else 0))

        self.vendor_cache[normalized] = vendor_id
        if rfc:
            self.vendor_rfc_cache[rfc] = vendor_id

        return vendor_id

    def get_or_create_institution(
        self,
        name: str,
        siglas: Optional[str] = None,
        tipo: Optional[str] = None,
        nivel: Optional[str] = None,
        clave: Optional[str] = None,
        ramo_id: Optional[int] = None,
        sector_id: Optional[int] = None
    ) -> int:
        """Get institution ID, creating if needed."""
        if not name:
            return None

        normalized = normalize_text(name)
        if normalized in self.institution_cache:
            return self.institution_cache[normalized]

        # Create new institution
        inst_id = self.next_institution_id
        self.next_institution_id += 1

        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO institutions (id, siglas, name, name_normalized, tipo,
                                     ramo_id, sector_id, clave_institucion, gobierno_nivel)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (inst_id, siglas, name, normalized, tipo,
              ramo_id, sector_id, clave, nivel))

        self.institution_cache[normalized] = inst_id
        return inst_id


# =============================================================================
# RAMO LOOKUP
# =============================================================================

def load_ramo_lookup(conn: sqlite3.Connection) -> Dict[str, Tuple[int, int]]:
    """Load ramo -> (ramo_id, sector_id) mapping."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, clave, sector_id FROM ramos")
    return {row[1]: (row[0], row[2]) for row in cursor.fetchall()}


# =============================================================================
# ROW NORMALIZATION
# =============================================================================

def normalize_row(
    row: pd.Series,
    structure: str,
    df_columns: List[str],
    source_file: str,
    source_year: int,
    entity_cache: EntityCache,
    ramo_lookup: Dict[str, Tuple[int, int]]
) -> Dict:
    """Transform a row to normalized format with classification."""

    mapping = {'A': MAPPING_A, 'B': MAPPING_B, 'C': MAPPING_C, 'D': MAPPING_D}[structure]

    # Extract raw values
    institution_name = get_value(row, df_columns, mapping.get('institution_name', []))
    institution_code = get_value(row, df_columns, mapping.get('institution_code', []))
    vendor_name = get_value(row, df_columns, mapping.get('vendor_name', []))
    vendor_rfc = get_value(row, df_columns, mapping.get('vendor_rfc', []))
    vendor_size = get_value(row, df_columns, mapping.get('vendor_size', []))
    vendor_country = get_value(row, df_columns, mapping.get('vendor_country', []))
    contract_title = get_value(row, df_columns, mapping.get('contract_title', []))
    contract_description = get_value(row, df_columns, mapping.get('contract_description', []))
    procedure_type = get_value(row, df_columns, mapping.get('procedure_type', []))
    contract_type = get_value(row, df_columns, mapping.get('contract_type', []))

    # Structure D specific fields
    clave_ramo = get_value(row, df_columns, mapping.get('clave_ramo', [])) if structure == 'D' else None
    partida_especifica = get_value(row, df_columns, mapping.get('partida_especifica', [])) if structure == 'D' else None

    # Classify sector
    classification = classify_contract(
        clave_ramo=clave_ramo,
        partida_especifica=partida_especifica,
        institution_name=institution_name,
        contract_title=contract_title,
        contract_description=contract_description
    )

    # Look up ramo
    ramo_id = None
    if clave_ramo and clave_ramo in ramo_lookup:
        ramo_id = ramo_lookup[clave_ramo][0]

    # Get/create vendor
    vendor_id = entity_cache.get_or_create_vendor(
        name=vendor_name,
        rfc=vendor_rfc,
        size=vendor_size,
        country=vendor_country,
        sat_verified=is_bool_true(get_value(row, df_columns, mapping.get('rfc_sat_verified', [])))
    )

    # Get/create institution
    institution_id = entity_cache.get_or_create_institution(
        name=institution_name,
        siglas=institution_code,
        tipo=get_value(row, df_columns, mapping.get('tipo_institucion', [])),
        nivel=get_value(row, df_columns, mapping.get('government_level', [])),
        clave=get_value(row, df_columns, mapping.get('clave_institucion', [])),
        ramo_id=ramo_id,
        sector_id=classification.sector_id
    )

    # Parse dates
    contract_date = parse_date(get_value(row, df_columns, mapping.get('contract_date', [])))
    start_date = parse_date(get_value(row, df_columns, mapping.get('start_date', [])))
    end_date = parse_date(get_value(row, df_columns, mapping.get('end_date', [])))
    award_date = parse_date(get_value(row, df_columns, mapping.get('award_date', [])))
    publication_date = parse_date(get_value(row, df_columns, mapping.get('publication_date', [])))

    # Parse amount - try multiple fields for Structure D
    amount = 0.0
    if structure == 'D':
        for amount_field in ['amount_drc', 'amount_min', 'amount_max', 'amount']:
            if amount_field in mapping:
                val = get_value(row, df_columns, mapping[amount_field])
                if val:
                    amount = parse_amount(val)
                    if amount > 0:
                        break
    else:
        amount = parse_amount(get_value(row, df_columns, mapping.get('amount', [])))

    # Normalize procedure type
    proc_type_norm, is_direct = normalize_procedure_type(procedure_type)

    # Extract year from contract date or source
    contract_year = source_year
    contract_month = None
    if contract_date:
        try:
            contract_year = int(contract_date[:4])
            contract_month = int(contract_date[5:7])
        except:
            pass

    # Flags
    is_high_value = amount >= 10_000_000  # > 10M MXN
    is_year_end = contract_month in [11, 12] if contract_month else False

    record = {
        'source_file': source_file,
        'source_structure': structure,
        'source_year': source_year,

        'vendor_id': vendor_id,
        'institution_id': institution_id,
        'contracting_unit_id': None,  # TODO: implement UC normalization
        'sector_id': classification.sector_id,
        'sub_sector_id': classification.sub_sector_id,
        'category_id': classification.category_id,
        'ramo_id': ramo_id,

        'contract_number': get_value(row, df_columns, mapping.get('contract_number', [])),
        'procedure_number': get_value(row, df_columns, mapping.get('procedure_number', [])),
        'expedient_code': get_value(row, df_columns, mapping.get('expedient_code', [])),

        'title': contract_title,
        'description': contract_description,
        'partida_especifica': partida_especifica,

        'procedure_type': procedure_type,
        'procedure_type_normalized': proc_type_norm,
        'contract_type': contract_type,
        'contract_type_normalized': normalize_contract_type(contract_type),
        'procedure_character': get_value(row, df_columns, mapping.get('procedure_character', [])),
        'participation_form': get_value(row, df_columns, mapping.get('participation_form', [])),

        'contract_date': contract_date,
        'start_date': start_date,
        'end_date': end_date,
        'award_date': award_date,
        'publication_date': publication_date,

        'amount_mxn': amount,
        'amount_original': amount,
        'currency': get_value(row, df_columns, mapping.get('currency', [])) or 'MXN',

        'contract_year': contract_year,
        'contract_month': contract_month,

        'is_direct_award': 1 if is_direct else 0,
        'is_single_bid': 0,  # TODO: compute
        'is_framework': 1 if is_bool_true(get_value(row, df_columns, mapping.get('framework_contract', []))) else 0,
        'is_consolidated': 1 if is_bool_true(get_value(row, df_columns, mapping.get('consolidated_purchase', []))) else 0,
        'is_multiannual': 1 if is_bool_true(get_value(row, df_columns, mapping.get('multiannual', []))) else 0,
        'is_high_value': 1 if is_high_value else 0,
        'is_year_end': 1 if is_year_end else 0,

        'risk_score': 0.0,
        'price_anomaly_score': 0.0,
        'temporal_anomaly_score': 0.0,
        'vendor_risk_score': 0.0,

        'url': get_value(row, df_columns, mapping.get('url', [])),
        'contract_status': get_value(row, df_columns, mapping.get('contract_status', [])),
    }

    return record


# =============================================================================
# DATABASE OPERATIONS
# =============================================================================

def insert_batch(conn: sqlite3.Connection, records: List[Dict]):
    """Insert a batch of contracts."""
    if not records:
        return

    columns = [
        'source_file', 'source_structure', 'source_year',
        'vendor_id', 'institution_id', 'contracting_unit_id',
        'sector_id', 'sub_sector_id', 'category_id', 'ramo_id',
        'contract_number', 'procedure_number', 'expedient_code',
        'title', 'description', 'partida_especifica',
        'procedure_type', 'procedure_type_normalized',
        'contract_type', 'contract_type_normalized',
        'procedure_character', 'participation_form',
        'contract_date', 'start_date', 'end_date', 'award_date', 'publication_date',
        'amount_mxn', 'amount_original', 'currency',
        'contract_year', 'contract_month',
        'is_direct_award', 'is_single_bid', 'is_framework',
        'is_consolidated', 'is_multiannual', 'is_high_value', 'is_year_end',
        'risk_score', 'price_anomaly_score', 'temporal_anomaly_score', 'vendor_risk_score',
        'url', 'contract_status'
    ]

    placeholders = ', '.join(['?' for _ in columns])
    sql = f"INSERT INTO contracts ({', '.join(columns)}) VALUES ({placeholders})"

    cursor = conn.cursor()
    values = [tuple(r.get(c) for c in columns) for r in records]
    cursor.executemany(sql, values)
    conn.commit()


# =============================================================================
# FILE PROCESSING
# =============================================================================

def process_xlsx_file(
    filepath: str,
    conn: sqlite3.Connection,
    entity_cache: EntityCache,
    ramo_lookup: Dict[str, Tuple[int, int]]
) -> Tuple[int, str]:
    """Process a single XLSX file."""
    filename = os.path.basename(filepath)
    print(f"\nProcessing {filename}...")

    try:
        df = pd.read_excel(filepath, engine='openpyxl')
        row_count = len(df)

        if row_count == 0:
            print(f"  WARNING: Empty file")
            return 0, 'empty'

        print(f"  Loaded {row_count:,} rows")

        structure = detect_structure(df)
        print(f"  Detected structure: {structure}")

        df_columns = list(df.columns)
        source_year = extract_year_from_filename(filename) or 2000

        records = []
        processed = 0

        for idx, row in df.iterrows():
            record = normalize_row(
                row, structure, df_columns, filename, source_year,
                entity_cache, ramo_lookup
            )
            records.append(record)

            if len(records) >= BATCH_SIZE:
                insert_batch(conn, records)
                processed += len(records)
                print(f"  Processed {processed:,}/{row_count:,} rows...")
                records = []

        if records:
            insert_batch(conn, records)
            processed += len(records)

        print(f"  Completed: {processed:,} rows")
        return processed, structure

    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 0, 'error'


def process_csv_file(
    filepath: str,
    conn: sqlite3.Connection,
    entity_cache: EntityCache,
    ramo_lookup: Dict[str, Tuple[int, int]]
) -> Tuple[int, str]:
    """Process a single CSV file (2023-2025 format)."""
    filename = os.path.basename(filepath)
    print(f"\nProcessing {filename}...")

    try:
        # Try different encodings
        for encoding in ['latin-1', 'utf-8', 'cp1252']:
            try:
                df = pd.read_csv(filepath, encoding=encoding, low_memory=False)
                break
            except UnicodeDecodeError:
                continue
        else:
            print(f"  ERROR: Could not decode file")
            return 0, 'error'

        row_count = len(df)

        if row_count == 0:
            print(f"  WARNING: Empty file")
            return 0, 'empty'

        print(f"  Loaded {row_count:,} rows")
        print(f"  Structure: D (CSV 2023-2025)")

        df_columns = list(df.columns)
        source_year = extract_year_from_filename(filename) or 2023

        records = []
        processed = 0

        for idx, row in df.iterrows():
            record = normalize_row(
                row, 'D', df_columns, filename, source_year,
                entity_cache, ramo_lookup
            )
            records.append(record)

            if len(records) >= BATCH_SIZE:
                insert_batch(conn, records)
                processed += len(records)
                print(f"  Processed {processed:,}/{row_count:,} rows...")
                records = []

        if records:
            insert_batch(conn, records)
            processed += len(records)

        print(f"  Completed: {processed:,} rows")
        return processed, 'D'

    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 0, 'error'


# =============================================================================
# STATISTICS UPDATE
# =============================================================================

def update_vendor_stats(conn: sqlite3.Connection):
    """Update aggregate statistics on vendors."""
    print("\nUpdating vendor statistics...")
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE vendors SET
            total_contracts = (
                SELECT COUNT(*) FROM contracts WHERE vendor_id = vendors.id
            ),
            total_amount_mxn = (
                SELECT COALESCE(SUM(amount_mxn), 0) FROM contracts WHERE vendor_id = vendors.id
            ),
            first_contract_date = (
                SELECT MIN(contract_date) FROM contracts WHERE vendor_id = vendors.id
            ),
            last_contract_date = (
                SELECT MAX(contract_date) FROM contracts WHERE vendor_id = vendors.id
            )
    """)

    conn.commit()
    print("  Vendor statistics updated")


def update_institution_stats(conn: sqlite3.Connection):
    """Update aggregate statistics on institutions."""
    print("Updating institution statistics...")
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE institutions SET
            total_contracts = (
                SELECT COUNT(*) FROM contracts WHERE institution_id = institutions.id
            ),
            total_amount_mxn = (
                SELECT COALESCE(SUM(amount_mxn), 0) FROM contracts WHERE institution_id = institutions.id
            )
    """)

    conn.commit()
    print("  Institution statistics updated")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main ETL pipeline."""
    print("=" * 70)
    print("RUBLI UNIFIED ETL PIPELINE")
    print("=" * 70)
    print(f"\nData directory: {DATA_DIR}")
    print(f"Database: {DB_PATH}")

    # Step 1: Create schema
    print("\n" + "=" * 70)
    print("STEP 1: Creating database schema")
    print("=" * 70)
    create_schema_main()

    # Step 2: Connect and load ramo lookup
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")

    ramo_lookup = load_ramo_lookup(conn)
    entity_cache = EntityCache(conn)

    # Step 3: Process XLSX files
    print("\n" + "=" * 70)
    print("STEP 2: Processing XLSX files (2002-2022)")
    print("=" * 70)

    xlsx_files = sorted([
        os.path.join(DATA_DIR, f)
        for f in os.listdir(DATA_DIR)
        if f.endswith('.xlsx')
    ])

    print(f"\nFound {len(xlsx_files)} XLSX files")

    total_xlsx = 0
    structure_counts = defaultdict(int)
    start_time = datetime.now()

    for filepath in xlsx_files:
        count, structure = process_xlsx_file(filepath, conn, entity_cache, ramo_lookup)
        total_xlsx += count
        structure_counts[structure] += 1

    xlsx_elapsed = datetime.now() - start_time
    print(f"\nXLSX processing complete: {total_xlsx:,} records in {xlsx_elapsed}")

    # Step 4: Process CSV files
    print("\n" + "=" * 70)
    print("STEP 3: Processing CSV files (2023-2025)")
    print("=" * 70)

    csv_files = sorted([
        os.path.join(DATA_DIR, f)
        for f in os.listdir(DATA_DIR)
        if f.endswith('.csv')
    ])

    print(f"\nFound {len(csv_files)} CSV files")

    total_csv = 0
    csv_start = datetime.now()

    for filepath in csv_files:
        count, structure = process_csv_file(filepath, conn, entity_cache, ramo_lookup)
        total_csv += count
        structure_counts[structure] += 1

    csv_elapsed = datetime.now() - csv_start
    print(f"\nCSV processing complete: {total_csv:,} records in {csv_elapsed}")

    # Step 5: Update statistics
    print("\n" + "=" * 70)
    print("STEP 4: Updating aggregate statistics")
    print("=" * 70)

    update_vendor_stats(conn)
    update_institution_stats(conn)

    # Step 5b: Calculate single bid (competitive procedures with only 1 vendor)
    print("\n  Calculating single bid indicators...")
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE contracts
        SET is_single_bid = 1
        WHERE procedure_number IN (
            SELECT procedure_number
            FROM contracts
            WHERE is_direct_award = 0
              AND procedure_number IS NOT NULL
              AND procedure_number != ''
            GROUP BY procedure_number
            HAVING COUNT(DISTINCT vendor_id) = 1
        )
        AND is_direct_award = 0
    ''')
    single_bid_count = cursor.rowcount
    conn.commit()
    print(f"  Marked {single_bid_count:,} contracts as single_bid")

    # Print validation stats
    print(f"\n  Data Quality Stats:")
    print(f"    Total amounts processed: {VALIDATION_STATS['total']:,}")
    print(f"    Rejected (>100B MXN): {VALIDATION_STATS['rejected']:,}")
    print(f"    Flagged (>10B MXN): {VALIDATION_STATS['flagged']:,}")

    # Final verification
    print("\n" + "=" * 70)
    print("FINAL VERIFICATION")
    print("=" * 70)

    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM contracts")
    contract_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM vendors")
    vendor_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM institutions")
    inst_count = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(amount_mxn) FROM contracts")
    total_amount = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT s.code, s.name_es, COUNT(c.id), COALESCE(SUM(c.amount_mxn), 0)
        FROM sectors s
        LEFT JOIN contracts c ON s.id = c.sector_id
        GROUP BY s.id, s.code, s.name_es
        ORDER BY COUNT(c.id) DESC
    """)
    print("\nContracts by sector:")
    for code, name, count, amount in cursor.fetchall():
        pct = 100 * count / contract_count if contract_count > 0 else 0
        print(f"  {code:20} {count:>10,} ({pct:>5.1f}%) ${amount:>15,.0f}")

    cursor.execute("""
        SELECT contract_year, COUNT(*), SUM(amount_mxn)
        FROM contracts
        WHERE contract_year IS NOT NULL
        GROUP BY contract_year
        ORDER BY contract_year
    """)
    print("\nContracts by year:")
    for year, count, amount in cursor.fetchall():
        print(f"  {year}: {count:>10,} contracts, ${amount:>15,.0f}")

    conn.close()

    total_elapsed = datetime.now() - start_time

    print("\n" + "=" * 70)
    print("ETL PIPELINE COMPLETE")
    print("=" * 70)
    print(f"\nTotal contracts: {contract_count:,}")
    print(f"Unique vendors: {vendor_count:,}")
    print(f"Unique institutions: {inst_count:,}")
    print(f"Total value: ${total_amount:,.2f} MXN")
    print(f"\nTotal time: {total_elapsed}")
    print(f"\nDatabase ready at: {DB_PATH}")


if __name__ == '__main__':
    main()
