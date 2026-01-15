"""
HYPERION-ATLAS Rules: Rule-Based Institution Classifier

Implements a priority-ordered rule-based classifier for Mexican
government institutions. Rules are applied in order, with earlier
matches taking precedence.

Version 2.0 (January 2026): Updated to use new 18-type taxonomy
that splits "decentralized" into functional categories.

4-Tier Classification:
0. Mega-entities (100% confidence) - IMSS, CFE, PEMEX with high volume
1. Known entities (100% confidence) - Specific institution patterns
2. Keyword patterns (85-95% confidence) - HOSPITAL, UNIVERSIDAD, etc.
3. Fallback rules (70-80% confidence) - State prefix patterns, etc.
"""

import re
from dataclasses import dataclass
from typing import Optional
from unidecode import unidecode
from .taxonomy import (
    INSTITUTION_TYPES, MEXICAN_STATES, SECTORS, SIZE_TIERS, AUTONOMY_LEVELS,
    get_institution_type_by_code, get_sector_id, get_size_tier, get_default_autonomy
)


@dataclass
class ClassificationResult:
    """Result of institution classification."""
    institution_type: str
    institution_type_id: int
    sector: str
    sector_id: int
    confidence: float
    matched_rule: str
    state_code: Optional[str] = None
    geographic_scope: str = 'federal'


class AtlasRuleClassifier:
    """
    Rule-based institution classifier for Mexican government entities.

    Applies rules in priority order to classify institutions by type
    and sector. Designed for the COMPRANET procurement database.

    Example:
        >>> classifier = AtlasRuleClassifier()
        >>> result = classifier.classify("INSTITUTO MEXICANO DEL SEGURO SOCIAL")
        >>> result.sector
        'salud'
        >>> result.confidence
        1.0
    """

    # ========================================================================
    # TIER 0: MEGA-ENTITIES (100% confidence, size_tier=mega)
    # High-volume institutions that warrant immediate identification.
    # These should be matched FIRST due to their enormous contract volumes.
    # ========================================================================

    MEGA_ENTITIES = [
        # Social Security (673K+ contracts for IMSS alone)
        (r'INSTITUTO MEXICANO DEL SEGURO SOCIAL|^IMSS\b', 'social_security', 'salud', 1.0, 'mega'),
        (r'INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES.*TRABAJADORES.*ESTADO|^ISSSTE\b', 'social_security', 'salud', 1.0, 'mega'),

        # State Energy Enterprises (206K+ contracts for CFE)
        (r'COMISION FEDERAL DE ELECTRICIDAD|^CFE\b|CFE DISTRIBUCION|CFE SUMINISTRADOR|CFE TRANSMISION|CFE GENERACION', 'state_enterprise_energy', 'energia', 1.0, 'mega'),
        (r'PETROLEOS MEXICANOS|^PEMEX\b|PEMEX EXPLORACION|PEMEX REFINACION|PEMEX GAS|PEMEX PETROQUIMICA', 'state_enterprise_energy', 'energia', 1.0, 'large'),

        # Social Programs (306K+ contracts for DICONSA)
        (r'^DICONSA\b|DICONSA.*S\.?A', 'social_program', 'agricultura', 1.0, 'mega'),
        (r'^LICONSA\b|LICONSA.*S\.?A', 'social_program', 'agricultura', 1.0, 'large'),
        (r'SEGURIDAD ALIMENTARIA MEXICANA', 'social_program', 'agricultura', 1.0, 'large'),
    ]

    # ========================================================================
    # TIER 1: Known Entities (100% confidence)
    # These are specific institutions with exact or near-exact name matches.
    # Updated to use new 18-type taxonomy codes.
    # ========================================================================

    KNOWN_ENTITIES = [
        # Tax and finance - Federal Agencies
        (r'SERVICIO DE ADMINISTRACION TRIBUTARIA|^SAT\b', 'federal_agency', 'hacienda', 1.0),

        # Autonomous Constitutional Bodies
        (r'BANCO DE MEXICO|^BANXICO\b', 'autonomous_constitutional', 'hacienda', 1.0),
        (r'INSTITUTO NACIONAL ELECTORAL|^INE\b', 'autonomous_constitutional', 'gobernacion', 1.0),
        (r'INSTITUTO FEDERAL ELECTORAL|^IFE\b', 'autonomous_constitutional', 'gobernacion', 1.0),  # Historical
        (r'INSTITUTO NACIONAL DE TRANSPARENCIA|^INAI\b', 'autonomous_constitutional', 'gobernacion', 1.0),
        (r'COMISION NACIONAL DE LOS DERECHOS HUMANOS|^CNDH\b', 'autonomous_constitutional', 'gobernacion', 1.0),

        # Research & Education - Major autonomous universities
        (r'UNIVERSIDAD NACIONAL AUTONOMA DE MEXICO|^UNAM\b', 'research_education', 'educacion', 1.0),
        (r'INSTITUTO POLITECNICO NACIONAL|^IPN\b', 'research_education', 'educacion', 1.0),

        # State Finance Enterprises
        (r'NACIONAL FINANCIERA|^NAFIN\b', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'BANCO DEL AHORRO NACIONAL|^BANSEFI\b', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'BANCO NACIONAL DE OBRAS|^BANOBRAS\b', 'state_enterprise_finance', 'hacienda', 1.0),

        # State Infrastructure Enterprises
        (r'CAMINOS Y PUENTES FEDERALES|^CAPUFE\b', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'AEROPUERTOS Y SERVICIOS AUXILIARES|^ASA\b', 'state_enterprise_infra', 'infraestructura', 1.0),

        # Federal Agencies - Environment/Water
        (r'COMISION NACIONAL DEL AGUA|^CONAGUA\b', 'federal_agency', 'ambiente', 1.0),

        # Defense - Federal Secretariats
        (r'SECRETARIA DE LA DEFENSA NACIONAL|^SEDENA\b', 'federal_secretariat', 'defensa', 1.0),
        (r'SECRETARIA DE MARINA|^SEMAR\b', 'federal_secretariat', 'defensa', 1.0),

        # Military
        (r'EJERCITO MEXICANO|EJERCITO NACIONAL', 'military', 'defensa', 1.0),
        (r'ARMADA DE MEXICO', 'military', 'defensa', 1.0),
        (r'GUARDIA NACIONAL', 'military', 'defensa', 1.0),

        # Social Programs
        (r'SISTEMA NACIONAL PARA EL DESARROLLO INTEGRAL.*FAMILIA|^DIF\b', 'social_program', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE LAS PERSONAS ADULTAS MAYORES|^INAPAM\b', 'social_program', 'trabajo', 1.0),
        (r'COMISION NACIONAL DE CULTURA FISICA|^CONADE\b', 'social_program', 'educacion', 1.0),

        # Judicial
        (r'SUPREMA CORTE DE JUSTICIA', 'judicial', 'gobernacion', 1.0),
        (r'CONSEJO DE LA JUDICATURA FEDERAL', 'judicial', 'gobernacion', 1.0),
        (r'TRIBUNAL ELECTORAL DEL PODER JUDICIAL', 'judicial', 'gobernacion', 1.0),
        (r'TRIBUNAL FEDERAL DE JUSTICIA ADMINISTRATIVA', 'judicial', 'gobernacion', 1.0),

        # Legislative
        (r'CAMARA DE DIPUTADOS', 'legislative', 'gobernacion', 1.0),
        (r'SENADO DE LA REPUBLICA', 'legislative', 'gobernacion', 1.0),
        (r'CONGRESO DE LA UNION', 'legislative', 'gobernacion', 1.0),

        # Presidency
        (r'PRESIDENCIA DE LA REPUBLICA', 'federal_secretariat', 'gobernacion', 1.0),

        # Tourism and Economic Development - State Infrastructure Enterprises
        (r'FONDO NACIONAL DE FOMENTO AL TURISMO|^FONATUR\b', 'state_enterprise_infra', 'hacienda', 1.0),
        (r'CONSEJO DE PROMOCION TURISTICA', 'federal_agency', 'hacienda', 0.95),

        # Airports and Transportation - State Infrastructure Enterprises
        (r'GRUPO AEROPORTUARIO|AEROPUERTO INTERNACIONAL', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'AGENCIA REGULADORA DEL TRANSPORTE FERROVIARIO', 'regulatory_agency', 'infraestructura', 1.0),
        (r'FERROCARRIL DEL ISTMO', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'SERVICIO POSTAL MEXICANO|^SEPOMEX\b', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'ADMINISTRACION PORTUARIA|SISTEMA PORTUARIO', 'state_enterprise_infra', 'infraestructura', 1.0),

        # Education and Culture - Research/Education Institutions
        (r'COMISION NACIONAL DE LIBROS DE TEXTO|^CONALITEG\b', 'research_education', 'educacion', 1.0),
        (r'CONSEJO NACIONAL DE FOMENTO EDUCATIVO|^CONAFE\b', 'research_education', 'educacion', 1.0),
        (r'INSTITUTO NACIONAL DE ANTROPOLOGIA E HISTORIA|^INAH\b', 'research_education', 'educacion', 1.0),
        (r'INSTITUTO NACIONAL DE BELLAS ARTES|^INBA\b', 'research_education', 'educacion', 1.0),
        (r'AUTORIDAD EDUCATIVA FEDERAL', 'federal_agency', 'educacion', 1.0),
        (r'IMPRESORA Y ENCUADERNADORA PROGRESO', 'research_education', 'educacion', 0.90),

        # Health Research and Specialty - Health Institutions
        (r'INSTITUTO NACIONAL DE CANCEROLOGIA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE CIENCIAS MEDICAS Y NUTRICION', 'health_institution', 'salud', 1.0),
        (r'LABORATORIOS DE BIOLOGICOS Y REACTIVOS|^BIRMEX\b', 'health_institution', 'salud', 1.0),
        (r'CENTRO NACIONAL PARA LA PREVENCION.*VIH|^CENSIDA\b', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE.*SALUD', 'health_institution', 'salud', 0.95),
        (r'INSTITUTO NACIONAL DE CARDIOLOGIA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE NEUROLOGIA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE PEDIATRIA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE PERINATOLOGIA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE PSIQUIATRIA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE REHABILITACION', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE ENFERMEDADES RESPIRATORIAS', 'health_institution', 'salud', 1.0),
        (r'HOSPITAL GENERAL DE MEXICO', 'health_institution', 'salud', 1.0),
        (r'HOSPITAL INFANTIL DE MEXICO', 'health_institution', 'salud', 1.0),
        (r'HOSPITAL JUAREZ', 'health_institution', 'salud', 1.0),

        # Energy Sector - State Energy Enterprises
        (r'LUZ Y FUERZA DEL CENTRO', 'state_enterprise_energy', 'energia', 1.0),
        (r'INSTITUTO MEXICANO DEL PETROLEO', 'research_education', 'energia', 1.0),
        (r'COMPANIA MEXICANA DE EXPLORACIONES', 'state_enterprise_energy', 'energia', 1.0),
        (r'CENTRO NACIONAL DE CONTROL DEL GAS NATURAL|^CENAGAS\b', 'state_enterprise_energy', 'energia', 1.0),
        (r'CENTRO NACIONAL DE CONTROL DE ENERGIA|^CENACE\b', 'state_enterprise_energy', 'energia', 1.0),

        # Finance and Treasury - State Finance Enterprises and Federal Agencies
        (r'SERVICIO DE ADMINISTRACION Y ENAJENACION DE BIENES|^SAE\b', 'federal_agency', 'hacienda', 1.0),
        (r'BANCO DEL BIENESTAR', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'PRONOSTICOS PARA LA ASISTENCIA PUBLICA', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'LOTERIA NACIONAL', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'INSTITUTO PARA DEVOLVER AL PUEBLO LO ROBADO|^INDEP\b', 'federal_agency', 'hacienda', 1.0),
        (r'FINANCIERA NACIONAL DE DESARROLLO|^FND\b|FINANCIERA RURAL', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'SOCIEDAD HIPOTECARIA FEDERAL|^SHF\b', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'AGROASEMEX', 'state_enterprise_finance', 'hacienda', 1.0),

        # Migration and Government
        (r'INSTITUTO NACIONAL DE MIGRACION|^INM\b', 'federal_agency', 'gobernacion', 1.0),
        (r'INSTITUTO NACIONAL DE ESTADISTICA.*GEOGRAFIA|^INEGI\b', 'autonomous_constitutional', 'gobernacion', 1.0),
        (r'GOBIERNO DEL DISTRITO FEDERAL', 'state_government', 'gobernacion', 0.95),

        # Labor - Social Programs
        (r'INSTITUTO DEL FONDO NACIONAL.*CONSUMO.*TRABAJADORES|^INFONACOT\b|^FONACOT\b', 'social_program', 'trabajo', 1.0),
        (r'INSTITUTO MEXICANO DE LA JUVENTUD|^IMJUVE\b', 'social_program', 'trabajo', 1.0),

        # Environment - Federal Agencies
        (r'COMISION NACIONAL FORESTAL|^CONAFOR\b', 'federal_agency', 'ambiente', 1.0),
        (r'PROCURADURIA FEDERAL DE PROTECCION AL AMBIENTE|^PROFEPA\b', 'federal_agency', 'ambiente', 1.0),
        (r'COMISION NACIONAL DE AREAS NATURALES PROTEGIDAS|^CONANP\b', 'federal_agency', 'ambiente', 1.0),

        # Agriculture - Federal Agencies
        (r'SERVICIO NACIONAL DE SANIDAD.*CALIDAD AGROALIMENTARIA|^SENASICA\b', 'federal_agency', 'agricultura', 1.0),
        (r'INSTITUTO NACIONAL DE PESCA|^INAPESCA\b', 'research_education', 'agricultura', 1.0),
        (r'INSTITUTO NACIONAL DE INVESTIGACIONES FORESTALES.*AGROPECUARIAS|^INIFAP\b', 'research_education', 'agricultura', 1.0),

        # Indigenous Affairs - Social Programs
        (r'INSTITUTO NACIONAL DE LOS PUEBLOS INDIGENAS|^INPI\b|COMISION NACIONAL PARA EL DESARROLLO DE LOS PUEBLOS INDIGENAS|^CDI\b', 'social_program', 'trabajo', 1.0),

        # ========================================================================
        # ADDITIONAL HIGH-PRIORITY PATTERNS (Added per analysis findings)
        # ========================================================================

        # Telecommunications - Autonomous Constitutional and State Enterprises
        (r'INSTITUTO FEDERAL DE TELECOMUNICACIONES|^IFT\b', 'autonomous_constitutional', 'tecnologia', 1.0),
        (r'TELECOMUNICACIONES DE MEXICO|^TELECOMM\b', 'state_enterprise_infra', 'tecnologia', 1.0),

        # Defense (additional) - Social Security and Finance
        (r'INSTITUTO DE SEGURIDAD SOCIAL.*FUERZAS ARMADAS|^ISSFAM\b', 'social_security', 'defensa', 1.0),
        (r'BANCO NACIONAL DEL EJERCITO|^BANJERCITO\b', 'state_enterprise_finance', 'defensa', 1.0),

        # Hacienda - Regulatory Agencies and State Enterprises
        (r'COMISION NACIONAL BANCARIA Y DE VALORES|^CNBV\b', 'regulatory_agency', 'hacienda', 1.0),
        (r'CASA DE MONEDA DE MEXICO', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'COMISION NACIONAL DEL SISTEMA DE AHORRO PARA EL RETIRO|^CONSAR\b', 'regulatory_agency', 'hacienda', 1.0),
        (r'COMISION NACIONAL DE SEGUROS Y FIANZAS|^CNSF\b', 'regulatory_agency', 'hacienda', 1.0),

        # Agriculture/Food - Federal Agencies and Social Programs
        (r'COMISION NACIONAL DE ACUACULTURA Y PESCA|^CONAPESCA\b', 'federal_agency', 'agricultura', 1.0),
        (r'ALIMENTACION PARA EL BIENESTAR', 'social_program', 'agricultura', 1.0),
        (r'APOYOS Y SERVICIOS A LA COMERCIALIZACION AGROPECUARIA|^ASERCA\b', 'federal_agency', 'agricultura', 1.0),

        # Education - Research/Education and Educational Institutions
        (r'INSTITUTO NACIONAL PARA LA EDUCACION DE LOS ADULTOS|^INEA\b', 'research_education', 'educacion', 1.0),
        (r'INSTITUTO NACIONAL DE LA INFRAESTRUCTURA FISICA EDUCATIVA|^INIFED\b', 'federal_agency', 'educacion', 1.0),
        (r'COLEGIO DE ESTUDIOS CIENTIFICOS Y TECNOLOGICOS|^CECyTE', 'educational', 'educacion', 0.90),
        (r'COLEGIO DE EDUCACION PROFESIONAL TECNICA|^CONALEP\b', 'educational', 'educacion', 0.95),
        (r'INSTITUTO TECNOLOGICO SUPERIOR', 'educational', 'educacion', 0.90),

        # Energy - State Enterprises
        (r'EXPORTADORA DE SAL', 'state_enterprise_energy', 'energia', 0.95),

        # State-level water and infrastructure
        (r'SISTEMA DE AGUAS', 'state_agency', 'ambiente', 0.85),
        (r'COMISION.*AGUA.*ESTADO', 'state_agency', 'ambiente', 0.85),
        (r'JUNTA DE CAMINOS', 'state_agency', 'infraestructura', 0.90),
        (r'JUNTA.*AGUA.*SANEAMIENTO', 'state_agency', 'ambiente', 0.85),
        (r'SERVICIOS REGIONALES|SERVICIOS EDUCATIVOS', 'state_agency', 'educacion', 0.85),

        # ========================================================================
        # ADDITIONAL PATTERNS FOR REMAINING "OTROS" (January 2026 analysis)
        # ========================================================================

        # Hacienda - Real Estate and Appraisals
        (r'INSTITUTO DE ADMINISTRACION Y AVALUOS DE BIENES NACIONALES|^INDAABIN\b', 'federal_agency', 'hacienda', 1.0),
        (r'BANCO NACIONAL DE COMERCIO EXTERIOR|^BANCOMEXT\b', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'FIDEICOMISO PARA LA CINETECA NACIONAL', 'research_education', 'hacienda', 0.95),
        (r'FIDEICOMISO DE FOMENTO MINERO|^FIFOMI\b', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'FIDEICOMISO DE RIESGO COMPARTIDO|^FIRCO\b', 'federal_agency', 'agricultura', 1.0),
        (r'COMISION NACIONAL PARA LA PROTECCION.*DEFENSA.*USUARIOS.*SERVICIOS FINANCIEROS|^CONDUSEF\b', 'regulatory_agency', 'hacienda', 1.0),

        # Agriculture - Marketing and Support Agencies
        (r'AGENCIA DE SERVICIOS A LA COMERCIALIZACION|ASERCA', 'federal_agency', 'agricultura', 1.0),
        (r'REGISTRO AGRARIO NACIONAL|^RAN\b', 'federal_agency', 'agricultura', 1.0),
        (r'FONDO DE CAPITALIZACION E INVERSION DEL SECTOR RURAL|^FOCIR\b', 'federal_agency', 'agricultura', 1.0),

        # Environment and Water
        (r'INSTITUTO MEXICANO DE TECNOLOGIA DEL AGUA|^IMTA\b', 'research_education', 'ambiente', 1.0),
        (r'INSTITUTO NACIONAL DE ECOLOGIA Y CAMBIO CLIMATICO|^INECC\b', 'research_education', 'ambiente', 1.0),
        (r'INSTITUTO DE ECOLOGIA|ECOLOGIA.*A\.?\s*C\.?', 'research_education', 'ambiente', 0.90),
        (r'COMISION NACIONAL DE SEGURIDAD NUCLEAR Y SALVAGUARDIAS|^CNSNS\b', 'regulatory_agency', 'ambiente', 1.0),

        # Gobernacion - Broadcasting and Media
        (r'INSTITUTO MEXICANO DE LA RADIO|^IMER\b', 'state_enterprise_infra', 'gobernacion', 1.0),
        (r'SISTEMA PUBLICO DE RADIODIFUSION DEL ESTADO|^SPR\b', 'state_enterprise_infra', 'gobernacion', 1.0),
        (r'TELEVISION METROPOLITANA|^TVMET\b', 'state_enterprise_infra', 'gobernacion', 1.0),
        (r'NOTIMEX.*AGENCIA DE NOTICIAS', 'state_enterprise_infra', 'gobernacion', 1.0),
        (r'TALLERES GRAFICOS DE MEXICO', 'state_enterprise_infra', 'gobernacion', 0.95),

        # Tecnologia and Metrology
        (r'CENTRO NACIONAL DE METROLOGIA|^CENAM\b', 'research_education', 'tecnologia', 1.0),
        (r'CORPORACION MEXICANA DE INVESTIGACION EN MATERIALES|^COMIMSA\b', 'research_education', 'tecnologia', 1.0),

        # Education - Research Centers and Colleges
        (r'EL COLEGIO DE MICHOACAN|COLEGIO DE MICHOACAN', 'educational', 'educacion', 1.0),
        (r'EL COLEGIO DE LA FRONTERA NORTE|COLEGIO DE LA FRONTERA NORTE|^COLEF\b', 'educational', 'educacion', 1.0),
        (r'EL COLEGIO DE LA FRONTERA SUR|COLEGIO DE LA FRONTERA SUR|^ECOSUR\b', 'educational', 'educacion', 1.0),
        (r'EL COLEGIO DE MEXICO|COLEGIO DE MEXICO|^COLMEX\b', 'educational', 'educacion', 1.0),
        (r'EL COLEGIO DE SAN LUIS|COLEGIO DE SAN LUIS', 'educational', 'educacion', 1.0),
        (r'INSTITUTO POTOSINO DE INVESTIGACION CIENTIFICA|^IPICYT\b', 'educational', 'educacion', 1.0),
        (r'CENTRO DE INVESTIGACION CIENTIFICA DE YUCATAN|^CICY\b', 'educational', 'educacion', 1.0),
        (r'CENTRO DE INVESTIGACION EN ALIMENTACION Y DESARROLLO|^CIAD\b', 'educational', 'educacion', 1.0),
        (r'CENTRO DE INVESTIGACION EN MATERIALES AVANZADOS|^CIMAV\b', 'educational', 'educacion', 1.0),
        (r'CENTRO DE INVESTIGACION EN MATEMATICAS|^CIMAT\b', 'educational', 'educacion', 1.0),
        (r'CENTRO DE INVESTIGACION EN QUIMICA APLICADA|^CIQA\b', 'educational', 'educacion', 1.0),

        # Education - Film and Arts
        (r'CENTRO DE CAPACITACION CINEMATOGRAFICA|^CCC\b', 'educational', 'educacion', 1.0),
        (r'INSTITUTO MEXICANO DE CINEMATOGRAFIA|^IMCINE\b', 'research_education', 'educacion', 1.0),
        (r'ESTUDIOS CHURUBUSCO AZTECA', 'state_enterprise_infra', 'educacion', 0.95),
        (r'FIDEICOMISO PARA LA CINETECA|CINETECA NACIONAL', 'research_education', 'educacion', 0.95),
        (r'FONDO DE CULTURA ECONOMICA|^FCE\b', 'research_education', 'educacion', 1.0),
        (r'CONSEJO NACIONAL PARA LA CULTURA Y LAS ARTES|^CONACULTA\b', 'federal_agency', 'educacion', 1.0),

        # Trabajo/Social - Development and Assistance
        (r'INSTITUTO NACIONAL PARA EL DESARROLLO DE CAPACIDADES|^INDESOL\b', 'social_program', 'trabajo', 1.0),
        (r'COORDINACION NACIONAL.*PROSPERA|PROSPERA.*PROGRAMA', 'social_program', 'trabajo', 1.0),
        (r'FONDO NACIONAL PARA EL FOMENTO DE LAS ARTESANIAS|^FONART\b', 'social_program', 'trabajo', 1.0),
        (r'CENTROS DE INTEGRACION JUVENIL|^CIJ\b', 'health_institution', 'salud', 1.0),

        # Salud - Specialized Institutes
        (r'INSTITUTO NACIONAL DE MEDICINA GENOMICA|^INMEGEN\b', 'health_institution', 'salud', 1.0),
        (r'CENTRO NACIONAL DE EQUIDAD DE GENERO Y SALUD REPRODUCTIVA|^CNEGSR\b', 'health_institution', 'salud', 1.0),

        # Gobernacion - Criminal Justice
        (r'INSTITUTO NACIONAL DE CIENCIAS PENALES|^INACIPE\b', 'educational', 'gobernacion', 1.0),

        # ========================================================================
        # PHASE 2.1: HIGH-PRIORITY FEDERAL ENTITIES (January 2026 Grand Expansion)
        # These patterns target specific federal entities still in "otros"
        # ========================================================================

        # Research Institutes
        (r'INSTITUTO NACIONAL DE INVESTIGACIONES NUCLEARES|^ININ\b', 'research_education', 'energia', 1.0),
        (r'INSTITUTO NACIONAL DE ASTROFISICA.*OPTICA.*ELECTRONICA|^INAOE\b', 'research_education', 'educacion', 1.0),
        (r'INSTITUTO.*INVESTIGACIONES.*DR\.?\s*JOSE\s*MARIA\s*LUIS\s*MORA|INSTITUTO MORA', 'research_education', 'educacion', 1.0),
        (r'INSTITUTO DE INVESTIGACIONES ELECTRICAS|^IIE\b', 'research_education', 'energia', 1.0),

        # Regulatory Bodies
        (r'INSTITUTO MEXICANO DE LA PROPIEDAD INDUSTRIAL|^IMPI\b', 'regulatory_agency', 'hacienda', 1.0),
        (r'COMISION FEDERAL DE COMPETENCIA ECONOMICA|^COFECE\b', 'autonomous_constitutional', 'hacienda', 1.0),
        (r'INSTITUTO PARA LA PROTECCION AL AHORRO BANCARIO|^IPAB\b', 'regulatory_agency', 'hacienda', 1.0),
        (r'COMISION REGULADORA DE ENERGIA|^CRE\b', 'regulatory_agency', 'energia', 1.0),
        (r'COMISION NACIONAL DE HIDROCARBUROS|^CNH\b', 'regulatory_agency', 'energia', 1.0),
        (r'COMISION EJECUTIVA DE ATENCION A VICTIMAS|^CEAV\b', 'federal_agency', 'gobernacion', 1.0),

        # Aviation and Security Services
        (r'SERVICIOS A LA NAVEGACION EN EL ESPACIO AEREO MEXICANO|^SENEAM\b', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'SERVICIO DE PROTECCION FEDERAL|^SPF\b', 'federal_agency', 'gobernacion', 1.0),
        (r'ORGANO.*ADMINISTRATIVO.*PREVENCION.*READAPTACION.*SOCIAL|PREVENCION Y READAPTACION SOCIAL', 'federal_agency', 'gobernacion', 1.0),
        (r'POLICIA FEDERAL|POLICIA FEDERAL PREVENTIVA|^PFP\b', 'federal_agency', 'gobernacion', 1.0),

        # Social Programs and Women's Affairs
        (r'INSTITUTO NACIONAL DE LAS MUJERES|^INMUJERES\b', 'social_program', 'trabajo', 1.0),
        (r'CONSEJO NACIONAL PARA PREVENIR LA DISCRIMINACION|^CONAPRED\b', 'social_program', 'trabajo', 1.0),
        (r'COORDINACION NACIONAL DE BECAS.*BIENESTAR|BECAS.*BENITO JUAREZ', 'social_program', 'trabajo', 1.0),
        (r'COORDINACION NACIONAL DE PROSPERA|PROSPERA.*PROGRAMA', 'social_program', 'trabajo', 1.0),

        # Health Support Services
        (r'CENTRO NACIONAL DE PROGRAMAS PREVENTIVOS.*CONTROL.*ENFERMEDADES|^CENAPRECE\b', 'health_institution', 'salud', 1.0),
        (r'SERVICIOS DE ATENCION PSIQUIATRICA', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO NACIONAL DE GERIATRIA', 'health_institution', 'salud', 1.0),
        (r'CENTRO NACIONAL DE LA TRANSFUSION SANGUINEA', 'health_institution', 'salud', 1.0),
        (r'COMISION NACIONAL DE ARBITRAJE MEDICO|^CONAMED\b', 'regulatory_agency', 'salud', 1.0),

        # Agriculture - Specialized Agencies
        (r'PRODUCTORA NACIONAL DE BIOLOGICOS VETERINARIOS|^PRONABIVE\b', 'federal_agency', 'agricultura', 1.0),
        (r'SERVICIO NACIONAL DE INSPECCION.*CERTIFICACION DE SEMILLAS|^SNICS\b', 'federal_agency', 'agricultura', 1.0),
        (r'INSTITUTO NACIONAL DE SUELO SUSTENTABLE|^INSUS\b', 'federal_agency', 'agricultura', 1.0),

        # Technology Research Centers
        (r'CIATEC.*CENTRO DE INNOVACION|CENTRO DE INNOVACION APLICADA EN TECNOLOGIAS', 'educational', 'tecnologia', 1.0),
        (r'CIATEQ.*CENTRO DE TECNOLOGIA AVANZADA|CENTRO DE TECNOLOGIA AVANZADA', 'educational', 'tecnologia', 1.0),
        (r'CENTRO DE INGENIERIA Y DESARROLLO INDUSTRIAL|^CIDESI\b', 'educational', 'tecnologia', 1.0),
        (r'CENTRO DE INVESTIGACION Y ASISTENCIA EN TECNOLOGIA|^CIQA\b', 'educational', 'tecnologia', 1.0),

        # Trade and Customs
        (r'AGENCIA NACIONAL DE ADUANAS DE MEXICO|ANAM|ADUANAS DE MEXICO', 'federal_agency', 'hacienda', 1.0),
        (r'PROMEXICO|PROMOCION DE MEXICO', 'federal_agency', 'hacienda', 1.0),

        # Energy Efficiency and Zones
        (r'COMISION NACIONAL PARA EL USO EFICIENTE DE LA ENERGIA|^CONUEE\b', 'federal_agency', 'energia', 1.0),
        (r'COMISION NACIONAL DE LAS ZONAS ARIDAS|^CONAZA\b', 'federal_agency', 'agricultura', 1.0),

        # Technical Education
        (r'CENTRO DE ENSENANZA TECNICA INDUSTRIAL|^CETI\b', 'educational', 'educacion', 1.0),
        (r'CENTRO DE ACTUALIZACION DEL MAGISTERIO', 'educational', 'educacion', 0.90),

        # ========================================================================
        # PHASE 2.1b: ADDITIONAL HIGH-PRIORITY (discovered from remaining otros)
        # ========================================================================

        # Information Access (historical IFAI -> INAI)
        (r'INSTITUTO FEDERAL DE ACCESO A LA INFORMACION|^IFAI\b', 'autonomous_constitutional', 'gobernacion', 1.0),

        # Indigenous and Cultural
        (r'INSTITUTO NACIONAL DE LENGUAS INDIGENAS|^INALI\b', 'research_education', 'educacion', 1.0),
        (r'EDUCAL.*S\.?A\.?|LIBRERIA.*EDUCAL', 'research_education', 'educacion', 0.95),

        # Financial Programs
        (r'FINANCIERA PARA EL BIENESTAR|FINANCIERA NACIONAL.*BIENESTAR', 'state_enterprise_finance', 'hacienda', 1.0),
        (r'FIDEICOMISO FONDO NACIONAL DE HABITACIONES POPULARES|^FONHAPO\b', 'state_enterprise_infra', 'infraestructura', 1.0),

        # Education Evaluation
        (r'INSTITUTO NACIONAL PARA LA EVALUACION DE LA EDUCACION|^INEE\b', 'autonomous_constitutional', 'educacion', 1.0),

        # PEMEX Subsidiaries
        (r'PETROQUIMICA CANGREJERA', 'state_enterprise_energy', 'energia', 1.0),
        (r'PEMEX TRANSFORMACION INDUSTRIAL', 'state_enterprise_energy', 'energia', 1.0),

        # Agriculture Colleges
        (r'COLEGIO SUPERIOR AGROPECUARIO|UNIVERSIDAD AUTONOMA.*AGRARIA', 'educational', 'agricultura', 0.95),

        # Health - Addictions
        (r'COMISION NACIONAL CONTRA LAS ADICCIONES|^CONADIC\b', 'federal_agency', 'salud', 1.0),

        # Labor Protection
        (r'COMITE NACIONAL MIXTO DE PROTECCION AL SALARIO|^CONAMPROS\b', 'federal_agency', 'trabajo', 1.0),
        (r'COMISION NACIONAL DE LOS SALARIOS MINIMOS|^CONASAMI\b', 'federal_agency', 'trabajo', 1.0),

        # Social Programs (historical)
        (r'COORDINACION NACIONAL.*PROGRAMA.*DESARROLLO HUMANO OPORTUNIDADES', 'federal_agency', 'trabajo', 1.0),

        # Intelligence
        (r'CENTRO NACIONAL DE INTELIGENCIA|^CNI\b', 'federal_agency', 'gobernacion', 1.0),
        (r'CENTRO DE INVESTIGACION Y SEGURIDAD NACIONAL|^CISEN\b', 'federal_agency', 'gobernacion', 1.0),

        # State Women's Institutes
        (r'SECRETARIA DE LAS MUJERES', 'state_agency', 'trabajo', 0.90),
        (r'INSTITUTO ESTATAL DE LAS MUJERES', 'state_agency', 'trabajo', 0.90),

        # ========================================================================
        # PHASE 2.2: JANUARY 2026 - COMPREHENSIVE 721 UNCLASSIFIED CLEANUP
        # Patterns derived from analysis of institutions with DEFAULT:NO_MATCH
        # ========================================================================

        # BROADCASTING/MEDIA (22,876+ contracts combined)
        (r'XE-?IPN.*CANAL\s*11|XEIPN\s*TV|CANAL\s*11', 'state_enterprise_infra', 'gobernacion', 1.0),
        (r'RADIO EDUCACION|RADIODIFUSORA', 'state_enterprise_infra', 'educacion', 0.95),

        # ENERGY - Instituto Nacional de Electricidad y Energías Limpias (5,936 contracts)
        (r'INSTITUTO NACIONAL DE ELECTRICIDAD Y ENERG[IÍ]AS LIMPIAS|^INEEL\b', 'research_education', 'energia', 1.0),

        # ENERGY - PEMEX Subsidiaries and Trading (1,000+ contracts combined)
        (r'PETROQU[IÍ]MICA MORELOS', 'state_enterprise_energy', 'energia', 1.0),
        (r'PETROQU[IÍ]MICA ESCOL[IÍ]N', 'state_enterprise_energy', 'energia', 1.0),
        (r'PETROQU[IÍ]MICA PAJARITOS', 'state_enterprise_energy', 'energia', 1.0),
        (r'PETROQU[IÍ]MICA COSOLEACAQUE', 'state_enterprise_energy', 'energia', 1.0),
        (r'PETROQU[IÍ]MICA TULA', 'state_enterprise_energy', 'energia', 1.0),
        (r'PETROQU[IÍ]MICA.*S\.?\s*A\.?\s*DE\s*C\.?\s*V', 'state_enterprise_energy', 'energia', 0.95),
        (r'P\.?M\.?I\.?\s*COMERCIO INTERNACIONAL', 'state_enterprise_energy', 'energia', 1.0),

        # GEOLOGY/MINING (4,490+ contracts)
        (r'SERVICIO GEOL[OÓ]GICO MEXICANO|^SGM\b', 'federal_agency', 'energia', 1.0),
        (r'CONSEJO DE RECURSOS MINERALES', 'federal_agency', 'energia', 0.95),

        # ANTI-CORRUPTION (4,386 contracts)
        (r'SECRETAR[IÍ]A ANTICORRUPCI[OÓ]N|ANTICORRUPCION Y BUEN GOBIERNO', 'federal_agency', 'gobernacion', 1.0),
        (r'SECRETAR[IÍ]A DE LA FUNCI[OÓ]N P[UÚ]BLICA.*ESTADO', 'state_agency', 'gobernacion', 0.90),

        # HEALTH - COFEPRIS (1,824 contracts) - CRITICAL MISSING
        (r'COMISI[OÓ]N FEDERAL PARA LA PROTECCI[OÓ]N CONTRA RIESGOS SANITARIOS|^COFEPRIS\b', 'regulatory_agency', 'salud', 1.0),

        # HEALTH - Regional/Specialty Centers (2,500+ contracts)
        (r'CENTRO REGIONAL DE ALTA ESPECIALIDAD', 'health_institution', 'salud', 0.95),
        (r'CENTRO NACIONAL DE REHABILITACI[OÓ]N', 'health_institution', 'salud', 1.0),
        (r'COMISI[OÓ]N NACIONAL DE SALUD MENTAL Y ADICCIONES', 'federal_agency', 'salud', 1.0),
        (r'COMISI[OÓ]N NACIONAL DE PROTECCI[OÓ]N SOCIAL EN SALUD', 'federal_agency', 'salud', 1.0),
        (r'CENTRO NACIONAL DE EXCELENCIA TECNOL[OÓ]GICA EN SALUD|^CENETEC\b', 'health_institution', 'salud', 1.0),
        (r'INSTITUTO MATERNO INFANTIL', 'health_institution', 'salud', 0.90),

        # EDUCATION - IPN Related (2,473 contracts)
        (r'COMISI[OÓ]N DE OPERACI[OÓ]N Y FOMENTO DE ACTIVIDADES ACAD[EÉ]MICAS.*IPN|^COFAA\b', 'research_education', 'educacion', 1.0),
        (r'TECNOL[OÓ]GICO NACIONAL DE M[EÉ]XICO|^TECNM\b', 'research_education', 'educacion', 1.0),
        (r'COMISI[OÓ]N NACIONAL PARA LA MEJORA CONTINUA DE LA EDUCACI[OÓ]N|^MEJOREDU\b', 'autonomous_constitutional', 'educacion', 1.0),
        (r'SISTEMA DE EDUCACI[OÓ]N P[UÚ]BLICA.*ESTADO|SISTEMA EDUCATIVO.*ESTADO', 'state_agency', 'educacion', 0.90),

        # SOCIAL DEVELOPMENT - CONEVAL (1,199 contracts) - CRITICAL MISSING
        (r'CONSEJO NACIONAL DE EVALUACI[OÓ]N DE LA POL[IÍ]TICA DE DESARROLLO SOCIAL|^CONEVAL\b', 'autonomous_constitutional', 'trabajo', 1.0),

        # SOCIAL DEVELOPMENT - INAES (824 contracts)
        (r'INSTITUTO NACIONAL DE LA ECONOM[IÍ]A SOCIAL|^INAES\b', 'social_program', 'trabajo', 1.0),
        (r'INSTITUTO NACIONAL DE DESARROLLO SOCIAL|^INDESOL\b', 'social_program', 'trabajo', 1.0),
        (r'CONSEJO NACIONAL PARA EL DESARROLLO Y LA INCLUSI[OÓ]N.*PERSONAS CON DISCAPACIDAD|^CONADIS\b', 'social_program', 'trabajo', 1.0),

        # CULTURE/TOURISM (3,500+ contracts)
        (r'COMPA[NÑ][IÍ]A OPERADORA DEL CENTRO CULTURAL.*TIJUANA|^CECUT\b', 'research_education', 'educacion', 1.0),
        (r'ARCHIVO GENERAL DE LA NACI[OÓ]N|^AGN\b', 'federal_agency', 'gobernacion', 1.0),

        # AGRICULTURE - Land and Rural Development (1,000+ contracts)
        (r'FIDEICOMISO FONDO NACIONAL DE FOMENTO EJIDAL|^FIFONAFE\b', 'federal_agency', 'agricultura', 1.0),
        (r'COMIT[EÉ] NACIONAL PARA EL DESARROLLO SUSTENTABLE.*CA[NÑ]A DE AZ[UÚ]CAR|^CONADESUCA\b', 'federal_agency', 'agricultura', 1.0),
        (r'INSTITUTO MEXICANO DE INVESTIGACI[OÓ]N EN PESCA Y ACUACULTURA|^IMIPAS\b', 'research_education', 'agricultura', 1.0),
        (r'COMISI[OÓ]N PARA LA REGULARIZACI[OÓ]N DE LA TENENCIA DE LA TIERRA|^CORETT\b', 'federal_agency', 'agricultura', 1.0),

        # INFRASTRUCTURE MEGAPROJECTS (300+ contracts)
        (r'TREN MAYA.*S\.?\s*A\.?\s*DE\s*C\.?\s*V', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'CORREDOR INTEROCE[AÁ]NICO.*ISTMO.*TEHUANTEPEC', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'AUTORIDAD FEDERAL PARA EL DESARROLLO.*ZONAS ECON[OÓ]MICAS ESPECIALES', 'federal_agency', 'infraestructura', 1.0),

        # TELECOMMUNICATIONS (440+ contracts)
        (r'ORGANISMO PROMOTOR DE INVERSIONES EN TELECOMUNICACIONES|^PROMTEL\b', 'state_enterprise_infra', 'tecnologia', 1.0),
        (r'COMISI[OÓ]N FEDERAL DE TELECOMUNICACIONES|^COFETEL\b', 'autonomous_constitutional', 'tecnologia', 1.0),

        # SPACE (189 contracts)
        (r'AGENCIA ESPACIAL MEXICANA|^AEM\b', 'federal_agency', 'tecnologia', 1.0),

        # ISSSTE Related (541 contracts)
        (r'SISTEMA INTEGRAL DE TIENDAS Y FARMACIAS.*ISSSTE|SUPERISSSTE', 'social_security', 'salud', 1.0),

        # DEFENSE/TRAINING (447 contracts)
        (r'FIDEICOMISO DE FORMACI[OÓ]N Y CAPACITACI[OÓ]N.*PERSONAL DE LA MARINA', 'military', 'defensa', 1.0),

        # ENTREPRENEURSHIP/ECONOMY (261 contracts)
        (r'INSTITUTO NACIONAL DEL EMPRENDEDOR|^INADEM\b', 'federal_agency', 'hacienda', 1.0),

        # INFORMATION/DOCUMENTATION (167 contracts)
        (r'FONDO DE INFORMACI[OÓ]N Y DOCUMENTACI[OÓ]N PARA LA INDUSTRIA|^INFOTEC\b', 'research_education', 'tecnologia', 1.0),

        # RESEARCH CENTERS (additional)
        (r'^CIATEQ\b|CIATEQ.*A\.?\s*C\.?', 'educational', 'tecnologia', 1.0),

        # STATE WATER/UTILITIES (1,500+ contracts combined)
        (r'SERVICIOS DE AGUA Y DRENAJE DE MONTERREY|^SADM\b', 'state_agency', 'ambiente', 1.0),
        (r'SISTEMA MUNICIPAL DE AGUAS Y SANEAMIENTO', 'municipal', 'ambiente', 0.90),
        (r'COMISI[OÓ]N ESTATAL DE SERVICIOS P[UÚ]BLICOS', 'state_agency', 'ambiente', 0.90),

        # STATE ROAD/INFRASTRUCTURE (800+ contracts)
        (r'CAMINOS Y AEROPISTAS DE OAXACA', 'state_agency', 'infraestructura', 1.0),
        (r'COMISI[OÓ]N DE CAMINOS.*ESTADO', 'state_agency', 'infraestructura', 0.90),

        # GENERIC SECRETARIATS (need sector classification)
        (r'^SECRETAR[IÍ]A DE EDUCACI[OÓ]N$|^SECRETAR[IÍ]A DE EDUCACI[OÓ]N DEL ESTADO', 'state_agency', 'educacion', 0.90),
        (r'^BIENESTAR$', 'federal_secretariat', 'trabajo', 0.85),
        (r'^CULTURA$', 'federal_secretariat', 'educacion', 0.85),
        (r'^TURISMO$', 'federal_secretariat', 'hacienda', 0.85),
        (r'^GOBERNACI[OÓ]N$', 'federal_secretariat', 'gobernacion', 0.85),
        (r'^DEFENSA NACIONAL$', 'federal_secretariat', 'defensa', 0.85),
        (r'^DESARROLLO AGRARIO.*TERRITORIAL.*URBANO$', 'federal_secretariat', 'agricultura', 0.85),
        (r'^SALUD$', 'federal_secretariat', 'salud', 0.85),
        (r'^SEGURIDAD Y PROTECCI[OÓ]N CIUDADANA$', 'federal_secretariat', 'gobernacion', 0.85),

        # STATE EDUCATIONAL INFRASTRUCTURE (additional specific patterns)
        (r'COMISI[OÓ]N DE INFRAESTRUCTURA EDUCATIVA.*ESTADO', 'state_agency', 'educacion', 0.90),
        (r'INSTITUTO SONORENSE DE INFRAESTRUCTURA EDUCATIVA|^ISIE\b', 'state_agency', 'educacion', 0.95),
        (r'COMIT[EÉ] ADMINISTRADOR.*INFRAESTRUCTURA.*EDUCATIVA', 'state_agency', 'educacion', 0.90),
        (r'COMIT[EÉ] DE INSTALACIONES EDUCATIVAS', 'state_agency', 'educacion', 0.90),
        (r'INSTITUTO.*ESPACIOS EDUCATIVOS', 'state_agency', 'educacion', 0.90),
        (r'INSTITUTO HIDALGUENSE DE EDUCACI[OÓ]N', 'state_agency', 'educacion', 0.90),

        # STATE DIF SYSTEMS (specific patterns for remaining)
        (r'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA.*ESTADO|DIF.*ESTADO', 'state_agency', 'salud', 0.90),

        # STATE WOMEN'S INSTITUTES (remaining)
        (r'INSTITUTO HIDALGUENSE DE LAS MUJERES', 'state_agency', 'trabajo', 0.95),

        # INDIGENOUS (historical)
        (r'INSTITUTO NACIONAL INDIGENISTA', 'social_program', 'trabajo', 0.95),

        # MUNICIPALITIES (just city names that appear in data)
        (r'^MATAMOROS$|^REYNOSA$|^CAJEME$|^CENTRO$', 'municipal', 'gobernacion', 0.80),

        # MISCLASSIFIED GENERIC
        (r'^ENTIDADES NO SECTORIZADAS$', 'other', 'otros', 0.50),
        (r'^OFICIAL[IÍ]A MAYOR$', 'state_agency', 'gobernacion', 0.85),
        (r'^SECRETAR[IÍ]A DE GOBIERNO$', 'state_agency', 'gobernacion', 0.90),
        (r'^SECRETAR[IÍ]A DE PLANEACI[OÓ]N.*FINANZAS', 'state_agency', 'hacienda', 0.90),
        (r'^SECRETAR[IÍ]A DE PLANEACI[OÓ]N URBANA.*INFRAESTRUCTURA', 'state_agency', 'infraestructura', 0.90),
        (r'^SECRETAR[IÍ]A DE OBRA P[UÚ]BLICA.*ESTADO', 'state_agency', 'infraestructura', 0.90),
        (r'^SECRETAR[IÍ]A DE AGUA Y OBRA P[UÚ]BLICA', 'state_agency', 'ambiente', 0.90),
        (r'^SECRETAR[IÍ]A DE LA REFORMA AGRARIA$', 'federal_secretariat', 'agricultura', 0.95),

        # COMPETITION/REGULATORY (historical COFECO -> COFECE)
        (r'COMISI[OÓ]N FEDERAL DE COMPETENCIA$|^COFECO\b', 'autonomous_constitutional', 'hacienda', 1.0),

        # HOUSING
        (r'FONDO DE.*GARANT[IÍ]A PARA EL CONSUMO DE LOS TRABAJADORES', 'social_program', 'trabajo', 0.95),

        # Private entities contracted by government (flag as other)
        (r'I\.?I\.?I\.?\s*SERVICIOS.*S\.?\s*A\.?\s*DE\s*C\.?\s*V|INNOVABIENESTAR', 'other', 'otros', 0.70),

        # ========================================================================
        # PHASE 2.3: SECOND PASS - REMAINING UNCLASSIFIED (from analysis)
        # ========================================================================

        # CONACYT/CONAHCYT - Fix matching (1,359+ contracts)
        (r'CONSEJO NACIONAL DE CIENCIA Y TECNOLOG[IÍ]A$', 'federal_agency', 'educacion', 1.0),
        (r'CONSEJO NACIONAL DE HUMANIDADES.*CIENCIAS.*TECNOLOG[IÍ]AS', 'federal_agency', 'educacion', 1.0),

        # State DIF systems with specific state names (1,000+ contracts combined)
        (r'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA EN HIDALGO|DIF HIDALGO', 'state_agency', 'salud', 0.95),
        (r'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA EN QUINTANA ROO', 'state_agency', 'salud', 0.95),
        (r'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA EN NUEVO LE[OÓ]N', 'state_agency', 'salud', 0.95),
        (r'SISTEMA ESTATAL PARA EL DESARROLLO INTEGRAL DE LA FAMILIA', 'state_agency', 'salud', 0.90),

        # Instituto Nacional del Suelo Sustentable (660 contracts)
        (r'INSTITUTO NACIONAL DEL SUELO SUSTENTABLE', 'federal_agency', 'agricultura', 1.0),

        # State Education Systems (471+ contracts)
        (r'SISTEMA DE EDUCACI[OÓ]N P[UÚ]BLICA DE HIDALGO|SISTEMA EDUCATIVO DE HIDALGO', 'state_agency', 'educacion', 0.95),
        (r'UNIDAD DE SERVICIOS PARA LA EDUCACI[OÓ]N B[AÁ]SICA', 'state_agency', 'educacion', 0.90),

        # Agricultural Education (188 contracts)
        (r'COLEGIO DE POSGRADUADOS|COLEGIO DE POSTGRADUADOS', 'educational', 'educacion', 1.0),

        # Fishing Institute (158 contracts) - synonym matching
        (r'INSTITUTO NACIONAL DE LA PESCA$', 'research_education', 'agricultura', 1.0),

        # State Educational Infrastructure (additional states)
        (r'INSTITUTO ESTATAL DE INFRAESTRUCTURA EDUCATIVA', 'state_agency', 'educacion', 0.90),

        # Q ROO prefix pattern (many institutions)
        (r'^Q\s*ROO[-:]?\s*SERVICIOS ESTATALES DE SALUD', 'state_agency', 'salud', 0.95),
        (r'^Q\s*ROO[-:]?\s*SISTEMA.*DESARROLLO INTEGRAL', 'state_agency', 'salud', 0.95),
        (r'^Q\s*ROO[-:]?\s*COMISI[OÓ]N.*JUVENTUD', 'state_agency', 'educacion', 0.90),

        # National Solidarity Programs (250+ contracts)
        (r'COORDINACI[OÓ]N GENERAL.*PROGRAMA NACIONAL.*APOYO.*EMPRESAS|^FONAES\b', 'federal_agency', 'trabajo', 1.0),
        (r'FONDO NACIONAL DE APOYO.*EMPRESAS.*SOLIDARIDAD', 'social_program', 'trabajo', 0.95),

        # Health Coordination (115+ contracts)
        (r'COORDINACI[OÓ]N DE SALUD MENTAL', 'federal_agency', 'salud', 0.90),
        (r'CENTRO NACIONAL DE PREVENCI[OÓ]N Y CONTROL DE ENFERMEDADES|^CENAVECE\b', 'health_institution', 'salud', 1.0),

        # Environment/Forestry (114 contracts)
        (r'PROTECTORA DE BOSQUES', 'state_agency', 'ambiente', 0.90),

        # Anti-corruption System (112 contracts)
        (r'SECRETAR[IÍ]A EJECUTIVA.*SISTEMA NACIONAL ANTICORRUPCI[OÓ]N|^SESNA\b', 'federal_agency', 'gobernacion', 1.0),

        # Aviation (194+ contracts combined)
        (r'AGENCIA FEDERAL DE AVIACI[OÓ]N CIVIL|^AFAC\b', 'regulatory_agency', 'infraestructura', 1.0),
        (r'SERVICIOS AEROPORTUARIOS.*CIUDAD DE M[EÉ]XICO', 'state_enterprise_infra', 'infraestructura', 1.0),
        (r'AEROL[IÍ]NEA DEL ESTADO MEXICANO|MEXICANA DE AVIACI[OÓ]N', 'state_enterprise_infra', 'infraestructura', 1.0),

        # Regulatory Improvement (107 contracts)
        (r'COMISI[OÓ]N NACIONAL DE MEJORA REGULATORIA|^CONAMER\b', 'federal_agency', 'hacienda', 1.0),

        # State Services (various)
        (r'SERVICIOS ESTATALES DE SALUD', 'state_agency', 'salud', 0.90),
        (r'ORGANISMO INTERMUN.*AGUA POT|ORGANISMO METROPOLITANO.*AGUA', 'municipal', 'ambiente', 0.85),

        # Railroads (historical, 85 contracts)
        (r'FERROCARRILES NACIONALES DE M[EÉ]XICO|^FERRONALES\b', 'state_enterprise_infra', 'infraestructura', 0.95),

        # State Secretariats (generic patterns)
        (r'^SECRETAR[IÍ]A DE HACIENDA$', 'state_agency', 'hacienda', 0.85),
        (r'^FUNCI[OÓ]N P[UÚ]BLICA$', 'federal_secretariat', 'gobernacion', 0.85),
        (r'^EDUCACI[OÓ]N P[UÚ]BLICA$', 'federal_secretariat', 'educacion', 0.85),
        (r'^SECRETAR[IÍ]A DE CONTRALOR[IÍ]A$', 'state_agency', 'gobernacion', 0.85),

        # State Road Commissions (200+ contracts combined)
        (r'COMISI[OÓ]N ESTATAL DE CAMINOS', 'state_agency', 'infraestructura', 0.90),
        (r'SISTEMA DE CAMINOS', 'state_agency', 'infraestructura', 0.85),
        (r'COMISI[OÓ]N DE V[IÍ]AS TERRESTRES', 'state_agency', 'infraestructura', 0.90),

        # State Social Security (85 contracts)
        (r'INSTITUTO DE SEGURIDAD SOCIAL DEL ESTADO', 'state_agency', 'salud', 0.90),

        # Women's Institutes (additional states)
        (r'INSTITUTO DE LA MUJER DEL ESTADO', 'state_agency', 'trabajo', 0.90),
        (r'SECRETAR[IÍ]A DE LA MUJER', 'state_agency', 'trabajo', 0.90),

        # State Education Institutes
        (r'INSTITUTO DE EDUCACI[OÓ]N DE', 'state_agency', 'educacion', 0.90),

        # Technology Programs
        (r'COORDINACI[OÓ]N GENERAL.*PRENDE|@PRENDE', 'federal_agency', 'educacion', 0.95),

        # Youth and Sports Commissions
        (r'COMISI[OÓ]N PARA LA JUVENTUD Y EL DEPORTE', 'state_agency', 'educacion', 0.85),

        # Regional Development
        (r'SECRETAR[IÍ]A DE DESARROLLO REGIONAL', 'state_agency', 'infraestructura', 0.85),

        # Research Centers (additional)
        (r'^CIATEC\b|CIATEC.*A\.?\s*C\.?', 'educational', 'tecnologia', 1.0),

        # Energy Commission (historical)
        (r'COMISI[OÓ]N NACIONAL DE ENERG[IÍ]A$', 'federal_agency', 'energia', 0.95),

        # State Natural Resources
        (r'SECRETAR[IÍ]A DE RECURSOS NATURALES', 'state_agency', 'ambiente', 0.90),

        # Liquidation Trusts
        (r'FIDEICOMISO LIQUIDADOR', 'federal_agency', 'hacienda', 0.80),
        (r'FONDO DE EMPRESAS EXPROPIADAS', 'federal_agency', 'hacienda', 0.80),

        # State Education and Culture Secretariats
        (r'SECRETAR[IÍ]A DE EDUCACI[OÓ]N.*CULTURA.*BIENESTAR', 'state_agency', 'educacion', 0.90),

        # Water Utilities (additional patterns)
        (r'AGUA DE HERMOSILLO', 'municipal', 'ambiente', 0.90),
        (r'JUNTA DE ELECTRIFICACI[OÓ]N', 'state_agency', 'energia', 0.90),

        # Distance Education
        (r'TELEBACHILLERATO', 'state_agency', 'educacion', 0.90),

        # Public Welfare
        (r'ADMINISTRACI[OÓ]N DEL PATRIMONIO DE LA BENEFICENCIA P[UÚ]BLICA', 'federal_agency', 'salud', 0.95),

        # Cultural Institutes
        (r'INSTITUTO DE CULTURA DE', 'state_agency', 'educacion', 0.85),

        # Training Institutes
        (r'INSTITUTO DE CAPACITACI[OÓ]N Y ADIESTRAMIENTO', 'state_agency', 'trabajo', 0.90),

        # IT Programs
        (r'FIDEICOMISO.*MEJORAMIENTO.*MEDIOS.*INFORM[AÁ]TICA', 'federal_agency', 'tecnologia', 0.85),

        # ========================================================================
        # PHASE 2.4: FINAL CLEANUP - Additional patterns from third pass
        # ========================================================================

        # Broadcasting (state level)
        (r'RADIOTELEVIS[IÓ]ON DE VERACRUZ', 'state_agency', 'gobernacion', 0.95),

        # Health - Child/Adolescent Centers
        (r'CENTRO NACIONAL PARA LA SALUD DE LA INFANCIA', 'health_institution', 'salud', 1.0),
        (r'CENTRO NACIONAL DE EQUIDAD DE G[EÉ]NERO.*SALUD', 'health_institution', 'salud', 1.0),
        (r'COMISI[OÓ]N CONSTRUCTORA DE SALUD', 'state_agency', 'salud', 0.90),

        # State Hacienda Secretariats
        (r'SECRETAR[IÍ]A DE HACIENDA DEL ESTADO', 'state_agency', 'hacienda', 0.90),

        # Training Institutes for Work
        (r'INSTITUTO DE CAPACITACI[OÓ]N PARA EL TRABAJO', 'state_agency', 'trabajo', 0.90),
        (r'INSTITUTO DE FORMACI[OÓ]N PARA EL TRABAJO', 'state_agency', 'trabajo', 0.90),

        # State Women's Institutes (specific)
        (r'INSTITUTO VERACRUZANO DE LAS MUJERES', 'state_agency', 'trabajo', 0.95),

        # State Education Integration Units
        (r'UNIDAD DE INTEGRACI[OÓ]N EDUCATIVA', 'state_agency', 'educacion', 0.90),
        (r'UNIDAD DEL SISTEMA PARA LA CARRERA.*MAESTRAS', 'federal_agency', 'educacion', 0.95),

        # Acquisition/Purchasing Committees
        (r'COMIT[EÉ] DE ADQUISICIONES', 'state_agency', 'hacienda', 0.85),

        # State Education and Culture Secretariats (specific states)
        (r'SECRETAR[IÍ]A DE EDUCACI[OÓ]N Y CULTURA', 'state_agency', 'educacion', 0.90),

        # Cultural Heritage Authorities
        (r'AUTORIDAD DEL PATRIMONIO CULTURAL', 'state_agency', 'educacion', 0.90),

        # State Government Secretariats
        (r'SECRETAR[IÍ]A GENERAL DE GOBIERNO', 'state_agency', 'gobernacion', 0.90),

        # State Water/Infrastructure Secretariats
        (r'SECRETAR[IÍ]A DE AGUA.*OBRA P[UÚ]BLICA.*INFRAESTRUCTURA', 'state_agency', 'infraestructura', 0.90),

        # Municipal Development Commissions
        (r'COMISI[OÓ]N MUNICIPAL DE DESARROLLO', 'municipal', 'infraestructura', 0.85),

        # Common municipalities (just city names)
        (r'^ALTAMIRA$|^TIJUANA$|^MACUSPANA$|^CAMARGO$|^JU[AÁ]REZ$', 'municipal', 'gobernacion', 0.80),
        (r'^NUEVO LAREDO$|^CUNDUAC[AÁ]N$|^VERACRUZ$|^MIGUEL ALEM[AÁ]N$', 'municipal', 'gobernacion', 0.80),

        # DIF (simple name without state)
        (r'^SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA$', 'social_program', 'salud', 0.85),
    ]

    # ========================================================================
    # TIER 2: Federal Secretariats (95% confidence)
    # ========================================================================

    FEDERAL_SECRETARIATS = [
        (r'SECRETARIA DE GOBERNACION|^SEGOB\b', 'gobernacion'),
        (r'SECRETARIA DE HACIENDA.*CREDITO PUBLICO|^SHCP\b', 'hacienda'),
        (r'SECRETARIA DE BIENESTAR', 'trabajo'),
        (r'SECRETARIA DE DESARROLLO SOCIAL|^SEDESOL\b', 'trabajo'),  # Historical
        (r'SECRETARIA DE MEDIO AMBIENTE|^SEMARNAT\b', 'ambiente'),
        (r'SECRETARIA DE ENERGIA|^SENER\b', 'energia'),
        (r'SECRETARIA DE ECONOMIA|^SE\b', 'hacienda'),
        (r'SECRETARIA DE AGRICULTURA|^SADER\b|^SAGARPA\b', 'agricultura'),
        (r'SECRETARIA DE COMUNICACIONES|^SCT\b|^SICT\b|INFRAESTRUCTURA.*COMUNICACIONES.*TRANSPORTES', 'infraestructura'),
        (r'SECRETARIA DE EDUCACION PUBLICA|^SEP\b', 'educacion'),
        (r'SECRETARIA DE SALUD|^SSA\b', 'salud'),
        (r'SECRETARIA DEL TRABAJO|^STPS\b', 'trabajo'),
        (r'SECRETARIA DE DESARROLLO AGRARIO|^SEDATU\b', 'agricultura'),
        (r'SECRETARIA DE TURISMO|^SECTUR\b', 'hacienda'),
        (r'SECRETARIA DE LA FUNCION PUBLICA|^SFP\b', 'gobernacion'),
        (r'SECRETARIA DE RELACIONES EXTERIORES|^SRE\b', 'gobernacion'),
        (r'SECRETARIA DE SEGURIDAD.*PROTECCION CIUDADANA|^SSPC\b', 'gobernacion'),
        (r'SECRETARIA DE CULTURA', 'educacion'),
    ]

    # ========================================================================
    # TIER 2: Keyword Patterns (85-95% confidence)
    # ========================================================================

    KEYWORD_PATTERNS = [
        # Health (90% confidence)
        (r'HOSPITAL', 'health_institution', 'salud', 0.90),
        (r'CENTRO DE SALUD', 'health_institution', 'salud', 0.90),
        (r'CLINICA', 'health_institution', 'salud', 0.85),
        (r'INSTITUTO.*SALUD', 'health_institution', 'salud', 0.90),
        (r'EPIDEMIOLOG', 'health_institution', 'salud', 0.90),
        (r'SERVICIOS DE SALUD', 'health_institution', 'salud', 0.90),
        (r'UNIDAD MEDIC', 'health_institution', 'salud', 0.85),
        (r'CENTRO MEDIC', 'health_institution', 'salud', 0.85),

        # Education (90% confidence)
        (r'UNIVERSIDAD', 'educational', 'educacion', 0.95),
        (r'INSTITUTO TECNOLOGICO', 'educational', 'educacion', 0.95),
        (r'COLEGIO DE BACHILLERES', 'educational', 'educacion', 0.90),
        (r'COLEGIO NACIONAL', 'educational', 'educacion', 0.85),
        (r'CENTRO DE ESTUDIOS', 'educational', 'educacion', 0.85),
        (r'ESCUELA', 'educational', 'educacion', 0.80),
        (r'TECNOLOGICO DE', 'educational', 'educacion', 0.85),
        (r'CENTRO DE INVESTIGACION', 'educational', 'educacion', 0.85),
        (r'CONACYT|CONAHCYT', 'federal_agency', 'educacion', 0.95),
        (r'COLEGIO DE POSTGRADUADOS', 'educational', 'educacion', 0.90),
        (r'CETIS|CBTIS|CBTA|CONALEP', 'educational', 'educacion', 0.90),

        # Infrastructure (85% confidence)
        (r'CARRETERA', 'state_agency', 'infraestructura', 0.85),
        (r'PUENTES', 'state_agency', 'infraestructura', 0.85),
        (r'OBRAS PUBLICAS', 'state_agency', 'infraestructura', 0.85),
        (r'VIVIENDA', 'state_agency', 'infraestructura', 0.80),
        (r'DESARROLLO URBANO', 'state_agency', 'infraestructura', 0.85),
        (r'TRANSPORTE', 'state_agency', 'infraestructura', 0.80),
        (r'AEROPUERTO', 'state_enterprise_infra', 'infraestructura', 0.85),

        # Judicial (90% confidence)
        (r'TRIBUNAL', 'judicial', 'gobernacion', 0.90),
        (r'JUZGADO', 'judicial', 'gobernacion', 0.90),
        (r'SUPREMA CORTE', 'judicial', 'gobernacion', 0.95),
        (r'PODER JUDICIAL', 'judicial', 'gobernacion', 0.95),
        (r'FISCALIA', 'judicial', 'gobernacion', 0.90),
        (r'PROCURADURIA', 'judicial', 'gobernacion', 0.85),

        # Legislative (90% confidence)
        (r'CONGRESO DEL ESTADO', 'legislative', 'gobernacion', 0.90),
        (r'LEGISLATURA', 'legislative', 'gobernacion', 0.90),
        (r'CAMARA DE', 'legislative', 'gobernacion', 0.85),

        # Water/Environment (85% confidence)
        (r'AGUA POTABLE|AGUA Y SANEAMIENTO', 'state_agency', 'ambiente', 0.85),
        (r'ALCANTARILLADO', 'state_agency', 'ambiente', 0.85),
        (r'HIDRAULIC', 'state_agency', 'ambiente', 0.85),
        (r'MEDIO AMBIENTE', 'state_agency', 'ambiente', 0.85),
        (r'ECOLOGI', 'state_agency', 'ambiente', 0.80),

        # Agriculture (85% confidence)
        (r'AGRICULTURA', 'state_agency', 'agricultura', 0.85),
        (r'GANADERIA', 'state_agency', 'agricultura', 0.85),
        (r'FORESTAL', 'state_agency', 'agricultura', 0.80),
        (r'RURAL', 'state_agency', 'agricultura', 0.75),
        (r'PESQUER', 'state_agency', 'agricultura', 0.85),

        # Labor (85% confidence)
        (r'EMPLEO', 'state_agency', 'trabajo', 0.85),
        (r'LABORAL', 'state_agency', 'trabajo', 0.80),
        (r'PENSION', 'state_agency', 'trabajo', 0.80),
        (r'PREVISION SOCIAL', 'state_agency', 'trabajo', 0.85),

        # Technology (80% confidence)
        (r'TECNOLOG[IÍ]A DE LA INFORMACION', 'federal_agency', 'tecnologia', 0.85),
        (r'SISTEMAS DE INFORMACION', 'state_agency', 'tecnologia', 0.80),
        (r'INNOVACION', 'state_agency', 'tecnologia', 0.75),

        # Security (85% confidence)
        (r'SEGURIDAD PUBLICA', 'state_agency', 'gobernacion', 0.85),
        (r'POLICIA', 'state_agency', 'gobernacion', 0.85),
        (r'PROTECCION CIVIL', 'state_agency', 'gobernacion', 0.85),
        (r'BOMBEROS', 'municipal', 'gobernacion', 0.80),

        # State-level Secretariats (85% confidence)
        (r'SECRETARIA DE INFRAESTRUCTURA', 'state_agency', 'infraestructura', 0.90),
        (r'SECRETARIA DE OBRAS', 'state_agency', 'infraestructura', 0.90),
        (r'SECRETARIA DE FINANZAS', 'state_agency', 'hacienda', 0.90),
        (r'SECRETARIA DE ADMINISTRACION', 'state_agency', 'gobernacion', 0.85),

        # Development Zones
        (r'CORPORACION PARA EL DESARROLLO|ZONA FRONTERIZA', 'state_agency', 'infraestructura', 0.85),
        (r'PARQUE FUNDIDORA|PARQUE INDUSTRIAL', 'state_agency', 'infraestructura', 0.80),

        # ========================================================================
        # PHASE 2.2: MEDIUM-PRIORITY STATE-LEVEL PATTERNS (January 2026 Grand Expansion)
        # These patterns target state-level entities that vary by state
        # ========================================================================

        # State Educational Infrastructure Institutes (~22B total)
        (r'INSTITUTO.*INFRAESTRUCTURA.*FISICA\s*EDUCATIVA|^IIFEE?[A-Z]?\b|^INIFE\b', 'state_agency', 'educacion', 0.90),
        (r'COMITE.*CONSTRUCCION.*ESCUELAS|^COCOES\b', 'state_agency', 'educacion', 0.90),
        (r'COMITE ADMINISTRADOR.*FEDERAL.*CONSTRUCCION.*ESCUELAS|^CAPFCE\b', 'federal_agency', 'educacion', 0.95),
        (r'ESPACIOS EDUCATIVOS|INSTITUTO.*ESPACIOS EDUCATIVOS', 'state_agency', 'educacion', 0.90),

        # State Water Commissions (~30B total)
        (r'COMISION ESTATAL DE(L)? AGUA|^CEA[A-Z]?\b', 'state_agency', 'ambiente', 0.90),
        (r'SERVICIOS DE AGUA Y DRENAJE', 'state_agency', 'ambiente', 0.90),
        (r'INSTITUTO DEL AGUA|INSTITUTO ESTATAL DEL AGUA', 'state_agency', 'ambiente', 0.90),
        (r'COMISION ESTATAL DE AGUAS Y SANEAMIENTO', 'state_agency', 'ambiente', 0.90),
        (r'JUNTA.*AGUA.*SANEAMIENTO|JUNTA DE AGUA', 'state_agency', 'ambiente', 0.85),
        (r'ORGANISMO.*AGUA POTABLE|ORGANISMO DE AGUA', 'state_agency', 'ambiente', 0.85),

        # State Infrastructure Secretariats
        (r'SECRETARIA DE OBRA PUBLICA|SECRETARIA DE OBRAS', 'state_agency', 'infraestructura', 0.90),
        (r'JUNTA ESTATAL DE CAMINOS|JUNTA DE CAMINOS', 'state_agency', 'infraestructura', 0.90),
        (r'INSTITUTO.*CONSTRUCCION.*CONSERVACION.*OBRA', 'state_agency', 'infraestructura', 0.90),
        (r'COMISION ESTATAL DE INFRAESTRUCTURA|^CEI\b', 'state_agency', 'infraestructura', 0.90),
        (r'FIDEICOMISO.*PROYECTOS ESTRATEGICOS', 'state_agency', 'infraestructura', 0.85),

        # State DIF Systems
        (r'SISTEMA.*DESARROLLO INTEGRAL.*FAMILIA.*ESTADO|DIF ESTATAL', 'state_agency', 'salud', 0.90),
        (r'DIF DEL ESTADO|^DIF [A-Z]{2,}', 'state_agency', 'salud', 0.85),

        # State Housing and Development
        (r'COMISION DE VIVIENDA.*ESTADO|COMISION ESTATAL DE VIVIENDA', 'state_agency', 'infraestructura', 0.85),
        (r'INSTITUTO.*VIVIENDA.*ESTADO|INSTITUTO ESTATAL DE VIVIENDA', 'state_agency', 'infraestructura', 0.85),
        (r'SECRETARIA DE INFRAESTRUCTURA.*TRANSPORTE', 'state_agency', 'infraestructura', 0.90),
        (r'SECRETARIA DE TRANSPORTE.*VIALIDAD', 'state_agency', 'infraestructura', 0.85),

        # State Finance and Administration
        (r'SECRETARIA DE PLANEACION.*ADMINISTRACION.*FINANZAS', 'state_agency', 'hacienda', 0.85),
        (r'SECRETARIA DE FINANZAS.*ADMINISTRACION', 'state_agency', 'hacienda', 0.85),
        (r'OFICIALIA MAYOR|OFICIAL.*MAYOR', 'state_agency', 'gobernacion', 0.80),
        (r'CONTRALORIA.*ESTADO|CONTRALORIA GENERAL', 'state_agency', 'gobernacion', 0.85),
        (r'CONSEJERIA JURIDICA', 'state_agency', 'gobernacion', 0.80),

        # Municipal - Mexico City Alcaldias
        (r'ALCALDIA DE|ALCALDIA [A-Z]', 'municipal', 'gobernacion', 0.90),

        # State Social Programs
        (r'INSTITUTO.*MUJERES.*ESTADO|INSTITUTO ESTATAL DE.*MUJERES', 'state_agency', 'trabajo', 0.90),
        (r'ATENCION.*VICTIMAS|COMISION.*VICTIMAS', 'state_agency', 'gobernacion', 0.85),

        # State Agriculture
        (r'DESARROLLO AGROPECUARIO|FOMENTO AGROPECUARIO', 'state_agency', 'agricultura', 0.85),
        (r'SECRETARIA.*DESARROLLO RURAL', 'state_agency', 'agricultura', 0.85),
    ]

    # ========================================================================
    # TIER 3: Municipal Patterns (80% confidence)
    # ========================================================================

    MUNICIPAL_PATTERNS = [
        (r'PRESIDENCIA MUNICIPAL', 0.95),
        (r'H\.?\s*AYUNTAMIENTO', 0.95),
        (r'HONORABLE AYUNTAMIENTO', 0.95),
        (r'MUNICIPIO DE', 0.90),
        (r'GOBIERNO MUNICIPAL', 0.90),
        (r'AYUNTAMIENTO DE', 0.90),
        (r'MUNICIPIO LIBRE', 0.85),
    ]

    # ========================================================================
    # TIER 3: State Government Patterns (85% confidence)
    # ========================================================================

    STATE_GOVERNMENT_PATTERNS = [
        (r'GOBIERNO DEL ESTADO', 0.95),
        (r'PODER EJECUTIVO DEL ESTADO', 0.90),
        (r'GUBERNATURA', 0.90),
        (r'OFICINA DEL GOBERNADOR', 0.90),
    ]

    def __init__(self):
        """Initialize the classifier."""
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile all regex patterns for efficiency."""
        # TIER 0: Mega-entities (checked first)
        self._mega_entities = [
            (re.compile(pattern, re.IGNORECASE), inst_type, sector, conf, size_tier)
            for pattern, inst_type, sector, conf, size_tier in self.MEGA_ENTITIES
        ]

        # TIER 1: Known entities
        self._known_entities = [
            (re.compile(pattern, re.IGNORECASE), inst_type, sector, conf)
            for pattern, inst_type, sector, conf in self.KNOWN_ENTITIES
        ]

        self._secretariats = [
            (re.compile(pattern, re.IGNORECASE), sector)
            for pattern, sector in self.FEDERAL_SECRETARIATS
        ]

        self._keywords = [
            (re.compile(pattern, re.IGNORECASE), inst_type, sector, conf)
            for pattern, inst_type, sector, conf in self.KEYWORD_PATTERNS
        ]

        self._municipal = [
            (re.compile(pattern, re.IGNORECASE), conf)
            for pattern, conf in self.MUNICIPAL_PATTERNS
        ]

        self._state_gov = [
            (re.compile(pattern, re.IGNORECASE), conf)
            for pattern, conf in self.STATE_GOVERNMENT_PATTERNS
        ]

        # State prefix pattern
        state_codes = '|'.join(MEXICAN_STATES.keys())
        self._state_prefix = re.compile(
            rf'^({state_codes})\s*[-:]\s*',
            re.IGNORECASE
        )

    def classify(self, name: str) -> ClassificationResult:
        """
        Classify an institution by name.

        Args:
            name: Institution name (raw or normalized)

        Returns:
            ClassificationResult with type, sector, and confidence
        """
        if not name or not isinstance(name, str):
            return self._default_result("EMPTY_NAME")

        # Normalize: uppercase, remove accents, remove extra spaces
        # CRITICAL: Use unidecode to convert accented characters to ASCII
        # This ensures "COMISIÓN" matches pattern "COMISION"
        normalized = unidecode(' '.join(name.upper().split()))

        # Extract state prefix if present
        state_code = self._extract_state_prefix(normalized)
        if state_code:
            # Remove prefix for pattern matching
            normalized = self._state_prefix.sub('', normalized).strip()

        # TIER 0: Mega-entities (100% confidence, highest priority)
        for pattern, inst_type, sector, confidence, size_tier in self._mega_entities:
            if pattern.search(normalized):
                return ClassificationResult(
                    institution_type=inst_type,
                    institution_type_id=get_institution_type_by_code(inst_type).id,
                    sector=sector,
                    sector_id=get_sector_id(sector),
                    confidence=confidence,
                    matched_rule=f"MEGA:{pattern.pattern[:30]}",
                    state_code=state_code,
                    geographic_scope='federal'
                )

        # TIER 1: Known entities (100% confidence)
        for pattern, inst_type, sector, confidence in self._known_entities:
            if pattern.search(normalized):
                return ClassificationResult(
                    institution_type=inst_type,
                    institution_type_id=get_institution_type_by_code(inst_type).id,
                    sector=sector,
                    sector_id=get_sector_id(sector),
                    confidence=confidence,
                    matched_rule=f"KNOWN:{pattern.pattern[:30]}",
                    state_code=state_code,
                    geographic_scope='state' if state_code else 'federal'
                )

        # TIER 2: Federal secretariats (95% confidence)
        for pattern, sector in self._secretariats:
            if pattern.search(normalized):
                return ClassificationResult(
                    institution_type='federal_secretariat',
                    institution_type_id=1,
                    sector=sector,
                    sector_id=get_sector_id(sector),
                    confidence=0.95,
                    matched_rule=f"SECRETARIAT:{pattern.pattern[:30]}",
                    state_code=state_code,
                    geographic_scope='federal'
                )

        # TIER 2: Municipal patterns (before keywords to catch municipalities first)
        for pattern, confidence in self._municipal:
            if pattern.search(normalized):
                return ClassificationResult(
                    institution_type='municipal',
                    institution_type_id=13,  # Updated for new taxonomy
                    sector='infraestructura',  # Municipalities primarily do infrastructure
                    sector_id=get_sector_id('infraestructura'),
                    confidence=confidence,
                    matched_rule=f"MUNICIPAL:{pattern.pattern[:30]}",
                    state_code=state_code,
                    geographic_scope='municipal'
                )

        # TIER 2: State government patterns
        for pattern, confidence in self._state_gov:
            if pattern.search(normalized):
                return ClassificationResult(
                    institution_type='state_government',
                    institution_type_id=11,  # Updated for new taxonomy
                    sector='gobernacion',
                    sector_id=get_sector_id('gobernacion'),
                    confidence=confidence,
                    matched_rule=f"STATE_GOV:{pattern.pattern[:30]}",
                    state_code=state_code,
                    geographic_scope='state'
                )

        # TIER 2: Keyword patterns
        for pattern, inst_type, sector, confidence in self._keywords:
            if pattern.search(normalized):
                # Adjust geographic scope based on state prefix
                scope = 'state' if state_code else 'federal'

                return ClassificationResult(
                    institution_type=inst_type,
                    institution_type_id=get_institution_type_by_code(inst_type).id,
                    sector=sector,
                    sector_id=get_sector_id(sector),
                    confidence=confidence,
                    matched_rule=f"KEYWORD:{pattern.pattern[:30]}",
                    state_code=state_code,
                    geographic_scope=scope
                )

        # TIER 3: State prefix default (70% confidence)
        if state_code:
            return ClassificationResult(
                institution_type='state_agency',
                institution_type_id=12,  # Updated for new taxonomy
                sector='otros',
                sector_id=get_sector_id('otros'),
                confidence=0.70,
                matched_rule=f"STATE_PREFIX:{state_code}",
                state_code=state_code,
                geographic_scope='state'
            )

        # Default: unclassified (0% confidence)
        return self._default_result("NO_MATCH")

    def _extract_state_prefix(self, name: str) -> Optional[str]:
        """Extract state code from institution name prefix."""
        match = self._state_prefix.match(name)
        if match:
            return match.group(1).upper()
        return None

    def _default_result(self, reason: str) -> ClassificationResult:
        """Return default classification for unmatched institutions."""
        return ClassificationResult(
            institution_type='other',
            institution_type_id=19,  # Updated for new taxonomy
            sector='otros',
            sector_id=12,
            confidence=0.0,
            matched_rule=f"DEFAULT:{reason}",
            state_code=None,
            geographic_scope='federal'
        )

    def classify_batch(
        self,
        institutions: list[dict],
        name_field: str = 'name'
    ) -> list[tuple[dict, ClassificationResult]]:
        """
        Classify a batch of institutions.

        Args:
            institutions: List of institution dicts
            name_field: Field containing institution name

        Returns:
            List of (institution, result) tuples
        """
        results = []
        for inst in institutions:
            name = inst.get(name_field, '')
            result = self.classify(name)
            results.append((inst, result))
        return results

    def get_statistics(
        self,
        results: list[ClassificationResult]
    ) -> dict:
        """
        Get classification statistics.

        Args:
            results: List of ClassificationResult objects

        Returns:
            Dict with statistics
        """
        total = len(results)
        if total == 0:
            return {}

        by_type = {}
        by_sector = {}
        by_confidence = {'high': 0, 'medium': 0, 'low': 0, 'none': 0}

        for result in results:
            # By type
            by_type[result.institution_type] = by_type.get(result.institution_type, 0) + 1

            # By sector
            by_sector[result.sector] = by_sector.get(result.sector, 0) + 1

            # By confidence
            if result.confidence >= 0.9:
                by_confidence['high'] += 1
            elif result.confidence >= 0.7:
                by_confidence['medium'] += 1
            elif result.confidence > 0:
                by_confidence['low'] += 1
            else:
                by_confidence['none'] += 1

        return {
            'total': total,
            'by_type': by_type,
            'by_sector': by_sector,
            'by_confidence': by_confidence,
            'avg_confidence': sum(r.confidence for r in results) / total,
            'classified_rate': sum(1 for r in results if r.confidence > 0) / total,
        }


# Module-level convenience function
def classify_institution(name: str) -> ClassificationResult:
    """
    Convenience function for one-off classification.

    Args:
        name: Institution name

    Returns:
        ClassificationResult
    """
    classifier = AtlasRuleClassifier()
    return classifier.classify(name)
