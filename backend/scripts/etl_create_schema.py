"""
RUBLI Normalized Database Schema Creation
==========================================
Creates the RUBLI_NORMALIZED.db with a 3-level sector taxonomy
optimized for fraud detection analytics.

Tables:
- sectors: 12 main government sectors
- sub_sectors: ~40 sub-sector classifications
- categories: Partida-based granular categories
- ramos: Government branch reference
- vendors: Normalized vendor entities
- institutions: Normalized government institutions
- contracting_units: Contracting unit entities
- contracts: Main fact table

Author: RUBLI Project
Date: 2026-01-05
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Optional

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')
DATA_DIR = os.path.join(BACKEND_DIR, 'data')

# =============================================================================
# SCHEMA DDL
# =============================================================================

SCHEMA_DDL = """
-- =============================================================================
-- RUBLI_NORMALIZED.db - Normalized Procurement Database Schema
-- Version: 1.0
-- Description: Multi-level sector taxonomy with analytics-first design
-- =============================================================================

-- =============================================================================
-- REFERENCE TABLES (Lookup/Dimension Tables)
-- =============================================================================

-- Level 1: Main Sectors (12 sectors)
CREATE TABLE IF NOT EXISTS sectors (
    id INTEGER PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    acronym VARCHAR(10),
    color VARCHAR(7),
    description_es TEXT,
    description_en TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Level 2: Sub-Sectors
CREATE TABLE IF NOT EXISTS sub_sectors (
    id INTEGER PRIMARY KEY,
    sector_id INTEGER NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    color VARCHAR(7),
    description_es TEXT,
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Level 3: Categories (Partida Especifica mappings)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    sub_sector_id INTEGER,
    sector_id INTEGER NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    partida_pattern VARCHAR(20),
    name_es VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sub_sector_id) REFERENCES sub_sectors(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Ramo (Government Branch) Reference Table
CREATE TABLE IF NOT EXISTS ramos (
    id INTEGER PRIMARY KEY,
    clave VARCHAR(10) UNIQUE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    sector_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- =============================================================================
-- ENTITY TABLES (Normalized Vendors and Institutions)
-- =============================================================================

-- Normalized Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY,
    rfc VARCHAR(13),
    name VARCHAR(500) NOT NULL,
    name_normalized VARCHAR(500),
    size_stratification VARCHAR(50),
    country_code VARCHAR(5) DEFAULT 'MX',
    is_verified_sat INTEGER DEFAULT 0,
    is_ghost_company INTEGER DEFAULT 0,
    ghost_probability REAL DEFAULT 0.0,
    first_contract_date DATE,
    last_contract_date DATE,
    total_contracts INTEGER DEFAULT 0,
    total_amount_mxn REAL DEFAULT 0.0,
    avg_risk_score REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Normalized Institutions Table
CREATE TABLE IF NOT EXISTS institutions (
    id INTEGER PRIMARY KEY,
    siglas VARCHAR(50),
    name VARCHAR(500) NOT NULL,
    name_normalized VARCHAR(500),
    tipo VARCHAR(100),
    ramo_id INTEGER,
    sector_id INTEGER,
    clave_institucion VARCHAR(20),
    gobierno_nivel VARCHAR(50),
    total_contracts INTEGER DEFAULT 0,
    total_amount_mxn REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ramo_id) REFERENCES ramos(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
);

-- Contracting Units (UC) Table
CREATE TABLE IF NOT EXISTS contracting_units (
    id INTEGER PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    clave_uc VARCHAR(20),
    nombre VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- =============================================================================
-- MAIN CONTRACTS TABLE (Fact Table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY,

    -- Source tracking
    source_file VARCHAR(100),
    source_structure CHAR(1),
    source_year INTEGER,

    -- Foreign Keys (normalized)
    vendor_id INTEGER,
    institution_id INTEGER,
    contracting_unit_id INTEGER,
    sector_id INTEGER,
    sub_sector_id INTEGER,
    category_id INTEGER,
    ramo_id INTEGER,

    -- Contract identification
    contract_number VARCHAR(200),
    procedure_number VARCHAR(200),
    expedient_code VARCHAR(200),

    -- Contract details
    title VARCHAR(1000),
    description TEXT,
    partida_especifica VARCHAR(20),

    -- Procedure information
    procedure_type VARCHAR(100),
    procedure_type_normalized VARCHAR(50),
    contract_type VARCHAR(100),
    contract_type_normalized VARCHAR(50),
    procedure_character VARCHAR(100),
    participation_form VARCHAR(100),

    -- Dates
    contract_date DATE,
    start_date DATE,
    end_date DATE,
    award_date DATE,
    publication_date DATE,

    -- Financial
    amount_mxn REAL,
    amount_original REAL,
    currency VARCHAR(10) DEFAULT 'MXN',

    -- Contract year (computed for fast filtering)
    contract_year INTEGER,
    contract_month INTEGER,

    -- Flags
    is_direct_award INTEGER DEFAULT 0,
    is_single_bid INTEGER DEFAULT 0,
    is_framework INTEGER DEFAULT 0,
    is_consolidated INTEGER DEFAULT 0,
    is_multiannual INTEGER DEFAULT 0,
    is_high_value INTEGER DEFAULT 0,
    is_year_end INTEGER DEFAULT 0,

    -- Risk scoring
    risk_score REAL DEFAULT 0.0,
    price_anomaly_score REAL DEFAULT 0.0,
    temporal_anomaly_score REAL DEFAULT 0.0,
    vendor_risk_score REAL DEFAULT 0.0,

    -- Metadata
    url VARCHAR(1000),
    contract_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (contracting_unit_id) REFERENCES contracting_units(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id),
    FOREIGN KEY (sub_sector_id) REFERENCES sub_sectors(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (ramo_id) REFERENCES ramos(id)
);

-- =============================================================================
-- INDEXES FOR FAST ANALYTICS
-- =============================================================================

-- Primary dimension indexes
CREATE INDEX IF NOT EXISTS idx_contracts_sector ON contracts(sector_id);
CREATE INDEX IF NOT EXISTS idx_contracts_sub_sector ON contracts(sub_sector_id);
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_institution ON contracts(institution_id);
CREATE INDEX IF NOT EXISTS idx_contracts_ramo ON contracts(ramo_id);

-- Temporal indexes
CREATE INDEX IF NOT EXISTS idx_contracts_year ON contracts(contract_year);
CREATE INDEX IF NOT EXISTS idx_contracts_year_month ON contracts(contract_year, contract_month);
CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(contract_date);

-- Analytical indexes
CREATE INDEX IF NOT EXISTS idx_contracts_amount ON contracts(amount_mxn);
CREATE INDEX IF NOT EXISTS idx_contracts_risk ON contracts(risk_score);
CREATE INDEX IF NOT EXISTS idx_contracts_direct_award ON contracts(is_direct_award);
CREATE INDEX IF NOT EXISTS idx_contracts_single_bid ON contracts(is_single_bid);
CREATE INDEX IF NOT EXISTS idx_contracts_high_value ON contracts(is_high_value);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contracts_sector_year ON contracts(sector_id, contract_year);
CREATE INDEX IF NOT EXISTS idx_contracts_sector_risk ON contracts(sector_id, risk_score);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_year ON contracts(vendor_id, contract_year);
CREATE INDEX IF NOT EXISTS idx_contracts_institution_year ON contracts(institution_id, contract_year);

-- Vendor analytics
CREATE INDEX IF NOT EXISTS idx_vendors_risk ON vendors(avg_risk_score);
CREATE INDEX IF NOT EXISTS idx_vendors_ghost ON vendors(ghost_probability);
CREATE INDEX IF NOT EXISTS idx_vendors_rfc ON vendors(rfc);
CREATE INDEX IF NOT EXISTS idx_vendors_name_normalized ON vendors(name_normalized);

-- Institution analytics
CREATE INDEX IF NOT EXISTS idx_institutions_sector ON institutions(sector_id);
CREATE INDEX IF NOT EXISTS idx_institutions_ramo ON institutions(ramo_id);
CREATE INDEX IF NOT EXISTS idx_institutions_name_normalized ON institutions(name_normalized);

-- Sub-sector indexes
CREATE INDEX IF NOT EXISTS idx_sub_sectors_sector ON sub_sectors(sector_id);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_sector ON categories(sector_id);
CREATE INDEX IF NOT EXISTS idx_categories_sub_sector ON categories(sub_sector_id);
CREATE INDEX IF NOT EXISTS idx_categories_partida ON categories(partida_pattern);
"""

# =============================================================================
# VIEWS DDL
# =============================================================================

VIEWS_DDL = """
-- =============================================================================
-- VIEWS FOR COMMON ANALYTICS
-- =============================================================================

-- Sector Summary View
CREATE VIEW IF NOT EXISTS v_sector_summary AS
SELECT
    s.id as sector_id,
    s.code as sector_code,
    s.name_es as sector_name,
    s.color as sector_color,
    COUNT(c.id) as total_contracts,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
    SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
    SUM(CASE WHEN c.risk_score >= 0.7 THEN 1 ELSE 0 END) as high_risk_count,
    COUNT(DISTINCT c.vendor_id) as unique_vendors,
    COUNT(DISTINCT c.institution_id) as unique_institutions,
    MIN(c.contract_year) as earliest_year,
    MAX(c.contract_year) as latest_year
FROM sectors s
LEFT JOIN contracts c ON s.id = c.sector_id
GROUP BY s.id, s.code, s.name_es, s.color;

-- Vendor Risk Profile View
CREATE VIEW IF NOT EXISTS v_vendor_risk_profile AS
SELECT
    v.id as vendor_id,
    v.rfc,
    v.name,
    v.name_normalized,
    v.size_stratification,
    v.is_ghost_company,
    v.ghost_probability,
    COUNT(c.id) as contract_count,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.amount_mxn), 0) as avg_contract_value,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    COALESCE(MAX(c.risk_score), 0) as max_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
    SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
    COUNT(DISTINCT c.institution_id) as institution_count,
    COUNT(DISTINCT c.sector_id) as sector_count,
    MIN(c.contract_year) as first_year,
    MAX(c.contract_year) as last_year
FROM vendors v
LEFT JOIN contracts c ON v.id = c.vendor_id
GROUP BY v.id, v.rfc, v.name, v.name_normalized, v.size_stratification,
         v.is_ghost_company, v.ghost_probability;

-- Year-over-Year Trends View
CREATE VIEW IF NOT EXISTS v_yearly_trends AS
SELECT
    contract_year,
    sector_id,
    COUNT(*) as contract_count,
    SUM(amount_mxn) as total_amount_mxn,
    AVG(risk_score) as avg_risk_score,
    SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
    ROUND(100.0 * SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as direct_award_pct,
    SUM(CASE WHEN risk_score >= 0.7 THEN 1 ELSE 0 END) as high_risk_count
FROM contracts
WHERE contract_year IS NOT NULL
GROUP BY contract_year, sector_id
ORDER BY contract_year, sector_id;

-- Institution Summary View
CREATE VIEW IF NOT EXISTS v_institution_summary AS
SELECT
    i.id as institution_id,
    i.siglas,
    i.name,
    i.name_normalized,
    i.tipo,
    i.gobierno_nivel,
    s.code as sector_code,
    s.name_es as sector_name,
    r.clave as ramo_clave,
    r.descripcion as ramo_descripcion,
    COUNT(c.id) as total_contracts,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
    COUNT(DISTINCT c.vendor_id) as unique_vendors,
    MIN(c.contract_year) as first_year,
    MAX(c.contract_year) as last_year
FROM institutions i
LEFT JOIN sectors s ON i.sector_id = s.id
LEFT JOIN ramos r ON i.ramo_id = r.id
LEFT JOIN contracts c ON i.id = c.institution_id
GROUP BY i.id, i.siglas, i.name, i.name_normalized, i.tipo, i.gobierno_nivel,
         s.code, s.name_es, r.clave, r.descripcion;

-- Sub-Sector Summary View
CREATE VIEW IF NOT EXISTS v_sub_sector_summary AS
SELECT
    ss.id as sub_sector_id,
    ss.code as sub_sector_code,
    ss.name_es as sub_sector_name,
    s.code as sector_code,
    s.name_es as sector_name,
    COUNT(c.id) as total_contracts,
    COALESCE(SUM(c.amount_mxn), 0) as total_amount_mxn,
    COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
    COUNT(DISTINCT c.vendor_id) as unique_vendors
FROM sub_sectors ss
JOIN sectors s ON ss.sector_id = s.id
LEFT JOIN contracts c ON ss.id = c.sub_sector_id
GROUP BY ss.id, ss.code, ss.name_es, s.code, s.name_es;
"""

# =============================================================================
# SEED DATA
# =============================================================================

SECTORS_DATA = [
    {"id": 1, "code": "salud", "name_es": "Salud", "name_en": "Health", "acronym": "SAL", "color": "#dc2626", "description_es": "Sector salud incluyendo hospitales, farmaceuticos y equipo medico", "display_order": 1},
    {"id": 2, "code": "educacion", "name_es": "Educacion", "name_en": "Education", "acronym": "EDU", "color": "#3b82f6", "description_es": "Sector educativo desde basica hasta superior", "display_order": 2},
    {"id": 3, "code": "infraestructura", "name_es": "Infraestructura", "name_en": "Infrastructure", "acronym": "INF", "color": "#ea580c", "description_es": "Obras publicas, carreteras, edificios gubernamentales", "display_order": 3},
    {"id": 4, "code": "energia", "name_es": "Energia", "name_en": "Energy", "acronym": "ENE", "color": "#eab308", "description_es": "Petroleo, electricidad, energias renovables", "display_order": 4},
    {"id": 5, "code": "defensa", "name_es": "Defensa", "name_en": "Defense", "acronym": "DEF", "color": "#1e3a5f", "description_es": "Defensa nacional y marina", "display_order": 5},
    {"id": 6, "code": "tecnologia", "name_es": "Tecnologia", "name_en": "Technology", "acronym": "TEC", "color": "#8b5cf6", "description_es": "Sistemas informaticos, software, servicios tecnologicos", "display_order": 6},
    {"id": 7, "code": "hacienda", "name_es": "Hacienda", "name_en": "Treasury", "acronym": "HAC", "color": "#16a34a", "description_es": "Hacienda y credito publico", "display_order": 7},
    {"id": 8, "code": "gobernacion", "name_es": "Gobernacion", "name_en": "Interior", "acronym": "GOB", "color": "#be123c", "description_es": "Gobernacion, seguridad publica, procuraduria", "display_order": 8},
    {"id": 9, "code": "agricultura", "name_es": "Agricultura", "name_en": "Agriculture", "acronym": "AGR", "color": "#22c55e", "description_es": "Agricultura, ganaderia, pesca", "display_order": 9},
    {"id": 10, "code": "ambiente", "name_es": "Medio Ambiente", "name_en": "Environment", "acronym": "AMB", "color": "#10b981", "description_es": "Medio ambiente y recursos naturales", "display_order": 10},
    {"id": 11, "code": "trabajo", "name_es": "Trabajo", "name_en": "Labor", "acronym": "TRA", "color": "#f97316", "description_es": "Trabajo y prevision social", "display_order": 11},
    {"id": 12, "code": "otros", "name_es": "Otros", "name_en": "Other", "acronym": "OTR", "color": "#64748b", "description_es": "Otros sectores no clasificados", "display_order": 12},
]

SUB_SECTORS_DATA = [
    # SALUD sub-sectors
    {"sector_id": 1, "code": "salud_hospitales", "name_es": "Hospitales", "name_en": "Hospitals", "keywords": "hospital,clinica,centro medico"},
    {"sector_id": 1, "code": "salud_farmaceutica", "name_es": "Farmaceutica", "name_en": "Pharmaceuticals", "keywords": "medicamento,farmaco,laboratorio"},
    {"sector_id": 1, "code": "salud_equipo_medico", "name_es": "Equipo Medico", "name_en": "Medical Equipment", "keywords": "equipo medico,instrumental,dispositivo"},
    {"sector_id": 1, "code": "salud_servicios", "name_es": "Servicios Medicos", "name_en": "Medical Services", "keywords": "servicio medico,consulta,diagnostico"},
    {"sector_id": 1, "code": "salud_emergencias", "name_es": "Emergencias", "name_en": "Emergency Services", "keywords": "emergencia,urgencia,ambulancia"},

    # EDUCACION sub-sectors
    {"sector_id": 2, "code": "edu_basica", "name_es": "Educacion Basica", "name_en": "Basic Education", "keywords": "primaria,secundaria,escuela"},
    {"sector_id": 2, "code": "edu_media", "name_es": "Educacion Media", "name_en": "Secondary Education", "keywords": "preparatoria,bachillerato,cbtis"},
    {"sector_id": 2, "code": "edu_superior", "name_es": "Educacion Superior", "name_en": "Higher Education", "keywords": "universidad,tecnologico,unam,ipn"},
    {"sector_id": 2, "code": "edu_infraestructura", "name_es": "Infraestructura Educativa", "name_en": "Educational Infrastructure", "keywords": "construccion escuela,aula,laboratorio"},
    {"sector_id": 2, "code": "edu_materiales", "name_es": "Materiales Educativos", "name_en": "Educational Materials", "keywords": "libro,material didactico,uniforme"},

    # INFRAESTRUCTURA sub-sectors
    {"sector_id": 3, "code": "infra_carreteras", "name_es": "Carreteras", "name_en": "Roads", "keywords": "carretera,autopista,pavimento"},
    {"sector_id": 3, "code": "infra_puentes", "name_es": "Puentes", "name_en": "Bridges", "keywords": "puente,viaducto,paso elevado"},
    {"sector_id": 3, "code": "infra_edificios", "name_es": "Edificios Publicos", "name_en": "Public Buildings", "keywords": "edificio,oficinas,construccion"},
    {"sector_id": 3, "code": "infra_agua", "name_es": "Agua y Saneamiento", "name_en": "Water & Sanitation", "keywords": "agua,drenaje,alcantarillado"},
    {"sector_id": 3, "code": "infra_transporte", "name_es": "Transporte", "name_en": "Transportation", "keywords": "metro,transporte,aeropuerto,puerto"},

    # ENERGIA sub-sectors
    {"sector_id": 4, "code": "energia_petroleo", "name_es": "Petroleo y Gas", "name_en": "Oil & Gas", "keywords": "petroleo,gas,refineria,pemex"},
    {"sector_id": 4, "code": "energia_electricidad", "name_es": "Electricidad", "name_en": "Electricity", "keywords": "electricidad,cfe,generacion,transmision"},
    {"sector_id": 4, "code": "energia_renovable", "name_es": "Energias Renovables", "name_en": "Renewable Energy", "keywords": "solar,eolica,renovable"},
    {"sector_id": 4, "code": "energia_combustibles", "name_es": "Combustibles", "name_en": "Fuels", "keywords": "combustible,gasolina,diesel"},

    # DEFENSA sub-sectors
    {"sector_id": 5, "code": "defensa_ejercito", "name_es": "Ejercito", "name_en": "Army", "keywords": "ejercito,sedena,militar"},
    {"sector_id": 5, "code": "defensa_marina", "name_es": "Marina", "name_en": "Navy", "keywords": "marina,semar,naval"},
    {"sector_id": 5, "code": "defensa_equipo", "name_es": "Equipo Militar", "name_en": "Military Equipment", "keywords": "armamento,vehiculo militar,equipo tactico"},

    # TECNOLOGIA sub-sectors
    {"sector_id": 6, "code": "tec_software", "name_es": "Software", "name_en": "Software", "keywords": "software,sistema,aplicacion,desarrollo"},
    {"sector_id": 6, "code": "tec_hardware", "name_es": "Hardware", "name_en": "Hardware", "keywords": "computadora,servidor,equipo computo"},
    {"sector_id": 6, "code": "tec_comunicaciones", "name_es": "Comunicaciones", "name_en": "Communications", "keywords": "telecomunicacion,red,internet,fibra"},
    {"sector_id": 6, "code": "tec_consultoria", "name_es": "Consultoria TI", "name_en": "IT Consulting", "keywords": "consultoria,asesoria,implementacion"},

    # HACIENDA sub-sectors
    {"sector_id": 7, "code": "hacienda_sat", "name_es": "SAT", "name_en": "Tax Administration", "keywords": "sat,impuesto,fiscal"},
    {"sector_id": 7, "code": "hacienda_banca", "name_es": "Banca de Desarrollo", "name_en": "Development Banking", "keywords": "banco,nafin,banobras"},

    # GOBERNACION sub-sectors
    {"sector_id": 8, "code": "gob_seguridad", "name_es": "Seguridad Publica", "name_en": "Public Security", "keywords": "policia,seguridad,vigilancia"},
    {"sector_id": 8, "code": "gob_procuraduria", "name_es": "Procuraduria", "name_en": "Attorney General", "keywords": "procuraduria,fiscalia,justicia"},
    {"sector_id": 8, "code": "gob_electoral", "name_es": "Electoral", "name_en": "Electoral", "keywords": "ine,electoral,eleccion"},

    # AGRICULTURA sub-sectors
    {"sector_id": 9, "code": "agri_produccion", "name_es": "Produccion Agricola", "name_en": "Agricultural Production", "keywords": "cultivo,cosecha,semilla"},
    {"sector_id": 9, "code": "agri_ganaderia", "name_es": "Ganaderia", "name_en": "Livestock", "keywords": "ganado,bovino,porcino"},
    {"sector_id": 9, "code": "agri_pesca", "name_es": "Pesca", "name_en": "Fisheries", "keywords": "pesca,acuacultura,marisco"},

    # AMBIENTE sub-sectors
    {"sector_id": 10, "code": "amb_conservacion", "name_es": "Conservacion", "name_en": "Conservation", "keywords": "conservacion,area natural,biodiversidad"},
    {"sector_id": 10, "code": "amb_agua", "name_es": "Recursos Hidricos", "name_en": "Water Resources", "keywords": "conagua,cuenca,acuifero"},

    # TRABAJO sub-sectors
    {"sector_id": 11, "code": "trabajo_empleo", "name_es": "Empleo", "name_en": "Employment", "keywords": "empleo,capacitacion,laboral"},
    {"sector_id": 11, "code": "trabajo_seguridad_social", "name_es": "Seguridad Social", "name_en": "Social Security", "keywords": "imss,issste,pension"},

    # OTROS sub-sectors
    {"sector_id": 12, "code": "otros_general", "name_es": "General", "name_en": "General", "keywords": "otro,varios,general"},
]

RAMOS_DATA = [
    {"clave": "01", "descripcion": "Poder Legislativo", "sector_id": 8},
    {"clave": "02", "descripcion": "Oficina de la Presidencia de la Republica", "sector_id": 8},
    {"clave": "03", "descripcion": "Poder Judicial", "sector_id": 8},
    {"clave": "04", "descripcion": "Gobernacion", "sector_id": 8},
    {"clave": "05", "descripcion": "Relaciones Exteriores", "sector_id": 8},
    {"clave": "06", "descripcion": "Hacienda y Credito Publico", "sector_id": 7},
    {"clave": "07", "descripcion": "Defensa Nacional", "sector_id": 5},
    {"clave": "08", "descripcion": "Agricultura y Desarrollo Rural", "sector_id": 9},
    {"clave": "09", "descripcion": "Comunicaciones y Transportes", "sector_id": 3},
    {"clave": "10", "descripcion": "Economia", "sector_id": 12},
    {"clave": "11", "descripcion": "Educacion Publica", "sector_id": 2},
    {"clave": "12", "descripcion": "Salud", "sector_id": 1},
    {"clave": "13", "descripcion": "Marina", "sector_id": 5},
    {"clave": "14", "descripcion": "Trabajo y Prevision Social", "sector_id": 11},
    {"clave": "15", "descripcion": "Desarrollo Agrario Territorial y Urbano", "sector_id": 3},
    {"clave": "16", "descripcion": "Medio Ambiente y Recursos Naturales", "sector_id": 10},
    {"clave": "17", "descripcion": "Procuraduria General de la Republica", "sector_id": 8},
    {"clave": "18", "descripcion": "Energia", "sector_id": 4},
    {"clave": "19", "descripcion": "Aportaciones a Seguridad Social", "sector_id": 11},
    {"clave": "20", "descripcion": "Bienestar", "sector_id": 12},
    {"clave": "21", "descripcion": "Turismo", "sector_id": 3},
    {"clave": "22", "descripcion": "Instituto Nacional Electoral", "sector_id": 8},
    {"clave": "23", "descripcion": "Provisiones Salariales y Economicas", "sector_id": 7},
    {"clave": "24", "descripcion": "Deuda Publica", "sector_id": 7},
    {"clave": "25", "descripcion": "Previsiones y Aportaciones para Sistemas de Educacion", "sector_id": 2},
    {"clave": "27", "descripcion": "Funcion Publica", "sector_id": 8},
    {"clave": "35", "descripcion": "Comision Nacional de los Derechos Humanos", "sector_id": 8},
    {"clave": "36", "descripcion": "Seguridad y Proteccion Ciudadana", "sector_id": 8},
    {"clave": "38", "descripcion": "Consejo Nacional de Ciencia y Tecnologia", "sector_id": 6},
    {"clave": "40", "descripcion": "INFONAVIT", "sector_id": 11},
    {"clave": "41", "descripcion": "Comision Federal de Competencia Economica", "sector_id": 12},
    {"clave": "42", "descripcion": "Instituto Federal de Telecomunicaciones", "sector_id": 6},
    {"clave": "43", "descripcion": "Instituto Federal de Acceso a la Informacion", "sector_id": 8},
    {"clave": "44", "descripcion": "Instituto Nacional de Estadistica y Geografia", "sector_id": 12},
    {"clave": "45", "descripcion": "Comision Reguladora de Energia", "sector_id": 4},
    {"clave": "46", "descripcion": "Comision Nacional de Hidrocarburos", "sector_id": 4},
    {"clave": "47", "descripcion": "Entidades no Sectorizadas", "sector_id": 12},
    {"clave": "48", "descripcion": "Cultura", "sector_id": 2},
    {"clave": "50", "descripcion": "IMSS", "sector_id": 1},
    {"clave": "51", "descripcion": "ISSSTE", "sector_id": 1},
    {"clave": "52", "descripcion": "PEMEX", "sector_id": 4},
    {"clave": "53", "descripcion": "CFE", "sector_id": 4},
]

CATEGORIES_DATA = [
    # Partida-based categories for SALUD
    {"sector_id": 1, "sub_sector_id": 2, "code": "cat_medicamentos", "partida_pattern": "253%", "name_es": "Medicamentos", "name_en": "Medications"},
    {"sector_id": 1, "sub_sector_id": 2, "code": "cat_vacunas", "partida_pattern": "254%", "name_es": "Vacunas", "name_en": "Vaccines"},
    {"sector_id": 1, "sub_sector_id": 2, "code": "cat_reactivos", "partida_pattern": "255%", "name_es": "Reactivos y Laboratorio", "name_en": "Lab Reagents"},
    {"sector_id": 1, "sub_sector_id": 3, "code": "cat_equipo_medico", "partida_pattern": "531%", "name_es": "Equipo Medico", "name_en": "Medical Equipment"},
    {"sector_id": 1, "sub_sector_id": 3, "code": "cat_instrumental", "partida_pattern": "532%", "name_es": "Instrumental Medico", "name_en": "Medical Instruments"},

    # Partida-based categories for TECNOLOGIA
    {"sector_id": 6, "sub_sector_id": None, "code": "cat_servicios_ti", "partida_pattern": "339%", "name_es": "Servicios de TI", "name_en": "IT Services"},
    {"sector_id": 6, "sub_sector_id": None, "code": "cat_software", "partida_pattern": "337%", "name_es": "Software", "name_en": "Software"},
    {"sector_id": 6, "sub_sector_id": None, "code": "cat_equipo_computo", "partida_pattern": "515%", "name_es": "Equipo de Computo", "name_en": "Computing Equipment"},

    # Partida-based categories for INFRAESTRUCTURA
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_obra_construccion", "partida_pattern": "611%", "name_es": "Construccion", "name_en": "Construction"},
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_obra_carreteras", "partida_pattern": "614%", "name_es": "Carreteras y Puentes", "name_en": "Roads and Bridges"},
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_obra_agua", "partida_pattern": "616%", "name_es": "Obras Hidraulicas", "name_en": "Water Works"},
    {"sector_id": 3, "sub_sector_id": None, "code": "cat_mantenimiento", "partida_pattern": "35%", "name_es": "Mantenimiento", "name_en": "Maintenance"},

    # Partida-based categories for ENERGIA
    {"sector_id": 4, "sub_sector_id": None, "code": "cat_combustibles", "partida_pattern": "261%", "name_es": "Combustibles", "name_en": "Fuels"},
    {"sector_id": 4, "sub_sector_id": None, "code": "cat_lubricantes", "partida_pattern": "262%", "name_es": "Lubricantes", "name_en": "Lubricants"},

    # General categories
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_materiales_oficina", "partida_pattern": "21%", "name_es": "Materiales de Oficina", "name_en": "Office Supplies"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_servicios_basicos", "partida_pattern": "31%", "name_es": "Servicios Basicos", "name_en": "Basic Services"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_arrendamientos", "partida_pattern": "32%", "name_es": "Arrendamientos", "name_en": "Leases"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_servicios_prof", "partida_pattern": "33%", "name_es": "Servicios Profesionales", "name_en": "Professional Services"},
    {"sector_id": 12, "sub_sector_id": None, "code": "cat_vehiculos", "partida_pattern": "541%", "name_es": "Vehiculos", "name_en": "Vehicles"},
]

# =============================================================================
# SCHEMA CREATION FUNCTIONS
# =============================================================================

def create_schema(conn: sqlite3.Connection) -> None:
    """Create all tables and indexes."""
    print("Creating database schema...")
    cursor = conn.cursor()

    # Execute schema DDL
    cursor.executescript(SCHEMA_DDL)
    conn.commit()
    print("  Tables and indexes created")

    # Execute views DDL
    cursor.executescript(VIEWS_DDL)
    conn.commit()
    print("  Views created")


def seed_sectors(conn: sqlite3.Connection) -> None:
    """Insert sector reference data."""
    print("Seeding sectors...")
    cursor = conn.cursor()

    for sector in SECTORS_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO sectors
            (id, code, name_es, name_en, acronym, color, description_es, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            sector["id"], sector["code"], sector["name_es"], sector["name_en"],
            sector["acronym"], sector["color"], sector["description_es"], sector["display_order"]
        ))

    conn.commit()
    print(f"  Inserted {len(SECTORS_DATA)} sectors")


def seed_sub_sectors(conn: sqlite3.Connection) -> None:
    """Insert sub-sector reference data."""
    print("Seeding sub-sectors...")
    cursor = conn.cursor()

    for i, ss in enumerate(SUB_SECTORS_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO sub_sectors
            (id, sector_id, code, name_es, name_en, keywords, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            i, ss["sector_id"], ss["code"], ss["name_es"],
            ss.get("name_en"), ss.get("keywords"), i
        ))

    conn.commit()
    print(f"  Inserted {len(SUB_SECTORS_DATA)} sub-sectors")


def seed_ramos(conn: sqlite3.Connection) -> None:
    """Insert ramo reference data."""
    print("Seeding ramos (government branches)...")
    cursor = conn.cursor()

    for i, ramo in enumerate(RAMOS_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO ramos
            (id, clave, descripcion, sector_id)
            VALUES (?, ?, ?, ?)
        """, (i, ramo["clave"], ramo["descripcion"], ramo["sector_id"]))

    conn.commit()
    print(f"  Inserted {len(RAMOS_DATA)} ramos")


def seed_categories(conn: sqlite3.Connection) -> None:
    """Insert category reference data."""
    print("Seeding categories...")
    cursor = conn.cursor()

    for i, cat in enumerate(CATEGORIES_DATA, 1):
        cursor.execute("""
            INSERT OR REPLACE INTO categories
            (id, sector_id, sub_sector_id, code, partida_pattern, name_es, name_en, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            i, cat["sector_id"], cat.get("sub_sector_id"), cat["code"],
            cat["partida_pattern"], cat["name_es"], cat.get("name_en")
        ))

    conn.commit()
    print(f"  Inserted {len(CATEGORIES_DATA)} categories")


def verify_schema(conn: sqlite3.Connection) -> None:
    """Verify schema was created correctly."""
    print("\nVerifying schema...")
    cursor = conn.cursor()

    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"  Tables: {', '.join(tables)}")

    # Check counts
    for table in ['sectors', 'sub_sectors', 'ramos', 'categories']:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  {table}: {count} records")

    # Check views
    cursor.execute("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name")
    views = [row[0] for row in cursor.fetchall()]
    print(f"  Views: {', '.join(views)}")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main entry point."""
    print("=" * 70)
    print("RUBLI NORMALIZED DATABASE SCHEMA CREATION")
    print("=" * 70)
    print(f"\nDatabase path: {DB_PATH}")

    # Remove existing database if exists
    if os.path.exists(DB_PATH):
        print(f"\nRemoving existing database...")
        os.remove(DB_PATH)

    # Create database connection
    conn = sqlite3.connect(DB_PATH)

    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        # Create schema
        create_schema(conn)

        # Seed reference data
        seed_sectors(conn)
        seed_sub_sectors(conn)
        seed_ramos(conn)
        seed_categories(conn)

        # Verify
        verify_schema(conn)

        print("\n" + "=" * 70)
        print("SCHEMA CREATION COMPLETE")
        print("=" * 70)
        print(f"\nDatabase ready at: {DB_PATH}")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
