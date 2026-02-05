"""
Create detailed column mapping table for COMPRANET structures
"""

import pandas as pd
from pathlib import Path

# Column mapping data
mapping_data = [
    # Contract Identification
    {
        'category': 'Contract ID',
        'unified_field': 'procedure_number',
        'structure_a': 'NÚMERO DE PROCEDIMIENTO',
        'structure_b': 'NÚMERO DE PROCEDIMIENTO',
        'structure_c': 'Número del procedimiento',
        'structure_d': 'Número de procedimiento',
        'data_type': 'string',
        'required': True,
        'notes': 'Primary key for grouping contract awards'
    },
    {
        'category': 'Contract ID',
        'unified_field': 'contract_code',
        'structure_a': 'NÚMERO DE CONTRATO',
        'structure_b': 'NÚMERO DE CONTRATO',
        'structure_c': 'Código del contrato',
        'structure_d': 'Código del contrato',
        'data_type': 'string',
        'required': True,
        'notes': 'Unique contract identifier'
    },
    {
        'category': 'Contract ID',
        'unified_field': 'contract_reference',
        'structure_a': 'REFERENCIA DE LA CONTRATACIÓN',
        'structure_b': 'REFERENCIA DE LA CONTRATACIÓN',
        'structure_c': 'Referencia del expediente',
        'structure_d': 'Referencia del expediente',
        'data_type': 'string',
        'required': False,
        'notes': 'Internal reference number'
    },
    {
        'category': 'Contract ID',
        'unified_field': 'expediente_code',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Código del expediente',
        'structure_d': 'Código del expediente',
        'data_type': 'string',
        'required': False,
        'notes': 'File/dossier code'
    },

    # Institution
    {
        'category': 'Institution',
        'unified_field': 'institution_name',
        'structure_a': 'DEPENDENCIA / ENTIDAD',
        'structure_b': 'DEPENDENCIA / ENTIDAD',
        'structure_c': 'Institución',
        'structure_d': 'Institución',
        'data_type': 'string',
        'required': True,
        'notes': 'Government institution name'
    },
    {
        'category': 'Institution',
        'unified_field': 'institution_acronym',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Siglas de la Institución',
        'structure_d': 'Siglas de la Institución',
        'data_type': 'string',
        'required': False,
        'notes': 'Institution abbreviation'
    },
    {
        'category': 'Institution',
        'unified_field': 'uc_code',
        'structure_a': 'CLAVE UC',
        'structure_b': 'CLAVE UC',
        'structure_c': 'Clave de la UC',
        'structure_d': 'Clave de la UC',
        'data_type': 'string',
        'required': True,
        'notes': 'Purchasing unit code'
    },
    {
        'category': 'Institution',
        'unified_field': 'uc_name',
        'structure_a': 'NOMBRE UC',
        'structure_b': 'NOMBRE UC',
        'structure_c': 'Nombre de la UC',
        'structure_d': 'Nombre de la UC',
        'data_type': 'string',
        'required': True,
        'notes': 'Purchasing unit name'
    },
    {
        'category': 'Institution',
        'unified_field': 'ramo_code',
        'structure_a': None,
        'structure_b': None,
        'structure_c': None,
        'structure_d': 'Clave Ramo',
        'data_type': 'integer',
        'required': False,
        'notes': 'Budget ramo code - ONLY IN 2023+'
    },
    {
        'category': 'Institution',
        'unified_field': 'ramo_description',
        'structure_a': None,
        'structure_b': None,
        'structure_c': None,
        'structure_d': 'Descripción Ramo',
        'data_type': 'string',
        'required': False,
        'notes': 'Budget ramo description - ONLY IN 2023+'
    },
    {
        'category': 'Institution',
        'unified_field': 'government_level',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Orden de gobierno',
        'structure_d': 'Orden de gobierno',
        'data_type': 'string',
        'required': False,
        'notes': 'Federal/State/Municipal'
    },

    # Amount
    {
        'category': 'Amount',
        'unified_field': 'contract_amount',
        'structure_a': 'IMPORTE MN SIN IVA',
        'structure_b': 'IMPORTE MN SIN IVA',
        'structure_c': 'Importe del contrato',
        'structure_d': 'Importe DRC',
        'data_type': 'float',
        'required': True,
        'notes': 'CRITICAL: Validate < 100B MXN'
    },
    {
        'category': 'Amount',
        'unified_field': 'currency',
        'structure_a': 'MXN (implicit)',
        'structure_b': 'MXN (implicit)',
        'structure_c': 'Moneda del contrato',
        'structure_d': 'Moneda',
        'data_type': 'string',
        'required': True,
        'notes': 'Default to MXN for A/B'
    },

    # Dates
    {
        'category': 'Dates',
        'unified_field': 'signature_date',
        'structure_a': 'FECHA DE SUSCRIPCIÓN DE CONTRATO',
        'structure_b': 'FECHA DE SUSCRIPCIÓN DE CONTRATO',
        'structure_c': 'Fecha de firma del contrato',
        'structure_d': 'Fecha de firma del contrato',
        'data_type': 'datetime',
        'required': True,
        'notes': 'Contract signature date'
    },
    {
        'category': 'Dates',
        'unified_field': 'start_date',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Fecha de inicio del contrato',
        'structure_d': 'Fecha de inicio del contrato',
        'data_type': 'date',
        'required': False,
        'notes': 'Contract start date'
    },
    {
        'category': 'Dates',
        'unified_field': 'end_date',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Fecha de fin del contrato',
        'structure_d': 'Fecha de fin del contrato',
        'data_type': 'date',
        'required': False,
        'notes': 'Contract end date'
    },
    {
        'category': 'Dates',
        'unified_field': 'publication_date',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Fecha de publicación',
        'structure_d': 'Fecha de publicación',
        'data_type': 'datetime',
        'required': False,
        'notes': 'Tender publication date'
    },
    {
        'category': 'Dates',
        'unified_field': 'apertura_date',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Fecha de apertura',
        'structure_d': 'Fecha de apertura',
        'data_type': 'datetime',
        'required': False,
        'notes': 'Bid opening date (null for direct awards)'
    },
    {
        'category': 'Dates',
        'unified_field': 'fallo_date',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Fecha de fallo',
        'structure_d': 'Fecha de fallo',
        'data_type': 'datetime',
        'required': False,
        'notes': 'Award decision date (null for direct awards)'
    },

    # Vendor
    {
        'category': 'Vendor',
        'unified_field': 'vendor_name',
        'structure_a': 'RAZÓN SOCIAL',
        'structure_b': 'RAZÓN SOCIAL',
        'structure_c': 'Proveedor o contratista',
        'structure_d': 'Proveedor o contratista',
        'data_type': 'string',
        'required': True,
        'notes': 'Normalize to UPPERCASE'
    },
    {
        'category': 'Vendor',
        'unified_field': 'vendor_rfc',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'RFC',
        'structure_d': 'rfc',
        'data_type': 'string',
        'required': False,
        'notes': 'Note case change: RFC -> rfc. 0% in A/B, 66% in C, ~100% in D'
    },
    {
        'category': 'Vendor',
        'unified_field': 'rupc_folio',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Folio en el RUPC',
        'structure_d': 'Folio en el RUPC',
        'data_type': 'string',
        'required': False,
        'notes': 'Public registry folio'
    },
    {
        'category': 'Vendor',
        'unified_field': 'vendor_size',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Estratificación de la empresa',
        'structure_d': 'Estratificación',
        'data_type': 'string',
        'required': False,
        'notes': 'Micro/Pequeña/Mediana/Grande'
    },
    {
        'category': 'Vendor',
        'unified_field': 'vendor_country',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Clave del país de la empresa',
        'structure_d': 'País de la empresa',
        'data_type': 'string',
        'required': False,
        'notes': 'Vendor country'
    },

    # Procedure
    {
        'category': 'Procedure',
        'unified_field': 'procedure_type',
        'structure_a': 'TIPO DE PROCEDIMIENTO',
        'structure_b': 'TIPO DE PROCEDIMIENTO',
        'structure_c': 'Tipo de procedimiento',
        'structure_d': 'Tipo Procedimiento',
        'data_type': 'string',
        'required': True,
        'notes': 'Licitación Pública/Invitación/Adjudicación Directa'
    },
    {
        'category': 'Procedure',
        'unified_field': 'procurement_type',
        'structure_a': 'TIPO CONTRATACIÓN',
        'structure_b': 'TIPO CONTRATACIÓN',
        'structure_c': 'Tipo de contratación',
        'structure_d': 'Tipo de contratación',
        'data_type': 'string',
        'required': True,
        'notes': 'Obra/Servicios/Adquisiciones'
    },
    {
        'category': 'Procedure',
        'unified_field': 'character',
        'structure_a': 'CARACTER',
        'structure_b': 'CARACTER',
        'structure_c': 'Carácter del procedimiento',
        'structure_d': 'Carácter del procedimiento',
        'data_type': 'string',
        'required': True,
        'notes': 'Nacional/Internacional'
    },
    {
        'category': 'Procedure',
        'unified_field': 'participation_form',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Forma de participación',
        'structure_d': 'Forma de participación',
        'data_type': 'string',
        'required': False,
        'notes': 'Presencial/Electrónica/Mixta (82% null in D)'
    },
    {
        'category': 'Procedure',
        'unified_field': 'legal_basis',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Fundamento legal',
        'structure_d': None,
        'data_type': 'string',
        'required': False,
        'notes': 'Legal article citation'
    },
    {
        'category': 'Procedure',
        'unified_field': 'exception_article',
        'structure_a': None,
        'structure_b': None,
        'structure_c': None,
        'structure_d': 'Artículo de excepción',
        'data_type': 'string',
        'required': False,
        'notes': 'Exception article for direct awards'
    },
    {
        'category': 'Procedure',
        'unified_field': 'exception_description',
        'structure_a': None,
        'structure_b': None,
        'structure_c': None,
        'structure_d': 'Descripción excepción',
        'data_type': 'string',
        'required': False,
        'notes': 'Exception reason description'
    },

    # Classification
    {
        'category': 'Classification',
        'unified_field': 'partida_especifica',
        'structure_a': None,
        'structure_b': None,
        'structure_c': None,
        'structure_d': 'Partida específica',
        'data_type': 'string',
        'required': False,
        'notes': 'Budget line item - ONLY IN 2023+ (100% coverage)'
    },
    {
        'category': 'Classification',
        'unified_field': 'cucop_code',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Clave CUCOP',
        'structure_d': None,
        'data_type': 'string',
        'required': False,
        'notes': 'Product/service classification (2018-2022 only)'
    },
    {
        'category': 'Classification',
        'unified_field': 'contract_title',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Título del contrato',
        'structure_d': 'Título del contrato',
        'data_type': 'string',
        'required': False,
        'notes': 'Contract title/subject'
    },
    {
        'category': 'Classification',
        'unified_field': 'contract_description',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Descripción del contrato',
        'structure_d': 'Descripción del contrato',
        'data_type': 'string',
        'required': False,
        'notes': 'Detailed contract description'
    },

    # Flags
    {
        'category': 'Flags',
        'unified_field': 'is_framework_agreement',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Contrato marco',
        'structure_d': 'Contrato marco',
        'data_type': 'boolean',
        'required': False,
        'notes': 'Framework/umbrella contract flag'
    },
    {
        'category': 'Flags',
        'unified_field': 'is_consolidated',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Compra consolidada',
        'structure_d': 'Compra consolidada',
        'data_type': 'boolean',
        'required': False,
        'notes': 'Consolidated purchase flag'
    },
    {
        'category': 'Flags',
        'unified_field': 'is_multiyear',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Contrato plurianual',
        'structure_d': 'Contrato plurianual',
        'data_type': 'boolean',
        'required': False,
        'notes': 'Multi-year contract flag'
    },
    {
        'category': 'Flags',
        'unified_field': 'has_modification',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Convenio modificatorio',
        'structure_d': 'Convenio modificatorio',
        'data_type': 'boolean',
        'required': False,
        'notes': 'Contract modification flag (72% null in D)'
    },
    {
        'category': 'Flags',
        'unified_field': 'rfc_verified_sat',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'RFC verificado en el SAT',
        'structure_d': None,
        'data_type': 'boolean',
        'required': False,
        'notes': 'RFC verified in tax authority (Structure C only)'
    },

    # URL/Reference
    {
        'category': 'Reference',
        'unified_field': 'contract_url',
        'structure_a': 'URL DEL CONTRATO',
        'structure_b': 'URL DEL CONTRATO',
        'structure_c': None,
        'structure_d': None,
        'data_type': 'string',
        'required': False,
        'notes': 'Contract document URL (only A/B)'
    },
    {
        'category': 'Reference',
        'unified_field': 'announcement_url',
        'structure_a': None,
        'structure_b': None,
        'structure_c': 'Dirección del anuncio',
        'structure_d': 'Dirección del anuncio',
        'data_type': 'string',
        'required': False,
        'notes': 'Tender announcement URL'
    },
]

# Create DataFrame
df = pd.DataFrame(mapping_data)

# Save to CSV
output_file = Path(r"D:\Python\yangwenli\column_mapping.csv")
df.to_csv(output_file, index=False, encoding='utf-8-sig')

print(f"Column mapping saved to: {output_file}")
print(f"\nTotal fields mapped: {len(df)}")
print(f"\nFields by category:")
print(df.groupby('category').size())

print(f"\nFields available by structure:")
print(f"  Structure A: {df['structure_a'].notna().sum()} / {len(df)}")
print(f"  Structure B: {df['structure_b'].notna().sum()} / {len(df)}")
print(f"  Structure C: {df['structure_c'].notna().sum()} / {len(df)}")
print(f"  Structure D: {df['structure_d'].notna().sum()} / {len(df)}")

print(f"\nRequired fields: {df[df['required']].shape[0]}")
print(f"Optional fields: {df[~df['required']].shape[0]}")

# Create markdown table
print("\n\n=== MARKDOWN TABLE ===\n")
print("| Category | Unified Field | Structure A | Structure B | Structure C | Structure D | Required | Notes |")
print("|----------|---------------|-------------|-------------|-------------|-------------|----------|-------|")

for _, row in df.iterrows():
    a = row['structure_a'] if pd.notna(row['structure_a']) else 'N/A'
    b = row['structure_b'] if pd.notna(row['structure_b']) else 'N/A'
    c = row['structure_c'] if pd.notna(row['structure_c']) else 'N/A'
    d = row['structure_d'] if pd.notna(row['structure_d']) else 'N/A'
    req = 'Yes' if row['required'] else 'No'

    print(f"| {row['category']} | `{row['unified_field']}` | {a} | {b} | {c} | {d} | {req} | {row['notes']} |")
