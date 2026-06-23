---
## Visual Review — 2026-06-22T12:05:14Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site outage. Add `rubli.xyz` to egress allowlist in environment settings to enable live checks.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions — stable false-positive baseline, same as prior runs:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected. **Action required: add `rubli.xyz` to environment egress allowlist** so health checks can reach the live site.

---
## Visual Review — 2026-06-19T18:03:41Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site outage. Add `rubli.xyz` to egress allowlist in environment settings to enable live checks.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions — stable false-positive baseline, same as prior runs:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected. **Action required: add `rubli.xyz` to environment egress allowlist** so health checks can reach the live site.

---
## Visual Review — 2026-06-19T12:04:47Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site outage. Add `rubli.xyz` to egress allowlist in environment settings to enable live checks.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions — stable false-positive baseline, same as prior runs:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.
- `SECTORS.find(...)` in PatternDossier, Contracts, ContractDossier, CategoryDossier, CaseDetail — legitimate bilingual `.name` / `.nameEN` property access. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected. **Action required: add `rubli.xyz` to environment egress allowlist** so health checks can reach the live site.

---
## Visual Review — 2026-06-19T06:04:20Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`Issuer: O=Anthropic; CN=Egress Gateway SDS Issuing CA (production)`). Persistent infrastructure constraint — not a site outage. TLS completes to 37.60.232.109:443 over TLSv1.3. Add `rubli.xyz` to egress allowlist in environment settings to enable live checks.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions — stable false-positive baseline, same as prior runs:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.
- `SECTORS.find(...)` in PatternDossier, Contracts, ContractDossier, CategoryDossier, CaseDetail — legitimate bilingual `.name` / `.nameEN` property access. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected. To fix: add `rubli.xyz` to environment egress allowlist.

---
## Visual Review — 2026-06-19T00:04:12Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site outage. Add `rubli.xyz` to egress allowlist in environment settings to enable live checks.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions — stable false-positive baseline, same as prior runs:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.
- `SECTORS.find(...)` in PatternDossier, Contracts, ContractDossier, CategoryDossier, CaseDetail — legitimate bilingual `.name` / `.nameEN` property access. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected. To fix: add `rubli.xyz` to environment egress allowlist.

---
## Visual Review — 2026-06-18T18:04:01Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`Host not in allowlist: rubli.xyz`). Persistent infrastructure constraint — not a site outage. TLS completes to 37.60.232.109:443 over TLSv1.3. Add `rubli.xyz` to egress allowlist in environment settings to enable live checks.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions — stable false-positive baseline, same as prior runs:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected. To fix: add `rubli.xyz` to environment egress allowlist.

---
## Visual Review — 2026-06-16T15:43:45Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN |
| https://rubli.xyz/atlas | 403 | WARN |
| https://rubli.xyz/aria | 403 | WARN |
| https://rubli.xyz/sectors | 403 | WARN |
| https://rubli.xyz/sectors/salud | 403 | WARN |
| https://rubli.xyz/cases | 403 | WARN |
| https://rubli.xyz/methodology | 403 | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s from Anthropic cloud runner egress gateway (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — egress gateway (empty body) | WARN |
| /api/v1/sectors | BLOCKED — egress gateway (empty body) | WARN |

> Same egress restriction blocks all API calls. Not indicative of backend failure.

### Bilingual Gaps
Grep scans completed (3 patterns checked). No new regressions vs. prior run:
- `CaseLibrary.tsx:19` — inline comment referencing FRAUDTYPES enum; not rendered text. OK.
- `Methodology.tsx:125` — academic citation (Mahalanobis, P.C. 1936); untranslatable proper noun. OK.
- `InstitutionLeague.tsx:211,692` — `TIER_STYLES.Excelente.color` code accessor, not rendered string. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property; not user-facing. OK.
- `ExpedienteSpine.tsx:76` — TypeScript return-type annotation. OK.
- `ExploreCanvas.tsx:1476–1491` — comment block + corporate-form token array; not rendered. OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–165` — pattern labels properly bilingual via `isEs ? ES : EN` ternaries. OK.
- `RegisterRow.tsx:160` — `PATTERN_CHIP[item.primary_pattern]` code accessor; not a rendered string. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway (persistent infrastructure constraint, not a site regression). Bilingual scan clean. No new issues detected.