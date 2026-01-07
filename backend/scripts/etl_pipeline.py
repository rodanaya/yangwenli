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
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict
from pathlib import Path

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger('etl_pipeline')

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
# STRUCTURE VALIDATION CONFIGURATION
# =============================================================================

# Required columns for each structure (at least one from each group must exist)
STRUCTURE_REQUIRED_COLUMNS = {
    'A': {
        'institution': ['DEPENDENCIA / ENTIDAD', 'DEPENDENCIA'],
        'vendor': ['RAZÓN SOCIAL', 'RAZON SOCIAL'],
        'amount': ['IMPORTE MN SIN IVA'],
        'procedure': ['TIPO DE PROCEDIMIENTO'],
    },
    'B': {
        'institution': ['DEPENDENCIA'],
        'vendor': ['PROVEEDOR_CONTRATISTA'],
        'amount': ['IMPORTE_CONTRATO'],
        'procedure': ['TIPO_PROCEDIMIENTO'],
    },
    'C': {
        'institution': ['Institución', 'Institucion'],
        'vendor': ['Proveedor o contratista'],
        'amount': ['Importe del contrato'],
        'procedure': ['Tipo de procedimiento'],
    },
    'D': {
        'institution': ['Institución', 'Institucion'],
        'vendor': ['Proveedor o contratista'],
        'amount': ['Importe DRC', 'Monto sin imp./mínimo', 'Monto sin imp./minimo'],
        'procedure': ['Tipo Procedimiento'],
        'ramo': ['Clave Ramo'],  # Structure D specific
    },
}

# =============================================================================
# STRUCTURE DETECTION AND VALIDATION
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


def validate_structure(df: pd.DataFrame, structure: str) -> Tuple[bool, List[str]]:
    """
    Validate that a DataFrame has the expected columns for its detected structure.

    Args:
        df: The DataFrame to validate
        structure: The detected structure ('A', 'B', 'C', or 'D')

    Returns:
        Tuple of (is_valid, list_of_missing_groups)
    """
    if structure not in STRUCTURE_REQUIRED_COLUMNS:
        logger.warning(f"Unknown structure '{structure}', skipping validation")
        return True, []

    required = STRUCTURE_REQUIRED_COLUMNS[structure]
    cols = set(df.columns)

    # Also check with normalized column names (handle encoding issues)
    cols_normalized = set()
    for col in cols:
        cols_normalized.add(col)
        # Add normalized version without accents
        normalized = col.replace('ó', 'o').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ú', 'u').replace('ñ', 'n')
        cols_normalized.add(normalized)

    missing_groups = []

    for group_name, group_cols in required.items():
        # Check if at least one column from the group exists
        found = False
        for col_option in group_cols:
            if col_option in cols:
                found = True
                break
            # Check normalized version
            col_normalized = col_option.replace('ó', 'o').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ú', 'u').replace('ñ', 'n')
            if col_normalized in cols_normalized:
                found = True
                break

        if not found:
            missing_groups.append(group_name)

    is_valid = len(missing_groups) == 0

    if not is_valid:
        logger.warning(f"Structure {structure} validation failed. Missing groups: {missing_groups}")
        logger.debug(f"Available columns: {sorted(list(cols)[:20])}...")  # Show first 20

    return is_valid, missing_groups


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


def normalize_string_value(val: Optional[str], strip_whitespace: bool = True) -> Optional[str]:
    """
    Normalize a string value.

    Args:
        val: The value to normalize
        strip_whitespace: Whether to strip leading/trailing whitespace

    Returns:
        Normalized string or None
    """
    if val is None:
        return None

    if not isinstance(val, str):
        val = str(val)

    if strip_whitespace:
        val = val.strip()

    # Return None for empty strings after stripping
    if not val:
        return None

    return val


def get_value(row: pd.Series, df_columns: List[str], options: List[str], strip: bool = True) -> Optional[str]:
    """
    Get value from row using first matching column.

    Args:
        row: DataFrame row
        df_columns: List of column names in the DataFrame
        options: List of possible column names to try
        strip: Whether to strip whitespace from the result

    Returns:
        String value or None
    """
    col = find_column(df_columns, options)
    if col and col in row.index:
        val = row[col]
        if pd.notna(val):
            str_val = str(val) if not isinstance(val, str) else val
            return normalize_string_value(str_val, strip_whitespace=strip)
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


def parse_amount(value, context: str = "") -> float:
    """
    Parse various amount formats to float.

    Args:
        value: The value to parse
        context: Optional context string for logging (e.g., field name)

    Returns:
        Parsed float amount, or 0.0 if invalid/rejected
    """
    if pd.isna(value):
        return 0.0

    if isinstance(value, (int, float)):
        amount = float(value)
    elif isinstance(value, str):
        cleaned = re.sub(r'[,$\s]', '', value)
        try:
            amount = float(cleaned)
        except ValueError:
            if cleaned:  # Only log if there was actual content
                logger.debug(f"Could not parse amount value: '{value}' {context}")
            return 0.0
    else:
        return 0.0

    # VALIDATION: Check for unreasonable values
    VALIDATION_STATS['total'] += 1

    if amount > MAX_CONTRACT_VALUE:
        # Reject values over 100B MXN - these are data entry errors
        logger.warning(f"[REJECTED] Contract value {amount:,.0f} MXN exceeds maximum ({MAX_CONTRACT_VALUE:,.0f}) {context}")
        VALIDATION_STATS['rejected'] += 1
        return 0.0  # Return 0 to exclude from analytics

    if amount > FLAG_THRESHOLD:
        # Flag values over 10B for review (but include them)
        logger.info(f"[FLAGGED] High value contract: {amount:,.0f} MXN {context}")
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
    """Cache for vendors and institutions to enable deduplication with checkpoint support."""

    CHECKPOINT_INTERVAL = 50000  # Save checkpoint every N operations

    def __init__(self, conn: sqlite3.Connection, checkpoint_dir: Optional[str] = None):
        self.conn = conn
        self.vendor_cache: Dict[str, int] = {}  # normalized_name -> id
        self.vendor_rfc_cache: Dict[str, int] = {}  # rfc -> id
        self.institution_cache: Dict[str, int] = {}  # normalized_name -> id
        self.next_vendor_id = 1
        self.next_institution_id = 1
        self.operations_since_checkpoint = 0
        self.checkpoint_dir = checkpoint_dir or os.path.dirname(DB_PATH)
        self.checkpoint_file = os.path.join(self.checkpoint_dir, '.etl_cache_checkpoint.json')

    def save_checkpoint(self) -> None:
        """Save cache state to disk for recovery."""
        checkpoint_data = {
            'vendor_cache': self.vendor_cache,
            'vendor_rfc_cache': self.vendor_rfc_cache,
            'institution_cache': self.institution_cache,
            'next_vendor_id': self.next_vendor_id,
            'next_institution_id': self.next_institution_id,
            'timestamp': datetime.now().isoformat()
        }
        try:
            with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(checkpoint_data, f)
            logger.debug(f"Saved cache checkpoint: {len(self.vendor_cache)} vendors, "
                        f"{len(self.institution_cache)} institutions")
        except Exception as e:
            logger.warning(f"Failed to save cache checkpoint: {e}")

    def load_checkpoint(self) -> bool:
        """Load cache state from disk. Returns True if loaded successfully."""
        if not os.path.exists(self.checkpoint_file):
            return False

        try:
            with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)

            self.vendor_cache = checkpoint_data.get('vendor_cache', {})
            self.vendor_rfc_cache = checkpoint_data.get('vendor_rfc_cache', {})
            self.institution_cache = checkpoint_data.get('institution_cache', {})
            self.next_vendor_id = checkpoint_data.get('next_vendor_id', 1)
            self.next_institution_id = checkpoint_data.get('next_institution_id', 1)

            logger.info(f"Loaded cache checkpoint from {checkpoint_data.get('timestamp', 'unknown')}: "
                       f"{len(self.vendor_cache)} vendors, {len(self.institution_cache)} institutions")
            return True
        except Exception as e:
            logger.warning(f"Failed to load cache checkpoint: {e}")
            return False

    def clear_checkpoint(self) -> None:
        """Remove checkpoint file."""
        if os.path.exists(self.checkpoint_file):
            try:
                os.remove(self.checkpoint_file)
                logger.debug("Cleared cache checkpoint file")
            except Exception as e:
                logger.warning(f"Failed to clear checkpoint file: {e}")

    def _maybe_checkpoint(self) -> None:
        """Save checkpoint if interval reached."""
        self.operations_since_checkpoint += 1
        if self.operations_since_checkpoint >= self.CHECKPOINT_INTERVAL:
            self.save_checkpoint()
            self.operations_since_checkpoint = 0

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

        # Normalize RFC (strip whitespace, uppercase)
        if rfc:
            rfc = normalize_string_value(rfc)
            if rfc:
                rfc = rfc.upper()

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

        # Checkpoint periodically
        self._maybe_checkpoint()

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

        # Checkpoint periodically
        self._maybe_checkpoint()

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

    # Parse amount - try multiple fields for Structure D with logging
    amount = 0.0
    amount_field_used = None
    if structure == 'D':
        # Priority order for Structure D amount fields
        amount_fields_priority = ['amount_drc', 'amount_min', 'amount_max', 'amount']
        for amount_field in amount_fields_priority:
            if amount_field in mapping:
                val = get_value(row, df_columns, mapping[amount_field])
                if val:
                    amount = parse_amount(val, context=f"(field: {amount_field})")
                    if amount > 0:
                        amount_field_used = amount_field
                        # Log if using fallback field (not the primary amount_drc)
                        if amount_field != 'amount_drc':
                            procedure_num = get_value(row, df_columns, mapping.get('procedure_number', []))
                            logger.debug(f"Structure D: Using fallback amount field '{amount_field}' "
                                       f"for procedure {procedure_num}")
                        break
    else:
        amount = parse_amount(get_value(row, df_columns, mapping.get('amount', [])),
                            context=f"(structure: {structure})")

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

def validate_fk_references(conn: sqlite3.Connection, records: List[Dict]) -> List[Dict]:
    """
    Validate foreign key references exist before batch insert.

    Args:
        conn: Database connection
        records: List of record dictionaries

    Returns:
        List of valid records (with invalid FK references logged and corrected)
    """
    cursor = conn.cursor()

    # Get valid IDs for each FK table
    cursor.execute("SELECT id FROM sectors")
    valid_sectors = {row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id FROM sub_sectors")
    valid_sub_sectors = {row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id FROM categories")
    valid_categories = {row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id FROM ramos")
    valid_ramos = {row[0] for row in cursor.fetchall()}

    invalid_count = 0
    for record in records:
        # Validate sector_id
        if record.get('sector_id') and record['sector_id'] not in valid_sectors:
            logger.debug(f"Invalid sector_id {record['sector_id']}, setting to 12 (otros)")
            record['sector_id'] = 12  # Default to "otros"
            invalid_count += 1

        # Validate sub_sector_id
        if record.get('sub_sector_id') and record['sub_sector_id'] not in valid_sub_sectors:
            logger.debug(f"Invalid sub_sector_id {record['sub_sector_id']}, setting to None")
            record['sub_sector_id'] = None
            invalid_count += 1

        # Validate category_id
        if record.get('category_id') and record['category_id'] not in valid_categories:
            logger.debug(f"Invalid category_id {record['category_id']}, setting to None")
            record['category_id'] = None
            invalid_count += 1

        # Validate ramo_id
        if record.get('ramo_id') and record['ramo_id'] not in valid_ramos:
            logger.debug(f"Invalid ramo_id {record['ramo_id']}, setting to None")
            record['ramo_id'] = None
            invalid_count += 1

    if invalid_count > 0:
        logger.info(f"Corrected {invalid_count} invalid FK references in batch")

    return records


def insert_batch(conn: sqlite3.Connection, records: List[Dict], use_savepoint: bool = True) -> int:
    """
    Insert a batch of contracts with savepoint-based error recovery.

    Args:
        conn: Database connection
        records: List of record dictionaries
        use_savepoint: Whether to use savepoints for error recovery

    Returns:
        Number of records successfully inserted
    """
    if not records:
        return 0

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
        # NOTE: risk_score columns moved to separate risk_scores table (see etl_create_schema.py)
        'url', 'contract_status'
    ]

    placeholders = ', '.join(['?' for _ in columns])
    sql = f"INSERT INTO contracts ({', '.join(columns)}) VALUES ({placeholders})"

    cursor = conn.cursor()

    # Validate FK references before insert
    records = validate_fk_references(conn, records)

    values = [tuple(r.get(c) for c in columns) for r in records]

    if use_savepoint:
        # Use savepoint for error recovery
        savepoint_name = f"batch_{datetime.now().strftime('%H%M%S%f')}"
        try:
            cursor.execute(f"SAVEPOINT {savepoint_name}")
            cursor.executemany(sql, values)
            cursor.execute(f"RELEASE SAVEPOINT {savepoint_name}")
            conn.commit()
            return len(records)
        except sqlite3.Error as e:
            logger.error(f"Batch insert failed: {e}")
            cursor.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
            cursor.execute(f"RELEASE SAVEPOINT {savepoint_name}")

            # Try inserting records one by one to identify problematic records
            logger.info("Attempting row-by-row insert to recover...")
            successful = 0
            for i, value_tuple in enumerate(values):
                try:
                    cursor.execute(sql, value_tuple)
                    successful += 1
                except sqlite3.Error as row_error:
                    logger.warning(f"Failed to insert row {i}: {row_error}")

            conn.commit()
            logger.info(f"Recovered {successful}/{len(records)} records")
            return successful
    else:
        cursor.executemany(sql, values)
        conn.commit()
        return len(records)


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
    logger.info(f"Processing {filename}...")

    try:
        df = pd.read_excel(filepath, engine='openpyxl')
        row_count = len(df)

        if row_count == 0:
            logger.warning(f"Empty file: {filename}")
            return 0, 'empty'

        logger.info(f"  Loaded {row_count:,} rows from {filename}")

        structure = detect_structure(df)
        logger.info(f"  Detected structure: {structure}")

        # Validate structure
        is_valid, missing_groups = validate_structure(df, structure)
        if not is_valid:
            logger.warning(f"  Structure validation failed for {filename}. "
                         f"Missing: {missing_groups}. Proceeding with caution.")

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
                inserted = insert_batch(conn, records)
                processed += inserted
                logger.info(f"  Processed {processed:,}/{row_count:,} rows...")
                records = []

        if records:
            inserted = insert_batch(conn, records)
            processed += inserted

        logger.info(f"  Completed {filename}: {processed:,} rows")
        return processed, structure

    except Exception as e:
        logger.error(f"  ERROR processing {filename}: {e}")
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
    logger.info(f"Processing {filename}...")

    try:
        # Try different encodings - latin-1 is most common for COMPRANET CSVs
        encoding_used = None
        for encoding in ['latin-1', 'utf-8', 'cp1252', 'iso-8859-1']:
            try:
                df = pd.read_csv(filepath, encoding=encoding, low_memory=False)
                encoding_used = encoding
                logger.info(f"  Successfully read with encoding: {encoding}")
                break
            except UnicodeDecodeError:
                logger.debug(f"  Encoding {encoding} failed for {filename}")
                continue
        else:
            logger.error(f"Could not decode file {filename} with any supported encoding")
            return 0, 'error'

        row_count = len(df)

        if row_count == 0:
            logger.warning(f"Empty file: {filename}")
            return 0, 'empty'

        logger.info(f"  Loaded {row_count:,} rows from {filename}")
        logger.info(f"  Structure: D (CSV 2023-2025)")

        # Validate structure
        is_valid, missing_groups = validate_structure(df, 'D')
        if not is_valid:
            logger.warning(f"  Structure validation failed for {filename}. "
                         f"Missing: {missing_groups}. Proceeding with caution.")

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
                inserted = insert_batch(conn, records)
                processed += inserted
                logger.info(f"  Processed {processed:,}/{row_count:,} rows...")
                records = []

        if records:
            inserted = insert_batch(conn, records)
            processed += inserted

        logger.info(f"  Completed {filename}: {processed:,} rows")
        return processed, 'D'

    except Exception as e:
        logger.error(f"ERROR processing {filename}: {e}")
        import traceback
        traceback.print_exc()
        return 0, 'error'


# =============================================================================
# STATISTICS UPDATE
# =============================================================================

def update_vendor_stats(conn: sqlite3.Connection):
    """Update aggregate statistics on vendors."""
    logger.info("Updating vendor statistics...")
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
    logger.info("  Vendor statistics updated")


def update_institution_stats(conn: sqlite3.Connection):
    """Update aggregate statistics on institutions."""
    logger.info("Updating institution statistics...")
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
    logger.info("  Institution statistics updated")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main ETL pipeline."""
    logger.info("=" * 70)
    logger.info("RUBLI UNIFIED ETL PIPELINE")
    logger.info("=" * 70)
    logger.info(f"Data directory: {DATA_DIR}")
    logger.info(f"Database: {DB_PATH}")

    # Step 1: Create schema
    logger.info("=" * 70)
    logger.info("STEP 1: Creating database schema")
    logger.info("=" * 70)
    create_schema_main()

    # Step 2: Connect and load ramo lookup
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")

    ramo_lookup = load_ramo_lookup(conn)
    entity_cache = EntityCache(conn)

    # Step 3: Process XLSX files
    logger.info("=" * 70)
    logger.info("STEP 2: Processing XLSX files (2002-2022)")
    logger.info("=" * 70)

    xlsx_files = sorted([
        os.path.join(DATA_DIR, f)
        for f in os.listdir(DATA_DIR)
        if f.endswith('.xlsx')
    ])

    logger.info(f"Found {len(xlsx_files)} XLSX files")

    total_xlsx = 0
    structure_counts = defaultdict(int)
    start_time = datetime.now()

    for filepath in xlsx_files:
        count, structure = process_xlsx_file(filepath, conn, entity_cache, ramo_lookup)
        total_xlsx += count
        structure_counts[structure] += 1

    xlsx_elapsed = datetime.now() - start_time
    logger.info(f"XLSX processing complete: {total_xlsx:,} records in {xlsx_elapsed}")

    # Save checkpoint after XLSX processing
    entity_cache.save_checkpoint()

    # Step 4: Process CSV files
    logger.info("=" * 70)
    logger.info("STEP 3: Processing CSV files (2023-2025)")
    logger.info("=" * 70)

    csv_files = sorted([
        os.path.join(DATA_DIR, f)
        for f in os.listdir(DATA_DIR)
        if f.endswith('.csv')
    ])

    logger.info(f"Found {len(csv_files)} CSV files")

    total_csv = 0
    csv_start = datetime.now()

    for filepath in csv_files:
        count, structure = process_csv_file(filepath, conn, entity_cache, ramo_lookup)
        total_csv += count
        structure_counts[structure] += 1

    csv_elapsed = datetime.now() - csv_start
    logger.info(f"CSV processing complete: {total_csv:,} records in {csv_elapsed}")

    # Save final checkpoint
    entity_cache.save_checkpoint()

    # Step 5: Update statistics
    logger.info("=" * 70)
    logger.info("STEP 4: Updating aggregate statistics")
    logger.info("=" * 70)

    update_vendor_stats(conn)
    update_institution_stats(conn)

    # Step 5b: Calculate single bid (competitive procedures with only 1 vendor)
    logger.info("Calculating single bid indicators...")
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
    logger.info(f"Marked {single_bid_count:,} contracts as single_bid")

    # Print validation stats
    logger.info("Data Quality Stats:")
    logger.info(f"  Total amounts processed: {VALIDATION_STATS['total']:,}")
    logger.info(f"  Rejected (>100B MXN): {VALIDATION_STATS['rejected']:,}")
    logger.info(f"  Flagged (>10B MXN): {VALIDATION_STATS['flagged']:,}")

    # Final verification
    logger.info("=" * 70)
    logger.info("FINAL VERIFICATION")
    logger.info("=" * 70)

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
    logger.info("Contracts by sector:")
    for code, name, count, amount in cursor.fetchall():
        pct = 100 * count / contract_count if contract_count > 0 else 0
        logger.info(f"  {code:20} {count:>10,} ({pct:>5.1f}%) ${amount:>15,.0f}")

    cursor.execute("""
        SELECT contract_year, COUNT(*), SUM(amount_mxn)
        FROM contracts
        WHERE contract_year IS NOT NULL
        GROUP BY contract_year
        ORDER BY contract_year
    """)
    logger.info("Contracts by year:")
    for year, count, amount in cursor.fetchall():
        logger.info(f"  {year}: {count:>10,} contracts, ${amount:>15,.0f}")

    # Clean up checkpoint file on successful completion
    entity_cache.clear_checkpoint()

    conn.close()

    total_elapsed = datetime.now() - start_time

    logger.info("=" * 70)
    logger.info("ETL PIPELINE COMPLETE")
    logger.info("=" * 70)
    logger.info(f"Total contracts: {contract_count:,}")
    logger.info(f"Unique vendors: {vendor_count:,}")
    logger.info(f"Unique institutions: {inst_count:,}")
    logger.info(f"Total value: ${total_amount:,.2f} MXN")
    logger.info(f"Total time: {total_elapsed}")
    logger.info(f"Database ready at: {DB_PATH}")


if __name__ == '__main__':
    main()
