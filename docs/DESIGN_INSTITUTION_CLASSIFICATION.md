# Institution Classification Design Document

> *"To know your enemy, you must become your enemy."* - Sun Tzu (adapted by Yang Wen-li)

**Version:** 1.0
**Status:** Design Phase
**Author:** Claude Code Assistant

---

## 1. Objective

Classify 4,456 government institutions into standardized categories to enable:
- Accurate sector-based analysis
- Institutional hierarchy understanding
- Cross-institution comparisons
- Risk pattern detection by institution type

---

## 2. Current State Analysis

### 2.1 Data Profile

| Metric | Value |
|--------|-------|
| Total Institutions | 4,456 |
| Naming Patterns | Multiple (federal, state, municipal) |
| Encoding Issues | Present (UTF-8 artifacts) |

### 2.2 Observed Naming Patterns

| Pattern | Count | Example |
|---------|-------|---------|
| State prefix (XXX-) | ~2,000 | `PUE-Presidencia Municipal de...` |
| Federal secretariats | 30 | `SECRETARIA DE...` |
| State governments | 54 | `GOBIERNO DEL ESTADO DE...` |
| Municipalities | 102 | `Presidencia Municipal de...` |
| Institutes | 463 | `INSTITUTO NACIONAL DE...` |
| Universities | 271 | `UNIVERSIDAD...` |
| Hospitals | 21 | `HOSPITAL...` |
| Autonomous | 8+ | `PEMEX`, `ISSSTE` |

### 2.3 State Abbreviation Codes

Identified prefixes indicating state-level entities:
```
AGS, BC, BCS, CAMP, CHIH, CHIS, COAH, COL, CDMX, DGO, GRO, GTO,
HGO, JAL, MEX, MICH, MOR, NAY, NL, OAX, PUE, QRO, QROO, SLP,
SIN, SON, TAB, TAMS, TLAX, VER, YUC, ZAC
```

---

## 3. Proposed Taxonomy

### 3.1 Institution Types (Primary Classification)

| ID | Type | Description | Detection Strategy |
|----|------|-------------|-------------------|
| 1 | federal_secretariat | Federal ministries | Keywords: SECRETARIA, SUBSECRETARIA |
| 2 | federal_agency | Federal agencies/commissions | Keywords: COMISION, AGENCIA, CONSEJO |
| 3 | decentralized | Decentralized public entities | Keywords: IMSS, ISSSTE, PEMEX, CFE |
| 4 | autonomous | Constitutionally autonomous | List: BANXICO, INE, INAI, CNDH |
| 5 | state_government | State executive branch | Pattern: GOBIERNO DEL ESTADO |
| 6 | state_agency | State-level agencies | Prefix + agency keywords |
| 7 | municipal | Municipal governments | Keywords: MUNICIPIO, AYUNTAMIENTO |
| 8 | educational | Educational institutions | Keywords: UNIVERSIDAD, INSTITUTO, COLEGIO |
| 9 | health | Health institutions | Keywords: HOSPITAL, CLINICA, CENTRO DE SALUD |
| 10 | judicial | Judicial branch | Keywords: TRIBUNAL, JUZGADO, SUPREMA CORTE |
| 11 | legislative | Legislative branch | Keywords: CAMARA, SENADO, CONGRESO |
| 12 | military | Military/defense | Keywords: EJERCITO, ARMADA, SEDENA, SEMAR |
| 13 | other | Unclassified | Fallback |

### 3.2 Institution Levels (Secondary Classification)

| ID | Level | Description |
|----|-------|-------------|
| 1 | secretariat | Cabinet-level ministry |
| 2 | subsecretariat | Deputy ministry |
| 3 | directorate | Directorate general |
| 4 | unit | Administrative unit |
| 5 | delegation | Regional delegation |
| 6 | branch | Branch office |
| 7 | headquarters | Central office |

### 3.3 Geographic Scope

| ID | Scope | Description |
|----|-------|-------------|
| 1 | federal | National scope |
| 2 | state | Single state scope |
| 3 | municipal | Single municipality |
| 4 | regional | Multi-state region |

---

## 4. Database Schema Changes

### 4.1 New Tables

```sql
-- Institution types lookup
CREATE TABLE institution_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    is_government BOOLEAN DEFAULT 1,
    risk_baseline REAL DEFAULT 0.0
);

-- Institution levels lookup
CREATE TABLE institution_levels (
    id INTEGER PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    hierarchy_order INTEGER
);

-- Geographic scope lookup
CREATE TABLE geographic_scopes (
    id INTEGER PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name_es VARCHAR(50) NOT NULL,
    name_en VARCHAR(50)
);

-- State codes lookup
CREATE TABLE states (
    id INTEGER PRIMARY KEY,
    code VARCHAR(5) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10)
);
```

### 4.2 Institutions Table Updates

```sql
ALTER TABLE institutions ADD COLUMN institution_type_id INTEGER
    REFERENCES institution_types(id);
ALTER TABLE institutions ADD COLUMN institution_level_id INTEGER
    REFERENCES institution_levels(id);
ALTER TABLE institutions ADD COLUMN geographic_scope_id INTEGER
    REFERENCES geographic_scopes(id);
ALTER TABLE institutions ADD COLUMN state_id INTEGER
    REFERENCES states(id);
ALTER TABLE institutions ADD COLUMN parent_institution_id INTEGER
    REFERENCES institutions(id);
ALTER TABLE institutions ADD COLUMN normalized_name VARCHAR(500);
ALTER TABLE institutions ADD COLUMN classification_confidence REAL;
ALTER TABLE institutions ADD COLUMN classification_method VARCHAR(20);
ALTER TABLE institutions ADD COLUMN is_verified BOOLEAN DEFAULT 0;
```

---

## 5. Classification Algorithm

### 5.1 Rule-Based Classifier (Phase 1)

```python
class InstitutionClassifier:
    """Rule-based institution classifier."""

    FEDERAL_SECRETARIATS = [
        'SECRETARIA DE GOBERNACION',
        'SECRETARIA DE HACIENDA',
        'SECRETARIA DE ECONOMIA',
        # ... complete list
    ]

    AUTONOMOUS_INSTITUTIONS = [
        ('BANCO DE MEXICO', 'BANXICO'),
        ('INSTITUTO NACIONAL ELECTORAL', 'INE'),
        ('INSTITUTO NACIONAL DE TRANSPARENCIA', 'INAI'),
        ('COMISION NACIONAL DE LOS DERECHOS HUMANOS', 'CNDH'),
        # ... complete list
    ]

    DECENTRALIZED = [
        ('INSTITUTO MEXICANO DEL SEGURO SOCIAL', 'IMSS'),
        ('INSTITUTO DE SEGURIDAD', 'ISSSTE'),
        ('PETROLEOS MEXICANOS', 'PEMEX'),
        ('COMISION FEDERAL DE ELECTRICIDAD', 'CFE'),
    ]

    STATE_PREFIXES = [
        'AGS', 'BC', 'BCS', 'CAMP', 'CHIH', 'CHIS', 'COAH', 'COL',
        'CDMX', 'DGO', 'GRO', 'GTO', 'HGO', 'JAL', 'MEX', 'MICH',
        'MOR', 'NAY', 'NL', 'OAX', 'PUE', 'QRO', 'QROO', 'SLP',
        'SIN', 'SON', 'TAB', 'TAMS', 'TLAX', 'VER', 'YUC', 'ZAC'
    ]

    def classify(self, name: str) -> dict:
        """Classify institution by name."""
        normalized = self.normalize(name)

        # Check for state prefix (XXX-...)
        state_id = self.extract_state(normalized)

        # Apply rules in priority order
        result = (
            self._check_autonomous(normalized) or
            self._check_decentralized(normalized) or
            self._check_federal_secretariat(normalized) or
            self._check_municipal(normalized) or
            self._check_state_government(normalized) or
            self._check_educational(normalized) or
            self._check_health(normalized) or
            self._check_military(normalized) or
            self._check_judicial(normalized) or
            self._check_legislative(normalized) or
            {'type_id': 13, 'confidence': 0.0}  # other
        )

        result['state_id'] = state_id
        return result
```

### 5.2 Detection Rules

#### Municipal Detection
```python
MUNICIPAL_KEYWORDS = [
    'PRESIDENCIA MUNICIPAL',
    'H. AYUNTAMIENTO',
    'HONORABLE AYUNTAMIENTO',
    'MUNICIPIO DE',
    'GOBIERNO MUNICIPAL'
]

def _check_municipal(self, name: str) -> dict:
    for keyword in self.MUNICIPAL_KEYWORDS:
        if keyword in name:
            return {
                'type_id': 7,  # municipal
                'confidence': 0.95,
                'matched_rule': f'MUNICIPAL:{keyword}'
            }
    return None
```

#### Educational Detection
```python
EDUCATIONAL_KEYWORDS = [
    ('UNIVERSIDAD', 0.95),
    ('INSTITUTO TECNOLOGICO', 0.90),
    ('COLEGIO', 0.85),
    ('CENTRO DE ESTUDIOS', 0.85),
    ('ESCUELA', 0.80),
    ('TECNOLOGICO', 0.75),
]

def _check_educational(self, name: str) -> dict:
    for keyword, confidence in self.EDUCATIONAL_KEYWORDS:
        if keyword in name:
            return {
                'type_id': 8,  # educational
                'confidence': confidence,
                'matched_rule': f'EDUCATIONAL:{keyword}'
            }
    return None
```

### 5.3 ML Classifier (Phase 2)

For institutions that cannot be classified by rules, use ML:

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

class MLInstitutionClassifier:
    """ML-based classifier for ambiguous institutions."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=5000
        )
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=20
        )

    def train(self, names: list, labels: list):
        """Train on rule-classified data."""
        X = self.vectorizer.fit_transform(names)
        self.model.fit(X, labels)

    def predict(self, name: str) -> tuple:
        """Predict institution type with confidence."""
        X = self.vectorizer.transform([name])
        proba = self.model.predict_proba(X)[0]
        pred_class = self.model.classes_[proba.argmax()]
        confidence = proba.max()
        return pred_class, confidence
```

---

## 6. Implementation Plan

### Step 1: Create Schema (Steps 16-25)
- Create lookup tables
- Add columns to institutions
- Insert seed data

### Step 2: Build Rule Classifier (Steps 26-45)
- Implement keyword extraction
- Implement each detection function
- Test on sample data

### Step 3: Run Initial Classification (Steps 46-50)
- Classify all institutions with rules
- Generate confidence distribution report
- Identify unclassified institutions

### Step 4: Train ML Model (Steps 51-60)
- Use rule-classified as training data
- Train and validate model
- Apply to unclassified institutions

### Step 5: Validation (Steps 61-68)
- Manual review of low-confidence classifications
- Create override table
- Apply corrections
- Update database

---

## 7. Expected Outcomes

| Metric | Target |
|--------|--------|
| Classification coverage | 100% |
| Rule-based classification | ~70% |
| High confidence (>0.8) | ~85% |
| Manual review needed | ~5% |

---

## 8. Validation Strategy

1. **Known Institution Verification**
   - Verify PEMEX, CFE, IMSS classified correctly
   - Verify federal secretariats classified correctly

2. **Sector Alignment Check**
   - Health sector institutions should be type=health or decentralized (IMSS)
   - Education sector institutions should be type=educational

3. **Contract Distribution Check**
   - Verify contract counts by institution type make sense

---

## 9. Files to Create

| File | Purpose |
|------|---------|
| `backend/scripts/classify_institutions.py` | Main classification script |
| `backend/data/institution_keywords.json` | Keyword dictionaries |
| `backend/models/institution_classifier.pkl` | Trained ML model |

---

*"Classification is not about putting things in boxes - it's about understanding patterns."*
