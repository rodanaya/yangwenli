"""
Dossier export — reporter-ready ZIP packages.

A "dossier" is a ZIP containing everything a journalist needs to walk
away with a finding: structured data (CSV + JSON manifest) plus a
standalone HTML brief that can be printed to PDF via any browser.
Addresses the investigative-editor review's #1 missing feature —
"no export, no folio lookup, no 'give me the 50 worst contracts
for Vendor X'."

No new dependencies: ZIP via stdlib, HTML inlined with CSS. The reader
can:
  - Open `contracts.csv` in Excel / pandas directly
  - Open `dossier.html` in a browser, print to PDF for editor
  - Consume `manifest.json` in automated pipelines
"""

import csv
import html as _html
import io
import json
import logging
import sqlite3
import zipfile
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dossier", tags=["dossier"])


def _dossier_html(ctx: dict) -> str:
    """Render the standalone HTML brief. Inlined styling, print-friendly."""
    def e(v):
        return _html.escape(str(v)) if v is not None else ""

    rows = ""
    for c in ctx.get("top_contracts", [])[:50]:
        title = (c.get("title") or "").strip() or "—"
        if len(title) > 120:
            title = title[:117] + "..."
        amount = c.get("amount_mxn") or 0
        risk = (c.get("risk_level") or "low").lower()
        rows += (
            f"<tr>"
            f"<td class='mono'>{e(c.get('folio') or c.get('id') or '')}</td>"
            f"<td>{e(title)}</td>"
            f"<td class='mono num'>{e(c.get('year') or '')}</td>"
            f"<td class='mono num'>${amount:,.0f}</td>"
            f"<td>{e(c.get('institution_name') or '—')}</td>"
            f"<td class='risk risk-{e(risk)}'>{e(risk.upper())}</td>"
            f"</tr>"
        )

    registry_flags = []
    if ctx.get("is_efos_definitivo"):
        registry_flags.append('<span class="flag flag-crit">SAT EFOS definitivo (Art. 69-B)</span>')
    if ctx.get("is_sfp_sanctioned"):
        registry_flags.append('<span class="flag flag-high">SFP sanción firmada</span>')
    if ctx.get("in_ground_truth"):
        registry_flags.append('<span class="flag flag-amber">RUBLI ground-truth case</span>')
    registry_html = (
        " ".join(registry_flags) if registry_flags
        else '<span class="mono" style="color:#888">No external registry hits</span>'
    )

    stats_html = "".join(
        f'<div class="stat"><div class="v">{e(s["value"])}</div><div class="l">{e(s["label"])}</div></div>'
        for s in ctx.get("stats", [])
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>RUBLI Dossier — {e(ctx.get("title") or "")}</title>
<style>
  @page {{ size: letter; margin: 0.75in; }}
  body {{ font-family: Georgia, 'Times New Roman', serif; color: #1a1714; background: #faf9f6; max-width: 7.5in; margin: 0 auto; padding: 24pt; line-height: 1.55; }}
  .mono {{ font-family: 'JetBrains Mono', 'Menlo', monospace; font-size: 90%; }}
  .num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .kicker {{ font-family: 'JetBrains Mono', monospace; font-size: 9pt; letter-spacing: 0.18em; text-transform: uppercase; color: #655d55; margin-bottom: 6pt; }}
  h1 {{ font-size: 24pt; line-height: 1.1; margin: 0 0 8pt 0; font-weight: 800; letter-spacing: -0.02em; }}
  h2 {{ font-size: 14pt; margin-top: 24pt; margin-bottom: 8pt; padding-bottom: 4pt; border-bottom: 1pt solid #d6ceca; }}
  .dateline {{ font-family: 'JetBrains Mono', monospace; font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase; color: #655d55; margin-bottom: 16pt; }}
  .disclaimer {{ background: #fff5e6; border-left: 3pt solid #a06820; padding: 10pt 14pt; margin: 14pt 0 24pt 0; font-size: 9pt; }}
  .disclaimer strong {{ color: #8b5a1e; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 8.5pt; }}
  th, td {{ padding: 5pt 7pt; text-align: left; border-bottom: 0.5pt solid #e5ded9; vertical-align: top; }}
  th {{ background: #f0ece7; font-size: 7.5pt; letter-spacing: 0.1em; text-transform: uppercase; color: #655d55; font-weight: 700; }}
  .stats {{ display: flex; flex-wrap: wrap; gap: 20pt; margin: 14pt 0 20pt 0; padding: 12pt 0; border-top: 1pt solid #d6ceca; border-bottom: 1pt solid #d6ceca; }}
  .stat {{ min-width: 100pt; }}
  .stat .v {{ font-size: 18pt; font-weight: 800; font-variant-numeric: tabular-nums; }}
  .stat .l {{ font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; letter-spacing: 0.12em; text-transform: uppercase; color: #655d55; margin-top: 2pt; }}
  .flag {{ display: inline-block; padding: 2pt 6pt; border-radius: 1pt; font-family: 'JetBrains Mono', monospace; font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; margin-right: 4pt; }}
  .flag-crit {{ background: #fbeaea; color: #b91c1c; border: 0.5pt solid #dc2626; }}
  .flag-high {{ background: #fdf0e6; color: #c2410c; border: 0.5pt solid #ea580c; }}
  .flag-amber {{ background: #fbf4e6; color: #926411; border: 0.5pt solid #a06820; }}
  .risk-critical {{ color: #b91c1c; font-weight: 700; }}
  .risk-high {{ color: #c2410c; font-weight: 700; }}
  .risk-medium {{ color: #a06820; }}
  .risk-low {{ color: #65a30d; }}
  footer {{ margin-top: 36pt; padding-top: 12pt; border-top: 1pt solid #d6ceca; font-size: 8pt; color: #655d55; }}
  .narrative {{ font-size: 11pt; line-height: 1.7; margin: 10pt 0 14pt 0; }}
  .narrative strong {{ color: #1a1714; }}
</style>
</head>
<body>
<div class="kicker">RUBLI · {e(ctx.get("dossier_type", "DOSSIER"))}</div>
<h1>{e(ctx.get("title") or "")}</h1>
<div class="dateline">Built by RUBLI · Data: COMPRANET {e(ctx.get("year_range") or "2002-2025")} · Generated {e(ctx.get("generated_at") or "")} · Model v0.6.5 · STATISTICAL INDICATOR, NOT A FINDING OF WRONGDOING</div>

<div class="disclaimer">
  <strong>Reader note:</strong> This dossier compiles COMPRANET public records and RUBLI model output. Risk scores are statistical indicators of similarity to documented corruption patterns — not calibrated probabilities, and not findings of wrongdoing. Every contract listed is a public record you can verify via COMPRANET folio. A high "pattern match" score warrants investigation, not accusation.
</div>

<div class="narrative">{ctx.get("narrative_html") or ""}</div>

<h2>Key figures</h2>
<div class="stats">{stats_html}</div>

<h2>External registry status</h2>
<div style="margin: 10pt 0;">{registry_html}</div>

<h2>Top {min(50, len(ctx.get("top_contracts", [])))} contracts (by value)</h2>
<table>
<thead><tr><th>ID / folio</th><th>Title</th><th>Year</th><th>Amount (MXN)</th><th>Institution</th><th>Risk</th></tr></thead>
<tbody>{rows}</tbody>
</table>

<h2>Methodology</h2>
<p style="font-size: 9.5pt; line-height: 1.6;">
RUBLI v0.6.5 — per-sector logistic regression with Positive-Unlabeled correction (Elkan and Noto 2008), trained on 748 institution-scoped windowed ground-truth cases. Test AUC 0.828 (vendor-stratified hold-out). OECD-compliant high-risk rate 13.49%. External registries cross-referenced: SAT EFOS Art. 69-B (13,960 RFCs), SFP sanctions (544), RUBLI ground-truth corpus (1,363 cases). Full methodology: <span class="mono">https://rubli.xyz/methodology</span>.
</p>

<footer>
  Generated by RUBLI — open-source procurement intelligence · https://rubli.xyz<br>
  This dossier is machine-generated from public COMPRANET records and RUBLI model output. For methodology, caveats, and known model limitations: https://rubli.xyz/methodology.
</footer>
</body>
</html>"""


def _build_dossier_zip(ctx: dict) -> bytes:
    """Build a ZIP file in-memory containing manifest.json, contracts.csv,
    dossier.html, and README.txt."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(ctx, indent=2, default=str, ensure_ascii=False))

        csv_out = io.StringIO()
        writer = csv.writer(csv_out)
        writer.writerow([
            "contract_id", "folio", "title", "year", "amount_mxn",
            "institution_id", "institution_name", "vendor_id", "vendor_name",
            "risk_score", "risk_level", "is_direct_award", "is_single_bid",
        ])
        for c in ctx.get("top_contracts", []):
            writer.writerow([
                c.get("id", ""),
                c.get("folio", ""),
                c.get("title", ""),
                c.get("year", ""),
                c.get("amount_mxn", ""),
                c.get("institution_id", ""),
                c.get("institution_name", ""),
                c.get("vendor_id", ""),
                c.get("vendor_name", ""),
                c.get("risk_score", ""),
                c.get("risk_level", ""),
                c.get("is_direct_award", ""),
                c.get("is_single_bid", ""),
            ])
        zf.writestr("contracts.csv", csv_out.getvalue())

        zf.writestr("dossier.html", _dossier_html(ctx))

        readme = (
            f"RUBLI Dossier - {ctx.get('title')}\n"
            f"Generated: {ctx.get('generated_at')}\n"
            f"Subject: {ctx.get('dossier_type')} #{ctx.get('entity_id')}\n"
            f"\n"
            f"Files in this package:\n"
            f"  - dossier.html    -> open in any browser; Ctrl+P to print-to-PDF\n"
            f"  - contracts.csv   -> open in Excel or load with pandas\n"
            f"  - manifest.json   -> machine-readable full data payload\n"
            f"\n"
            f"Source:      https://rubli.xyz\n"
            f"Methodology: https://rubli.xyz/methodology\n"
            f"\n"
            f"IMPORTANT: RUBLI risk scores are statistical indicators, not findings\n"
            f"of wrongdoing. Every contract listed is a public COMPRANET record.\n"
            f"A high pattern-match score warrants investigation -- not accusation.\n"
        )
        zf.writestr("README.txt", readme)
    buf.seek(0)
    return buf.read()


def _safe_filename(name: str, max_len: int = 40) -> str:
    out = "".join(ch if ch.isalnum() else "_" for ch in (name or "")[:max_len]).strip("_")
    return out or "entity"


@router.get("/vendor/{vendor_id}")
def export_vendor_dossier(vendor_id: int):
    """Reporter-ready ZIP dossier for a vendor: HTML brief (print to PDF),
    CSV of top-50 contracts by value, JSON manifest with full context,
    README orienting the journalist."""
    try:
        with get_db() as conn:
            conn.row_factory = sqlite3.Row

            vendor = conn.execute(
                "SELECT * FROM vendors WHERE id = ?", (vendor_id,)
            ).fetchone()
            if not vendor:
                raise HTTPException(status_code=404, detail="Vendor not found")

            agg = conn.execute(
                """
                SELECT
                    COUNT(*) AS n_contracts,
                    SUM(amount_mxn) AS total_value,
                    AVG(risk_score) AS avg_risk,
                    MAX(risk_score) AS max_risk,
                    MIN(contract_year) AS first_year,
                    MAX(contract_year) AS last_year,
                    SUM(CASE WHEN is_direct_award=1 THEN 1 ELSE 0 END) AS da_count,
                    SUM(CASE WHEN is_single_bid=1 THEN 1 ELSE 0 END) AS sb_count,
                    SUM(CASE WHEN risk_level IN ('critical','high') THEN 1 ELSE 0 END) AS hr_count
                FROM contracts
                WHERE vendor_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
                """,
                (vendor_id,),
            ).fetchone()

            aria = conn.execute(
                "SELECT ips_final, ips_tier, primary_pattern, is_efos_definitivo, "
                "is_sfp_sanctioned, in_ground_truth FROM aria_queue WHERE vendor_id = ?",
                (vendor_id,),
            ).fetchone()

            contracts = conn.execute(
                """
                SELECT
                    c.id, c.procedure_number AS folio, c.title AS title,
                    c.contract_year AS year, c.amount_mxn, c.risk_score, c.risk_level,
                    c.is_direct_award, c.is_single_bid,
                    c.institution_id, COALESCE(i.siglas, i.name) AS institution_name,
                    c.vendor_id, v.name AS vendor_name
                FROM contracts c
                LEFT JOIN institutions i ON c.institution_id = i.id
                LEFT JOIN vendors v ON c.vendor_id = v.id
                WHERE c.vendor_id = ? AND c.amount_mxn > 0 AND c.amount_mxn < 100000000000
                ORDER BY c.amount_mxn DESC
                LIMIT 50
                """,
                (vendor_id,),
            ).fetchall()

            contracts_list = [dict(c) for c in contracts]
            n_contracts = agg["n_contracts"] or 0
            total_value = agg["total_value"] or 0
            avg_risk = agg["avg_risk"] or 0
            da_pct = 100.0 * (agg["da_count"] or 0) / max(1, n_contracts)
            hr_count = agg["hr_count"] or 0

            vendor_name_esc = _html.escape(vendor["name"])
            narrative = (
                f"<strong>{vendor_name_esc}</strong> won "
                f"<strong>{n_contracts:,} federal contracts</strong> totaling "
                f"<strong>${total_value:,.0f} MXN</strong> between "
                f"<strong>{agg['first_year']}</strong> and <strong>{agg['last_year']}</strong>. "
                f"<strong>{da_pct:.1f}%</strong> were awarded without competitive bidding "
                f"(OECD guidance: under 25%). The RUBLI v0.6.5 model scores the vendor at "
                f"<strong>{avg_risk*100:.0f}/100 average pattern match</strong>, with "
                f"<strong>{hr_count:,}</strong> contracts flagged high or critical."
            )

            rfc = vendor["rfc"] if "rfc" in vendor.keys() else None

            ctx = {
                "dossier_type": "VENDOR DOSSIER",
                "entity_id": vendor_id,
                "title": vendor["name"],
                "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
                "year_range": (
                    f"{agg['first_year']}-{agg['last_year']}" if agg["first_year"] else "2002-2025"
                ),
                "narrative_html": narrative,
                "vendor": {"id": vendor["id"], "name": vendor["name"], "rfc": rfc},
                "aggregate": {
                    "n_contracts": n_contracts,
                    "total_value_mxn": total_value,
                    "avg_risk_score": avg_risk,
                    "max_risk_score": agg["max_risk"],
                    "direct_award_pct": da_pct,
                    "high_risk_count": hr_count,
                    "first_year": agg["first_year"],
                    "last_year": agg["last_year"],
                },
                "ips_final": aria["ips_final"] if aria else None,
                "ips_tier": aria["ips_tier"] if aria else None,
                "primary_pattern": aria["primary_pattern"] if aria else None,
                "is_efos_definitivo": bool(aria["is_efos_definitivo"]) if aria else False,
                "is_sfp_sanctioned": bool(aria["is_sfp_sanctioned"]) if aria else False,
                "in_ground_truth": bool(aria["in_ground_truth"]) if aria else False,
                "stats": [
                    {"value": f"{n_contracts:,}", "label": "Contracts"},
                    {"value": f"${total_value/1e9:.2f}B", "label": "Total value MXN"},
                    {"value": f"{avg_risk*100:.0f}/100", "label": "Pattern match avg"},
                    {"value": f"{da_pct:.0f}%", "label": "Direct award rate"},
                    {"value": f"{hr_count:,}", "label": "High-risk contracts"},
                ],
                "top_contracts": contracts_list,
                "methodology_url": "https://rubli.xyz/methodology",
                "source_url": f"https://rubli.xyz/vendors/{vendor_id}",
            }

            zip_bytes = _build_dossier_zip(ctx)
            safe = _safe_filename(vendor["name"])
            filename = f"rubli-dossier-vendor-{vendor_id}-{safe}.zip"
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
    except sqlite3.Error as e:
        logger.error(f"DB error in export_vendor_dossier({vendor_id}): {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")


@router.get("/institution/{institution_id}")
def export_institution_dossier(institution_id: int):
    """Reporter-ready ZIP dossier for an institution: HTML brief, CSV of
    top-50 contracts by value, JSON manifest, README."""
    try:
        with get_db() as conn:
            conn.row_factory = sqlite3.Row

            inst = conn.execute(
                "SELECT id, COALESCE(siglas, name) AS display_name, name, sector_id "
                "FROM institutions WHERE id = ?",
                (institution_id,),
            ).fetchone()
            if not inst:
                raise HTTPException(status_code=404, detail="Institution not found")

            agg = conn.execute(
                """
                SELECT
                    COUNT(*) AS n_contracts,
                    SUM(amount_mxn) AS total_value,
                    AVG(risk_score) AS avg_risk,
                    MIN(contract_year) AS first_year,
                    MAX(contract_year) AS last_year,
                    SUM(CASE WHEN is_direct_award=1 THEN 1 ELSE 0 END) AS da_count,
                    SUM(CASE WHEN risk_level IN ('critical','high') THEN 1 ELSE 0 END) AS hr_count,
                    COUNT(DISTINCT vendor_id) AS n_vendors
                FROM contracts
                WHERE institution_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
                """,
                (institution_id,),
            ).fetchone()

            contracts = conn.execute(
                """
                SELECT
                    c.id, c.procedure_number AS folio, c.title AS title,
                    c.contract_year AS year, c.amount_mxn, c.risk_score, c.risk_level,
                    c.is_direct_award, c.is_single_bid,
                    c.institution_id, ? AS institution_name,
                    c.vendor_id, v.name AS vendor_name
                FROM contracts c
                LEFT JOIN vendors v ON c.vendor_id = v.id
                WHERE c.institution_id = ? AND c.amount_mxn > 0 AND c.amount_mxn < 100000000000
                ORDER BY c.amount_mxn DESC
                LIMIT 50
                """,
                (inst["display_name"], institution_id),
            ).fetchall()

            contracts_list = [dict(c) for c in contracts]
            n_contracts = agg["n_contracts"] or 0
            total_value = agg["total_value"] or 0
            avg_risk = agg["avg_risk"] or 0
            da_pct = 100.0 * (agg["da_count"] or 0) / max(1, n_contracts)
            hr_count = agg["hr_count"] or 0

            inst_name_esc = _html.escape(inst["display_name"])
            narrative = (
                f"<strong>{inst_name_esc}</strong> awarded "
                f"<strong>{n_contracts:,} contracts</strong> totaling "
                f"<strong>${total_value:,.0f} MXN</strong> between "
                f"<strong>{agg['first_year']}</strong> and <strong>{agg['last_year']}</strong>, "
                f"to <strong>{agg['n_vendors']:,}</strong> unique vendors. "
                f"<strong>{da_pct:.1f}%</strong> of contracts were awarded without competitive bidding "
                f"(OECD guidance: under 25%). The RUBLI model flagged "
                f"<strong>{hr_count:,}</strong> contracts as high or critical risk."
            )

            ctx = {
                "dossier_type": "INSTITUTION DOSSIER",
                "entity_id": institution_id,
                "title": inst["display_name"],
                "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
                "year_range": (
                    f"{agg['first_year']}-{agg['last_year']}" if agg["first_year"] else "2002-2025"
                ),
                "narrative_html": narrative,
                "institution": {
                    "id": inst["id"],
                    "display_name": inst["display_name"],
                    "full_name": inst["name"],
                    "sector_id": inst["sector_id"],
                },
                "aggregate": {
                    "n_contracts": n_contracts,
                    "total_value_mxn": total_value,
                    "avg_risk_score": avg_risk,
                    "direct_award_pct": da_pct,
                    "high_risk_count": hr_count,
                    "n_vendors": agg["n_vendors"],
                    "first_year": agg["first_year"],
                    "last_year": agg["last_year"],
                },
                "is_efos_definitivo": False,
                "is_sfp_sanctioned": False,
                "in_ground_truth": False,
                "stats": [
                    {"value": f"{n_contracts:,}", "label": "Contracts"},
                    {"value": f"${total_value/1e9:.2f}B", "label": "Total value MXN"},
                    {"value": f"{agg['n_vendors']:,}", "label": "Unique vendors"},
                    {"value": f"{da_pct:.0f}%", "label": "Direct award rate"},
                    {"value": f"{hr_count:,}", "label": "High-risk contracts"},
                ],
                "top_contracts": contracts_list,
                "methodology_url": "https://rubli.xyz/methodology",
                "source_url": f"https://rubli.xyz/institutions/{institution_id}",
            }

            zip_bytes = _build_dossier_zip(ctx)
            safe = _safe_filename(inst["display_name"])
            filename = f"rubli-dossier-institution-{institution_id}-{safe}.zip"
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
    except sqlite3.Error as e:
        logger.error(f"DB error in export_institution_dossier({institution_id}): {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
