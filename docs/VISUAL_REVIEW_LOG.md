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
