# Investigation Leads - Manual Review Required

**Generated:** February 5, 2026
**Risk Model:** v3.2 (with co-bidding detection)
**Target:** Validate model by researching top flagged vendors

---

## Instructions

For each vendor below:
1. Google: `"[vendor name]" corrupcion OR auditoria OR investigacion`
2. Check if they appear in ASF (Auditoria Superior) reports
3. Search news for any procurement scandals
4. Note if they're on EFOS list (facturas falsas)
5. Record findings in the "Result" column

**Success metric:** >50% of top leads should have verifiable concerns

---

## Top 20 Leads for Manual Review

| # | Vendor | Risk | Amount | Institution | Factors | Result |
|---|--------|------|--------|-------------|---------|--------|
| 1 | RALCA, S.A. DE C.V. | 0.645 | 68M | ISSSTE | direct_award, price_anomaly, short_ad, year_end | |
| 2 | GRUPO FARMACOS ESPECIALIZADOS | 0.630 | 800M | ISSSTE | direct_award, price_anomaly, short_ad, year_end | |
| 3 | TOKA INTERNACIONAL S A P I DE CV | 0.625 | 334M | SEGOB | single_bid, restricted, price_anomaly, short_ad | |
| 4 | PRESTACIONES UNIVERSALES, S.A. DE C.V. | 0.625 | 136M | IPN | single_bid, restricted, price_anomaly | |
| 5 | SODEXO MOTIVATION SOLUTIONS | 0.625 | 34M | PROFECO | single_bid, restricted, price_anomaly | |
| 6 | EDENRED MEXICO SA DE CV | 0.605 | 1.42B | ISSSTE | single_bid, restricted, price_anomaly | |

### Quick Search Links

**RALCA, S.A. DE C.V.**
- Search: https://www.google.com/search?q=%22RALCA%22+corrupcion+OR+auditoria+ISSSTE

**GRUPO FARMACOS ESPECIALIZADOS**
- Search: https://www.google.com/search?q=%22GRUPO+FARMACOS+ESPECIALIZADOS%22+corrupcion+OR+auditoria

**TOKA INTERNACIONAL**
- Search: https://www.google.com/search?q=%22TOKA+INTERNACIONAL%22+corrupcion+OR+auditoria

**PRESTACIONES UNIVERSALES**
- Search: https://www.google.com/search?q=%22PRESTACIONES+UNIVERSALES%22+corrupcion+OR+auditoria

**SODEXO MOTIVATION SOLUTIONS**
- Search: https://www.google.com/search?q=%22SODEXO%22+vales+corrupcion+Mexico

**EDENRED MEXICO**
- Search: https://www.google.com/search?q=%22EDENRED+MEXICO%22+corrupcion+OR+auditoria

---

## Key Observations

1. **ISSSTE dominates** - Most critical-risk contracts are at ISSSTE (health services)
2. **Pharmacy sector** - RALCA and GRUPO FARMACOS are pharmaceutical distributors
3. **Voucher companies** - EDENRED, SODEXO, TOKA are food/benefit voucher providers
4. **Pattern: December + Direct Award + Short Advertisement** - Common combination

---

## Research Resources

- **ASF Reports:** https://www.asf.gob.mx/
- **COMPRANET:** https://compranet.hacienda.gob.mx/
- **EFOS List:** https://www.sat.gob.mx/consultas/lista-negra-del-sat
- **Mexicanos Contra la Corrupcion:** https://contralacorrupcion.mx/

---

## Recording Your Findings

After researching each vendor, update the table with:
- **VERIFIED** - Found credible corruption reports or audit findings
- **SUSPICIOUS** - Found concerning patterns but no direct evidence
- **CLEAN** - No issues found (potential false positive)
- **UNCLEAR** - Insufficient information available

Calculate precision: `VERIFIED / (VERIFIED + CLEAN) * 100%`

Target: >50% precision (1 in 2 flagged contracts has real issues)
Acceptable: >5% precision (1 in 20 flagged contracts has real issues)
