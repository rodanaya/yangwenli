"""
RUBLI Sector Classification Module
===================================
Provides multi-level sector classification for COMPRANET contracts.

Classification Priority:
1. Ramo (Clave Ramo) -> Primary sector
2. Partida (Partida Especifica) -> Sub-sector/Category
3. Institution name patterns -> Fallback
4. Contract keywords -> Last resort

Author: RUBLI Project
Date: 2026-01-05
"""

import re
import unicodedata
from typing import Optional, Tuple, Dict, List
from dataclasses import dataclass

# =============================================================================
# CLASSIFICATION RESULT
# =============================================================================

@dataclass
class ClassificationResult:
    """Result of sector classification."""
    sector_id: Optional[int]
    sub_sector_id: Optional[int]
    category_id: Optional[int]
    confidence: float  # 0.0 to 1.0
    method: str  # 'ramo', 'partida', 'institution', 'keyword', 'default'


# =============================================================================
# RAMO TO SECTOR MAPPING
# =============================================================================

# Maps Clave Ramo (2-digit code) to sector_id
RAMO_TO_SECTOR: Dict[str, int] = {
    # Gobernacion cluster
    "01": 8,   # Poder Legislativo -> gobernacion
    "02": 8,   # Presidencia -> gobernacion
    "03": 8,   # Poder Judicial -> gobernacion
    "04": 8,   # Gobernacion -> gobernacion
    "05": 8,   # Relaciones Exteriores -> gobernacion

    # Hacienda
    "06": 7,   # Hacienda y Credito Publico -> hacienda
    "23": 7,   # Provisiones Salariales -> hacienda
    "24": 7,   # Deuda Publica -> hacienda

    # Defensa
    "07": 5,   # Defensa Nacional -> defensa
    "13": 5,   # Marina -> defensa

    # Agricultura
    "08": 9,   # Agricultura -> agricultura

    # Infraestructura
    "09": 3,   # Comunicaciones y Transportes -> infraestructura
    "15": 3,   # Desarrollo Agrario/Urbano -> infraestructura
    "21": 3,   # Turismo -> infraestructura

    # Economia
    "10": 12,  # Economia -> otros

    # Educacion
    "11": 2,   # Educacion Publica -> educacion
    "25": 2,   # Previsiones Educacion -> educacion
    "48": 2,   # Cultura -> educacion

    # Salud
    "12": 1,   # Salud -> salud
    "50": 1,   # IMSS -> salud
    "51": 1,   # ISSSTE -> salud

    # Trabajo
    "14": 11,  # Trabajo y Prevision Social -> trabajo
    "19": 11,  # Aportaciones Seguridad Social -> trabajo
    "40": 11,  # INFONAVIT -> trabajo

    # Ambiente
    "16": 10,  # Medio Ambiente -> ambiente

    # Seguridad/Procuraduria
    "17": 8,   # Procuraduria -> gobernacion
    "36": 8,   # Seguridad -> gobernacion
    "22": 8,   # INE -> gobernacion
    "27": 8,   # Funcion Publica -> gobernacion
    "35": 8,   # CNDH -> gobernacion
    "43": 8,   # INAI -> gobernacion

    # Energia
    "18": 4,   # Energia -> energia
    "45": 4,   # CRE -> energia
    "46": 4,   # CNH -> energia
    "52": 4,   # PEMEX -> energia
    "53": 4,   # CFE -> energia

    # Tecnologia
    "38": 6,   # CONACYT -> tecnologia
    "42": 6,   # IFT -> tecnologia

    # Otros
    "20": 12,  # Bienestar -> otros
    "41": 12,  # COFECE -> otros
    "44": 12,  # INEGI -> otros
    "47": 12,  # Entidades no sectorizadas -> otros
}


# =============================================================================
# PARTIDA TO CATEGORY MAPPING
# =============================================================================

# Maps Partida patterns to (sector_id, sub_sector_id, category_id)
# Format: partida_prefix -> (sector_id, sub_sector_id, category_id, name)
PARTIDA_MAPPINGS: Dict[str, Tuple[int, Optional[int], Optional[int], str]] = {
    # SALUD (sector 1)
    "253": (1, 2, 1, "Medicamentos"),           # salud_farmaceutica
    "254": (1, 2, 2, "Vacunas"),                # salud_farmaceutica
    "255": (1, 2, 3, "Reactivos"),              # salud_farmaceutica
    "531": (1, 3, 4, "Equipo Medico"),          # salud_equipo_medico
    "532": (1, 3, 5, "Instrumental Medico"),    # salud_equipo_medico

    # TECNOLOGIA (sector 6)
    "339": (6, None, 6, "Servicios TI"),        # tecnologia
    "337": (6, None, 7, "Software"),            # tecnologia
    "515": (6, None, 8, "Equipo Computo"),      # tecnologia

    # INFRAESTRUCTURA (sector 3)
    "611": (3, None, 9, "Construccion"),        # infraestructura
    "614": (3, None, 10, "Carreteras"),         # infraestructura
    "616": (3, None, 11, "Obras Hidraulicas"),  # infraestructura
    "35": (3, None, 12, "Mantenimiento"),       # infraestructura

    # ENERGIA (sector 4)
    "261": (4, None, 13, "Combustibles"),       # energia
    "262": (4, None, 14, "Lubricantes"),        # energia

    # GENERAL (sector 12 - otros)
    "21": (12, None, 15, "Materiales Oficina"),   # otros
    "31": (12, None, 16, "Servicios Basicos"),    # otros
    "32": (12, None, 17, "Arrendamientos"),       # otros
    "33": (12, None, 18, "Servicios Prof"),       # otros
    "541": (12, None, 19, "Vehiculos"),           # otros
}


# =============================================================================
# INSTITUTION PATTERNS
# =============================================================================

# Maps institution name patterns to sector_id
INSTITUTION_PATTERNS: List[Tuple[str, int, str]] = [
    # SALUD (1)
    (r"\bIMSS\b", 1, "IMSS"),
    (r"\bISSSTE\b", 1, "ISSSTE"),
    (r"\bSECRETARIA\s+DE\s+SALUD\b", 1, "SSA"),
    (r"\bINSABI\b", 1, "INSABI"),
    (r"\bINSTITUTO\s+NACIONAL\s+DE\s+.*SALUD\b", 1, "Instituto Salud"),
    (r"\bHOSPITAL\b", 1, "Hospital"),
    (r"\bCLINICA\b", 1, "Clinica"),

    # EDUCACION (2)
    (r"\bSEP\b", 2, "SEP"),
    (r"\bSECRETARIA\s+DE\s+EDUCACION\b", 2, "SEP"),
    (r"\bUNAM\b", 2, "UNAM"),
    (r"\bIPN\b", 2, "IPN"),
    (r"\bUAM\b", 2, "UAM"),
    (r"\bUNIVERSIDAD\b", 2, "Universidad"),
    (r"\bCONACYT\b", 6, "CONACYT"),  # -> tecnologia
    (r"\bTECNOLOGICO\b", 2, "Tecnologico"),

    # INFRAESTRUCTURA (3)
    (r"\bSCT\b", 3, "SCT"),
    (r"\bSECRETARIA\s+DE\s+COMUNICACIONES\b", 3, "SCT"),
    (r"\bCAPUFE\b", 3, "CAPUFE"),
    (r"\bOBRAS\s+PUBLICAS\b", 3, "Obras Publicas"),
    (r"\bCONAGUA\b", 10, "CONAGUA"),  # -> ambiente

    # ENERGIA (4)
    (r"\bPEMEX\b", 4, "PEMEX"),
    (r"\bPETROLEOS\s+MEXICANOS\b", 4, "PEMEX"),
    (r"\bCFE\b", 4, "CFE"),
    (r"\bCOMISION\s+FEDERAL\s+DE\s+ELECTRICIDAD\b", 4, "CFE"),
    (r"\bSENER\b", 4, "SENER"),
    (r"\bSECRETARIA\s+DE\s+ENERGIA\b", 4, "SENER"),

    # DEFENSA (5)
    (r"\bSEDENA\b", 5, "SEDENA"),
    (r"\bDEFENSA\s+NACIONAL\b", 5, "SEDENA"),
    (r"\bSEMAR\b", 5, "SEMAR"),
    (r"\bMARINA\b", 5, "SEMAR"),
    (r"\bEJERCITO\b", 5, "Ejercito"),

    # TECNOLOGIA (6)
    (r"\bINEGI\b", 12, "INEGI"),
    (r"\bINFOTEC\b", 6, "INFOTEC"),

    # HACIENDA (7)
    (r"\bSHCP\b", 7, "SHCP"),
    (r"\bHACIENDA\b", 7, "SHCP"),
    (r"\bSAT\b", 7, "SAT"),
    (r"\bBANXICO\b", 7, "Banxico"),
    (r"\bNAFIN\b", 7, "NAFIN"),
    (r"\bBANOBRAS\b", 7, "Banobras"),

    # GOBERNACION (8)
    (r"\bSEGOB\b", 8, "SEGOB"),
    (r"\bGOBERNACION\b", 8, "SEGOB"),
    (r"\bINE\b", 8, "INE"),
    (r"\bPROCURADURIA\b", 8, "PGR"),
    (r"\bFISCALIA\b", 8, "FGR"),
    (r"\bPOLICIA\b", 8, "Policia"),

    # AGRICULTURA (9)
    (r"\bSAGARPA\b", 9, "SAGARPA"),
    (r"\bAGRICULTURA\b", 9, "SAGARPA"),
    (r"\bCONASEGURO\b", 9, "Agro"),

    # AMBIENTE (10)
    (r"\bSEMARNAT\b", 10, "SEMARNAT"),
    (r"\bMEDIO\s+AMBIENTE\b", 10, "SEMARNAT"),
    (r"\bCONANP\b", 10, "CONANP"),

    # TRABAJO (11)
    (r"\bSTPS\b", 11, "STPS"),
    (r"\bTRABAJO\b", 11, "STPS"),
    (r"\bINFONAVIT\b", 11, "INFONAVIT"),
]


# =============================================================================
# KEYWORD PATTERNS
# =============================================================================

# Maps keywords in contract title/description to sector_id
KEYWORD_PATTERNS: List[Tuple[str, int, str]] = [
    # SALUD (1)
    (r"\bMEDICAMENTO", 1, "Medicamento"),
    (r"\bVACUNA", 1, "Vacuna"),
    (r"\bQUIRURGICO", 1, "Quirurgico"),
    (r"\bHOSPITAL", 1, "Hospital"),
    (r"\bMEDICO", 1, "Medico"),
    (r"\bFARMACEUTICO", 1, "Farmaceutico"),

    # INFRAESTRUCTURA (3)
    (r"\bCONSTRUCCION", 3, "Construccion"),
    (r"\bCAR RETERA", 3, "Carretera"),
    (r"\bPAVIMENT", 3, "Pavimento"),
    (r"\bPUENTE", 3, "Puente"),
    (r"\bEDIFICIO", 3, "Edificio"),

    # ENERGIA (4)
    (r"\bGASOLINA", 4, "Gasolina"),
    (r"\bDIESEL", 4, "Diesel"),
    (r"\bCOMBUSTIBLE", 4, "Combustible"),
    (r"\bELECTRICIDAD", 4, "Electricidad"),

    # TECNOLOGIA (6)
    (r"\bSOFTWARE", 6, "Software"),
    (r"\bSISTEMA\s+INFORMATICO", 6, "Sistema"),
    (r"\bCOMPUTADORA", 6, "Computadora"),
    (r"\bSERVIDOR", 6, "Servidor"),
    (r"\bDESARROLLO\s+DE\s+SISTEMAS", 6, "Desarrollo"),

    # DEFENSA (5)
    (r"\bARMAMENTO", 5, "Armamento"),
    (r"\bMILITAR", 5, "Militar"),
    (r"\bBALISTIC", 5, "Balistico"),
]


# =============================================================================
# CONTRACT TYPE NORMALIZATION
# =============================================================================

CONTRACT_TYPE_MAP: Dict[str, str] = {
    "ADQUISICIONES": "adquisicion",
    "ADQUISICIONES DE BIENES": "adquisicion",
    "ADQUISICION": "adquisicion",
    "SERVICIOS": "servicio",
    "SERVICIO": "servicio",
    "SERVICIOS RELACIONADOS CON LA OBRA PUBLICA": "servicio_obra",
    "OBRA PUBLICA": "obra_publica",
    "OBRA PUBLICA Y SERVICIOS": "obra_publica",
    "OBRAS PUBLICAS": "obra_publica",
    "ARRENDAMIENTOS": "arrendamiento",
    "ARRENDAMIENTO": "arrendamiento",
}

PROCEDURE_TYPE_MAP: Dict[str, str] = {
    "ADJUDICACION DIRECTA": "directa",
    "ADJUDICACIÓN DIRECTA": "directa",
    "ADJUDICACION DIRECTA FEDERAL": "directa",
    "AD": "directa",
    "LICITACION PUBLICA": "licitacion",
    "LICITACIÓN PÚBLICA": "licitacion",
    "LICITACION PUBLICA NACIONAL": "licitacion_nacional",
    "LICITACION PUBLICA INTERNACIONAL": "licitacion_internacional",
    "LP": "licitacion",
    "INVITACION A CUANDO MENOS 3 PERSONAS": "invitacion",
    "INVITACIÓN A CUANDO MENOS TRES PERSONAS": "invitacion",
    "INVITACION A CUANDO MENOS TRES PERSONAS": "invitacion",
    "I3P": "invitacion",
}


# =============================================================================
# NORMALIZATION UTILITIES
# =============================================================================

def normalize_text(text: str) -> str:
    """
    Normalize text for matching.
    - Uppercase
    - Remove accents
    - Remove extra whitespace
    """
    if not text:
        return ""

    # Uppercase
    text = text.upper()

    # Remove accents
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')

    # Normalize whitespace
    text = ' '.join(text.split())

    return text


def normalize_vendor_name(name: str) -> str:
    """
    Normalize vendor name for deduplication.
    - Uppercase + remove accents
    - Normalize legal suffixes (SA DE CV -> SADECV)
    - Remove punctuation
    """
    if not name:
        return ""

    name = normalize_text(name)

    # Normalize legal suffixes
    suffixes = [
        (r"\bS\.?\s*A\.?\s*DE\s*C\.?\s*V\.?\b", "SADECV"),
        (r"\bS\.?\s*DE\s*R\.?\s*L\.?\s*DE\s*C\.?\s*V\.?\b", "SDERLDECV"),
        (r"\bS\.?\s*DE\s*R\.?\s*L\.?\b", "SDERL"),
        (r"\bS\.?\s*C\.?\b", "SC"),
        (r"\bA\.?\s*C\.?\b", "AC"),
        (r"\bSOFOM\b", "SOFOM"),
        (r"\bSAPI\s*DE\s*CV\b", "SAPIDECV"),
    ]

    for pattern, replacement in suffixes:
        name = re.sub(pattern, replacement, name)

    # Remove punctuation
    name = re.sub(r'[^\w\s]', '', name)

    # Normalize whitespace
    name = ' '.join(name.split())

    return name


def normalize_contract_type(contract_type: str) -> str:
    """Normalize contract type to standard values."""
    if not contract_type:
        return "otro"

    normalized = normalize_text(contract_type)
    return CONTRACT_TYPE_MAP.get(normalized, "otro")


def normalize_procedure_type(procedure_type: str) -> Tuple[str, bool]:
    """
    Normalize procedure type and detect direct awards.
    Returns: (normalized_type, is_direct_award)
    """
    if not procedure_type:
        return ("desconocido", False)

    normalized = normalize_text(procedure_type)

    # Check for direct award
    is_direct = "DIRECTA" in normalized or "ADJUDICACION" in normalized

    # Map to normalized type
    mapped = PROCEDURE_TYPE_MAP.get(normalized)
    if mapped:
        return (mapped, is_direct)

    # Partial matching
    if "DIRECTA" in normalized:
        return ("directa", True)
    if "LICITACION" in normalized:
        if "INTERNACIONAL" in normalized:
            return ("licitacion_internacional", False)
        return ("licitacion", False)
    if "INVITACION" in normalized:
        return ("invitacion", False)

    return ("otro", is_direct)


# =============================================================================
# CLASSIFICATION FUNCTIONS
# =============================================================================

def classify_by_ramo(clave_ramo: str) -> Optional[int]:
    """
    Classify by government branch code.
    Priority: 1 (highest confidence)
    """
    if not clave_ramo:
        return None

    # Normalize to 2-digit string
    clave = str(clave_ramo).strip().zfill(2)

    return RAMO_TO_SECTOR.get(clave)


def classify_by_partida(partida: str, current_sector: Optional[int] = None) -> Tuple[Optional[int], Optional[int], Optional[int]]:
    """
    Classify by budget line item (Partida Especifica).
    Returns: (sector_id, sub_sector_id, category_id)
    Priority: 2
    """
    if not partida:
        return (None, None, None)

    partida = str(partida).strip()

    # Try progressively shorter prefixes
    for prefix_len in [5, 4, 3, 2]:
        prefix = partida[:prefix_len]
        if prefix in PARTIDA_MAPPINGS:
            sector_id, sub_sector_id, category_id, _ = PARTIDA_MAPPINGS[prefix]

            # If we already have a sector from ramo, only use partida for sub-sector/category
            if current_sector and sector_id != current_sector:
                # Cross-cutting category - keep original sector but use partida category
                return (current_sector, sub_sector_id, category_id)

            return (sector_id, sub_sector_id, category_id)

    return (None, None, None)


def classify_by_institution(institution_name: str) -> Tuple[Optional[int], str]:
    """
    Classify by institution name patterns.
    Returns: (sector_id, matched_pattern)
    Priority: 3
    """
    if not institution_name:
        return (None, "")

    normalized = normalize_text(institution_name)

    for pattern, sector_id, name in INSTITUTION_PATTERNS:
        if re.search(pattern, normalized):
            return (sector_id, name)

    return (None, "")


def classify_by_keywords(text: str) -> Tuple[Optional[int], str]:
    """
    Classify by keywords in contract title/description.
    Returns: (sector_id, matched_keyword)
    Priority: 4 (lowest)
    """
    if not text:
        return (None, "")

    normalized = normalize_text(text)

    for pattern, sector_id, name in KEYWORD_PATTERNS:
        if re.search(pattern, normalized):
            return (sector_id, name)

    return (None, "")


def classify_contract(
    clave_ramo: Optional[str] = None,
    descripcion_ramo: Optional[str] = None,
    partida_especifica: Optional[str] = None,
    institution_name: Optional[str] = None,
    contract_title: Optional[str] = None,
    contract_description: Optional[str] = None
) -> ClassificationResult:
    """
    Main classification function using multi-level priority.

    Args:
        clave_ramo: 2-digit government branch code
        descripcion_ramo: Full branch description
        partida_especifica: 5-digit budget line item
        institution_name: Name of contracting institution
        contract_title: Contract title
        contract_description: Contract description

    Returns:
        ClassificationResult with sector_id, sub_sector_id, category_id
    """

    sector_id = None
    sub_sector_id = None
    category_id = None
    confidence = 0.0
    method = "default"

    # Priority 1: Ramo classification
    sector_id = classify_by_ramo(clave_ramo)
    if sector_id:
        confidence = 0.95
        method = "ramo"

    # Priority 2: Partida classification (refines sector or provides sub-sector)
    partida_sector, partida_sub, partida_cat = classify_by_partida(
        partida_especifica, sector_id
    )
    if partida_sector:
        if not sector_id:
            sector_id = partida_sector
            confidence = 0.85
            method = "partida"
        sub_sector_id = partida_sub
        category_id = partida_cat

    # Priority 3: Institution name
    if not sector_id:
        inst_sector, _ = classify_by_institution(institution_name)
        if inst_sector:
            sector_id = inst_sector
            confidence = 0.75
            method = "institution"

    # Priority 4: Keywords
    if not sector_id:
        combined_text = f"{contract_title or ''} {contract_description or ''}"
        kw_sector, _ = classify_by_keywords(combined_text)
        if kw_sector:
            sector_id = kw_sector
            confidence = 0.60
            method = "keyword"

    # Default to "otros" (sector 12)
    if not sector_id:
        sector_id = 12  # otros
        confidence = 0.30
        method = "default"

    return ClassificationResult(
        sector_id=sector_id,
        sub_sector_id=sub_sector_id,
        category_id=category_id,
        confidence=confidence,
        method=method
    )


# =============================================================================
# TESTING
# =============================================================================

def test_classification():
    """Test classification with sample data."""
    print("Testing sector classification...")

    test_cases = [
        # (clave_ramo, partida, institution, title, expected_sector)
        ("12", "25301", "IMSS", "Adquisicion de medicamentos", "salud"),
        ("11", None, "SEP", "Construccion de escuelas", "educacion"),
        ("18", "26101", "PEMEX", "Combustible diesel", "energia"),
        ("07", None, "SEDENA", "Equipo militar", "defensa"),
        (None, "339xx", None, "Desarrollo de software", "tecnologia"),
        (None, None, "CFE", "Transformadores electricos", "energia"),
        ("09", "61401", "SCT", "Construccion de carretera", "infraestructura"),
    ]

    sector_names = {
        1: "salud", 2: "educacion", 3: "infraestructura", 4: "energia",
        5: "defensa", 6: "tecnologia", 7: "hacienda", 8: "gobernacion",
        9: "agricultura", 10: "ambiente", 11: "trabajo", 12: "otros"
    }

    for ramo, partida, inst, title, expected in test_cases:
        result = classify_contract(
            clave_ramo=ramo,
            partida_especifica=partida,
            institution_name=inst,
            contract_title=title
        )
        actual = sector_names.get(result.sector_id, "unknown")
        status = "PASS" if actual == expected else "FAIL"
        print(f"  [{status}] Ramo={ramo}, Partida={partida}, Inst={inst}")
        print(f"         Expected: {expected}, Got: {actual} (method: {result.method})")


if __name__ == '__main__':
    test_classification()
