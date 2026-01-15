"""
HYPERION Normalizer: Spanish Name Normalization

Handles normalization of Mexican company and institution names with:
- Accent removal (preserving Spanish ñ → N)
- Legal suffix extraction and standardization
- Punctuation and whitespace normalization
- Abbreviation expansion
"""

import re
from typing import NamedTuple
from unidecode import unidecode


class NormalizedName(NamedTuple):
    """Result of name normalization."""
    original: str
    normalized: str
    base_name: str
    legal_suffix: str | None
    tokens: list[str]
    first_token: str


class HyperionNormalizer:
    """
    Spanish company and institution name normalizer.

    Designed for Mexican procurement data with specific handling for:
    - Legal entity suffixes (S.A. DE C.V., S. DE R.L., etc.)
    - State prefixes (AGS-, BC-, CDMX-, etc.)
    - Common abbreviations and variations

    Example:
        >>> normalizer = HyperionNormalizer()
        >>> result = normalizer.normalize("Construcciones Azteca, S.A. de C.V.")
        >>> result.base_name
        'CONSTRUCCIONES AZTECA'
        >>> result.legal_suffix
        'SA DE CV'
    """

    # Legal suffixes ordered by length (longest first for greedy matching)
    LEGAL_SUFFIXES = [
        # Full forms
        ('SOCIEDAD ANONIMA DE CAPITAL VARIABLE', 'SA DE CV'),
        ('SOCIEDAD ANONIMA PROMOTORA DE INVERSION', 'SAPI'),
        ('SOCIEDAD ANONIMA PROMOTORA DE INVERSION DE CAPITAL VARIABLE', 'SAPI DE CV'),
        ('SOCIEDAD DE RESPONSABILIDAD LIMITADA DE CAPITAL VARIABLE', 'SRL DE CV'),
        ('SOCIEDAD DE RESPONSABILIDAD LIMITADA', 'SRL'),
        ('SOCIEDAD COOPERATIVA DE RESPONSABILIDAD LIMITADA', 'SCL'),
        ('SOCIEDAD EN COMANDITA SIMPLE', 'SCS'),
        ('SOCIEDAD EN COMANDITA POR ACCIONES', 'SCA'),
        ('SOCIEDAD EN NOMBRE COLECTIVO', 'SNC'),
        ('SOCIEDAD CIVIL', 'SC'),
        ('ASOCIACION CIVIL', 'AC'),
        ('INSTITUCION DE ASISTENCIA PRIVADA', 'IAP'),
        ('SOCIEDAD ANONIMA BURSATIL DE CAPITAL VARIABLE', 'SAB DE CV'),
        ('SOCIEDAD ANONIMA BURSATIL', 'SAB'),

        # PHASE 3 - Additional fully-spaced variations (3D fix)
        ('S. A. P. I. DE C. V.', 'SAPI DE CV'),  # Fully spaced SAPI
        ('S. A. P. I.', 'SAPI'),                  # Fully spaced SAPI
        ('S. A. DE C. V.', 'SA DE CV'),           # Fully spaced SA DE CV
        ('S. A. B. DE C. V.', 'SAB DE CV'),       # Fully spaced SAB
        ('S. A. B.', 'SAB'),                      # Fully spaced SAB
        ('S. C. DE R. L. DE C. V.', 'SC DE RL DE CV'),  # Fully spaced SC DE RL
        ('S. C. DE R. L.', 'SC DE RL'),           # Fully spaced SC DE RL
        ('S.A.B. DE C.V.', 'SAB DE CV'),          # Mixed SAB
        ('S.A.B DE C.V.', 'SAB DE CV'),           # Mixed SAB no period
        ('S.A.B.', 'SAB'),                        # Just SAB with periods

        # Abbreviated forms (with periods)
        ('S.A.P.I. DE C.V.', 'SAPI DE CV'),
        ('S.A.P.I DE C.V.', 'SAPI DE CV'),
        ('S.A.P.I.', 'SAPI'),
        ('S.A.DEC.V.', 'SA DE CV'),  # No space variation
        ('S.A.DE C.V.', 'SA DE CV'),
        ('S.A. DE C.V.', 'SA DE CV'),
        ('S.A DE C.V.', 'SA DE CV'),
        ('S.A. DE C.V', 'SA DE CV'),
        ('S.A DE C.V', 'SA DE CV'),
        ('S. DE R.L. DE C.V.', 'SRL DE CV'),
        ('S. DE R. L. DE C. V.', 'SRL DE CV'),  # Fully spaced with periods
        ('S DE R. L. DE C. V.', 'SRL DE CV'),   # No period on S
        ('S.R.L. DE C.V.', 'SRL DE CV'),        # Compact S.R.L.
        ('S. DE R.L. MI', 'SRL MI'),
        ('S. DE R.L.', 'SRL'),
        ('S DE R.L.', 'SRL'),
        ('S DE RL', 'SRL'),
        ('S.R.L.', 'SRL'),                      # Just S.R.L.
        ('S.C. DE R.L.', 'SC DE RL'),
        ('S.C.L.', 'SCL'),
        ('S.C.S.', 'SCS'),
        ('S.N.C.', 'SNC'),
        ('S.A.', 'SA'),
        ('S.C.', 'SC'),
        ('A.C.', 'AC'),
        ('I.A.P.', 'IAP'),

        # Without periods (various spacing)
        ('S A P I DE CV', 'SAPI DE CV'),  # Spaced out version
        ('S A P I DE C V', 'SAPI DE CV'),
        ('SAPI DE CV', 'SAPI DE CV'),
        ('S A DE C V', 'SA DE CV'),  # Spaced out version
        ('SA DE CV', 'SA DE CV'),
        # SRL variants with various spacing (CRITICAL - enables WALMART grouping)
        ('S DE R L DE C V', 'SRL DE CV'),  # Fully spaced version
        ('S R L DE C V', 'SRL DE CV'),     # Partially spaced
        ('S DE R L DE CV', 'SRL DE CV'),
        ('S DE RL DE CV', 'SRL DE CV'),
        ('S DE RL DE C V', 'SRL DE CV'),
        ('SRL DE CV', 'SRL DE CV'),
        ('S DE R L', 'SRL'),               # Without DE CV
        ('S R L', 'SRL'),
        ('SC DE RL', 'SC DE RL'),
        ('S DE RL', 'SRL'),
        ('S A B', 'SAB'),  # Sociedad Anonima Bursatil
        ('S A B DE C V', 'SAB DE CV'),
        ('SAB DE CV', 'SAB DE CV'),
        ('SAB', 'SAB'),
        ('SA', 'SA'),
        ('SC', 'SC'),
        ('AC', 'AC'),
        ('SRL', 'SRL'),

        # SOFOM variations
        ('SOFOM ENR', 'SOFOM ENR'),
        ('SOFOM E.N.R.', 'SOFOM ENR'),
        ('SOFOM', 'SOFOM'),
    ]

    # Mexican state abbreviation prefixes
    STATE_PREFIXES = {
        'AGS': 'Aguascalientes',
        'BC': 'Baja California',
        'BCS': 'Baja California Sur',
        'CAMP': 'Campeche',
        'CHIH': 'Chihuahua',
        'CHIS': 'Chiapas',
        'COAH': 'Coahuila',
        'COL': 'Colima',
        'CDMX': 'Ciudad de Mexico',
        'DGO': 'Durango',
        'GRO': 'Guerrero',
        'GTO': 'Guanajuato',
        'HGO': 'Hidalgo',
        'JAL': 'Jalisco',
        'MEX': 'Estado de Mexico',
        'MICH': 'Michoacan',
        'MOR': 'Morelos',
        'NAY': 'Nayarit',
        'NL': 'Nuevo Leon',
        'OAX': 'Oaxaca',
        'PUE': 'Puebla',
        'QRO': 'Queretaro',
        'QROO': 'Quintana Roo',
        'SLP': 'San Luis Potosi',
        'SIN': 'Sinaloa',
        'SON': 'Sonora',
        'TAB': 'Tabasco',
        'TAMS': 'Tamaulipas',
        'TLAX': 'Tlaxcala',
        'VER': 'Veracruz',
        'YUC': 'Yucatan',
        'ZAC': 'Zacatecas',
    }

    # Common abbreviations to expand
    ABBREVIATIONS = {
        'GRAL': 'GENERAL',
        'GRALS': 'GENERALES',
        'DR': 'DOCTOR',
        'DRA': 'DOCTORA',
        'ING': 'INGENIERO',
        'LIC': 'LICENCIADO',
        'ARQ': 'ARQUITECTO',
        'PROFR': 'PROFESOR',
        'MTRO': 'MAESTRO',
        'SR': 'SENOR',
        'SRA': 'SENORA',
        'SRIA': 'SECRETARIA',
        'DEPTO': 'DEPARTAMENTO',
        'ADMVA': 'ADMINISTRATIVA',
        'ADMVO': 'ADMINISTRATIVO',
        'ADMVOS': 'ADMINISTRATIVOS',
        'ADMON': 'ADMINISTRACION',
        'ADMINIS': 'ADMINISTRACION',
        'COMERCL': 'COMERCIAL',
        'COMERC': 'COMERCIAL',
        'COMUNIC': 'COMUNICACIONES',
        'CONST': 'CONSTRUCCIONES',
        'CONSTR': 'CONSTRUCCIONES',
        'CONSTRUC': 'CONSTRUCCIONES',
        'CONSTRUCCS': 'CONSTRUCCIONES',
        'DIST': 'DISTRIBUIDORA',
        'DISTRIB': 'DISTRIBUIDORA',
        'DISTRIBA': 'DISTRIBUIDORA',
        'EQUIP': 'EQUIPOS',
        'EQUIPAM': 'EQUIPAMIENTO',
        'FARMACEUT': 'FARMACEUTICOS',
        'FARM': 'FARMACEUTICOS',
        'IND': 'INDUSTRIAL',
        'INDUST': 'INDUSTRIAL',
        'INDUSTR': 'INDUSTRIAL',
        'INTERNAC': 'INTERNACIONAL',
        'INTERNACL': 'INTERNACIONAL',
        'INTL': 'INTERNACIONAL',
        'LAB': 'LABORATORIO',
        'LABS': 'LABORATORIOS',
        'MED': 'MEDICO',
        'MEDIC': 'MEDICO',
        'MEX': 'MEXICO',
        'MEXIC': 'MEXICANO',
        'MEXNA': 'MEXICANA',
        'MEXNO': 'MEXICANO',
        'MUN': 'MUNICIPAL',
        'MUNIC': 'MUNICIPAL',
        'NAL': 'NACIONAL',
        'NACL': 'NACIONAL',
        'ORG': 'ORGANIZACION',
        'ORGANIZ': 'ORGANIZACION',
        'PROD': 'PRODUCTOS',
        'PRODS': 'PRODUCTOS',
        'PRODUCS': 'PRODUCTOS',
        'PRODTOS': 'PRODUCTOS',
        'PROV': 'PROVEEDORA',
        'PROVEED': 'PROVEEDORA',
        'REP': 'REPRESENTACIONES',
        'REPRES': 'REPRESENTACIONES',
        'REPRESENT': 'REPRESENTACIONES',
        'SERV': 'SERVICIOS',
        'SERVS': 'SERVICIOS',
        'SOC': 'SOCIEDAD',
        'TEC': 'TECNICO',
        'TECN': 'TECNICO',
        'TECNICO': 'TECNICO',
        'TECNOL': 'TECNOLOGIA',
        'TECNOLOG': 'TECNOLOGIA',
        'UNIV': 'UNIVERSIDAD',
    }

    def __init__(self, expand_abbreviations: bool = False):
        """
        Initialize normalizer.

        Args:
            expand_abbreviations: If True, expand common abbreviations.
                                  Default False to preserve original form.
        """
        self.expand_abbreviations = expand_abbreviations

        # Compile regex patterns
        self._suffix_patterns = [
            (re.compile(re.escape(pattern) + r'\s*$', re.IGNORECASE), std)
            for pattern, std in self.LEGAL_SUFFIXES
        ]

        # State prefix pattern: XXX- or XXXX- at start
        self._state_prefix_pattern = re.compile(
            r'^(' + '|'.join(self.STATE_PREFIXES.keys()) + r')\s*[-:]\s*',
            re.IGNORECASE
        )

    def normalize(self, name: str) -> NormalizedName:
        """
        Normalize a company or institution name.

        Args:
            name: Original name string

        Returns:
            NormalizedName with normalized components
        """
        if not name or not isinstance(name, str):
            return NormalizedName(
                original=name or '',
                normalized='',
                base_name='',
                legal_suffix=None,
                tokens=[],
                first_token=''
            )

        original = name.strip()

        # Step 1: Uppercase and remove accents
        normalized = self._remove_accents(original.upper())

        # Step 2: Extract state prefix if present
        state_match = self._state_prefix_pattern.match(normalized)
        if state_match:
            normalized = normalized[state_match.end():]

        # Step 3: Extract legal suffix
        legal_suffix = None
        for pattern, std_suffix in self._suffix_patterns:
            match = pattern.search(normalized)
            if match:
                legal_suffix = std_suffix
                normalized = normalized[:match.start()].strip()
                break

        # Step 4: Clean punctuation (preserve internal hyphens)
        base_name = re.sub(r'[^\w\s-]', ' ', normalized)

        # Step 5: Normalize whitespace
        base_name = ' '.join(base_name.split())

        # Step 6: Optionally expand abbreviations
        if self.expand_abbreviations:
            base_name = self._expand_abbreviations(base_name)

        # Step 7: Tokenize
        tokens = base_name.split() if base_name else []
        first_token = tokens[0] if tokens else ''

        # Build full normalized name
        full_normalized = base_name
        if legal_suffix:
            full_normalized = f"{base_name} {legal_suffix}" if base_name else legal_suffix

        return NormalizedName(
            original=original,
            normalized=full_normalized,
            base_name=base_name,
            legal_suffix=legal_suffix,
            tokens=tokens,
            first_token=first_token
        )

    def _remove_accents(self, text: str) -> str:
        """
        Remove accents while preserving Spanish characters.

        Uses unidecode for transliteration:
        - á, é, í, ó, ú → A, E, I, O, U
        - ñ → N
        - ü → U
        """
        return unidecode(text)

    def _expand_abbreviations(self, text: str) -> str:
        """Expand common abbreviations."""
        words = text.split()
        expanded = []
        for word in words:
            # Remove trailing period if present
            clean_word = word.rstrip('.')
            if clean_word in self.ABBREVIATIONS:
                expanded.append(self.ABBREVIATIONS[clean_word])
            else:
                expanded.append(word)
        return ' '.join(expanded)

    def extract_state_prefix(self, name: str) -> tuple[str | None, str]:
        """
        Extract state prefix from institution name.

        Args:
            name: Institution name

        Returns:
            Tuple of (state_code, name_without_prefix)
        """
        if not name:
            return None, name

        normalized = name.upper().strip()
        match = self._state_prefix_pattern.match(normalized)

        if match:
            state_code = match.group(1).upper()
            remaining = normalized[match.end():].strip()
            return state_code, remaining

        return None, name

    def normalize_rfc(self, rfc: str) -> str | None:
        """
        Normalize and validate Mexican RFC (tax ID).

        Valid RFC formats:
        - Physical persons: 4 letters + 6 digits + 3 alphanumeric (13 chars)
        - Legal entities: 3 letters + 6 digits + 3 alphanumeric (12 chars)

        Args:
            rfc: Raw RFC string

        Returns:
            Normalized RFC or None if invalid
        """
        if not rfc or not isinstance(rfc, str):
            return None

        # Remove whitespace and convert to uppercase
        clean = re.sub(r'\s+', '', rfc.upper())

        # Remove common separators
        clean = re.sub(r'[-_.]', '', clean)

        # Validate length
        if len(clean) not in (12, 13):
            return None

        # Basic format validation
        if len(clean) == 12:
            # Legal entity: AAA######XXX
            pattern = r'^[A-Z&]{3}\d{6}[A-Z0-9]{3}$'
        else:
            # Physical person: AAAA######XXX
            pattern = r'^[A-Z&]{4}\d{6}[A-Z0-9]{3}$'

        if re.match(pattern, clean):
            return clean

        return None

    def get_blocking_keys(self, name: NormalizedName) -> list[str]:
        """
        Generate blocking keys for a normalized name.

        Returns multiple keys for different blocking strategies:
        - First 3 characters of first token
        - First 5 characters of normalized name
        - First token (if short enough)

        Args:
            name: NormalizedName result

        Returns:
            List of blocking keys
        """
        keys = []

        if name.first_token:
            # First 3 chars of first token
            if len(name.first_token) >= 3:
                keys.append(f"T3:{name.first_token[:3]}")

            # Full first token if short
            if len(name.first_token) <= 10:
                keys.append(f"T:{name.first_token}")

        if name.base_name:
            # First 5 chars of full name
            if len(name.base_name) >= 5:
                keys.append(f"N5:{name.base_name[:5]}")

        return keys


# Module-level convenience function
def normalize_name(name: str, expand_abbreviations: bool = False) -> NormalizedName:
    """
    Convenience function for one-off normalization.

    Args:
        name: Name to normalize
        expand_abbreviations: Whether to expand common abbreviations

    Returns:
        NormalizedName result
    """
    normalizer = HyperionNormalizer(expand_abbreviations=expand_abbreviations)
    return normalizer.normalize(name)
