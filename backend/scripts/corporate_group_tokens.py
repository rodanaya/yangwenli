#!/usr/bin/env python3
"""
Corporate Group Token Dictionary for Vendor Matching

This module provides token-based matching for corporate groups instead of
SQL LIKE patterns. Tokens are matched as complete words (not substrings)
to reduce false positives.

Usage:
    from corporate_group_tokens import match_corporate_group

    result = match_corporate_group("CICSA CONSTRUCTORES SA DE CV")
    # Returns: ('Grupo Carso', ['CICSA'], 0.95)
"""

# Token dictionary: corporate_group -> list of identifying tokens
# Tokens are matched as complete words in vendor names
CORPORATE_GROUP_TOKENS = {
    # ============================================================
    # MAJOR MEXICAN CONGLOMERATES
    # ============================================================
    'Grupo Carso': [
        # Removed 'CLARO' - common Spanish word meaning "clear/obviously"
        'CARSO', 'CICSA', 'INBURSA', 'CONDUMEX', 'SANBORN', 'SANBORNS',
        'TELMEX', 'TELEFONOS DE MEXICO', 'SEARS OPERADORA',
        'GRUPO CARSO', 'IDEAL INVERSIONES', 'CLARO MEXICO',
    ],
    'Grupo Alfa': [
        # Removed 'ALFA' - too common (Greek alphabet)
        'GRUPO ALFA', 'ALFA SAB', 'ALPEK', 'NEMAK', 'SIGMA ALIMENTOS', 'AXTEL',
        'POLIOLES', 'PETROTEMEX', 'DAK AMERICAS',
    ],
    'FEMSA': [
        'FEMSA', 'OXXO', 'COCA-COLA FEMSA', 'COCA COLA FEMSA',
        'FOMENTO ECONOMICO MEXICANO', 'HEINEKEN MEXICO',
    ],
    'Grupo Bimbo': [
        'BIMBO', 'MARINELA', 'BARCEL', 'TIA ROSA', 'RICOLINO',
        'GRUPO BIMBO', 'WONDER', 'OROWEAT',
    ],
    'Grupo Salinas': [
        'TV AZTECA', 'AZTECA TELEVISION', 'ELEKTRA', 'BANCO AZTECA',
        'ITALIKA', 'TOTALPLAY', 'GRUPO SALINAS',
    ],
    'Grupo BAL': [
        # Removed 'FRESNILLO' - city name in Zacatecas, causes false positives
        'PENOLES', 'INDUSTRIAS PENOLES', 'GNP', 'GRUPO NACIONAL PROVINCIAL',
        'PROFUTURO', 'GRUPO BAL', 'FRESNILLO PLC',
    ],
    'Grupo Mexico': [
        'GRUPO MEXICO', 'SOUTHERN COPPER', 'MINERA MEXICO',
        'FERROMEX', 'FERROSUR', 'ASARCO',
    ],
    'Cemex': [
        'CEMEX', 'CEMENTO MEXICANO', 'CONCRETOS APASCO',
    ],
    'Grupo Televisa': [
        'TELEVISA', 'IZZI', 'SKY', 'CABLEVISION', 'EDITORIAL TELEVISA',
        'GRUPO TELEVISA',
    ],
    'America Movil': [
        'AMERICA MOVIL', 'TELCEL', 'TRACFONE', 'CLARO MEXICO',
    ],
    'Grupo Modelo': [
        # Removed CORONA and MODELO - too common
        'GRUPO MODELO', 'CERVECERIA MODELO', 'CERVEZA MODELO',
    ],
    'Grupo Lala': [
        'LALA', 'GRUPO LALA', 'LACTEOS LALA',
    ],
    'Grupo Herdez': [
        'HERDEZ', 'GRUPO HERDEZ', 'MCCORMICK MEXICO',
    ],
    'Grupo Coppel': [
        'COPPEL', 'BANCOPPEL', 'AFORE COPPEL',
    ],
    'Grupo Liverpool': [
        'LIVERPOOL', 'FABRICAS DE FRANCIA', 'SUBURBIA',
    ],
    'Grupo Aeroportuario': [
        'OMA', 'GRUPO AEROPORTUARIO', 'ASUR', 'GAP',
    ],
    'Vitro': [
        'VITRO', 'VIDRIERA', 'VIDRIO PLANO', 'CRISA',
    ],
    'Arca Continental': [
        # Removed ARCA alone - too common
        'ARCA CONTINENTAL', 'TONICORP', 'BEBIDAS MUNDIALES',
    ],
    'Kimberly-Clark de Mexico': [
        'KIMBERLY', 'KLEENEX', 'HUGGIES', 'KOTEX',
    ],
    'Alsea': [
        'ALSEA', 'STARBUCKS COFFEE MEXICO', 'VIPS', 'DOMINOS PIZZA',
        'BURGER KING MEXICO', 'ITALIANNIS', 'CHILIS',
    ],

    # ============================================================
    # GOVERNMENT & STATE ENTERPRISES
    # ============================================================
    'PEMEX': [
        'PEMEX', 'PETROLEOS MEXICANOS', 'PMI COMERCIO',
        'PEMEX EXPLORACION', 'PEMEX REFINACION', 'PEMEX LOGISTICA',
    ],
    'CFE': [
        'CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'CFE DISTRIBUCION',
        'CFE GENERACION', 'CFE TRANSMISION',
    ],
    'IMSS': [
        'IMSS', 'INSTITUTO MEXICANO DEL SEGURO SOCIAL',
    ],
    'ISSSTE': [
        'ISSSTE', 'FOVISSSTE',
    ],

    # ============================================================
    # INTERNATIONAL CONGLOMERATES
    # ============================================================
    'Walmart': [
        'WALMART', 'WALMEX', 'SAMS CLUB', 'BODEGA AURRERA',
        'SUPERAMA', 'WALMART MEXICO',
    ],
    'Johnson Controls': [
        'JOHNSON CONTROLS', 'YORK', 'TYCO', 'GRINNELL',
    ],
    'Deere & Company': [
        'JOHN DEERE', 'DEERE', 'INDUSTRIAS JOHN DEERE',
    ],
    'Linde': [
        'LINDE', 'PRAXAIR', 'LINDE MEXICO',
    ],
    'Nestle': [
        'NESTLE', 'PURINA', 'NESCAFE', 'GERBER MEXICO',
    ],
    'Siemens': [
        'SIEMENS', 'SIEMENS HEALTHINEERS', 'SIEMENS ENERGY',
    ],
    'ABB': [
        'ABB MEXICO', 'ABB AUTOMATION', 'BALDOR',
    ],
    'BASF': [
        'BASF', 'BASF MEXICANA', 'BASF AGRO',
    ],
    'Bayer': [
        'BAYER', 'BAYER MEXICO', 'MONSANTO',
    ],
    'FedEx': [
        'FEDEX', 'FEDERAL EXPRESS',
    ],
    'UPS': [
        'UPS MEXICO', 'UNITED PARCEL', 'UPS DE MEXICO',
    ],
    'DHL': [
        'DHL', 'DHL EXPRESS', 'DHL MEXICO',
    ],
    'HP': [
        'HEWLETT PACKARD', 'HP MEXICO', 'HP INC',
    ],
    'Dell': [
        'DELL MEXICO', 'DELL TECHNOLOGIES',
    ],
    'Microsoft': [
        'MICROSOFT', 'MICROSOFT MEXICO',
    ],
    'Oracle': [
        'ORACLE', 'ORACLE MEXICO',
    ],
    'SAP': [
        'SAP MEXICO', 'SAP SE',
    ],
    'IBM': [
        'IBM', 'IBM MEXICO', 'INTERNATIONAL BUSINESS MACHINES',
    ],
    'General Electric': [
        'GENERAL ELECTRIC', 'GE MEXICO', 'GE HEALTHCARE',
    ],
    'Caterpillar': [
        'CATERPILLAR', 'CAT MEXICO', 'FINNING',
    ],
    'CNH Industrial': [
        'CNH INDUSTRIAL', 'NEW HOLLAND', 'CASE IH', 'CNH DE MEXICO',
    ],
    'AGCO': [
        'AGCO', 'MASSEY FERGUSON', 'FENDT', 'VALTRA',
    ],
    'Honeywell': [
        'HONEYWELL', 'HONEYWELL MEXICO',
    ],
    'Emerson': [
        'EMERSON', 'EMERSON MEXICO', 'EMERSON ELECTRIC',
    ],
    '3M': [
        '3M MEXICO', '3M MANUFACTURERA',
    ],
    'Schneider Electric': [
        'SCHNEIDER ELECTRIC', 'SCHNEIDER MEXICO', 'SQUARE D',
    ],
    'Rockwell Automation': [
        'ROCKWELL', 'ALLEN BRADLEY', 'ROCKWELL AUTOMATION',
    ],
    'Stanley Black & Decker': [
        'DEWALT', 'STANLEY HERRAMIENTAS', 'BLACK DECKER',
    ],
    'Bosch': [
        'BOSCH', 'ROBERT BOSCH', 'BOSCH MEXICO',
    ],
    'WPP': [
        'OGILVY', 'JWT', 'YOUNG RUBICAM', 'WPP MEXICO',
    ],
    'Omnicom': [
        'OMNICOM', 'BBDO', 'DDB', 'TBWA',
    ],
    'Publicis': [
        'PUBLICIS', 'SAATCHI', 'LEO BURNETT',
    ],
    'Mars': [
        'MARS PETCARE', 'EFFEM', 'PEDIGREE', 'WHISKAS', 'SNICKERS',
    ],
    'Mondelez': [
        'MONDELEZ', 'KRAFT FOODS', 'CADBURY', 'OREO', 'TANG',
    ],
    'PepsiCo': [
        'PEPSICO', 'SABRITAS', 'GAMESA', 'QUAKER', 'GATORADE',
    ],
    'Heineken': [
        'HEINEKEN MEXICO', 'CUAUHTEMOC MOCTEZUMA', 'CERVECERIA CUAUHTEMOC',
        'TECATE', 'SOL', 'DOS EQUIS',
    ],
    'AB InBev': [
        # Removed 'CORONA' - common word meaning "crown" in Spanish
        # Removed 'GRUPO MODELO' - already in Grupo Modelo section
        'ANHEUSER', 'ANHEUSER BUSCH', 'BUDWEISER', 'CERVECERIA MODELO',
    ],
    'Danone': [
        'DANONE', 'BONAFONT', 'ACTIVIA',
    ],
    'Unilever': [
        'UNILEVER', 'HOLANDA', 'DOVE', 'AXE', 'REXONA',
    ],
    'Procter & Gamble': [
        'PROCTER', 'GAMBLE', 'PANTENE', 'HEAD SHOULDERS', 'ARIEL', 'DOWNY',
    ],
    'Colgate-Palmolive': [
        'COLGATE', 'PALMOLIVE', 'COLGATE PALMOLIVE',
    ],
    'Johnson & Johnson': [
        'JOHNSON JOHNSON', 'JANSSEN', 'NEUTROGENA',
    ],
    'Pfizer': [
        'PFIZER', 'PFIZER MEXICO',
    ],
    'Roche': [
        'ROCHE MEXICO', 'PRODUCTOS ROCHE', 'HOFFMANN LA ROCHE',
    ],
    'Novartis': [
        'NOVARTIS', 'SANDOZ', 'NOVARTIS MEXICO',
    ],
    'Merck': [
        'MERCK MEXICO', 'MSD', 'MERCK SHARP',
    ],
    'AstraZeneca': [
        'ASTRAZENECA', 'ASTRA ZENECA',
    ],
    'GlaxoSmithKline': [
        'GLAXOSMITHKLINE', 'GSK', 'GLAXO',
    ],
    'Sanofi': [
        'SANOFI', 'SANOFI AVENTIS', 'SANOFI MEXICO',
    ],
    'Abbott': [
        'ABBOTT', 'ABBOTT MEXICO', 'ABBOTT LABORATORIES',
    ],
    'Medtronic': [
        'MEDTRONIC', 'MEDTRONIC MEXICO',
    ],
    'Stryker': [
        'STRYKER', 'STRYKER MEXICO',
    ],
    'Zimmer Biomet': [
        'ZIMMER', 'BIOMET', 'ZIMMER BIOMET',
    ],

    # ============================================================
    # AUTOMOTIVE
    # ============================================================
    'Volkswagen': [
        'VOLKSWAGEN', 'VW MEXICO', 'AUDI MEXICO', 'SEAT MEXICO',
    ],
    'General Motors': [
        'GENERAL MOTORS', 'GM MEXICO', 'CHEVROLET',
    ],
    'Ford': [
        'FORD MOTOR', 'FORD MEXICO',
    ],
    'Toyota': [
        'TOYOTA', 'TOYOTA MEXICO', 'LEXUS',
    ],
    'Nissan': [
        'NISSAN', 'NISSAN MEXICANA', 'INFINITI',
    ],
    'Honda': [
        'HONDA', 'HONDA MEXICO',
    ],
    'BMW': [
        'BMW', 'BMW MEXICO', 'MINI MEXICO',
    ],
    'Mercedes-Benz': [
        'MERCEDES', 'DAIMLER', 'MERCEDES BENZ',
    ],
    'Kia': [
        'KIA MOTORS', 'KIA MEXICO',
    ],
    'Hyundai': [
        'HYUNDAI', 'HYUNDAI MEXICO',
    ],
}

# Minimum token length to avoid false positives
MIN_TOKEN_LENGTH = 4


def tokenize_name(name: str) -> set:
    """
    Tokenize a vendor name into words.
    Returns uppercase tokens for matching.
    """
    import re
    # Remove punctuation and split
    name = name.upper()
    name = re.sub(r'[^\w\s]', ' ', name)
    tokens = set(name.split())
    # Filter out short tokens and common words
    stop_words = {'DE', 'LA', 'EL', 'LOS', 'LAS', 'SA', 'CV', 'SAPI', 'SC', 'RL', 'AC'}
    tokens = {t for t in tokens if len(t) >= MIN_TOKEN_LENGTH and t not in stop_words}
    return tokens


def match_corporate_group(vendor_name: str, is_individual: bool = False) -> tuple:
    """
    Match a vendor name against corporate group tokens.

    Args:
        vendor_name: The vendor name to match
        is_individual: If True, skip matching (individuals don't belong to groups)

    Returns:
        Tuple of (corporate_group, matched_tokens, confidence) or (None, [], 0.0)
    """
    import re

    if is_individual:
        return (None, [], 0.0)

    vendor_tokens = tokenize_name(vendor_name)
    vendor_upper = vendor_name.upper()
    best_match = (None, [], 0.0)

    for corp_group, group_tokens in CORPORATE_GROUP_TOKENS.items():
        matched = []
        for token in group_tokens:
            # Check if token appears as a complete word
            token_upper = token.upper()
            if ' ' in token:
                # Multi-word token - use regex word boundary
                # Escape special chars and add word boundaries
                pattern = r'\b' + re.escape(token_upper) + r'\b'
                if re.search(pattern, vendor_upper):
                    matched.append(token)
            else:
                # Single-word token - check in tokenized set
                if token_upper in vendor_tokens:
                    matched.append(token)

        if matched:
            # Calculate confidence based on match strength
            confidence = min(0.95, 0.80 + (len(matched) * 0.05))
            if len(matched) > len(best_match[1]):
                best_match = (corp_group, matched, confidence)

    return best_match


def get_all_tokens() -> dict:
    """Return the full token dictionary."""
    return CORPORATE_GROUP_TOKENS


if __name__ == '__main__':
    # Test the matcher
    test_names = [
        "CICSA CONSTRUCTORES SA DE CV",
        "SEGUROS INBURSA SA DE CV",
        "OXXO SA DE CV",
        "WALMART DE MEXICO SAB DE CV",
        "PEMEX EXPLORACION Y PRODUCCION",
        "CEMEX CONCRETOS SA DE CV",
        "SIEMENS MEXICO SA DE CV",
        "JUAN PEREZ GARCIA",  # Should not match
    ]

    print("Token Matching Test Results:")
    print("=" * 60)
    for name in test_names:
        corp, tokens, conf = match_corporate_group(name)
        if corp:
            print(f"\n{name[:50]}")
            print(f"  -> {corp} (confidence: {conf:.2f})")
            print(f"  -> Matched tokens: {tokens}")
        else:
            print(f"\n{name[:50]}")
            print(f"  -> No match")
