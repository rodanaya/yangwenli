#!/usr/bin/env python3
"""
Create vendor classification infrastructure for mass vendor classification.
Part of the Grand Classification Expansion.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def create_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Creating vendor classification infrastructure...")

    # Create vendor_industries table (taxonomy)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS vendor_industries (
        id INTEGER PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name_es VARCHAR(200) NOT NULL,
        name_en VARCHAR(200) NOT NULL,
        parent_id INTEGER REFERENCES vendor_industries(id),
        sector_affinity INTEGER REFERENCES sectors(id),
        description TEXT,
        is_active INTEGER DEFAULT 1,
        display_order INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("  Created: vendor_industries")

    # Create vendor_classifications table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS vendor_classifications (
        id INTEGER PRIMARY KEY,
        vendor_id INTEGER UNIQUE NOT NULL REFERENCES vendors(id),

        -- Industry classification
        industry_id INTEGER REFERENCES vendor_industries(id),
        industry_code VARCHAR(50),
        industry_confidence REAL DEFAULT 0,
        industry_source VARCHAR(50),
        industry_rule VARCHAR(200),

        -- Company type classification
        company_type VARCHAR(50),
        company_subtype VARCHAR(100),

        -- Size classification
        size_class VARCHAR(20),
        size_source VARCHAR(50),

        -- Geographic
        is_domestic INTEGER DEFAULT 1,
        is_international INTEGER DEFAULT 0,

        -- Business model
        is_individual INTEGER DEFAULT 0,
        is_government INTEGER DEFAULT 0,
        specialization_score REAL,

        -- Metadata
        classification_version INTEGER DEFAULT 1,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("  Created: vendor_classifications")

    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vc_vendor ON vendor_classifications(vendor_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vc_industry ON vendor_classifications(industry_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vc_company_type ON vendor_classifications(company_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vc_size ON vendor_classifications(size_class)')
    print("  Created indexes")

    # Populate vendor_industries taxonomy
    industries = [
        # Construction & Infrastructure (10-19)
        (10, 'construccion', 'Construccion', 'Construction', None, 3, 'General construction'),
        (11, 'construccion_civil', 'Construccion Civil', 'Civil Construction', 10, 3, 'Roads, bridges, infrastructure'),
        (12, 'construccion_edificacion', 'Edificacion', 'Building Construction', 10, 3, 'Buildings, residential'),
        (13, 'inmobiliario', 'Inmobiliario', 'Real Estate', 10, 3, 'Real estate development'),
        (14, 'arquitectura', 'Arquitectura', 'Architecture', 10, 3, 'Architectural services'),

        # Healthcare & Pharma (20-29)
        (20, 'salud', 'Salud', 'Healthcare', None, 1, 'Healthcare sector'),
        (21, 'farmaceutico', 'Farmaceutico', 'Pharmaceutical', 20, 1, 'Pharmaceuticals'),
        (22, 'equipo_medico', 'Equipo Medico', 'Medical Equipment', 20, 1, 'Medical devices'),
        (23, 'laboratorio', 'Laboratorio', 'Laboratory', 20, 1, 'Laboratory services'),
        (24, 'hospital', 'Hospital/Clinica', 'Hospital/Clinic', 20, 1, 'Healthcare facilities'),

        # Technology (30-39)
        (30, 'tecnologia', 'Tecnologia', 'Technology', None, 6, 'Technology sector'),
        (31, 'software', 'Software', 'Software', 30, 6, 'Software development'),
        (32, 'hardware', 'Hardware/Computo', 'Hardware/Computing', 30, 6, 'Computer hardware'),
        (33, 'telecomunicaciones', 'Telecomunicaciones', 'Telecommunications', 30, 6, 'Telecom'),
        (34, 'sistemas', 'Sistemas', 'Systems', 30, 6, 'IT systems'),

        # Services (40-49)
        (40, 'servicios', 'Servicios', 'Services', None, 12, 'General services'),
        (41, 'consultoria', 'Consultoria', 'Consulting', 40, 12, 'Consulting services'),
        (42, 'seguridad', 'Seguridad', 'Security', 40, 5, 'Security services'),
        (43, 'limpieza', 'Limpieza', 'Cleaning', 40, 12, 'Cleaning services'),
        (44, 'mantenimiento', 'Mantenimiento', 'Maintenance', 40, 12, 'Maintenance'),
        (45, 'logistica', 'Logistica', 'Logistics', 40, 3, 'Logistics/transport'),
        (46, 'publicidad', 'Publicidad/Marketing', 'Advertising/Marketing', 40, 12, 'Marketing'),

        # Commerce & Distribution (50-59)
        (50, 'comercio', 'Comercio', 'Commerce', None, 12, 'Trade/commerce'),
        (51, 'distribucion', 'Distribucion', 'Distribution', 50, 12, 'Distribution'),
        (52, 'importacion', 'Importacion/Exportacion', 'Import/Export', 50, 12, 'Trade'),

        # Energy & Resources (60-69)
        (60, 'energia', 'Energia', 'Energy', None, 4, 'Energy sector'),
        (61, 'petroleo', 'Petroleo y Gas', 'Oil and Gas', 60, 4, 'Oil and gas'),
        (62, 'electricidad', 'Electricidad', 'Electricity', 60, 4, 'Electrical'),
        (63, 'renovables', 'Energias Renovables', 'Renewable Energy', 60, 4, 'Renewables'),

        # Manufacturing (70-79)
        (70, 'manufactura', 'Manufactura', 'Manufacturing', None, 12, 'Manufacturing'),
        (71, 'quimicos', 'Quimicos', 'Chemicals', 70, 12, 'Chemical products'),
        (72, 'alimentos', 'Alimentos', 'Food', 70, 9, 'Food processing'),
        (73, 'textiles', 'Textiles', 'Textiles', 70, 12, 'Textile manufacturing'),
        (74, 'metalmecanico', 'Metalmecanico', 'Metal/Mechanical', 70, 12, 'Metal products'),

        # Financial (80-89)
        (80, 'financiero', 'Financiero', 'Financial', None, 7, 'Financial sector'),
        (81, 'banca', 'Banca', 'Banking', 80, 7, 'Banking'),
        (82, 'seguros', 'Seguros', 'Insurance', 80, 7, 'Insurance'),
        (83, 'arrendamiento', 'Arrendamiento', 'Leasing', 80, 7, 'Leasing'),

        # Education & Culture (90-99)
        (90, 'educacion', 'Educacion', 'Education', None, 2, 'Education'),
        (91, 'editorial', 'Editorial', 'Publishing', 90, 2, 'Publishing'),
        (92, 'capacitacion', 'Capacitacion', 'Training', 90, 2, 'Training services'),

        # Other sectors (100+)
        (100, 'agricultura', 'Agricultura', 'Agriculture', None, 9, 'Agriculture'),
        (101, 'turismo', 'Turismo', 'Tourism', None, 12, 'Tourism/hospitality'),
        (102, 'transporte', 'Transporte', 'Transportation', None, 3, 'Transportation'),
        (103, 'ambiental', 'Ambiental', 'Environmental', None, 10, 'Environmental'),
        (104, 'ingenieria', 'Ingenieria', 'Engineering', None, 3, 'Engineering services'),
        (105, 'gobierno', 'Gobierno', 'Government', None, 8, 'Government entity'),
        (199, 'otros', 'Otros', 'Other', None, 12, 'Unclassified'),
    ]

    cursor.execute('DELETE FROM vendor_industries')  # Clear existing
    for ind in industries:
        cursor.execute('''
            INSERT INTO vendor_industries (id, code, name_es, name_en, parent_id, sector_affinity, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ind)
    print(f"  Inserted {len(industries)} industry categories")

    conn.commit()
    print()
    print("Vendor classification infrastructure created!")
    conn.close()

if __name__ == "__main__":
    create_schema()
