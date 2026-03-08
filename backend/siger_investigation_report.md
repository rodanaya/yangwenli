# SIGER Investigation Report — ARIA-Flagged Vendors
**Date:** March 8, 2026
**Source:** SIGER 2.0 (rpc.economia.gob.mx/siger2)
**Scope:** Tier 1–2 ARIA-flagged vendors with RFC, cross-referenced in Mexico's commercial registry

---

## Method

Free public search in SIGER returns: FME (Folio Mercantil Electrónico), registered company name, and registry office. Full corporate details (shareholders, partners, capital) require paid consultation ($736 MXN/company). RFC date encoding was used to verify incorporation year.

**FME format:**
- `N-YYYYXXXXXX` = registered via electronic system post-2016
- `integer` = old paper registration pre-2016

---

## 🔴 Tier 1 — Critical Investigation Targets

### 1. WHITEMED — FME N-2023086882
| Field | Value |
|-------|-------|
| RFC | WHI231017IC4 |
| Incorporated | **October 17, 2023** |
| Registry | Monterrey (Nuevo León) |
| Contract Value | **1.07B MXN** |
| ARIA Pattern | P3 (single-source monopoly) |

**Red flags:** Incorporated October 2023, yet winning over a billion pesos in health contracts within months. English brand name. Registered in Monterrey supplying federal agencies. Highest suspicion ratio (value/age) of all companies searched.

---

### 2. SERVICIOS INTEGRALES RETIMAR + RETIMAR SERVICES
| Field | Value |
|-------|-------|
| RFC | SIR220609IA9 |
| Incorporated | **June 9, 2022** |
| FME | N-2022069919 |
| Registry | Ciudad de México |
| Contract Value | **2.31B MXN** |
| ARIA Pattern | P6 (institution capture) |
| Related Entity | N-2024061085 (incorporated 2024, CDMX) |

**Red flags:** Incorporated June 2022 with 2.31B MXN in contracts within ~2 years. A second entity with "RETIMAR" in the name was incorporated in 2024 — possible shell succession pattern (creating a new entity before the original is blacklisted).

---

### 3. GX2 DESARROLLOS — FME N-2020036751
| Field | Value |
|-------|-------|
| RFC | GDE200619SG7 |
| Incorporated | **June 19, 2020** |
| Registry | **Culiacán (Sinaloa)** |
| Contract Value | **5.89B MXN** |
| ARIA Pattern | P3 (single-source monopoly) |

**Red flags:** COVID-era incorporation (June 2020). **Culiacán registry is a significant red flag** — Sinaloa state capital associated with organized crime infiltration of government contracts. 5.89B MXN at monopoly concentration. Simplest SA de CV corporate structure.

---

### 4. LAMAP — FME N-2021092394
| Field | Value |
|-------|-------|
| RFC | LAM211108FQA |
| Incorporated | **November 8, 2021** |
| Registry | Ciudad de México |
| Contract Value | **4.73B MXN** |
| ARIA Pattern | P3 (single-source monopoly) |

**Red flags:** Incorporated November 2021, 4.73B MXN within ~2-3 years. Short single-word name with no descriptive content.

---

### 5. ARMOT SEGURIDAD — FME N-2022076046
| Field | Value |
|-------|-------|
| RFC | ASP220621KC5 |
| Incorporated | **June 21, 2022** |
| Registry | Pachuca (Hidalgo) |
| Contract Value | **3.67B MXN** |
| ARIA Pattern | P3 (single-source monopoly) |

**Red flags:** Incorporated June 2022 with 3.67B MXN in security service contracts. Registered in Pachuca (state capital of Hidalgo) serving federal agencies. Security services sector is particularly opaque.

---

## 🟠 Tier 2 — High Priority

### 6. BAHUD PROCESSING MÉXICO — FME N-2018076600
| RFC | BPM1809043P8 | Incorporated | Sep 2018 |
|-----|--------------|--------------|----------|
| Registry | Ciudad de México | Value | **15.79B MXN** |
| Pattern | P2 (ghost company) | | |

Already in RUBLI ground truth (Case 23). Highest absolute contract value in sample. Ghost company pattern.

---

### 7. HYOSUNG SOLUTIONS — FME N-2020037572
| RFC | HSO200602PH2 | Incorporated | Jun 2020 |
|-----|--------------|--------------|----------|
| Registry | Ciudad de México | Value | **1.62B MXN** |
| Corporate form | **S. de R.L. de C.V.** | Pattern | P3 (monopoly) |

**Note:** Hyosung is a real Korean conglomerate (ATM machines, textiles). Verify whether this is a genuine subsidiary of Hyosung Group or a Mexican company appropriating the name. S. de R.L. de C.V. (limited partnership) is an unusual form for a large government vendor.

---

### 8. INTEGMEV — FME N-2020048714
| RFC | INT191209LR2 | Incorporated | Dec 2019 / FME 2020 |
|-----|--------------|--------------|---------------------|
| Registry | Naucalpan (EdoMex) | Value | **3.07B MXN** |
| Pattern | P2 (intermediary) | | |

Incorporated December 2019 (RFC), FME issued 2020. Naucalpan registration. 3.07B MXN as intermediary.

---

### 9. ICA CONSTRUCTORA — FME N-2017033512
| RFC | ICO170407UI6 | Incorporated | Apr 2017 |
|-----|--------------|--------------|----------|
| Registry | Ciudad de México | Value | **44.48B MXN** |
| Pattern | P7 (bid rotation) | | |

**Highest absolute value: 44.48B MXN.** ICA (Empresas ICA) filed for bankruptcy in 2016 and restructured. This entity (incorporated April 2017, one year after bankruptcy) may be a restructured subsidiary. The bid rotation pattern (P7) across infrastructure suggests coordinated contract distribution. Requires cross-reference with SAT/ASF records.

---

### 10. CORPORATIVO EJECUTIVO MZT — FME N-2018024769
| RFC | CEM171107HV1 | Incorporated | Nov 2017 / FME 2018 |
|-----|--------------|--------------|---------------------|
| Registry | Naucalpan (EdoMex) | Value | **1.09B MXN** |
| Pattern | P3 (monopoly) | | |

**MZT = Mazatlán (Sinaloa)** abbreviation in company name, registered in Naucalpan. Sinaloa reference combined with Estado de México registration is a known pattern for front companies serving federal agencies.

---

## 🟡 Tier 3 — Monitor

| Vendor | FME | Inc. Year | Value | Notes |
|--------|-----|-----------|-------|-------|
| CREATIVIDAD E INTEGRACIÓN EN SERVICIOS MÉDICOS | 257244 | **1999** | 6.70B | Old company, but 6.70B and P6 institution capture — long-term monopoly |
| ALMACENAJE Y DISTRIBUCIÓN AVIOR | 6689 | **2000** | 3.98B | Old company, Querétaro, P3 monopoly in warehousing/distribution |
| GAMS SOLUTIONS | 545469 | **2015** | 8.21B | Established company, P6 institution capture |
| TRANS CE CARGO | 563448 | **2016** | 2.57B | P6 institution capture |
| GRUPO LABORATORIOS IMPERIALES | N-2017049682 | 2017 | 1.26B | P3 lab supply monopoly |
| SERPROSEP | N-2019010920 | 2019 | 3.24B | P3 monopoly |
| PHARMAJAL | 87114 | **2014** | 1.65B | Guadalajara pharma distributor, P3 |
| MULTICORPORACION BREXOT | N-2017009072 | 2017 | 0.60B | P6 institution capture |
| ARMOUR KING | N-2019078530 | 2019 | 2.13B | English name, P3 monopoly |
| ADACA MEDICAL | 510771 | **2014** | 0.65B | Medical equipment, P3 |
| COMERCIALIZADORA REALZA | 58779 | **2015** | 0.63B | Mérida registry, P3 |
| GRUPO FARMACÉUTICO SIGMUN | 474827 | **2012** | 0.71B | P2 ghost pattern despite age |

---

## ✅ False Positive

| Vendor | FME | Reason |
|--------|-----|--------|
| CFE DISTRIBUCIÓN | 557931 | State-owned enterprise (SOE), CFE subsidiary created by 2013 energy reform. Legal monopoly by design. Exclude from investigation. |

---

## Pattern Analysis

### Incorporation Timeline Clustering
```
2023: WHITEMED (1.07B) ← Most suspicious
2022: RETIMAR (2.31B), ARMOT (3.67B)
2021: LAMAP (4.73B)
2020: GX2 (5.89B, Culiacán), HYOSUNG (1.62B), INTEGMEV (3.07B)
2019: SERPROSEP (3.24B), ARMOUR KING (2.13B)
2018: BAHUD (15.79B), CORPORATIVO MZT (1.09B)
2017: ICA (44.48B), BREXOT (0.60B), GRUPO IMPERIALES (1.26B)
```

**5 of 6 most suspicious companies incorporated 2020–2023** — the pandemic and post-pandemic period created a permissive procurement environment that new entities exploited.

### Geographic Red Flags
- **Culiacán (Sinaloa):** GX2 DESARROLLOS — very unusual for federal contractor
- **Pachuca (Hidalgo):** ARMOT SEGURIDAD — security company, opaque sector
- **Naucalpan (EdoMex):** INTEGMEV, CORPORATIVO MZT — common shell company address zone
- **Monterrey:** WHITEMED — health company serving federal agencies from NL
- **Mérida:** COMERCIALIZADORA REALZA — Yucatán company winning federal contracts

### English Names (unusual for Mexican federal contractors)
- WHITEMED (health)
- ARMOUR KING (security?)
- HYOSUNG SOLUTIONS (Korean brand name)
- GX2 DESARROLLOS (alphanumeric name)

---

## Next Steps

1. **SIGER paid consultation** ($736 MXN/company) for Tier 1 targets → reveals shareholders, partners, capital
2. **ASF Cuenta Pública** cross-reference for RETIMAR, GX2, LAMAP, ARMOT
3. **Investigative press search:** "GX2 Culiacán", "Retimar contratos", "Lamap gobierno"
4. **SAT EFOS/RFC validation** for WHITEMED (Oct 2023 RFC — verify it's not on EFOS definitivo list)
5. **Hyosung Group verification** — email Korean parent company or check SEC/Korean DART filings for Mexican subsidiary
6. **ICA CONSTRUCTORA cross-reference** with ICA bankruptcy proceedings and restructuring documents

---

*Data: SIGER 2.0 public registry + RUBLI COMPRANET database. Not legal conclusions — statistical indicators for investigation triage.*
