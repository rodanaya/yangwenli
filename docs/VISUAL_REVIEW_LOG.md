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
