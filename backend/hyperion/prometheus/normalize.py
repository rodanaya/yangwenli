"""
HYPERION-PROMETHEUS Normalize: Vendor Normalization Pipeline

Prepares vendor data for deduplication by:
- Normalizing names using HyperionNormalizer
- Generating phonetic codes
- Extracting and validating RFC
- Creating blocking keys
"""

import sqlite3
from pathlib import Path
from dataclasses import dataclass
from typing import Iterator

from ..normalizer import HyperionNormalizer, NormalizedName
from ..phonetic import SpanishSoundex


@dataclass
class NormalizedVendor:
    """Normalized vendor record ready for matching."""
    id: int
    original_name: str
    normalized_name: str
    base_name: str
    legal_suffix: str | None
    first_token: str
    phonetic_code: str
    rfc: str | None
    is_individual: bool


class VendorNormalizer:
    """
    Vendor normalization pipeline for COMPRANET data.

    Processes vendor records and generates normalized features
    for deduplication matching.

    Example:
        >>> normalizer = VendorNormalizer()
        >>> vendor = {'id': 1, 'name': 'CONSTRUCCIONES AZTECA SA DE CV', 'rfc': 'CAZ990101ABC'}
        >>> result = normalizer.normalize_vendor(vendor)
        >>> result.base_name
        'CONSTRUCCIONES AZTECA'
    """

    # RFC patterns for individual vs corporate
    INDIVIDUAL_RFC_LENGTH = 13  # 4 letters + 6 digits + 3 check
    CORPORATE_RFC_LENGTH = 12   # 3 letters + 6 digits + 3 check

    # Keywords indicating individual (person) vendors
    INDIVIDUAL_KEYWORDS = [
        'PERSONA FISICA',
        'CONTRIBUYENTE',
    ]

    # Name patterns indicating individual
    INDIVIDUAL_PATTERNS = [
        # Spanish double surnames pattern (3+ words, no legal suffix)
        # e.g., "GARCIA MARTINEZ JUAN CARLOS"
    ]

    def __init__(self):
        """Initialize normalizer with components."""
        self.name_normalizer = HyperionNormalizer()
        self.phonetic_encoder = SpanishSoundex()

    def normalize_vendor(self, vendor: dict) -> NormalizedVendor:
        """
        Normalize a single vendor record.

        Args:
            vendor: Dict with 'id', 'name', 'rfc' keys

        Returns:
            NormalizedVendor with all computed features
        """
        vendor_id = vendor.get('id')
        name = vendor.get('name', '') or ''
        rfc = vendor.get('rfc')

        # Normalize name
        norm = self.name_normalizer.normalize(name)

        # Validate and clean RFC
        clean_rfc = self.name_normalizer.normalize_rfc(rfc) if rfc else None

        # Generate phonetic code from first token
        phonetic = self.phonetic_encoder.encode(norm.first_token) if norm.first_token else ''

        # Determine if individual or corporate
        is_individual = self._is_individual(name, norm, clean_rfc)

        return NormalizedVendor(
            id=vendor_id,
            original_name=name,
            normalized_name=norm.normalized,
            base_name=norm.base_name,
            legal_suffix=norm.legal_suffix,
            first_token=norm.first_token,
            phonetic_code=phonetic,
            rfc=clean_rfc,
            is_individual=is_individual
        )

    def _is_individual(
        self,
        name: str,
        norm: NormalizedName,
        rfc: str | None
    ) -> bool:
        """
        Determine if vendor is an individual (persona fisica) or company.

        Uses multiple signals:
        - RFC length (13 = individual, 12 = corporate)
        - Presence of legal suffix (SA DE CV = corporate)
        - Name structure (3+ words without suffix = likely individual)
        - Explicit keywords
        """
        # RFC is definitive when present
        if rfc:
            return len(rfc) == self.INDIVIDUAL_RFC_LENGTH

        # Legal suffix = corporate
        if norm.legal_suffix:
            return False

        # Individual keywords
        name_upper = name.upper()
        for keyword in self.INDIVIDUAL_KEYWORDS:
            if keyword in name_upper:
                return True

        # Heuristic: 3+ word names without suffix likely individual
        # Mexican names: APELLIDO_PATERNO APELLIDO_MATERNO NOMBRE(S)
        if len(norm.tokens) >= 3 and not norm.legal_suffix:
            # Check if tokens look like a person name (all proper-looking words)
            all_short = all(len(t) <= 15 for t in norm.tokens)
            no_corp_words = not any(
                w in norm.base_name
                for w in ['SOCIEDAD', 'EMPRESA', 'COMPANIA', 'GRUPO', 'SERVICIOS',
                          'COMERCIAL', 'CONSTRUCCIONES', 'INDUSTRIAL', 'DISTRIBUIDORA']
            )
            if all_short and no_corp_words:
                return True

        return False

    def normalize_batch(
        self,
        vendors: list[dict],
        progress_callback: callable = None
    ) -> list[NormalizedVendor]:
        """
        Normalize a batch of vendor records.

        Args:
            vendors: List of vendor dicts
            progress_callback: Optional callback(current, total)

        Returns:
            List of NormalizedVendor objects
        """
        results = []
        total = len(vendors)

        for i, vendor in enumerate(vendors):
            results.append(self.normalize_vendor(vendor))

            if progress_callback and (i + 1) % 10000 == 0:
                progress_callback(i + 1, total)

        return results


def normalize_vendors_from_db(
    db_path: Path,
    batch_size: int = 50000,
    progress_callback: callable = None
) -> Iterator[list[NormalizedVendor]]:
    """
    Stream normalized vendors from database in batches.

    Args:
        db_path: Path to SQLite database
        batch_size: Records per batch
        progress_callback: Optional callback(processed, total)

    Yields:
        Batches of NormalizedVendor objects
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get total count
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total = cursor.fetchone()[0]

    # Initialize normalizer
    normalizer = VendorNormalizer()

    # Process in batches
    offset = 0
    processed = 0

    while True:
        cursor.execute("""
            SELECT id, name, rfc
            FROM vendors
            ORDER BY id
            LIMIT ? OFFSET ?
        """, (batch_size, offset))

        rows = cursor.fetchall()
        if not rows:
            break

        # Convert to dicts
        vendors = [
            {'id': row[0], 'name': row[1], 'rfc': row[2]}
            for row in rows
        ]

        # Normalize batch
        normalized = normalizer.normalize_batch(vendors)
        processed += len(normalized)

        if progress_callback:
            progress_callback(processed, total)

        yield normalized

        offset += batch_size

    conn.close()


def update_vendors_with_normalization(
    db_path: Path,
    progress_callback: callable = None
) -> int:
    """
    Update vendors table with normalized data.

    Adds columns if needed and populates:
    - normalized_name
    - base_name
    - legal_suffix
    - first_token
    - phonetic_code
    - is_individual

    Args:
        db_path: Path to SQLite database
        progress_callback: Optional callback(processed, total)

    Returns:
        Number of vendors updated
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add columns if they don't exist
    columns_to_add = [
        ('normalized_name', 'VARCHAR(500)'),
        ('base_name', 'VARCHAR(500)'),
        ('legal_suffix', 'VARCHAR(50)'),
        ('first_token', 'VARCHAR(100)'),
        ('phonetic_code', 'VARCHAR(10)'),
        ('is_individual', 'INTEGER DEFAULT 0'),
    ]

    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE vendors ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    conn.commit()

    # Get total count
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total = cursor.fetchone()[0]

    # Process in batches
    normalizer = VendorNormalizer()
    batch_size = 10000
    offset = 0
    updated = 0

    while True:
        cursor.execute("""
            SELECT id, name, rfc
            FROM vendors
            ORDER BY id
            LIMIT ? OFFSET ?
        """, (batch_size, offset))

        rows = cursor.fetchall()
        if not rows:
            break

        # Normalize and update
        updates = []
        for row in rows:
            vendor = {'id': row[0], 'name': row[1], 'rfc': row[2]}
            norm = normalizer.normalize_vendor(vendor)

            updates.append((
                norm.normalized_name,
                norm.base_name,
                norm.legal_suffix,
                norm.first_token,
                norm.phonetic_code,
                1 if norm.is_individual else 0,
                norm.id
            ))

        cursor.executemany("""
            UPDATE vendors SET
                normalized_name = ?,
                base_name = ?,
                legal_suffix = ?,
                first_token = ?,
                phonetic_code = ?,
                is_individual = ?
            WHERE id = ?
        """, updates)

        conn.commit()
        updated += len(updates)
        offset += batch_size

        if progress_callback:
            progress_callback(updated, total)

    conn.close()
    return updated
