"""
HYPERION-ATLAS Taxonomy: Institution Type Definitions

Defines the standardized taxonomy for Mexican government institutions
including types, levels, sector mappings, size tiers, and autonomy levels.

Version 2.0 (January 2026): Redesigned taxonomy based on IMF CRI, OECD,
and EU ARACHNE frameworks. Splits "decentralized" into functional categories.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class InstitutionType:
    """Definition of an institution type."""
    id: int
    code: str
    name_es: str
    name_en: str
    description: str
    is_government: bool = True
    is_legally_decentralized: bool = False  # Legal status (organismo descentralizado)
    default_sector: str = 'otros'
    risk_baseline: float = 0.0


@dataclass
class InstitutionLevel:
    """Administrative level of an institution."""
    id: int
    code: str
    name_es: str
    name_en: str
    hierarchy_order: int


@dataclass
class GeographicScope:
    """Geographic scope of an institution."""
    id: int
    code: str
    name_es: str
    name_en: str


@dataclass
class SizeTier:
    """Size tier based on procurement volume."""
    id: int
    code: str
    name_es: str
    name_en: str
    min_contracts: int
    max_contracts: int  # -1 = unlimited
    risk_adjustment: float  # Added to base risk


@dataclass
class AutonomyLevel:
    """Budget and operational autonomy level."""
    id: int
    code: str
    name_es: str
    name_en: str
    description: str
    risk_baseline: float


# ============================================================================
# Institution Types (Primary Classification) - Version 2.0
# 18 types replacing the original 13, with "decentralized" split into
# functional categories based on IMF CRI and OECD frameworks.
# ============================================================================

INSTITUTION_TYPES = {
    # Federal Government - Core
    1: InstitutionType(
        id=1,
        code='federal_secretariat',
        name_es='Secretaría Federal',
        name_en='Federal Secretariat',
        description='Federal cabinet-level ministry (Secretaría de Estado)',
        default_sector='gobernacion',
        risk_baseline=0.15
    ),
    2: InstitutionType(
        id=2,
        code='federal_agency',
        name_es='Órgano Federal',
        name_en='Federal Agency',
        description='Federal agency, commission, or council',
        default_sector='gobernacion',
        risk_baseline=0.20
    ),
    3: InstitutionType(
        id=3,
        code='autonomous_constitutional',
        name_es='Órgano Constitucional Autónomo',
        name_en='Constitutional Autonomous Body',
        description='Constitutionally autonomous institution (INE, BANXICO, INAI, CNDH)',
        default_sector='gobernacion',
        risk_baseline=0.10
    ),

    # Split from "decentralized" - Social Security
    4: InstitutionType(
        id=4,
        code='social_security',
        name_es='Seguridad Social',
        name_en='Social Security',
        description='Social security systems (IMSS, ISSSTE)',
        is_legally_decentralized=True,
        default_sector='salud',
        risk_baseline=0.25
    ),

    # Split from "decentralized" - State Enterprises
    5: InstitutionType(
        id=5,
        code='state_enterprise_energy',
        name_es='Empresa Productiva - Energía',
        name_en='State Energy Enterprise',
        description='State-owned energy enterprises (PEMEX, CFE)',
        is_legally_decentralized=True,
        default_sector='energia',
        risk_baseline=0.28
    ),
    6: InstitutionType(
        id=6,
        code='state_enterprise_finance',
        name_es='Empresa Productiva - Finanzas',
        name_en='State Finance Enterprise',
        description='Development banks and financial entities (NAFIN, BANOBRAS)',
        is_legally_decentralized=True,
        default_sector='hacienda',
        risk_baseline=0.22
    ),
    7: InstitutionType(
        id=7,
        code='state_enterprise_infra',
        name_es='Empresa Productiva - Infraestructura',
        name_en='State Infrastructure Enterprise',
        description='Infrastructure enterprises (CAPUFE, ASA, airports)',
        is_legally_decentralized=True,
        default_sector='infraestructura',
        risk_baseline=0.25
    ),

    # Split from "decentralized" - Research & Education
    8: InstitutionType(
        id=8,
        code='research_education',
        name_es='Centro de Investigación/Educación',
        name_en='Research & Education',
        description='Research centers and major educational institutions (CONACYT, UNAM, IPN)',
        is_legally_decentralized=True,
        default_sector='educacion',
        risk_baseline=0.18
    ),

    # Split from "decentralized" - Social Programs
    9: InstitutionType(
        id=9,
        code='social_program',
        name_es='Programa Social',
        name_en='Social Program',
        description='Social welfare programs (DIF, DICONSA, LICONSA)',
        is_legally_decentralized=True,
        default_sector='trabajo',
        risk_baseline=0.30
    ),

    # New category - Regulatory Agencies
    10: InstitutionType(
        id=10,
        code='regulatory_agency',
        name_es='Órgano Regulador',
        name_en='Regulatory Agency',
        description='Regulatory bodies (CRE, CNH, COFECE, COFEPRIS)',
        default_sector='gobernacion',
        risk_baseline=0.15
    ),

    # State and Local Government
    11: InstitutionType(
        id=11,
        code='state_government',
        name_es='Gobierno Estatal',
        name_en='State Government',
        description='State executive branch (Gobierno del Estado)',
        default_sector='gobernacion',
        risk_baseline=0.30
    ),
    12: InstitutionType(
        id=12,
        code='state_agency',
        name_es='Dependencia Estatal',
        name_en='State Agency',
        description='State-level agency or department',
        default_sector='otros',
        risk_baseline=0.30
    ),
    13: InstitutionType(
        id=13,
        code='municipal',
        name_es='Gobierno Municipal',
        name_en='Municipal Government',
        description='Municipal government (Presidencia Municipal, Ayuntamiento)',
        default_sector='infraestructura',
        risk_baseline=0.35
    ),

    # Branches of Government
    14: InstitutionType(
        id=14,
        code='judicial',
        name_es='Poder Judicial',
        name_en='Judicial Branch',
        description='Courts, tribunals, and judicial bodies',
        default_sector='gobernacion',
        risk_baseline=0.10
    ),
    15: InstitutionType(
        id=15,
        code='legislative',
        name_es='Poder Legislativo',
        name_en='Legislative Branch',
        description='Congress, Senate, and legislative bodies',
        default_sector='gobernacion',
        risk_baseline=0.15
    ),
    16: InstitutionType(
        id=16,
        code='military',
        name_es='Fuerzas Armadas',
        name_en='Military',
        description='Army, Navy, and defense institutions',
        default_sector='defensa',
        risk_baseline=0.15
    ),

    # Health Institutions (separate from social_security)
    17: InstitutionType(
        id=17,
        code='health_institution',
        name_es='Institución de Salud',
        name_en='Health Institution',
        description='Hospitals, specialty institutes, and health centers',
        default_sector='salud',
        risk_baseline=0.25
    ),

    # Educational Institutions (separate from research_education for schools)
    18: InstitutionType(
        id=18,
        code='educational',
        name_es='Institución Educativa',
        name_en='Educational Institution',
        description='Schools, technical institutes, and training centers',
        default_sector='educacion',
        risk_baseline=0.20
    ),

    # Fallback
    19: InstitutionType(
        id=19,
        code='other',
        name_es='Otro',
        name_en='Other',
        description='Unclassified or special purpose',
        default_sector='otros',
        risk_baseline=0.25
    ),
}

# Legacy mapping for backward compatibility
LEGACY_TYPE_MAPPING = {
    'decentralized': ['social_security', 'state_enterprise_energy', 'state_enterprise_finance',
                      'state_enterprise_infra', 'research_education', 'social_program'],
    'autonomous': ['autonomous_constitutional'],
    'health': ['health_institution'],
}


# ============================================================================
# Institution Levels (Secondary Classification)
# ============================================================================

INSTITUTION_LEVELS = {
    1: InstitutionLevel(
        id=1, code='secretariat',
        name_es='Secretaría', name_en='Secretariat',
        hierarchy_order=1
    ),
    2: InstitutionLevel(
        id=2, code='subsecretariat',
        name_es='Subsecretaría', name_en='Undersecretariat',
        hierarchy_order=2
    ),
    3: InstitutionLevel(
        id=3, code='directorate',
        name_es='Dirección General', name_en='Directorate General',
        hierarchy_order=3
    ),
    4: InstitutionLevel(
        id=4, code='unit',
        name_es='Unidad', name_en='Unit',
        hierarchy_order=4
    ),
    5: InstitutionLevel(
        id=5, code='delegation',
        name_es='Delegación', name_en='Delegation',
        hierarchy_order=5
    ),
    6: InstitutionLevel(
        id=6, code='branch',
        name_es='Sucursal', name_en='Branch',
        hierarchy_order=6
    ),
    7: InstitutionLevel(
        id=7, code='headquarters',
        name_es='Oficina Central', name_en='Headquarters',
        hierarchy_order=1
    ),
}


# ============================================================================
# Geographic Scope
# ============================================================================

GEOGRAPHIC_SCOPES = {
    1: GeographicScope(id=1, code='federal', name_es='Federal', name_en='Federal'),
    2: GeographicScope(id=2, code='state', name_es='Estatal', name_en='State'),
    3: GeographicScope(id=3, code='municipal', name_es='Municipal', name_en='Municipal'),
    4: GeographicScope(id=4, code='regional', name_es='Regional', name_en='Regional'),
}


# ============================================================================
# Size Tiers (NEW - Based on Procurement Volume)
# Risk adjustment is added to institution type base risk
# ============================================================================

SIZE_TIERS = {
    1: SizeTier(
        id=1,
        code='mega',
        name_es='Mega',
        name_en='Mega',
        min_contracts=100000,
        max_contracts=-1,  # Unlimited
        risk_adjustment=0.05  # Large scale warrants scrutiny
    ),
    2: SizeTier(
        id=2,
        code='large',
        name_es='Grande',
        name_en='Large',
        min_contracts=10000,
        max_contracts=99999,
        risk_adjustment=0.02
    ),
    3: SizeTier(
        id=3,
        code='medium',
        name_es='Mediano',
        name_en='Medium',
        min_contracts=1000,
        max_contracts=9999,
        risk_adjustment=0.00  # Baseline
    ),
    4: SizeTier(
        id=4,
        code='small',
        name_es='Pequeño',
        name_en='Small',
        min_contracts=100,
        max_contracts=999,
        risk_adjustment=-0.02
    ),
    5: SizeTier(
        id=5,
        code='micro',
        name_es='Micro',
        name_en='Micro',
        min_contracts=0,
        max_contracts=99,
        risk_adjustment=-0.05  # Less data = less reliable risk signal
    ),
}


# ============================================================================
# Autonomy Levels (NEW - Budget Independence)
# Based on IMF CRI and OECD procurement integrity frameworks
# ============================================================================

AUTONOMY_LEVELS = {
    1: AutonomyLevel(
        id=1,
        code='full_autonomy',
        name_es='Autonomía Plena',
        name_en='Full Autonomy',
        description='Constitutional autonomy with own budget (BANXICO, INE, UNAM)',
        risk_baseline=0.10
    ),
    2: AutonomyLevel(
        id=2,
        code='technical_autonomy',
        name_es='Autonomía Técnica',
        name_en='Technical Autonomy',
        description='Technical autonomy with federal budget oversight (CRE, COFECE)',
        risk_baseline=0.15
    ),
    3: AutonomyLevel(
        id=3,
        code='operational_autonomy',
        name_es='Autonomía Operativa',
        name_en='Operational Autonomy',
        description='Operational autonomy, sector budget (IMSS, CFE, PEMEX)',
        risk_baseline=0.20
    ),
    4: AutonomyLevel(
        id=4,
        code='dependent',
        name_es='Dependiente',
        name_en='Dependent',
        description='Fully dependent on parent institution budget',
        risk_baseline=0.25
    ),
    5: AutonomyLevel(
        id=5,
        code='subnational',
        name_es='Subnacional',
        name_en='Subnational',
        description='State or municipal budget (less federal oversight)',
        risk_baseline=0.30
    ),
}


# Helper function to determine size tier from contract count
def get_size_tier(contract_count: int) -> SizeTier:
    """Determine size tier based on contract count."""
    for tier in sorted(SIZE_TIERS.values(), key=lambda t: t.min_contracts, reverse=True):
        if contract_count >= tier.min_contracts:
            return tier
    return SIZE_TIERS[5]  # Default to micro


# Helper function to get autonomy level from institution type
def get_default_autonomy(institution_type_code: str) -> AutonomyLevel:
    """Get default autonomy level based on institution type."""
    autonomy_mapping = {
        'autonomous_constitutional': 'full_autonomy',
        'regulatory_agency': 'technical_autonomy',
        'social_security': 'operational_autonomy',
        'state_enterprise_energy': 'operational_autonomy',
        'state_enterprise_finance': 'operational_autonomy',
        'state_enterprise_infra': 'operational_autonomy',
        'research_education': 'operational_autonomy',
        'social_program': 'dependent',
        'federal_secretariat': 'dependent',
        'federal_agency': 'dependent',
        'health_institution': 'dependent',
        'educational': 'dependent',
        'judicial': 'dependent',
        'legislative': 'dependent',
        'military': 'dependent',
        'state_government': 'subnational',
        'state_agency': 'subnational',
        'municipal': 'subnational',
        'other': 'dependent',
    }
    code = autonomy_mapping.get(institution_type_code, 'dependent')
    for level in AUTONOMY_LEVELS.values():
        if level.code == code:
            return level
    return AUTONOMY_LEVELS[4]  # Default to dependent


# ============================================================================
# Mexican States
# ============================================================================

MEXICAN_STATES = {
    'AGS': ('Aguascalientes', 1),
    'BC': ('Baja California', 2),
    'BCS': ('Baja California Sur', 3),
    'CAMP': ('Campeche', 4),
    'CDMX': ('Ciudad de México', 9),  # DF is now CDMX
    'DF': ('Ciudad de México', 9),     # Legacy code
    'CHIH': ('Chihuahua', 8),
    'CHIS': ('Chiapas', 7),
    'COAH': ('Coahuila', 5),
    'COL': ('Colima', 6),
    'DGO': ('Durango', 10),
    'GRO': ('Guerrero', 12),
    'GTO': ('Guanajuato', 11),
    'HGO': ('Hidalgo', 13),
    'JAL': ('Jalisco', 14),
    'MEX': ('Estado de México', 15),
    'MICH': ('Michoacán', 16),
    'MOR': ('Morelos', 17),
    'NAY': ('Nayarit', 18),
    'NL': ('Nuevo León', 19),
    'OAX': ('Oaxaca', 20),
    'PUE': ('Puebla', 21),
    'QRO': ('Querétaro', 22),
    'QROO': ('Quintana Roo', 23),
    'SLP': ('San Luis Potosí', 24),
    'SIN': ('Sinaloa', 25),
    'SON': ('Sonora', 26),
    'TAB': ('Tabasco', 27),
    'TAMS': ('Tamaulipas', 28),
    'TLAX': ('Tlaxcala', 29),
    'VER': ('Veracruz', 30),
    'YUC': ('Yucatán', 31),
    'ZAC': ('Zacatecas', 32),
}


# ============================================================================
# Sector Mappings - Version 2.0
# Each institution type now has a clear default sector
# ============================================================================

# Maps institution type to default sector (from InstitutionType.default_sector)
TYPE_TO_SECTOR = {
    # Federal Government - Core
    'federal_secretariat': 'gobernacion',
    'federal_agency': 'gobernacion',
    'autonomous_constitutional': 'gobernacion',

    # Split from decentralized - by function
    'social_security': 'salud',
    'state_enterprise_energy': 'energia',
    'state_enterprise_finance': 'hacienda',
    'state_enterprise_infra': 'infraestructura',
    'research_education': 'educacion',
    'social_program': 'trabajo',
    'regulatory_agency': 'gobernacion',

    # State and Local
    'state_government': 'gobernacion',
    'state_agency': 'otros',  # Determined by keywords
    'municipal': 'infraestructura',

    # Branches of Government
    'judicial': 'gobernacion',
    'legislative': 'gobernacion',
    'military': 'defensa',

    # Service Institutions
    'health_institution': 'salud',
    'educational': 'educacion',

    # Fallback
    'other': 'otros',

    # Legacy mappings (for backward compatibility)
    'decentralized': 'otros',
    'autonomous': 'gobernacion',
    'health': 'salud',
}

# Sector codes as used in the database
SECTORS = {
    'salud': 1,
    'educacion': 2,
    'infraestructura': 3,
    'energia': 4,
    'defensa': 5,
    'tecnologia': 6,
    'hacienda': 7,
    'gobernacion': 8,
    'agricultura': 9,
    'ambiente': 10,
    'trabajo': 11,
    'otros': 12,
}


def get_institution_type(type_id: int) -> Optional[InstitutionType]:
    """Get institution type by ID."""
    return INSTITUTION_TYPES.get(type_id)


def get_institution_type_by_code(code: str) -> Optional[InstitutionType]:
    """Get institution type by code."""
    for inst_type in INSTITUTION_TYPES.values():
        if inst_type.code == code:
            return inst_type
    return None


def get_state_info(code: str) -> Optional[tuple[str, int]]:
    """Get state name and ID from code."""
    return MEXICAN_STATES.get(code.upper())


def get_sector_id(sector_code: str) -> int:
    """Get sector ID from code."""
    return SECTORS.get(sector_code, 12)  # Default to 'otros'
