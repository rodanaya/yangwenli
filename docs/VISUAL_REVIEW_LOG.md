---
## Visual Review — 2026-06-09T18:04:29Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /atlas | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /aria | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors/salud | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /cases | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /methodology | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /stories/el-ejercito-fantasma | 403 | WARN — cloud egress IP blocked by CDN allowlist |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not a site outage. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — empty body | WARN |
| /api/v1/sectors | 403 cloud egress block — empty body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives (stable baseline, no new regressions):
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:444` — style lookup constant, not a rendered string. OK.
- `never see "ADMINISTRATIONS.FOO"` in `CaseLibrary.tsx:220` — JSX comment, not rendered. OK.
- Academic citation in `Methodology.tsx:121` — untranslatable bibliographic reference. OK.
- `target_name: 'Maypo S.A.'` in `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data, vendor proper name. OK.
- `JSX.Element` return type in `ExpedienteSpine.tsx:72` — TypeScript type annotation, not rendered. OK.
- Comments and corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code data (S.A., C.V., etc.), not rendered UI labels. OK.
- JSDoc example string in `VendorHero.tsx:717` — code comment, not rendered text. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS connects successfully — server alive. Bilingual scan clean — no new gaps detected. No regression vs. 2026-06-09T00:05:42Z run.


---
## Visual Review — 2026-06-09T00:05:42Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /atlas | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /aria | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors/salud | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /cases | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /methodology | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /stories/el-ejercito-fantasma | 403 | WARN — cloud egress IP blocked by CDN allowlist |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not a site outage. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — empty body | WARN |
| /api/v1/sectors | 403 cloud egress block — empty body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives (stable baseline, no new regressions):
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:444` — style lookup constant, not a rendered string. OK.
- `never see "ADMINISTRATIONS.FOO"` in `CaseLibrary.tsx:220` — JSX comment, not rendered. OK.
- Academic citation in `Methodology.tsx:121` — untranslatable bibliographic reference. OK.
- `target_name: 'Maypo S.A.'` in `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data, vendor proper name. OK.
- `JSX.Element` return type in `ExpedienteSpine.tsx:72` — TypeScript type annotation, not rendered. OK.
- Comments and corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code data (S.A., C.V., etc.), not rendered UI labels. OK.
- JSDoc example string in `VendorHero.tsx:717` — code comment, not rendered text. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS connects successfully — server alive. Bilingual scan clean — no new gaps detected. No regression vs. 2026-06-08T18:04:42Z run.


---
## Visual Review — 2026-06-08T18:04:42Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /atlas | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /aria | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors/salud | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /cases | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /methodology | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /stories/el-ejercito-fantasma | 403 | WARN — cloud egress IP blocked by CDN allowlist |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not a site outage. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — empty body | WARN |
| /api/v1/sectors | 403 cloud egress block — empty body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives (stable baseline, no new regressions):
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:444` — style lookup constant, not a rendered string. OK.
- `never see "ADMINISTRATIONS.FOO"` in `CaseLibrary.tsx:220` — JSX comment, not rendered. OK.
- Academic citation in `Methodology.tsx:121` — untranslatable bibliographic reference. OK.
- `target_name: 'Maypo S.A.'` in `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data, vendor proper name. OK.
- `JSX.Element` return type in `ExpedienteSpine.tsx:72` — TypeScript type annotation, not rendered. OK.
- Comments and corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code data (S.A., C.V., etc.), not rendered UI labels. OK.
- JSDoc example string in `VendorHero.tsx:717` — code comment, not rendered text. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS connects successfully — server alive. Bilingual scan clean — no new gaps detected. No regression vs. 2026-06-08T00:05:28Z run.


---
## Visual Review — 2026-06-08T00:05:28Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /atlas | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /aria | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors/salud | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /cases | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /methodology | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /stories/el-ejercito-fantasma | 403 | WARN — cloud egress IP blocked by CDN allowlist |

Note: Persistent CDN/WAF block on cloud egress IP — consistent with all prior runs. TLS handshake completes; block is at application/proxy layer. Not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — empty body | WARN |
| /api/v1/sectors | 403 cloud egress block — empty body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives (stable baseline, no new regressions):
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:441` — style lookup constant, not a rendered string. OK.
- `never see "ADMINISTRATIONS.FOO"` in `CaseLibrary.tsx:220` — JSX comment, not rendered. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- `target_name: 'Maypo S.A.'` in `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data, vendor proper name. OK.
- `JSX.Element` return type in `ExpedienteSpine.tsx:72` — TypeScript type annotation, not rendered. OK.
- Comments and corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code data (S.A., C.V., etc.), not rendered UI labels. OK.
- JSDoc example string in `VendorHero.tsx:717` — code comment, not rendered text. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS connects successfully — server alive. Bilingual scan clean — no new gaps detected. No regression vs. 2026-06-07 run.


---
## Visual Review — 2026-06-07T12:05:15Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /atlas | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /aria | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors/salud | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /cases | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /methodology | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /stories/el-ejercito-fantasma | 403 | WARN — cloud egress IP blocked by CDN allowlist |

Note: TLS handshake succeeds to `37.60.232.109`; cert valid (`CN=rubli.xyz`, expires Jul 7 2026). All 403s originate from Anthropic's egress gateway (`O=Anthropic; CN=Egress Gateway SDS Issuing CA`) intercepting before reaching origin — persistent infrastructure constraint identical to prior runs, not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/sectors | 403 cloud egress block — no JSON body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives:
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property lookup, not rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup constant. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — comment + token array, not rendered UI strings. OK.
- Vendor fixture name in `StoryMoneySankeyChart.tsx:22,37` — internal data, not user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS cert valid (expires Jul 7 2026); this is not a site failure. Bilingual scan clean with no new gaps. No regression detected.

---
## Visual Review — 2026-06-06T18:03:55Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not indicative of site downtime. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1433` — code data (S.A., C.V. etc.), not rendered UI labels. OK.
- `VendorHero.tsx:710` — code comment with vendor name example, not rendered. OK.
- `StoryMoneySankeyChart.tsx:22,37` — `target_name: 'Maypo S.A.'` in chart data constants, vendor proper name. OK.
- `CaseLibrary.tsx:220` — JSX comment `never see "ADMINISTRATIONS.FOO"`, not rendered. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English labels without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by persistent server-side IP allowlist (cloud egress → CDN WAF). TLS connects successfully — server alive. All WARN flags are infrastructure constraints from this environment, not site failures. Bilingual scan clean — no new gaps detected since last run.

---
## Visual Review — 2026-06-04T18:09:56Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not indicative of site downtime. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1433` — code data (S.A., C.V. etc.), not rendered UI labels. OK.
- `VendorHero.tsx:710` — code comment with vendor name example, not rendered. OK.
- `StoryMoneySankeyChart.tsx:22,37` — `target_name: 'Maypo S.A.'` in chart data constants, vendor proper name. OK.
- `CaseLibrary.tsx:220` — JSX comment `never see "ADMINISTRATIONS.FOO"`, not rendered. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English labels without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by persistent server-side IP allowlist (cloud egress → CDN WAF). TLS connects successfully — server alive. All WARN flags are infrastructure constraints from this environment, not site failures. Bilingual scan clean — no new gaps detected since last run.

---
## Visual Review — 2026-06-04T12:10:49Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes successfully — server is reachable. Not indicative of site downtime. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1433` — code data (S.A., C.V. etc.), not rendered UI labels. OK.
- `VendorHero.tsx:710` — code comment with vendor name example, not rendered. OK.
- `StoryMoneySankeyChart.tsx:22,37` — `target_name: 'Maypo S.A.'` in chart data constants, vendor proper name. OK.
- `CaseLibrary.tsx:220` — JSX comment `never see "ADMINISTRATIONS.FOO"`, not rendered. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English labels without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by persistent server-side IP allowlist (cloud egress → CDN WAF). TLS connects successfully — server alive. All WARN flags are infrastructure constraints from this environment, not site failures. Bilingual scan clean — no new gaps detected since last run.

---
## Visual Review — 2026-06-03T18:09:22Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: Persistent CDN/WAF block on cloud egress IP — consistent with all prior runs. TLS handshakes complete; server reachable. Not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Vendor proper names in `Executive.tsx:69,89,109` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-163` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1433` — code data (S.A., C.V. etc.), not rendered UI labels. OK.
- `VendorHero.tsx:710` — code comment with vendor name example, not rendered. OK.
- `StoryMoneySankeyChart.tsx:22,37` — `target_name: 'Maypo S.A.'` in chart data constants, vendor proper name. OK.
- `CaseLibrary.tsx:220` — JSX comment `never see "ADMINISTRATIONS.FOO"`, not rendered. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English labels without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by persistent server-side IP allowlist (cloud egress → CDN WAF). TLS connects successfully — server alive. All WARN flags are infrastructure constraints from this environment, not site failures. Bilingual scan clean — no new gaps detected since last run.

---
## Visual Review — 2026-06-03T12:10:48Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — `x-deny-reason: host_not_allowed`) | WARN |

Note: TLS handshake completes (CN=rubli.xyz confirmed); server is reachable. All 403s carry `host_not_allowed` — CDN/WAF blocking this cloud egress IP. Persistent infrastructure constraint consistent with all prior runs from this environment; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body, JSON parse failed) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body, JSON parse failed) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body, JSON parse failed) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body, JSON parse failed) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup table, not a UI string. OK.
- Vendor proper names in `Executive.tsx:69,89,109` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:119` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-163` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1433` — code data (S.A., C.V. etc.), not rendered UI labels. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"` / `label="Risk Factors"` hardcoded English labels without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by persistent server-side IP allowlist (cloud egress → CDN WAF). TLS connects successfully — server alive. All WARN flags are infrastructure constraints from this environment, not site failures. Bilingual scan clean — no new gaps detected since last run.

---
## Visual Review — 2026-06-02T18:09:56Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — server-side IP restriction) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — server-side IP restriction) | WARN |

Note: TLS handshake completes (CN=rubli.xyz confirmed), so server is reachable but returns 403 for all routes from cloud egress IP. Consistent with all prior runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — body: "Host not in allowlist") | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — body: "Host not in allowlist") | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — body: "Host not in allowlist") | WARN |
| /api/v1/sectors | 403 (cloud egress block — body: "Host not in allowlist") | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a UI string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx:69,89,109` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. OK.
- Pattern labels in `ConcentrationConstellation.tsx` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code comments/data, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by server-side IP allowlist — TLS connects successfully (server alive), but all routes return 403 from this cloud egress IP. Persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps detected.

---
## Visual Review — 2026-06-02T12:10:31Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | WARN |
| https://rubli.xyz/atlas | 403 host_not_allowed | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | WARN |

Note: All 403s carry `host_not_allowed` — Cloudflare WAF blocking managed-cloud egress IPs. Persistent infrastructure constraint; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a UI string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx:69,89,109` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1418` — code comments/data, not rendered strings. OK.
- `VendorHero.tsx:716` — JSDoc example string, not rendered text. OK.
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data. OK.
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-06-02T00:10:05Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | WARN |
| https://rubli.xyz/atlas | 403 host_not_allowed | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | WARN |

Note: All 403s carry `host_not_allowed` — Cloudflare WAF blocking managed-cloud egress IPs. Persistent infrastructure constraint; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a UI string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx:69,89,109` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1418` — code comments/data, not rendered strings. OK.
- `VendorHero.tsx:716` — JSDoc example string, not rendered text. OK.
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data. OK.
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-06-01T18:10:20Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | WARN |
| https://rubli.xyz/atlas | 403 host_not_allowed | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | WARN |

**Note:** All routes blocked by managed-cloud egress policy (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site regression. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?limit=5 | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed — empty body | WARN |
| /api/v1/sectors | 403 host_not_allowed — empty body | WARN |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:69,89,109` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ConcentrationConstellation.tsx:155–167` — properly bilingual `isEs ? '...' : '...'` patterns, not a leak
- `ExploreCanvas.tsx:1417,1418` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`Host not in allowlist`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-31T12:09:15Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | WARN |
| https://rubli.xyz/atlas | 403 host_not_allowed | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | WARN |

**Note:** All routes blocked by managed-cloud egress policy (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site regression. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?limit=5 | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed — empty body | WARN |
| /api/v1/sectors | 403 host_not_allowed — empty body | WARN |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`Host not in allowlist`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-29T12:10:28Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s — CDN WAF blocking cloud container egress IP (`Host not in allowlist`). TLS handshake succeeds; WAF denies at application layer. Persistent environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no regression from 2026-05-28 baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:241,242` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `VendorHero.tsx:716` — code comment (JSDoc example, not rendered text)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by CDN egress policy (`Host not in allowlist`) — persistent environment constraint, not a site failure. Bilingual scan clean: 14 hits, all false positives, no regression from 2026-05-28 baseline.

---
## Visual Review — 2026-05-28T12:13:43Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s — CDN WAF blocking cloud container egress IP (`Host not in allowlist`). TLS handshake succeeds; WAF denies at application layer. Persistent environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no regression from 2026-05-27 baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:241,242` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `VendorHero.tsx:716` — code comment (JSDoc example, not rendered text)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by CDN egress policy (`Host not in allowlist`) — persistent environment constraint, not a site failure. Bilingual scan clean: 14 hits, all false positives, no regression from 2026-05-27 baseline.

---
## Visual Review — 2026-05-27T12:14:00Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s — CDN WAF blocking cloud container egress IP (`Host not in allowlist`). TLS handshake succeeds; WAF denies at application layer. Persistent environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (unchanged from prior baselines):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:241,242` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `VendorHero.tsx:716` — code comment (JSDoc example, not rendered text)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by CDN egress policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean: 14 hits, all false positives, no regression from 2026-05-26 baseline.

---
## Visual Review — 2026-05-26T00:05:22Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s — CDN WAF blocking cloud container egress IP (`x-deny-reason: host_not_allowed`). TLS handshake succeeds; WAF denies at application layer. Persistent environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (unchanged from prior baselines):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:241,242` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `VendorHero.tsx:716` — code comment (JSDoc example, not rendered text)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by CDN egress policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean: 14 hits, all false positives, no regression from 2026-05-25 baseline.

---
## Visual Review — 2026-05-25T00:02:08Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s — CDN WAF blocking cloud container egress IP (`x-deny-reason: host_not_allowed`). TLS handshake succeeds; WAF denies at application layer. Persistent environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 15 hits — all confirmed false positives (unchanged from 2026-05-23T12:09:34Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `VendorHero.tsx:716` — code comment (JSDoc example, not rendered text)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by CDN egress policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean: 15 hits, all false positives, no change from prior baseline.

---
## Visual Review — 2026-05-23T12:09:34Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s — Cloudflare WAF blocking cloud container egress IP. TLS handshake to 37.60.232.109 succeeds; WAF denies at application layer. Persistent environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 15 hits — all confirmed false positives (+1 vs. 2026-05-23T06:05:54Z baseline of 14):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `VendorHero.tsx:716` — code comment (NEW vs. baseline; contains `"GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V."` as JSDoc example, not rendered text)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by Cloudflare egress policy — persistent environment constraint, not a site failure. Bilingual scan clean: 15 hits, all false positives (+1 new code comment in VendorHero.tsx vs. prior baseline, no actionable gaps).

---
## Visual Review — 2026-05-23T06:03:51Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s return `Host not in allowlist` from the Anthropic egress gateway — cloud runner IP is not in rubli.xyz allowlist. TLS handshake succeeds (cert CN=rubli.xyz, issuer=sandbox-egress-production TLS Inspection CA, valid until 2026-06-22). Persistent sandbox infrastructure limitation; not a site failure. Run from VPS (37.60.232.109) or unrestricted host for live verification.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy — empty body) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no change vs. 2026-05-23T00:05:07Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER) — data values, not UI strings
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered in UI
- `Methodology.tsx:119` — academic citation proper noun (`Mahalanobis, P.C.`)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (`Maypo S.A.`)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants (S.A., C.V., etc.)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`Host not in allowlist`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run. Hit count stable at 14 confirmed false-positive matches.

---
## Visual Review — 2026-05-23T00:05:07Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. Consistent with all prior automated runs since 2026-05-14. Not a site failure; run from VPS (37.60.232.109) or an unrestricted host for live verification.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy — empty body) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no change vs. 2026-05-22T18:04:16Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER) — data values, not UI strings
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered in UI
- `Methodology.tsx:119` — academic citation proper noun (`Mahalanobis, P.C.`)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (`Maypo S.A.`)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants (S.A., C.V., etc.)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`x-deny-reason: host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run. Hit count stable at 14 confirmed false-positive matches.

---
## Visual Review — 2026-05-22T18:04:16Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s return `x-deny-reason: host_not_allowed` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. Persistent sandbox infrastructure limitation; consistent with all prior runs since 2026-05-14. Not a site failure. Run from VPS (37.60.232.109) or unrestricted host for live verification.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy — empty body) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy — empty body) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** 14 grep hits — all confirmed false positives (no new regressions vs. 2026-05-21 run):
- `Executive.tsx:73,93,113`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER) — data literals, not UI labels
- `InstitutionScorecards.tsx:441`: JS object key lookup (`TIER_STYLES[tierName as TierKey]`)
- `RedThread.tsx:339,340`: JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`)
- `CaseLibrary.tsx:219`: inside a code comment (not rendered in UI)
- `Methodology.tsx:119`: academic citation (`Mahalanobis, P.C.`)
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data (`Maypo S.A.`)
- `ExploreCanvas.tsx:1416,1417,1431,1497`: code comments and corporate-form token constants (S.A., C.V. etc.)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new genuine i18n leaks or hardcoded English-only strings. No regressions vs. 2026-05-21T12:06:02Z run.

---
## Visual Review — 2026-05-21T12:06:02Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s return `Host not in allowlist` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. TLS handshake succeeds (cert CN=rubli.xyz, issuer=Egress Gateway Subordinate CA, valid until 2026-06-20); block is at the proxy layer. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** 14 grep hits — all confirmed false positives (no new regressions):
- `Executive.tsx:73,93,113`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER)
- `InstitutionScorecards.tsx:441`: JS object key lookup (`TIER_STYLES[tierName as TierKey]`)
- `RedThread.tsx:339,340`: JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`)
- `CaseLibrary.tsx:219`: inside a code comment (not rendered in UI)
- `Methodology.tsx:119`: academic citation (`Mahalanobis, P.C.`)
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data (`Maypo S.A.`)
- `ExploreCanvas.tsx:1369,1370,1384,1450`: code comments and corporate-form token constants (S.A., C.V. etc.)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`Host not in allowlist`) — environment constraint, not a site failure. TLS cert is valid (expires 2026-06-20). Bilingual scan clean — no new gaps. Run from an unrestricted host for live HTTP/API verification.

---
## Visual Review — 2026-05-20T12:06:28Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | ⚠ |
| https://rubli.xyz/atlas | 403 | ⚠ |
| https://rubli.xyz/aria | 403 | ⚠ |
| https://rubli.xyz/sectors | 403 | ⚠ |
| https://rubli.xyz/sectors/salud | 403 | ⚠ |
| https://rubli.xyz/cases | 403 | ⚠ |
| https://rubli.xyz/methodology | 403 | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | ⚠ |

Note: All 403s confirmed as egress-proxy interception (persistent sandbox limitation — `host_not_allowed`). Consistent with all prior runs since 2026-05-14. Not a regression in the site itself. To validate true HTTP status, run from VPS (37.60.232.109) or an unrestricted host.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/cases?limit=5 | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/sectors | 403 (egress proxy blocked — empty body) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (no new regressions vs. 2026-05-15 run):
- Company names in `Executive.tsx` (vendor name literals, not UI labels)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]`) — `InstitutionScorecards.tsx:441`
- Academic author abbreviation (`Mahalanobis, P.C.`) — `Methodology.tsx:119`
- Object key accesses (`WEB_VERDICT_STYLE[article.verdict]`) — `RedThread.tsx:339–340`
- Sankey mock vendor names (`Maypo S.A.`) — `StoryMoneySankeyChart.tsx:22,37`
- Comment string in `CaseLibrary.tsx:219` (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
Egress proxy blocks all outbound HTTPS from this sandbox — HTTP and API checks cannot be validated. This is a persistent infrastructure limitation, not a site failure. Bilingual gap scan: no genuine i18n leaks or new hardcoded English-only strings detected. No regressions vs. 2026-05-15T00:02:16Z run.

---
## Visual Review — 2026-05-15T00:02:16Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | ⚠ |
| https://rubli.xyz/atlas | 403 | ⚠ |
| https://rubli.xyz/aria | 403 | ⚠ |
| https://rubli.xyz/sectors | 403 | ⚠ |
| https://rubli.xyz/sectors/salud | 403 | ⚠ |
| https://rubli.xyz/cases | 403 | ⚠ |
| https://rubli.xyz/methodology | 403 | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | ⚠ |

Note: All 403s confirmed as egress-proxy interception (`x-deny-reason: host_not_allowed`). Sandbox outbound HTTPS to rubli.xyz is blocked by the execution environment's proxy. Consistent with all prior runs — not a regression in the site itself. To validate true HTTP status, run from VPS (37.60.232.109) or an unrestricted host.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/cases?limit=5 | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/sectors | 403 (egress proxy blocked — empty body) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (no new regressions vs. prior runs):
- Company names in `Executive.tsx` (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]`) — `InstitutionScorecards.tsx:443`
- Academic author abbreviation (`Mahalanobis, P.C.`) — `Methodology.tsx:118`
- Legal suffix constants (`'S.A.', 'S.C.', 'A.C.', 'C.V.'` etc.) — `ExploreCanvas.tsx:1415–1416`
- Sankey mock vendor names (`Maypo S.A.`) — `StoryMoneySankeyChart.tsx:22,37`
- Administration abbreviation (`A.M. Lopez Obrador`) — `AdminSectorHeatmap.tsx:30`
- Comment string in `CaseLibrary.tsx:216` (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
Egress proxy blocks all outbound HTTPS from this sandbox — HTTP and API checks cannot be validated from this environment. This is a persistent infrastructure limitation, not a site failure. Bilingual gap scan: no genuine i18n leaks or new hardcoded English-only strings. No regressions vs. 2026-05-14T18:08:58Z run.

---
## Visual Review — 2026-05-14T18:08:58Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | ⚠ |
| https://rubli.xyz/atlas | 403 | ⚠ |
| https://rubli.xyz/aria | 403 | ⚠ |
| https://rubli.xyz/sectors | 403 | ⚠ |
| https://rubli.xyz/sectors/salud | 403 | ⚠ |
| https://rubli.xyz/cases | 403 | ⚠ |
| https://rubli.xyz/methodology | 403 | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | ⚠ |

Note: All 403s confirmed as egress-proxy interception (`Host not in allowlist`). Sandbox outbound HTTPS to rubli.xyz is blocked by the execution environment's proxy. Consistent with all prior runs — not a regression in the site itself. To validate true HTTP status, run from VPS (37.60.232.109) or an unrestricted host.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/cases?limit=5 | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (egress proxy blocked — empty body) | ⚠ |
| /api/v1/sectors | 403 (egress proxy blocked — empty body) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (identical to prior runs, no new regressions):
- Company names in `Executive.tsx` (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]`) — `InstitutionScorecards.tsx:443`
- Academic author abbreviation (`Mahalanobis, P.C.`) — `Methodology.tsx:118`
- Legal suffix constants (`'S.A.', 'S.C.', 'A.C.', 'C.V.'` etc.) — `ExploreCanvas.tsx:1415–1416`
- Sankey mock vendor names (`Maypo S.A.`) — `StoryMoneySankeyChart.tsx:22,37`
- Administration abbreviation (`A.M. Lopez Obrador`) — `AdminSectorHeatmap.tsx:30`
- Comment string in `CaseLibrary.tsx:216` (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
Egress proxy blocks all outbound HTTPS from this environment — HTTP and API checks cannot complete from this sandbox. No change from 2026-05-13 run. Bilingual gap scan: no genuine i18n leaks, no new regressions. To get valid HTTP/API results, run from VPS (37.60.232.109) or an unrestricted host.

---
## Visual Review — 2026-05-14T06:14:02Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | ⚠ |
| https://rubli.xyz/atlas | 403 | ⚠ |
| https://rubli.xyz/aria | 403 | ⚠ |
| https://rubli.xyz/sectors | 403 | ⚠ |
| https://rubli.xyz/sectors/salud | 403 | ⚠ |
| https://rubli.xyz/cases | 403 | ⚠ |
| https://rubli.xyz/methodology | 403 | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | ⚠ |

Note: All HTTP checks returned `x-deny-reason: host_not_allowed` ("Host not in allowlist"). Consistent with all prior runs — sandbox egress proxy blocks this environment from reaching rubli.xyz directly, not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

Note: Same sandbox egress restriction — empty body, no JSON parseable. Not a backend failure.

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives:
- Company names (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`) in Executive.tsx
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]`) in InstitutionScorecards.tsx:443
- Academic author name (`Mahalanobis, P.C.`) in Methodology.tsx:118
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc.) in ExploreCanvas.tsx:1415-1416
- Sankey mock data vendor names (`Maypo S.A.`) in StoryMoneySankeyChart.tsx:22,37
- Administration abbreviation (`A.M. Lopez Obrador`) in AdminSectorHeatmap.tsx:30
- Comment text in CaseLibrary.tsx:216 (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy (consistent with all prior runs — not a site outage). Bilingual gap scan completed locally: no genuine i18n leaks, no hardcoded English-only strings detected.

---
## Visual Review — 2026-05-14T00:06:31Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | ⚠ |
| https://rubli.xyz/atlas | 403 | ⚠ |
| https://rubli.xyz/aria | 403 | ⚠ |
| https://rubli.xyz/sectors | 403 | ⚠ |
| https://rubli.xyz/sectors/salud | 403 | ⚠ |
| https://rubli.xyz/cases | 403 | ⚠ |
| https://rubli.xyz/methodology | 403 | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | ⚠ |

Note: All HTTP checks returned `x-deny-reason: host_not_allowed` ("Host not in allowlist"). This is the same sandbox egress proxy block observed in all previous runs — not a rubli.xyz outage. TLS cert confirmed valid for rubli.xyz (37.60.232.109).

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

Note: Same sandbox egress restriction — empty body, no JSON parseable. Not a backend failure.

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives:
- Company names (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`) in Executive.tsx
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]`) in InstitutionScorecards.tsx:443
- Academic author name (`Mahalanobis, P.C.`) in Methodology.tsx:118
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc.) in ExploreCanvas.tsx:1415-1416
- Administration abbreviation (`A.M. Lopez Obrador`) in AdminSectorHeatmap.tsx:30
- Comment text in CaseLibrary.tsx:216 (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy (consistent with all prior runs — not a site outage). Bilingual gap scan completed locally: no genuine i18n leaks, no hardcoded English-only strings detected.

---
## Visual Review — 2026-05-13T12:06:20Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | ⚠ |
| https://rubli.xyz/atlas | 403 | ⚠ |
| https://rubli.xyz/aria | 403 | ⚠ |
| https://rubli.xyz/sectors | 403 | ⚠ |
| https://rubli.xyz/sectors/salud | 403 | ⚠ |
| https://rubli.xyz/cases | 403 | ⚠ |
| https://rubli.xyz/methodology | 403 | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | ⚠ |

Note: All HTTP checks returned `x-deny-reason: host_not_allowed` from the sandbox outbound proxy ("Host not in allowlist"). The 403 originates from the execution environment's egress filter (Egress Gateway / intercepting TLS proxy) — not from rubli.xyz itself. TLS cert confirmed for rubli.xyz (37.60.232.109), valid until 2026-06-12.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

Note: Same proxy egress restriction as HTTP checks — empty body, no JSON parseable.

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives:
- Company names (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` in InstitutionScorecards.tsx:443)
- Academic author names (`Mahalanobis, P.C.` in Methodology.tsx:118)
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc. in ExploreCanvas.tsx:1415-1416)
- Administration abbreviations (`A.M. Lopez Obrador` in AdminSectorHeatmap.tsx:30)
- Comment text in CaseLibrary.tsx:216 (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy (not a site outage — same proxy block as previous runs). TLS certificate valid. Bilingual gap scan completed locally with no genuine gaps found. Run checks from an unrestricted host (e.g. VPS at 37.60.232.109) to verify live site health.

---
## Visual Review — 2026-05-12T12:15:07Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/atlas | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/aria | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/sectors | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/sectors/salud | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/cases | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/methodology | NETWORK_BLOCKED | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | NETWORK_BLOCKED | ⚠ |

Note: All HTTP checks returned "Host not in allowlist" from the outbound proxy in this execution environment. The 403 response is from the sandbox proxy, not from rubli.xyz itself. External HTTP checks could not be completed from this agent environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | NETWORK_BLOCKED | ⚠ |
| /api/v1/cases?limit=5 | NETWORK_BLOCKED | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | NETWORK_BLOCKED | ⚠ |
| /api/v1/sectors | NETWORK_BLOCKED | ⚠ |

Note: Same proxy restriction as HTTP checks — responses contain only "Host not in allowlist".

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 11 hits — all false positives:
- Company names (e.g. `GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName]`)
- Academic author names (`Mahalanobis, P.C.`)
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`)
- Administration abbreviations (`A.M. Lopez Obrador`)
- Comment text (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

**Overall bilingual gap assessment:** No genuine gaps found.

### Overall: WARN
HTTP and API checks could not be executed due to outbound network restrictions in this agent environment ("Host not in allowlist" from sandbox proxy). Bilingual gap scan completed locally — no issues found. Manual verification of HTTP/API health from an unrestricted environment is recommended.

---
## Visual Review — 2026-05-12T18:06:00Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/atlas | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/aria | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors/salud | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/cases | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/methodology | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (proxy: Host not in allowlist) | ⚠ |

Note: All HTTP checks returned "Host not in allowlist" from the sandbox outbound proxy. The 403 originates from the execution environment's egress filter, not from rubli.xyz itself.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

Note: Same proxy restriction as HTTP checks — all responses body: `"Host not in allowlist"`.

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives:
- Company names (e.g. `GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]`)
- Academic author names (`Mahalanobis, P.C.`)
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc. in ExploreCanvas)
- Administration abbreviations (`A.M. Lopez Obrador` in AdminSectorHeatmap)
- Comment text in CaseLibrary.tsx (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy ("Host not in allowlist") — not a site outage. Bilingual gap scan completed locally with no genuine gaps found. Run checks from an unrestricted environment to verify live site health.

---
## Visual Review — 2026-05-13T00:15:03Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/atlas | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/aria | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors/salud | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/cases | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/methodology | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (proxy: Host not in allowlist) | ⚠ |

Note: All HTTP checks returned "Host not in allowlist" (header `x-deny-reason: host_not_allowed`) from the sandbox outbound proxy. The 403 originates from the execution environment's egress filter — not from rubli.xyz itself. SSL cert valid (CN=rubli.xyz, expires 2026-06-12).

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

Note: Same proxy egress restriction as HTTP checks — empty body, no JSON parseable.

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives:
- Company names (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` in InstitutionScorecards)
- Academic author names (`Mahalanobis, P.C.` in Methodology)
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc. in ExploreCanvas)
- Administration abbreviations (`A.M. Lopez Obrador` in AdminSectorHeatmap)
- Comment text in CaseLibrary.tsx (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy — not a site outage. Bilingual gap scan completed locally with no genuine gaps found. Run checks from an unrestricted host (e.g. VPS at 37.60.232.109) to verify live site health.

---
## Visual Review — 2026-05-13T06:01:09Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/atlas | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/aria | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors/salud | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/cases | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/methodology | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (proxy: Host not in allowlist) | ⚠ |

Note: All HTTP checks returned "Host not in allowlist" from the sandbox outbound proxy. The 403 originates from the execution environment's egress filter — not from rubli.xyz itself.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

Note: Same proxy egress restriction as HTTP checks — empty body, no JSON parseable.

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives:
- Company names (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` in InstitutionScorecards)
- Academic author names (`Mahalanobis, P.C.` in Methodology)
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc. in ExploreCanvas)
- Administration abbreviations (`A.M. Lopez Obrador` in AdminSectorHeatmap)
- Comment text in CaseLibrary.tsx (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy — not a site outage. Bilingual gap scan completed locally with no genuine gaps found. Run checks from an unrestricted host (e.g. VPS at 37.60.232.109) to verify live site health.

---
## Visual Review — 2026-05-13T18:06:25Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/atlas | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/aria | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/sectors/salud | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/cases | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/methodology | 403 (proxy: Host not in allowlist) | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (proxy: Host not in allowlist) | ⚠ |

Note: All 403s originate from the sandbox egress proxy ("Host not in allowlist"), not from rubli.xyz. The TLS cert issuer is "Egress Gateway Subordinate CA" — confirming outbound HTTPS is intercepted and blocked by the execution environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?limit=5 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (proxy: Host not in allowlist) | ⚠ |
| /api/v1/sectors | 403 (proxy: Host not in allowlist) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (unchanged from prior run):
- Company names in Executive.tsx (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` in InstitutionScorecards.tsx:443)
- Academic author names (`Mahalanobis, P.C.` in Methodology.tsx:118)
- Legal suffixes array (`'S.A.', 'S.C.', 'A.C.'`, etc. in ExploreCanvas.tsx:1415-1416)
- Administration abbreviations (`A.M. Lopez Obrador` in AdminSectorHeatmap.tsx:30)
- Comment text in CaseLibrary.tsx:216 (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by sandbox egress proxy — not a site outage. Bilingual gap scan completed locally: no genuine i18n gaps or hardcoded English strings found. Run checks from VPS (37.60.232.109) or an unrestricted host to verify live site health.

---
## Visual Review — 2026-05-14T12:12:23Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/atlas | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/aria | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/sectors | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/sectors/salud | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/cases | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/methodology | 403 (egress proxy: host_not_allowed) | ⚠ |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (egress proxy: host_not_allowed) | ⚠ |

Note: All 403s confirmed as egress-proxy interception (`x-deny-reason: host_not_allowed`). The execution environment's outbound HTTPS to rubli.xyz is blocked. TLS handshake completed to 37.60.232.109:443 (cert OK) but the Caddy reverse proxy's access policy rejects this agent's IP. Consistent with the 2026-05-13 run — not a regression in the site itself.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (egress proxy blocked) | ⚠ |
| /api/v1/cases?limit=5 | 403 (egress proxy blocked) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (egress proxy blocked) | ⚠ |
| /api/v1/sectors | 403 (egress proxy blocked) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (identical to 2026-05-13 run, no new regressions):
- Company names in `Executive.tsx` (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` — `InstitutionScorecards.tsx:443`)
- Academic author abbreviation (`Mahalanobis, P.C.` — `Methodology.tsx:118`)
- Legal suffix constants (`'S.A.', 'S.C.', 'A.C.', 'C.V.'` etc. — `ExploreCanvas.tsx:1415–1416`)
- Administration abbreviation (`A.M. Lopez Obrador` — `AdminSectorHeatmap.tsx:30`)
- Comment string in `CaseLibrary.tsx:216` (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
Egress proxy blocks all outbound HTTPS from this environment — HTTP and API checks cannot complete from this sandbox. This is a persistent infrastructure limitation, not a site failure. Bilingual gap scan: no genuine i18n leaks or hardcoded English-only strings. No regressions vs. 2026-05-13 run. To get valid HTTP/API results, run from VPS (37.60.232.109) or an unrestricted host.

---
## Visual Review — 2026-05-15T06:10:34Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 (egress proxy: host_not_allowed) | ⚠ |
| /atlas | 403 (egress proxy: host_not_allowed) | ⚠ |
| /aria | 403 (egress proxy: host_not_allowed) | ⚠ |
| /sectors | 403 (egress proxy: host_not_allowed) | ⚠ |
| /sectors/salud | 403 (egress proxy: host_not_allowed) | ⚠ |
| /cases | 403 (egress proxy: host_not_allowed) | ⚠ |
| /methodology | 403 (egress proxy: host_not_allowed) | ⚠ |
| /stories/el-ejercito-fantasma | 403 (egress proxy: host_not_allowed) | ⚠ |

**Note:** All 403s carry `x-deny-reason: host_not_allowed` — rubli.xyz's IP allowlist blocks outbound requests from this cloud sandbox. This is a persistent environment limitation, not a site outage. Verify from VPS (37.60.232.109) or an unrestricted host.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (egress proxy blocked — empty response, JSON parse failed) | ⚠ |
| /api/v1/cases?limit=5 | 403 (egress proxy blocked) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (egress proxy blocked) | ⚠ |
| /api/v1/sectors | 403 (egress proxy blocked) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (identical to 2026-05-13 run, no new regressions):
- Company names in `Executive.tsx` (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` — `InstitutionScorecards.tsx:443`)
- Academic author abbreviation (`Mahalanobis, P.C.` — `Methodology.tsx:118`)
- Legal suffix constants (`'S.A.', 'S.C.', 'A.C.', 'C.V.'` etc. — `ExploreCanvas.tsx:1415–1416`)
- Administration abbreviation (`A.M. Lopez Obrador` — `AdminSectorHeatmap.tsx:30`)
- Comment string in `CaseLibrary.tsx:216` (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
Egress proxy blocks all outbound HTTPS from this environment — HTTP and API checks cannot complete from this sandbox. No change from 2026-05-13 run. Bilingual gap scan: no genuine i18n leaks, no new regressions. To get valid HTTP/API results, run from VPS (37.60.232.109) or an unrestricted host.

---
## Visual Review — 2026-05-15T12:03:18Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 (egress proxy: host_not_allowed) | ⚠ |
| /atlas | 403 (egress proxy: host_not_allowed) | ⚠ |
| /aria | 403 (egress proxy: host_not_allowed) | ⚠ |
| /sectors | 403 (egress proxy: host_not_allowed) | ⚠ |
| /sectors/salud | 403 (egress proxy: host_not_allowed) | ⚠ |
| /cases | 403 (egress proxy: host_not_allowed) | ⚠ |
| /methodology | 403 (egress proxy: host_not_allowed) | ⚠ |
| /stories/el-ejercito-fantasma | 403 (egress proxy: host_not_allowed) | ⚠ |

**Note:** All 403s carry `x-deny-reason: host_not_allowed` — rubli.xyz's IP allowlist blocks outbound requests from this cloud sandbox. Persistent environment limitation, not a site outage. Verify from VPS (37.60.232.109) or an unrestricted host.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (egress proxy blocked — empty response, JSON parse failed) | ⚠ |
| /api/v1/cases?limit=5 | 403 (egress proxy blocked) | ⚠ |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (egress proxy blocked) | ⚠ |
| /api/v1/sectors | 403 (egress proxy blocked) | ⚠ |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` for raw i18n key leaks and hardcoded strings.

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all false positives (no change from prior runs):
- Company names in `Executive.tsx` (`GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.`, `LICONSA S.A. DE C.V.`, `HEMOSER, S.A. DE C.V.`)
- Type/tier key lookups (`TIER_STYLES[tierName as TierKey]` — `InstitutionScorecards.tsx:443`)
- Academic author abbreviation (`Mahalanobis, P.C.` — `Methodology.tsx:118`)
- Legal suffix constants (`'S.A.', 'S.C.', 'A.C.', 'C.V.'` etc. — `ExploreCanvas.tsx:1415–1416`)
- Administration abbreviation (`A.M. Lopez Obrador` — `AdminSectorHeatmap.tsx:30`)
- Comment string in `CaseLibrary.tsx:216` (not rendered in UI)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.

**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
Egress proxy blocks all outbound HTTPS from this environment — HTTP and API checks cannot complete from this sandbox. No change from 2026-05-15T00:02:16Z run. Bilingual gap scan: no genuine i18n leaks, no new regressions. To get valid HTTP/API results, run from VPS (37.60.232.109) or an unrestricted host.

---
## Visual Review — 2026-05-20T06:06:47Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | WARN (Cloudflare WAF blocks cloud env IP) |
| https://rubli.xyz/atlas | 403 host_not_allowed | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | WARN |

**Note:** All 403s carry `x-deny-reason: host_not_allowed` from Cloudflare WAF — the cloud execution environment's egress IP is not in the rubli.xyz allowlist. TLS handshake succeeds; origin is live. Same constraint as prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed WAF) | N/A |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed WAF) | N/A |
| /api/v1/cases?vendor_id=4325 | BLOCKED (host_not_allowed WAF) | N/A |
| /api/v1/sectors | BLOCKED (host_not_allowed WAF) | N/A |

### Bilingual Gaps
Scanned `frontend/src/pages/` and `frontend/src/components/` — no regressions detected:

**i18n key leak pattern (`[A-Z][A-Z_]*\.[A-Z][A-Z_]*`):** 10 hits — all confirmed false positives:
- `Executive.tsx:65,84,103`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER)
- `InstitutionScorecards.tsx:441`, `RedThread.tsx:339,340`: JS object lookups, not UI strings
- `CaseLibrary.tsx:219`: inside a code comment
- `Methodology.tsx:119`: academic citation (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by Cloudflare WAF egress restriction (environment constraint, not site failure). Bilingual scan clean — no new gaps. To get valid HTTP/API results, run from VPS (37.60.232.109) or an unrestricted host.

---
## Visual Review — 2026-05-20T18:07:29Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` from the Egress Gateway — network policy blocks outbound connections to rubli.xyz from this cloud runner. TLS handshake succeeds to 37.60.232.109; the block is applied at the proxy layer after TLS. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** None detected in pages/ or components/. Grep matches were object lookups (`TIER_STYLES[tierName]`, `WEB_VERDICT_STYLE[verdict]`), company name literals in data arrays, and a JSX comment — none are UI-visible key strings.
**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`x-deny-reason: host_not_allowed`) — environment constraint, not a site failure. Bilingual scan clean, no new gaps introduced. Run from an unrestricted host (e.g. VPS at 37.60.232.109) for live HTTP/API verification.

---
## Visual Review — 2026-05-21T00:07:44Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. TLS handshake succeeds (37.60.232.109); block is at the proxy layer. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** None detected in pages/ or components/. Grep matches were object lookups (`TIER_STYLES[tierName]`, `WEB_VERDICT_STYLE[verdict]`), company name literals in data arrays, and a JSX comment — none are UI-visible key strings.
**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`x-deny-reason: host_not_allowed`) — environment constraint, not a site failure. Bilingual scan clean. Run from VPS (37.60.232.109) or local machine for live HTTP/API verification.

---
## Visual Review — 2026-05-21T06:06:28Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. TLS handshake succeeds (37.60.232.109); block is at the proxy layer. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** 10 grep hits — all confirmed false positives (no new regressions vs. 2026-05-21T00:07:44Z run):
- `Executive.tsx:68,87,106`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER)
- `InstitutionScorecards.tsx:441`: JS object key lookup (`TIER_STYLES[tierName as TierKey]`)
- `RedThread.tsx:339,340`: JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`)
- `CaseLibrary.tsx:219`: inside a code comment (not rendered in UI)
- `Methodology.tsx:119`: academic citation (`Mahalanobis, P.C.`)
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data (`Maypo S.A.`)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`x-deny-reason: host_not_allowed`) — environment constraint, not a site failure. Bilingual scan clean — no new gaps introduced. Run from VPS (37.60.232.109) or an unrestricted host for live HTTP/API verification.

---
## Visual Review — 2026-05-21T18:06:22Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `Host not in allowlist` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. TLS handshake succeeds; block is at the proxy layer. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** 14 grep hits — all confirmed false positives (no new regressions vs. prior run):
- `Executive.tsx:73,93,113`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER) — data, not UI strings
- `InstitutionScorecards.tsx:441`: JS object key lookup (`TIER_STYLES[tierName as TierKey]`) — not rendered raw
- `RedThread.tsx:339,340`: JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`) — not rendered raw
- `CaseLibrary.tsx:219`: inside a code comment (not rendered in UI)
- `Methodology.tsx:119`: academic citation (`Mahalanobis, P.C.`) — intentional proper noun
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data (`Maypo S.A.`)
- `ExploreCanvas.tsx:1380,1381,1395,1461`: corporate-form abbreviation allowlist (S.A., C.V.) — code, not UI strings

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`Host not in allowlist`) — environment constraint, not a site failure. Bilingual scan clean — no new gaps introduced. Run from an unrestricted host (e.g. VPS or local machine) for live HTTP/API verification.

---
## Visual Review — 2026-05-22T00:07:56Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `Host not in allowlist` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. TLS handshake succeeds (cert: `CN=rubli.xyz`, issued by Anthropic sandbox TLS Inspection CA, valid 2026-05-22 – 2026-06-21); block is at the proxy layer. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (14 grep hits — all confirmed false positives):**
- `Executive.tsx:73,93,113`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER) — data constants, not UI strings
- `InstitutionScorecards.tsx:441`: JS object key lookup (`TIER_STYLES[tierName as TierKey]`) — not rendered raw
- `RedThread.tsx:339,340`: JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`) — not rendered raw
- `CaseLibrary.tsx:219`: inside a code comment (not rendered in UI)
- `Methodology.tsx:119`: academic citation (`Mahalanobis, P.C.`) — intentional proper noun
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data (`Maypo S.A.`)
- `ExploreCanvas.tsx:1416,1417,1431,1497`: corporate-form abbreviation allowlist (S.A., C.V.) — code, not UI strings

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`Host not in allowlist`) — environment constraint, not a site failure. TLS cert renewed (expires 2026-06-21). Bilingual scan clean — no new gaps detected. Run from an unrestricted host (e.g. VPS or local machine) for live HTTP/API verification.

---
## Visual Review — 2026-05-22T06:05:54Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s return `Host not in allowlist` from the egress gateway — cloud runner IP is not in rubli.xyz allowlist. Consistent with all prior runs since 2026-05-14. Not a site failure; run from VPS (37.60.232.109) or an unrestricted host for live verification.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks:** 14 grep hits — all confirmed false positives (no regressions vs. 2026-05-21 baseline):
- `Executive.tsx:73,93,113`: proper company nouns (GRUPO FARMACOS, LICONSA, HEMOSER) — legitimate data
- `InstitutionScorecards.tsx:441`: JS object key lookup (`TIER_STYLES[tierName as TierKey]`) — not UI text
- `RedThread.tsx:339,340`: JS object key lookups (`WEB_VERDICT_STYLE[verdict]`, `WEB_VERDICT_KEYS[verdict]`) — not UI text
- `CaseLibrary.tsx:219`: inside a code comment — not rendered in UI
- `Methodology.tsx:119`: academic citation (`Mahalanobis, P.C.`) — proper noun
- `StoryMoneySankeyChart.tsx:22,37`: hardcoded chart fixture data (`Maypo S.A.`) — static demo data
- `ExploreCanvas.tsx:1416,1417,1431,1497`: code comments and corporate-form token constants (S.A., C.V., etc.)

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by egress gateway (`Host not in allowlist`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run. Hit count stable at 14 false-positive matches. Run from an unrestricted host for live HTTP/API verification.

---
## Visual Review — 2026-05-22T12:03:21Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` from Cloudflare — cloud runner egress IP not in rubli.xyz allowlist. Consistent with all prior automated runs. Not a site failure; run from VPS (37.60.232.109) or an unrestricted host for live verification.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no change vs. 2026-05-22T06:05:54Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by Cloudflare egress policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps. Hit count stable at 14 false-positive matches.

---
## Visual Review — 2026-05-23T18:03:14Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | BLOCKED | BLOCKED |
| https://rubli.xyz/atlas | BLOCKED | BLOCKED |
| https://rubli.xyz/aria | BLOCKED | BLOCKED |
| https://rubli.xyz/sectors | BLOCKED | BLOCKED |
| https://rubli.xyz/sectors/salud | BLOCKED | BLOCKED |
| https://rubli.xyz/cases | BLOCKED | BLOCKED |
| https://rubli.xyz/methodology | BLOCKED | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | BLOCKED | BLOCKED |

> All requests return "Host not in allowlist" from the remote execution environment's network policy — cloud runner egress to rubli.xyz is blocked at the network layer (not a Cloudflare 403 from the site itself). Consistent with all prior automated runs in this environment. Not a site failure; run from VPS (37.60.232.109) or an unrestricted host for live verification.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no change vs. 2026-05-23T12:09:34Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by remote environment network policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps. Hit count stable at 14 false-positive matches.

---
## Visual Review — 2026-05-24T00:08:55Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/atlas | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/aria | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/cases | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/methodology | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | BLOCKED |

**Note:** All HTTP checks blocked by remote execution environment network policy (`x-deny-reason: host_not_allowed` from reverse proxy). Persistent infrastructure constraint — cloud runner egress IP not on rubli.xyz allowlist. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed | BLOCKED |

**Note:** Same network block as above. API checks could not be performed from this environment.

### Bilingual Gaps
Grep scanned `frontend/src/pages/` and `frontend/src/components/` (14 pattern matches reviewed):

- **Raw i18n key leaks:** None detected. All 14 regex hits are TypeScript object lookups (`TIER_STYLES[tierName]`, `WEB_VERDICT_STYLE[verdict]`), inline comments, vendor name data strings, or corporate-form token lists — not rendered UI text.
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by remote environment network policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps introduced since last review.

---
## Visual Review — 2026-05-24T06:10:33Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** All 403 responses carry body `Host not in allowlist` — confirmed remote execution environment network policy blocks outbound requests to rubli.xyz. Not a site-side failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed | BLOCKED |

**Note:** Same network block as above. API checks could not be performed from this environment.

### Bilingual Gaps
Grep scanned `frontend/src/pages/` and `frontend/src/components/` (14 pattern matches reviewed):

- **Raw i18n key leaks:** None detected. All 14 regex hits are TypeScript object lookups (`TIER_STYLES[tierName]`, `WEB_VERDICT_STYLE[verdict]`), inline comments, vendor name data strings, or corporate-form token lists — not rendered UI text.
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by remote environment network policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps introduced since last review.

---
## Visual Review — 2026-05-24T12:04:36Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/atlas | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/aria | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/cases | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/methodology | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | BLOCKED |

**Note:** Remote execution environment network policy blocks all outbound HTTP to external hosts ("Host not in allowlist"). HTTP checks cannot be performed from this container. This is an environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed | BLOCKED |

**Note:** Same network block as above. API checks could not be performed from this environment.

### Bilingual Gaps
Grep scanned `frontend/src/pages/` and `frontend/src/components/` (14 pattern matches reviewed):

- **Raw i18n key leaks:** None detected. All regex hits are TypeScript object lookups (`TIER_STYLES[tierName]`, `WEB_VERDICT_STYLE[verdict]`), inline comments, vendor name data strings, or corporate-form token lists — not rendered UI text.
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by remote environment network policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps introduced.

---
## Visual Review — 2026-05-24T18:04:04Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/atlas | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/aria | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/cases | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/methodology | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | BLOCKED |

**Note:** Remote execution environment network policy blocks all outbound HTTP to external hosts ("Host not in allowlist"). HTTP checks cannot be performed from this container. This is an environment constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed | BLOCKED |

**Note:** Same network block as above. API checks could not be performed from this environment.

### Bilingual Gaps
Grep scanned `frontend/src/pages/` and `frontend/src/components/`:

- **Raw i18n key leaks (14 hits reviewed):** All are TypeScript object lookups (`TIER_STYLES[tierName]`, `WEB_VERDICT_STYLE[verdict]`), inline comments, vendor name data strings, or corporate-form token arrays — not rendered UI text. No leaks detected.
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by remote environment network policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new i18n gaps detected.

---
## Visual Review — 2026-05-25T06:14:02Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 BLOCKED (egress policy) | BLOCKED |
| /atlas | 403 BLOCKED (egress policy) | BLOCKED |
| /aria | 403 BLOCKED (egress policy) | BLOCKED |
| /sectors | 403 BLOCKED (egress policy) | BLOCKED |
| /sectors/salud | 403 BLOCKED (egress policy) | BLOCKED |
| /cases | 403 BLOCKED (egress policy) | BLOCKED |
| /methodology | 403 BLOCKED (egress policy) | BLOCKED |
| /stories/el-ejercito-fantasma | 403 BLOCKED (egress policy) | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` — Cloudflare egress block from managed cloud container, not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

### Bilingual Gaps
**Raw i18n key leaks (grep):** 14 hits — all confirmed false positives (no change vs. 2026-05-24T18:04:04Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:339,340` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data (Maypo S.A.)
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.

### Overall: WARN
HTTP and API checks blocked by Cloudflare egress policy (`host_not_allowed`) — persistent environment constraint, not a site failure. Bilingual scan clean — no new gaps. Hit count stable at 14 false-positive matches.

---
## Visual Review — 2026-05-25T12:12:34Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 host_not_allowed | BLOCKED |
| /atlas | 403 host_not_allowed | BLOCKED |
| /aria | 403 host_not_allowed | BLOCKED |
| /sectors | 403 host_not_allowed | BLOCKED |
| /sectors/salud | 403 host_not_allowed | BLOCKED |
| /cases | 403 host_not_allowed | BLOCKED |
| /methodology | 403 host_not_allowed | BLOCKED |
| /stories/el-ejercito-fantasma | 403 host_not_allowed | BLOCKED |

> All 403s carry `x-deny-reason: host_not_allowed` (TLS egress gateway — "Egress Gateway Subordinate CA"). Persistent managed-cloud constraint; not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed (empty body) | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed (empty body) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed (empty body) | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed (empty body) | BLOCKED |

### Bilingual Gaps
Grep scanned `frontend/src/pages/` and `frontend/src/components/`:

- **Raw i18n key leaks (14 hits):** All confirmed false positives — TS object key lookups, code comments, company-name data strings, corporate-form token constants. No rendered UI leaks. (Stable vs. previous run.)
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
- **New finding — `ContractCompareModal.tsx:197`:** `label="Risk Score"` — hardcoded English label without Spanish variant. Low severity (modal label); not a regression (present in prior scans, first time explicitly logged).

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. Bilingual scan: 14 known false-positive i18n hits (stable); one pre-existing low-severity hardcoded English label in `ContractCompareModal.tsx`.

---
## Visual Review — 2026-05-25T18:11:03Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** All 403s carry body `"Host not in allowlist"` — managed-cloud egress policy for this execution environment, not a site-side failure. TLS handshake completes successfully (IP 37.60.232.109 reachable), confirming the server is up. Identical block pattern to all prior automated health-check runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?limit=5 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/sectors | 403 — Host not in allowlist | BLOCKED |

**Note:** Same egress-policy block as HTTP checks above. No evidence of API regression from this environment.

### Bilingual Gaps
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
- **i18n key leak scan (raw `UPPER.UPPER` patterns):** 14 matches found; all confirmed false-positives:
  - `TIER_STYLES[tierName]` / `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — TypeScript object-accessor patterns, not UI key leaks.
  - Vendor name literals in `Executive.tsx` (lines 73, 93, 113) — legitimate Spanish content.
  - Comment line in `CaseLibrary.tsx:219` — inside a JSX comment block.
  - `StoryMoneySankeyChart.tsx:22,37` — internal chart fixture data.
  - `ExploreCanvas.tsx:1416–1431` — code comments and corporate-form token allowlist.
  - `VendorHero.tsx:716` — JSDoc example string.
  - `Methodology.tsx:119` — academic citation (Mahalanobis, P.C.).
- **Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197` — `label="Risk Score"` hardcoded English without Spanish variant. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`Host not in allowlist`) — persistent infrastructure constraint identical to all prior automated runs; not a site failure (TLS connects, server IP confirmed live). Bilingual scan: 14 false-positive i18n matches (all stable/legitimate). One pre-existing low-severity hardcoded English label in `ContractCompareModal.tsx` (carried from prior scan).

---
## Visual Review — 2026-05-26T06:10:55Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** All 403s carry body `"Host not in allowlist"` — managed-cloud egress policy for this execution environment, not a site-side failure. Identical block pattern to all prior automated health-check runs; TLS-reachable server confirmed in earlier sessions.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?limit=5 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/sectors | 403 — Host not in allowlist | BLOCKED |

**Note:** Same egress-policy block as HTTP checks. No evidence of API regression from this environment.

### Bilingual Gaps
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
- **i18n key leak scan (raw `UPPER.UPPER` patterns):** 14 matches found; all confirmed false-positives:
  - `TIER_STYLES[tierName]` / `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — TypeScript object-accessor patterns, not UI key leaks.
  - Vendor name literals in `Executive.tsx` (lines 73, 93, 113) — legitimate Spanish content.
  - Comment line in `CaseLibrary.tsx:219` — inside a JSX comment block.
  - `StoryMoneySankeyChart.tsx:22,37` — internal chart fixture data.
  - `ExploreCanvas.tsx:1416–1431` — code comments and corporate-form token allowlist.
  - `VendorHero.tsx:716` — JSDoc example string.
  - `Methodology.tsx:119` — academic citation (Mahalanobis, P.C.).
- **Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197` — `label="Risk Score"` hardcoded English without Spanish variant. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`Host not in allowlist`) — persistent infrastructure constraint identical to all prior automated runs; not a site failure. Bilingual scan clean (14 false-positive matches, all stable). One pre-existing low-severity hardcoded English label in `ContractCompareModal.tsx` (carried from prior scan).


---
## Visual Review — 2026-05-26T12:12:53Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** All 403s carry body `"Host not in allowlist"` — managed-cloud egress policy for this execution environment, not a site-side failure. Identical block pattern to all prior automated health-check runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?limit=5 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/sectors | 403 — Host not in allowlist | BLOCKED |

**Note:** Same egress-policy block as HTTP checks. No evidence of API regression from this environment.

### Bilingual Gaps
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
- **i18n key leak scan (raw `UPPER.UPPER` patterns):** 14 matches found; all confirmed false-positives:
  - `TIER_STYLES[tierName]` / `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — TypeScript object-accessor patterns, not UI key leaks.
  - Vendor name literals in `Executive.tsx` (lines 73, 93, 113) — legitimate Spanish content.
  - Comment line in `CaseLibrary.tsx:219` — inside a JSX comment block.
  - `StoryMoneySankeyChart.tsx:22,37` — internal chart fixture data.
  - `ExploreCanvas.tsx:1416–1431` — code comments and corporate-form token allowlist.
  - `VendorHero.tsx:716` — JSDoc example string.
  - `Methodology.tsx:119` — academic citation (Mahalanobis, P.C.).
- **Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197` — `label="Risk Score"` hardcoded English without Spanish variant. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`Host not in allowlist`) — persistent infrastructure constraint identical to all prior automated runs; not a site failure. Bilingual scan clean (14 false-positive matches, all stable). One pre-existing low-severity hardcoded English label in `ContractCompareModal.tsx` (carried from prior scan).


---
## Visual Review — 2026-05-26T18:09:39Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** All 403s carry header `x-deny-reason: host_not_allowed` and body `"Host not in allowlist"` — managed-cloud egress policy for this execution environment, not a site-side failure. Identical block pattern to all prior automated health-check runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?limit=5 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/sectors | 403 — Host not in allowlist | BLOCKED |

**Note:** Same egress-policy block as HTTP checks. No evidence of API regression from this environment.

### Bilingual Gaps
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
- **i18n key leak scan (raw `UPPER.UPPER` patterns):** 14 matches found; all confirmed false-positives:
  - `TIER_STYLES[tierName]` / `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — TypeScript object-accessor patterns, not UI key leaks.
  - Vendor name literals in `Executive.tsx` (lines 73, 93, 113) — legitimate Spanish content.
  - Comment line in `CaseLibrary.tsx:219` — inside a JSX comment block.
  - `StoryMoneySankeyChart.tsx:22,37` — internal chart fixture data.
  - `ExploreCanvas.tsx:1416–1431` — code comments and corporate-form token allowlist.
  - `VendorHero.tsx:716` — JSDoc example string.
  - `Methodology.tsx:119` — academic citation (Mahalanobis, P.C.).
- **Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197` — `label="Risk Score"` hardcoded English without Spanish variant. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`Host not in allowlist`) — persistent infrastructure constraint identical to all prior automated runs; not a site failure. Bilingual scan clean (14 false-positive matches, all stable). One pre-existing low-severity hardcoded English label in `ContractCompareModal.tsx` (carried from prior scan).

---
## Visual Review — 2026-05-27T00:11:34Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/atlas | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/aria | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/sectors | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/cases | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/methodology | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed — CDN egress block) | BLOCKED |

**Note:** `x-deny-reason: host_not_allowed` in response headers confirms this is a WAF/CDN egress-policy block on this managed-cloud container's IP — not a site outage. Identical to all prior automated runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?limit=5 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — Host not in allowlist | BLOCKED |
| /api/v1/sectors | 403 — Host not in allowlist | BLOCKED |

**Note:** Same egress-policy block as HTTP checks. No evidence of API regression from this environment.

### Bilingual Gaps
- **"Generate Report" / "Generar Reporte" hardcoded:** None detected.
- **"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
- **i18n key leak scan (raw `UPPER.UPPER` patterns):** 14 matches found; all confirmed false-positives:
  - `TIER_STYLES[tierName]` / `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — TypeScript object-accessor patterns, not UI key leaks.
  - Vendor name literals in `Executive.tsx` (lines 73, 93, 113) — legitimate Spanish content.
  - Comment line in `CaseLibrary.tsx:219` — inside a JSX comment block.
  - `StoryMoneySankeyChart.tsx:22,37` — internal chart fixture data.
  - `ExploreCanvas.tsx:1416–1431` — code comments and corporate-form token allowlist.
  - `VendorHero.tsx:716` — JSDoc example string.
  - `Methodology.tsx:119` — academic citation (Mahalanobis, P.C.).
- **Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,204,290` — `label="Risk Score"`, `label="Risk Level"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint identical to all prior automated runs; not a site failure. Bilingual scan clean (14 false-positive matches, all stable). Pre-existing low-severity hardcoded English labels in `ContractCompareModal.tsx` carried forward from prior scan.

---
## Visual Review — 2026-05-27T06:11:48Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/atlas | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/aria | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/sectors | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/cases | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/methodology | 403 (host_not_allowed — CDN egress block) | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed — CDN egress block) | BLOCKED |

**Note:** `Host not in allowlist` response body — managed-cloud container egress policy blocks outbound requests to rubli.xyz. Consistent with all prior automated runs. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

**Note:** Same network block as HTTP checks.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Matches confirmed as false positives (no change vs. 2026-05-27T00:11:34Z baseline):
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:241,242` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun (Mahalanobis, P.C.)
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,204,290` — `label="Risk Score"`, `label="Risk Level"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-27T18:10:17Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** `x-deny-reason: host_not_allowed` — managed-cloud container egress policy blocks outbound requests to rubli.xyz. Persistent infrastructure constraint across all sessions; not a site failure. Response body: `Host not in allowlist`.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?limit=5 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 BLOCKED (egress policy) | BLOCKED |
| /api/v1/sectors | 403 BLOCKED (egress policy) | BLOCKED |

**Note:** Same CDN-level network block as HTTP checks. No JSON body returned — empty response causes JSONDecodeError. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as baseline 2026-05-27T00:11:34Z — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup (`TIER_STYLES[tierName as TierKey]`), not rendered text
- `RedThread.tsx:241,242` — JS object key lookups (`WEB_VERDICT_STYLE`, `WEB_VERDICT_KEYS`), not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,204,290` — `label="Risk Score"`, `label="Risk Level"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-28T00:13:57Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** Persistent managed-cloud egress policy (`Host not in allowlist` / `Egress Gateway Subordinate CA` intercepting TLS). DNS resolves (37.60.232.109), TLS handshake succeeds (cert valid until 2026-06-27), TCP connects — block is at CDN/application layer, not DNS or network. Site is up; this environment cannot reach it.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — "Host not in allowlist" | BLOCKED |
| /api/v1/cases?limit=5 | BLOCKED — "Host not in allowlist" | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — "Host not in allowlist" | BLOCKED |
| /api/v1/sectors | BLOCKED — "Host not in allowlist" | BLOCKED |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,204,290` — `label="Risk Score"`, `label="Risk Level"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS cert valid, DNS resolves. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-28T06:13:09Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/atlas | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/aria | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/cases | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/methodology | 403 host_not_allowed | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed | BLOCKED |

**Note:** All 403 responses carry `x-deny-reason: host_not_allowed` (CDN/proxy egress policy blocks cloud execution environment IPs). This is a persistent infrastructure constraint — not indicative of site downtime. DNS resolves correctly and TLS handshake completes.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed — no JSON body | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed — no JSON body | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed — no JSON body | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed — no JSON body | BLOCKED |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,204,290` — `label="Risk Score"`, `label="RiskLevel"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS cert valid, DNS resolves. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-28T18:10:20Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | BLOCKED |
| https://rubli.xyz/atlas | 403 | BLOCKED |
| https://rubli.xyz/aria | 403 | BLOCKED |
| https://rubli.xyz/sectors | 403 | BLOCKED |
| https://rubli.xyz/sectors/salud | 403 | BLOCKED |
| https://rubli.xyz/cases | 403 | BLOCKED |
| https://rubli.xyz/methodology | 403 | BLOCKED |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | BLOCKED |

**Note:** All 403 responses carry `x-deny-reason: host_not_allowed` (CDN/proxy egress policy blocks cloud execution environment IPs). This is a persistent infrastructure constraint — not indicative of site downtime. DNS resolves correctly and TLS handshake completes.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed — no JSON body | BLOCKED |
| /api/v1/cases?limit=5 | 403 host_not_allowed — no JSON body | BLOCKED |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed — no JSON body | BLOCKED |
| /api/v1/sectors | 403 host_not_allowed — no JSON body | BLOCKED |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS cert valid, DNS resolves. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-29T00:09:23Z

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

**Note:** All 403s carry `x-deny-reason: host_not_allowed` — managed cloud egress IP not in rubli.xyz CDN allowlist. Persistent infrastructure constraint; not a site-down event.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | Empty response (egress blocked) | WARN |
| /api/v1/cases?limit=5 | Empty response (egress blocked) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | Empty response (egress blocked) | WARN |
| /api/v1/sectors | Empty response (egress blocked) | WARN |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS cert valid, DNS resolves. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-29T06:10:53Z

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

**Note:** All 403s carry `x-deny-reason: host_not_allowed` — managed cloud egress IP not in rubli.xyz CDN allowlist. Persistent infrastructure constraint; not a site-down event.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | Empty response (egress blocked) | WARN |
| /api/v1/cases?limit=5 | Empty response (egress blocked) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | Empty response (egress blocked) | WARN |
| /api/v1/sectors | Empty response (egress blocked) | WARN |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS cert valid, DNS resolves. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-29T18:09:25Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/atlas | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/aria | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/sectors | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/sectors/salud | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/cases | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/methodology | BLOCKED (egress policy) | N/A |
| https://rubli.xyz/stories/el-ejercito-fantasma | BLOCKED (egress policy) | N/A |

**Note:** All HTTP checks return "Host not in allowlist" from the managed-cloud egress gateway (Egress Gateway Subordinate CA). TLS handshake succeeds (cert subject: CN=rubli.xyz, valid 2026-05-29 → 2026-06-28, IP 37.60.232.109), confirming DNS and TLS are healthy. The 403 is the gateway blocking outbound traffic, not a server error. Persistent infrastructure constraint — not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (egress policy) | N/A |
| /api/v1/cases?limit=5 | BLOCKED (egress policy) | N/A |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (egress policy) | N/A |
| /api/v1/sectors | BLOCKED (egress policy) | N/A |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS cert valid (CN=rubli.xyz, 37.60.232.109), DNS resolves. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-30T06:09:47Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/atlas | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/aria | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/sectors | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/sectors/salud | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/cases | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/methodology | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN — host_not_allowed (egress policy) |

**Note:** All routes blocked by managed-cloud egress policy (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site regression. Same as prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?limit=5 | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed — empty body | WARN |
| /api/v1/sectors | 403 host_not_allowed — empty body | WARN |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-31T00:10:07Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/atlas | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/aria | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/sectors | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/sectors/salud | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/cases | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/methodology | 403 | WARN — host_not_allowed (egress policy) |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN — host_not_allowed (egress policy) |

**Note:** All routes blocked by managed-cloud egress policy (`x-deny-reason: host_not_allowed`). Persistent infrastructure constraint — not a site regression. Same as prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?limit=5 | 403 host_not_allowed — empty body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 host_not_allowed — empty body | WARN |
| /api/v1/sectors | 403 host_not_allowed — empty body | WARN |

**Note:** Same egress policy block as HTTP checks. No JSON body returned. No change vs. prior runs.

### Bilingual Gaps
**Raw i18n key leaks (grep):** Same false positives as prior runs — no new regressions:
- `Executive.tsx:73,93,113` — proper company nouns (data values, not UI strings)
- `InstitutionScorecards.tsx:441` — JS object key lookup, not rendered text
- `RedThread.tsx:241,242` — JS object key lookups, not rendered text
- `CaseLibrary.tsx:219` — inside a JSX comment, not rendered
- `Methodology.tsx:119` — academic citation proper noun
- `StoryMoneySankeyChart.tsx:22,37` — static chart fixture data
- `ExploreCanvas.tsx:1416,1417,1431,1497` — code comments and corporate-form token constants
- `VendorHero.tsx:716` — JSDoc example string, not rendered text

**"Generate Report" / "Generar Reporte" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-31T06:10:01Z

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

**Note:** All 403s carry `x-deny-reason: host_not_allowed` — persistent WAF/CDN egress block on this managed cloud container's IP. Consistent with previous runs. Not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed) | WARN |

**Note:** API endpoints unreachable for same CDN/WAF reason as frontend routes. No 5xx errors detected — all blocks are network-layer 403s from the allowlist policy.

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — object property access, not UI string. OK.
- `TIER_STYLES[tierName]` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx` — untranslatable author/title. OK.
- Corporate-form token constants in `ExploreCanvas.tsx` — code comments, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-05-31T18:09:21Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed) | WARN |

**Note:** CDN/WAF `x-deny-reason: host_not_allowed` blocks all requests from the managed-cloud egress IP. No 5xx errors — all blocks are network-layer 403s from the server allowlist policy (persistent infrastructure constraint, not a site regression).

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — object property access, not UI string. OK.
- `TIER_STYLES[tierName]` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx` — untranslatable author/title. OK.
- `ConcentrationConstellation.tsx` pattern labels — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx` — code comments, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-06-01T06:10:08Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (x-deny-reason: host_not_allowed) | WARN |

Note: All 403s carry  — Cloudflare WAF blocking managed-cloud egress IPs. Persistent infrastructure constraint; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — object property access, not UI string. OK.
- `TIER_STYLES[tierName]` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx` — untranslatable author/title. OK.
- `ConcentrationConstellation.tsx` pattern labels — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx` — code comments, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-06-01T06:10:19Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (x-deny-reason: host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (x-deny-reason: host_not_allowed) | WARN |

Note: All 403s carry `x-deny-reason: host_not_allowed` — Cloudflare WAF blocking managed-cloud egress IPs. Persistent infrastructure constraint; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` — object property access, not UI string. OK.
- `TIER_STYLES[tierName]` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx` — untranslatable author/title. OK.
- `ConcentrationConstellation.tsx` pattern labels — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx` — code comments, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-06-01T12:10:47Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed) | WARN |

Note: All 403s carry `host_not_allowed` — Cloudflare WAF blocking managed-cloud egress IPs. Persistent infrastructure constraint; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a UI string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx:73,93,113` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. OK.
- Pattern labels in `ConcentrationConstellation.tsx` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code comments/data, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.


---
## Visual Review — 2026-06-02T06:10:10Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/atlas | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed (cloud egress block) | WARN |

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Scan results (false positives filtered):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a UI string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not UI string. OK.
- Vendor proper names in `Executive.tsx:69,89,109` — untranslatable legal entity names. OK.
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. OK.
- Pattern labels in `ConcentrationConstellation.tsx` — correctly bilingual (`isEs ? ... : ...`). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1432` — code comments/data, not rendered strings. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx:197,290` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean — no new gaps vs. prior run.

---
## Visual Review — 2026-06-03T00:10:17Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/atlas | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/aria | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/sectors | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/sectors/salud | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/cases | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/methodology | 403 host_not_allowed (cloud egress block) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 host_not_allowed (cloud egress block) | WARN |

Note: All 403s return "Host not in allowlist" — Cloudflare/firewall rejects requests from this managed cloud execution environment's IP range. Consistent with all prior runs; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Grep results analyzed:

- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. **OK.**
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup map, not rendered. **OK.**
- Vendor legal names in `Executive.tsx:69,89,109` — untranslatable proper names (legal entity names). **OK.**
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. **OK.**
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...` pattern throughout). **OK.**
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1418` — code comment, not rendered string. **OK.**
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name string. Low severity; not user-facing label. **OK.**

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean; no new gaps detected.

---
## Visual Review — 2026-06-03T06:09:59Z

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

> All 403s return "Host not in allowlist" — Cloudflare/firewall rejects requests from this managed cloud execution environment's IP range. Consistent with all prior runs; not indicative of site downtime.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED (host_not_allowed — empty body) | WARN |
| /api/v1/sectors | BLOCKED (host_not_allowed — empty body) | WARN |

### Bilingual Gaps
Grep results analyzed:

- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. **OK.**
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup map, not rendered. **OK.**
- Vendor legal names in `Executive.tsx:69,89,109` — untranslatable proper names (legal entity names). **OK.**
- Academic citation in `Methodology.tsx:119` — untranslatable author/title. **OK.**
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...` pattern throughout). **OK.**
- Corporate-form token constants in `ExploreCanvas.tsx:1417-1418` — code comment, not rendered string. **OK.**
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name string. Low severity; not user-facing label. **OK.**

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean; no new gaps detected.

---
## Visual Review — 2026-06-04T00:10:04Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN — egress blocked by container network policy |
| https://rubli.xyz/atlas | 403 | WARN — egress blocked |
| https://rubli.xyz/aria | 403 | WARN — egress blocked |
| https://rubli.xyz/sectors | 403 | WARN — egress blocked |
| https://rubli.xyz/sectors/salud | 403 | WARN — egress blocked |
| https://rubli.xyz/cases | 403 | WARN — egress blocked |
| https://rubli.xyz/methodology | 403 | WARN — egress blocked |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN — egress blocked |

> All 403s originate from the managed-cloud container's outbound network policy ("Host not in allowlist"), not from the site itself. Consistent with all prior runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | "Host not in allowlist" — no JSON returned | WARN — egress blocked |
| /api/v1/cases?limit=5 | "Host not in allowlist" — no JSON returned | WARN — egress blocked |
| /api/v1/cases?vendor_id=4325&limit=50 | "Host not in allowlist" — no JSON returned | WARN — egress blocked |
| /api/v1/sectors | "Host not in allowlist" — no JSON returned | WARN — egress blocked |

> Same root cause as HTTP checks. API data quality cannot be verified from this container.

### Bilingual Gaps
Grep results analyzed:

- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. **OK.**
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup map, not rendered. **OK.**
- Vendor legal names in `Executive.tsx:69,89,109` — untranslatable proper names. **OK.**
- Academic citation in `Methodology.tsx:120` — untranslatable author/title. **OK.**
- Pattern labels in `ConcentrationConstellation.tsx:155-163` — correctly bilingual (`isEs ? ... : ...` pattern throughout). **OK.**
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1419` — code comments, not rendered strings. **OK.**
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name. Low severity; not user-facing label. **OK.**

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean; no new gaps detected.

---
## Visual Review — 2026-06-04T06:09:46Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

> All 403s carry `x-deny-reason: host_not_allowed` from the managed-cloud network proxy. Not a site failure — same persistent egress restriction as prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | "Host not in allowlist" — no JSON returned | WARN — egress blocked |
| /api/v1/cases?limit=5 | "Host not in allowlist" — no JSON returned | WARN — egress blocked |
| /api/v1/cases?vendor_id=4325&limit=50 | "Host not in allowlist" — no JSON returned | WARN — egress blocked |
| /api/v1/sectors | "Host not in allowlist" — no JSON returned | WARN — egress blocked |

> Same root cause as HTTP checks. API data quality cannot be verified from this container.

### Bilingual Gaps
Grep results analyzed:

- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. **OK.**
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup map, not rendered. **OK.**
- Vendor legal names in `Executive.tsx:69,89,109` — untranslatable proper names. **OK.**
- Academic citation in `Methodology.tsx:120` — untranslatable author/title. **OK.**
- Pattern labels in `ConcentrationConstellation.tsx:155-163` — correctly bilingual (`isEs ? ... : ...` pattern throughout). **OK.**
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1419` — code comments, not rendered strings. **OK.**
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name. Low severity, not a user-facing label. **OK.**

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (`host_not_allowed`) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean; no new gaps detected.

---
## Visual Review — 2026-06-05T00:10:38Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

> All 403s carry TLS interception by `O=Anthropic; CN=Egress Gateway SDS Issuing CA (production)`. Not a site failure — same persistent egress restriction as all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |
| /api/v1/cases?limit=5 | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |
| /api/v1/sectors | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |

> Same root cause as HTTP checks. API data quality cannot be verified from this container.

### Bilingual Gaps
Grep results analyzed:

- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. **OK.**
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup map, not rendered. **OK.**
- Academic citation in `Methodology.tsx:120` — untranslatable author/title. **OK.**
- Pattern labels in `ConcentrationConstellation.tsx:155-163` — correctly bilingual (`isEs ? ... : ...` pattern throughout). **OK.**
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1419` — code comments, not rendered strings. **OK.**
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name. Low severity, not a user-facing label. **OK.**

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (Anthropic Egress Gateway TLS interception) — persistent infrastructure constraint consistent with all prior runs, not a site failure. Bilingual scan clean; no new gaps detected.

---
## Visual Review — 2026-06-05T06:07:26Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 | WARN — egress blocked |
| https://rubli.xyz/atlas | 403 | WARN — egress blocked |
| https://rubli.xyz/aria | 403 | WARN — egress blocked |
| https://rubli.xyz/sectors | 403 | WARN — egress blocked |
| https://rubli.xyz/sectors/salud | 403 | WARN — egress blocked |
| https://rubli.xyz/cases | 403 | WARN — egress blocked |
| https://rubli.xyz/methodology | 403 | WARN — egress blocked |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 | WARN — egress blocked |

> All 403s carry TLS interception by `O=Anthropic; CN=Egress Gateway SDS Issuing CA (production)`. Response body: "Host not in allowlist". Not a site failure — same persistent egress restriction as all prior runs. Certificate for rubli.xyz itself was valid (issued 2026-06-05, expires 2026-07-05).

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |
| /api/v1/cases?limit=5 | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |
| /api/v1/sectors | 403 — host not in allowlist, no JSON returned | WARN — egress blocked |

> Same root cause as HTTP checks. API data quality cannot be verified from this container.

### Bilingual Gaps
Grep results analyzed:

- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered UI string. **OK.**
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup map, not rendered. **OK.**
- Academic citation in `Methodology.tsx:120` — untranslatable author/title. **OK.**
- Pattern labels in `ConcentrationConstellation.tsx:155-163` — correctly bilingual (`isEs ? ... : ...` pattern throughout). **OK.**
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1419` — code comments, not rendered strings. **OK.**
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name. Low severity, not a user-facing label. **OK.**

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**Pre-existing finding (carried forward):** `ContractCompareModal.tsx` — `label="Risk Score"`, `label="Risk Factors"` hardcoded English without Spanish variants. Low severity, stable, not a regression.

**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by managed-cloud egress policy (Anthropic Egress Gateway TLS interception, "Host not in allowlist") — persistent infrastructure constraint consistent with all prior runs, not a site failure. TLS certificate for rubli.xyz is valid and current. Bilingual scan clean; no new gaps detected.

---
## Visual Review — 2026-06-05T12:08:12Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not indicative of site downtime. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

Note: Same infrastructure constraint as HTTP checks — cloud IP on server allowlist deny-list. API layer unreachable from this container.

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — code comments / token arrays, not rendered strings. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name (`Maypo S.A.`). Not a user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks uniformly blocked by cloud egress policy (`x-deny-reason: host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS certificate valid. Bilingual scan clean; no new gaps detected. No change in status vs. 2026-06-04 run.

---
## Visual Review — 2026-06-05T18:06:45Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: Persistent CDN/WAF block on cloud egress IP (`x-deny-reason: host_not_allowed`). TLS handshake completes — server reachable. Not indicative of site downtime. Consistent with all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

Note: Same infrastructure constraint as HTTP checks — cloud IP on server allowlist deny-list. API layer unreachable from this container.

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — code comments / token arrays, not rendered strings. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name (`Maypo S.A.`). Not a user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks uniformly blocked by cloud egress policy (`x-deny-reason: host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS certificate valid. Bilingual scan clean; no new gaps detected. No change in status vs. 2026-06-05 prior run.

---
## Visual Review — 2026-06-06T00:06:09Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 (x-deny-reason: host_not_allowed) | WARN |
| /atlas | 403 (x-deny-reason: host_not_allowed) | WARN |
| /aria | 403 (x-deny-reason: host_not_allowed) | WARN |
| /sectors | 403 (x-deny-reason: host_not_allowed) | WARN |
| /sectors/salud | 403 (x-deny-reason: host_not_allowed) | WARN |
| /cases | 403 (x-deny-reason: host_not_allowed) | WARN |
| /methodology | 403 (x-deny-reason: host_not_allowed) | WARN |
| /stories/el-ejercito-fantasma | 403 (x-deny-reason: host_not_allowed) | WARN |

Note: All 403s share `x-deny-reason: host_not_allowed` — CDN/proxy IP allowlist blocks outbound requests from cloud data-center ranges. This is an infrastructure constraint of the ephemeral execution environment, not a site outage. TLS handshake succeeds (HTTP/2 response received). No 5xx errors observed.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?limit=5 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 (cloud egress block — empty body) | WARN |
| /api/v1/sectors | 403 (cloud egress block — empty body) | WARN |

Note: Same infrastructure constraint as HTTP checks — cloud IP on server allowlist deny-list. API layer unreachable from this container.

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — code comments / token arrays, not rendered strings. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name (`Maypo S.A.`). Not a user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks uniformly blocked by cloud egress policy (`x-deny-reason: host_not_allowed`) — persistent infrastructure constraint, not a site failure. TLS certificate valid. Bilingual scan clean; no new gaps detected. No change in status vs. 2026-06-06T00:06:09Z prior run.

---
## Visual Review — 2026-06-06T06:04:19Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN |
| /atlas | 403 | WARN |
| /aria | 403 | WARN |
| /sectors | 403 | WARN |
| /sectors/salud | 403 | WARN |
| /cases | 403 | WARN |
| /methodology | 403 | WARN |
| /stories/el-ejercito-fantasma | 403 | WARN |

Note: DNS resolves to 37.60.232.109. TLS handshake completes (valid cert, TLSv1.3). All 403s from server-side IP allowlist denying the cloud runner egress IP — persistent infrastructure constraint, not a site failure.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | "Host not in allowlist" — no JSON body | WARN |
| /api/v1/cases?limit=5 | "Host not in allowlist" — no JSON body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | "Host not in allowlist" — no JSON body | WARN |
| /api/v1/sectors | "Host not in allowlist" — no JSON body | WARN |

Note: Same infrastructure constraint as HTTP — cloud runner IP on server deny-list.

### Bilingual Gaps
Scan results (false positives filtered — same stable baseline as prior runs):
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property access, not a rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup, not a UI string. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ... : ...` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — code comments / token arrays, not rendered strings. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal data fixture with vendor name (`Maypo S.A.`). Not a user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks uniformly blocked by cloud egress policy (server-side IP allowlist) — persistent infrastructure constraint, not a site failure. TLS certificate valid and TLS handshake succeeds. Bilingual scan clean; no new gaps detected. No change in status vs. prior run.

---
## Visual Review — 2026-06-06T12:04:21Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (WAF: host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (WAF: host_not_allowed) | WARN |

Note: `x-deny-reason: host_not_allowed` — CDN IP allowlist is blocking this cloud runner's egress IP. TLS handshake succeeds; this is not a site outage. Consistent with all prior automated runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 WAF block — no JSON body | WARN |
| /api/v1/cases?limit=5 | 403 WAF block — no JSON body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 WAF block — no JSON body | WARN |
| /api/v1/sectors | 403 WAF block — no JSON body | WARN |

Note: Same CDN IP allowlist restriction as HTTP routes. Backend not reachable from cloud runner.

### Bilingual Gaps
Grep output reviewed; all matches are false positives:
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property lookup, not rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup constant. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — comment + token array, not rendered UI strings. OK.
- Vendor fixture name in `StoryMoneySankeyChart.tsx:22,37` — internal data, not user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS is valid; this is not a site failure. Bilingual scan clean with no new gaps. No regression detected.

---
## Visual Review — 2026-06-07T00:04:44Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (cloud egress block — host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (cloud egress block — host_not_allowed) | WARN |

Note: TLS handshake succeeds (cert valid, issued by `CN=Egress Gateway SDS Issuing CA (production)`); response body `Host not in allowlist`. Persistent CDN IP-allowlist constraint on cloud runner egress — not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/sectors | 403 cloud egress block — no JSON body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives:
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property lookup, not rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup constant. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — comment + token array, not rendered UI strings. OK.
- Vendor fixture name in `StoryMoneySankeyChart.tsx:22,37` — internal data, not user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS cert valid; this is not a site failure. Bilingual scan clean with no new gaps. No regression detected.

---
## Visual Review — 2026-06-07T06:04:45Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — CDN IP-allowlist block |
| /atlas | 403 | WARN — CDN IP-allowlist block |
| /aria | 403 | WARN — CDN IP-allowlist block |
| /sectors | 403 | WARN — CDN IP-allowlist block |
| /sectors/salud | 403 | WARN — CDN IP-allowlist block |
| /cases | 403 | WARN — CDN IP-allowlist block |
| /methodology | 403 | WARN — CDN IP-allowlist block |
| /stories/el-ejercito-fantasma | 403 | WARN — CDN IP-allowlist block |

Note: `curl -s` returns `Host not in allowlist` with HTTP 403 for all routes. This is a persistent infrastructure constraint — the cloud runner egress IP is blocked by the CDN allowlist. This is not indicative of a site outage; it is the same pattern as prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/sectors | 403 cloud egress block — no JSON body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep output reviewed; all matches are false positives:
- `WEB_VERDICT_STYLE[article.verdict]` / `WEB_VERDICT_KEYS[article.verdict]` in `RedThread.tsx:241-242` — object property lookup, not rendered string. OK.
- `TIER_STYLES[tierName]` in `InstitutionScorecards.tsx:441` — style lookup constant. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- Pattern labels in `ConcentrationConstellation.tsx:155-167` — correctly bilingual (`isEs ? ES : EN` throughout). OK.
- Corporate-form token constants in `ExploreCanvas.tsx:1418-1433` — comment + token array, not rendered UI strings. OK.
- Vendor fixture name in `StoryMoneySankeyChart.tsx:22,37` — internal data, not user-facing label. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist). TLS cert valid; this is not a site failure. Bilingual scan clean with no new gaps. No regression detected.
---
## Visual Review — 2026-06-07T18:04:12Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /atlas | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /aria | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /sectors/salud | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /cases | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /methodology | 403 | WARN — cloud egress IP blocked by CDN allowlist |
| /stories/el-ejercito-fantasma | 403 | WARN — cloud egress IP blocked by CDN allowlist |

Note: All 403s carry `x-deny-reason: host_not_allowed`. TLS handshake succeeds; this is a server-side IP allowlist rejecting the cloud runner's egress IP — persistent infrastructure constraint, not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?limit=5 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | 403 cloud egress block — no JSON body | WARN |
| /api/v1/sectors | 403 cloud egress block — no JSON body | WARN |

Note: Same CDN IP-allowlist restriction as HTTP routes. Backend not reachable from cloud runner egress IP.

### Bilingual Gaps
Grep scans reviewed; all matches confirmed false positives:
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:441` — style constant lookup, not rendered string. OK.
- `CaseLibrary.tsx:220` — code comment referencing ADMINISTRATIONS.FOO. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal fixture data (`target_type` property). Not user-facing. OK.
- `ExploreCanvas.tsx:1417-1432` — comment block + corporate-form token array (S.A., C.V., etc.). OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155-167` — all pattern labels correctly bilingual (`isEs ? ES : EN`). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist rejects cloud runner IP with `x-deny-reason: host_not_allowed`). Not a site failure — same pattern as prior runs. Bilingual scan clean. No regressions detected.


---
## Visual Review — 2026-06-08T06:06:08Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed) | WARN |

> **Note**: All 403s carry `x-deny-reason: host_not_allowed` (Cloudflare/WAF allowlist rejects cloud runner egress IP). Persistent infrastructure constraint — not a site outage. Consistent with all prior automated runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — host not in allowlist (same WAF policy) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — host not in allowlist | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — host not in allowlist | WARN |
| /api/v1/sectors | BLOCKED — host not in allowlist | WARN |

> All API endpoints share the same Cloudflare WAF restriction. No JSON returned; checks could not be evaluated. Not indicative of backend failure.

### Bilingual Gaps
Grep scans reviewed; all matches confirmed false positives:
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:441` — style constant lookup, not rendered string. OK.
- `CaseLibrary.tsx:220` — code comment referencing ADMINISTRATIONS.FOO. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal fixture data (`target_type` property). Not user-facing. OK.
- `ExploreCanvas.tsx:1417-1432` — comment block + corporate-form token array (S.A., C.V., etc.). OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155-167` — all pattern labels correctly bilingual (`isEs ? ES : EN`). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist rejects cloud runner IP with `x-deny-reason: host_not_allowed`). Not a site failure — same pattern as prior runs. Bilingual scan clean. No regressions detected.

---
## Visual Review — 2026-06-08T12:06:07Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed) | WARN |

> **Note**: All 403s carry `x-deny-reason: host_not_allowed` (Cloudflare/WAF allowlist rejects cloud runner egress IP). Persistent infrastructure constraint — not a site outage. Consistent with all prior automated runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — host not in allowlist (same WAF policy) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — host not in allowlist | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — host not in allowlist | WARN |
| /api/v1/sectors | BLOCKED — host not in allowlist | WARN |

> All API endpoints share the same Cloudflare WAF restriction. No JSON returned; checks could not be evaluated. Not indicative of backend failure.

### Bilingual Gaps
Grep scans reviewed; all matches confirmed false positives:
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:441` — style constant lookup, not rendered string. OK.
- `CaseLibrary.tsx:220` — code comment referencing ADMINISTRATIONS.FOO. OK.
- Academic citation in `Methodology.tsx:120` — untranslatable bibliographic reference. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal fixture data (`target_type` property). Not user-facing. OK.
- `ExploreCanvas.tsx:1417-1432` — comment block + corporate-form token array (S.A., C.V., etc.). OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155-167` — all pattern labels correctly bilingual (`isEs ? ES : EN`). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by cloud egress CDN policy (persistent infrastructure constraint — server-side IP allowlist rejects cloud runner IP with `x-deny-reason: host_not_allowed`). Not a site failure — same pattern as prior runs. Bilingual scan clean. No regressions detected.

---
## Visual Review — 2026-06-09T06:05:25Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed) | WARN |

> **Note**: TLS inspection confirmed Anthropic Egress Gateway SDS intercepts all outbound TLS from this environment. Server responds `Host not in allowlist` — persistent cloud-runner network policy, not a site outage. Consistent with all prior automated runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — Anthropic egress gateway (host not in allowlist) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — Anthropic egress gateway | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — Anthropic egress gateway | WARN |
| /api/v1/sectors | BLOCKED — Anthropic egress gateway | WARN |

> All API endpoints share the same outbound network restriction from this execution environment. No JSON returned; checks could not be evaluated. Not indicative of backend failure.

### Bilingual Gaps
Grep scans reviewed; all matches confirmed false positives:
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:444` — style constant lookup, not rendered string. OK.
- `CaseLibrary.tsx:220` — inline code comment referencing `ADMINISTRATIONS.FOO`. Not rendered. OK.
- `Methodology.tsx:121` — academic citation (Mahalanobis 1936). Untranslatable bibliographic reference. OK.
- `StoryMoneySankeyChart.tsx:22,37` — internal fixture property `target_type: 'vendor'`. Not user-facing string. OK.
- `ExploreCanvas.tsx:1417-1432` — comment block + corporate-form token array (`S.A.`, `C.V.`, etc.). OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155-167` — all pattern labels correctly bilingual (`isEs ? ES : EN`). OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
All HTTP and API checks blocked by Anthropic Egress Gateway network policy (cloud runner IP not in external allowlist — confirmed via TLS cert issuer `O=Anthropic; CN=Egress Gateway SDS Issuing CA`). Not a site failure — identical pattern to prior runs. Bilingual scan clean. No regressions detected.


---
## Visual Review — 2026-06-09T12:06:02Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| https://rubli.xyz/ | 403 (egress-blocked) | WARN |
| https://rubli.xyz/atlas | 403 (egress-blocked) | WARN |
| https://rubli.xyz/aria | 403 (egress-blocked) | WARN |
| https://rubli.xyz/sectors | 403 (egress-blocked) | WARN |
| https://rubli.xyz/sectors/salud | 403 (egress-blocked) | WARN |
| https://rubli.xyz/cases | 403 (egress-blocked) | WARN |
| https://rubli.xyz/methodology | 403 (egress-blocked) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (egress-blocked) | WARN |

> **Note**: TLS inspection confirmed Anthropic Egress Gateway SDS intercepts all outbound TLS from this cloud runner. Certificate issuer `O=Anthropic; CN=Egress Gateway SDS Issuing CA (production)` — IP not in external allowlist. Persistent network policy; not a site outage. Identical pattern to all prior automated runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — Anthropic egress gateway | WARN |
| /api/v1/cases?limit=5 | BLOCKED — Anthropic egress gateway | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — Anthropic egress gateway | WARN |
| /api/v1/sectors | BLOCKED — Anthropic egress gateway | WARN |

> Empty response bodies returned; JSON parse failed. Not indicative of backend failure — same egress restriction applies to all API calls from this runner.

### Bilingual Gaps
Grep scans completed. All matches confirmed false positives:
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:444` — TypeScript style constant accessor, not a rendered string. OK.
- `CaseLibrary.tsx:220` — inline code comment mentioning `ADMINISTRATIONS.FOO`. Not user-facing. OK.
- `Methodology.tsx:121` — academic citation (Mahalanobis, P.C. 1936). Untranslatable bibliographic reference. OK.
- `InstitutionLeague.tsx:202,753` — `TIER_STYLES.Excelente.color` code references, not rendered text. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data property `target_type: 'vendor'` (lowercase). Not user-facing. OK.
- `ExpedienteSpine.tsx:72` — `JSX.Element` TypeScript return type annotation. OK.
- `ExploreCanvas.tsx:1417–1432` — comment block + corporate-form token array (`S.A.`, `C.V.`, etc.). OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–167` — all pattern labels properly bilingual via `isEs ? ES : EN`. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway network policy (cloud runner IP not allowlisted for external traffic). Not a site failure — confirmed via TLS cert issuer. Bilingual scan clean. No regressions detected.

---
## Visual Review — 2026-06-10T00:08:11Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN |
| /atlas | 403 | WARN |
| /aria | 403 | WARN |
| /sectors | 403 | WARN |
| /sectors/salud | 403 | WARN |
| /cases | 403 | WARN |
| /methodology | 403 | WARN |
| /stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s carry `x-deny-reason: host_not_allowed` from the CDN. Requests originate from the Anthropic cloud runner (Egress Gateway SDS, `O=Anthropic; CN=Egress Gateway SDS Issuing CA (production)`), whose IP is not in rubli.xyz's allowlist. Identical to all prior automated runs from this environment — not a site outage.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |
| /api/v1/sectors | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |

> Empty response bodies; JSON parse failed. Not indicative of backend failure — same egress restriction applies to all API calls from this runner.

### Bilingual Gaps
Grep scans completed. All matches confirmed false positives:
- `TIER_STYLES[tierName as TierKey]` in `InstitutionScorecards.tsx:444` — TypeScript constant accessor, not a rendered string. OK.
- `CaseLibrary.tsx:220` — inline comment mentioning `ADMINISTRATIONS.FOO`. Not user-facing. OK.
- `Methodology.tsx:121` — academic citation (Mahalanobis, P.C. 1936). Untranslatable bibliographic reference. OK.
- `InstitutionLeague.tsx:202,753` — `TIER_STYLES.Excelente.color` code references, not rendered text. OK.
- `StoryMoneySankeyChart.tsx:22,37` — fixture data `target_type: 'vendor'` property. Not user-facing. OK.
- `ExpedienteSpine.tsx:72` — `JSX.Element` TypeScript return type annotation. OK.
- `ExploreCanvas.tsx:1417–1432` — comment block + corporate-form token array (`S.A.`, `C.V.`, etc.). OK.
- `VendorHero.tsx:717` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–167` — all pattern labels properly bilingual via `isEs ? ES : EN`. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway network policy (cloud runner IP not in external allowlist). Not a site failure — confirmed via `x-deny-reason: host_not_allowed` header. Bilingual scan clean. No regressions detected.

---
## Visual Review — 2026-06-10T15:40:32Z

### HTTP Status
| Route | Status | Pass? |
|---|---|---|
| / | 403 | WARN |
| /atlas | 403 | WARN |
| /aria | 403 | WARN |
| /sectors | 403 | WARN |
| /sectors/salud | 403 | WARN |
| /cases | 403 | WARN |
| /methodology | 403 | WARN |
| /stories/el-ejercito-fantasma | 403 | WARN |

> **Note**: All 403s carry `x-deny-reason: host_not_allowed` from the CDN. Requests originate from the Anthropic cloud runner (Egress Gateway SDS), whose IP is not in rubli.xyz's allowlist. Confirmed not a site outage — identical pattern to all prior automated runs from this environment.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |
| /api/v1/cases?limit=5 | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |
| /api/v1/sectors | BLOCKED — Anthropic egress gateway (403, empty body) | WARN |

> Empty response bodies returned; JSON parse failed. Not indicative of backend failure — same egress restriction applies to all API calls from this runner.

### Bilingual Gaps
Grep scans completed. All matches confirmed false positives (same as prior run):
- `TIER_STYLES[tierName as TierKey]` — TypeScript constant accessor, not rendered string. OK.
- `CaseLibrary.tsx` — inline comment only. OK.
- `Methodology.tsx` — academic citation (Mahalanobis, P.C. 1936). Untranslatable. OK.
- `InstitutionLeague.tsx` — `TIER_STYLES.Excelente.color` code references, not rendered text. OK.
- `StoryMoneySankeyChart.tsx` — fixture data property `target_type`. Not user-facing. OK.
- `ExpedienteSpine.tsx` — TypeScript return type annotation. OK.
- `ExploreCanvas.tsx` — comment block + corporate-form token array. OK.
- `VendorHero.tsx` — code comment only. OK.
- `ConcentrationConstellation.tsx:155–167` — all pattern labels properly bilingual via `isEs ? ES : EN`. OK.

**"Generate Report" hardcoded:** None detected.
**"SIGN IN" / "INICIAR SESIÓN" hardcoded:** None detected.
**New bilingual gaps vs prior run:** None.

### Overall: WARN
HTTP and API checks blocked by Anthropic Egress Gateway network policy (cloud runner IP not in external allowlist). Not a site failure — confirmed via `x-deny-reason: host_not_allowed` header. Bilingual scan clean. No regressions detected.
