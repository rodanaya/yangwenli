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
| https://rubli.xyz/ | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/atlas | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/aria | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/sectors/salud | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/cases | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/methodology | 403 (host_not_allowed) | WARN |
| https://rubli.xyz/stories/el-ejercito-fantasma | 403 (host_not_allowed) | WARN |

> **Note**: Persistent CDN/WAF block; TLS handshake succeeds. `x-deny-reason: host_not_allowed` — cloud runner IP not allowlisted. Same pattern as all prior runs.

### API Health
| Endpoint | Result | Pass? |
|---|---|---|
| /api/v1/executive/summary | BLOCKED — host not in allowlist | WARN |
| /api/v1/cases?limit=5 | BLOCKED — host not in allowlist | WARN |
| /api/v1/cases?vendor_id=4325&limit=50 | BLOCKED — host not in allowlist | WARN |
| /api/v1/sectors | BLOCKED — host not in allowlist | WARN |

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
HTTP and API checks blocked by Anthropic Egress Gateway network policy (cloud runner IP not allowlisted for external traffic). Not a site failure — confirmed via `x-deny-reason: host_not_allowed` header. Bilingual scan clean. No regressions detected.

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
HTTP and API checks blocked by Anthropic Egress Gateway network policy (cloud runner IP not in external allowlist). Not a site failure — confirmed via TLS cert issuer. Bilingual scan clean. No regressions detected.