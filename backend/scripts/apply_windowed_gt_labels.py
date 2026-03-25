#!/usr/bin/env python3
"""apply_windowed_gt_labels.py -- GT Windowed Label Analysis

Reads ground_truth_cases+vendors, computes label noise.
Outputs: backend/reports/gt_windowed_label_report.csv
Does NOT modify the database.

Usage: cd backend && python -m scripts.apply_windowed_gt_labels
"""

import sqlite3, csv, os, time
from collections import defaultdict
from pathlib import Path


def get_db_path():
    env_path = os.environ.get("DATABASE_PATH")
    if env_path and os.path.exists(env_path): return env_path
    for c in [Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db",
              Path("RUBLI_NORMALIZED.db"), Path("backend/RUBLI_NORMALIZED.db")]:
        if c.exists(): return str(c)
    raise FileNotFoundError("Cannot find RUBLI_NORMALIZED.db")


def main():
    db_path = get_db_path()
    print(f"Database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    t0 = time.time()

    cur.execute("""
        SELECT gtv.vendor_id, gtc.id AS case_pk, gtc.case_id AS case_code,
            gtc.case_name, gtc.case_type, gtc.year_start, gtc.year_end,
            gtc.confidence_level, gtc.fraud_year_start, gtc.fraud_year_end,
            gtc.fraud_institution_ids
        FROM ground_truth_vendors gtv
        JOIN ground_truth_cases gtc ON gtc.id = gtv.case_id
        WHERE gtv.vendor_id IS NOT NULL
    """)
    vendor_cases = cur.fetchall()
    print(f"Loaded {len(vendor_cases)} vendor-case pairs")

    vendor_ids = list(set(vc["vendor_id"] for vc in vendor_cases))
    print(f"Unique vendors: {len(vendor_ids)}")

    ph = ",".join(["?"] * len(vendor_ids))
    cur.execute(f"""
        SELECT c.vendor_id, c.sector_id, c.contract_year,
               COUNT(*) AS cnt, COALESCE(SUM(c.amount_mxn), 0) AS total_value,
               c.institution_id
        FROM contracts c WHERE c.vendor_id IN ({ph})
        GROUP BY c.vendor_id, c.sector_id, c.contract_year, c.institution_id
    """, vendor_ids)
    raw = cur.fetchall()

    vendor_contracts = defaultdict(list)
    for row in raw:
        vendor_contracts[row["vendor_id"]].append(
            (row["sector_id"], row["contract_year"], row["cnt"],
             row["total_value"], row["institution_id"]))
    print(f"Loaded contract data for {len(vendor_contracts)} vendors")

    cur.execute("SELECT id, name_es FROM sectors")
    sector_names = dict(cur.fetchall())

    vendor_names = {}
    cur.execute(f"SELECT id, name FROM vendors WHERE id IN ({ph})", vendor_ids)
    for row in cur.fetchall():
        vendor_names[row["id"]] = row["name"]

    rows_out = []
    for vc in vendor_cases:
        vid = vc["vendor_id"]
        ys = vc["fraud_year_start"] or vc["year_start"]
        ye = vc["fraud_year_end"] or vc["year_end"]
        fraud_insts = None
        fi = vc["fraud_institution_ids"]
        if fi:
            try: fraud_insts = set(int(x.strip()) for x in fi.split(",") if x.strip())
            except ValueError: fraud_insts = None

        contracts = vendor_contracts.get(vid, [])
        total_ct = sum(c[2] for c in contracts)
        total_val = sum(c[3] for c in contracts)
        in_win, in_val, out_win, out_val = 0, 0.0, 0, 0.0

        sc = defaultdict(int)
        for sid, yr, cnt, val, iid in contracts: sc[sid] += cnt
        psid = max(sc, key=sc.get) if sc else None
        psector = sector_names.get(psid, "Unknown")

        for sid, yr, cnt, val, iid in contracts:
            iy = True
            ii = True
            if ys is not None and ye is not None:
                iy = ys <= yr <= ye if yr is not None else False
            if fraud_insts is not None:
                ii = iid in fraud_insts if iid is not None else False
            if iy and ii: in_win += cnt; in_val += val
            else: out_win += cnt; out_val += val

        np = round(100.0 * out_win / total_ct, 1) if total_ct > 0 else 0.0
        hw = ys is not None and ye is not None
        ws = f"{ys}-{ye}" if hw else "NONE"

        rows_out.append({
            "case_id": vc["case_pk"], "case_code": vc["case_code"],
            "case_name": vc["case_name"], "case_type": vc["case_type"],
            "confidence_level": vc["confidence_level"],
            "vendor_id": vid, "vendor_name": vendor_names.get(vid, "UNKNOWN"),
            "sector": psector, "year_window": ws, "year_start": ys, "year_end": ye,
            "has_institution_filter": "yes" if fraud_insts else "no",
            "total_contracts": total_ct,
            "in_window_contracts": in_win, "out_window_contracts": out_win,
            "noise_pct": np, "total_value_mxn": round(total_val, 2),
            "in_window_value_mxn": round(in_val, 2),
            "out_window_value_mxn": round(out_val, 2),
        })

    report_dir = Path(__file__).resolve().parent.parent / "reports"
    report_dir.mkdir(exist_ok=True)
    csv_path = report_dir / "gt_windowed_label_report.csv"
    fns = ["case_id", "case_code", "case_name", "case_type", "confidence_level",
           "vendor_id", "vendor_name", "sector", "year_window", "year_start",
           "year_end", "has_institution_filter", "total_contracts",
           "in_window_contracts", "out_window_contracts", "noise_pct",
           "total_value_mxn", "in_window_value_mxn", "out_window_value_mxn"]

    with open(csv_path, "w", newline="", encoding="utf-8") as csvf:
        w = csv.DictWriter(csvf, fieldnames=fns)
        w.writeheader()
        w.writerows(sorted(rows_out, key=lambda r: -r["out_window_contracts"]))
    print(f"Wrote {len(rows_out)} rows to {csv_path}")

    ta = sum(r["total_contracts"] for r in rows_out)
    ti = sum(r["in_window_contracts"] for r in rows_out)
    to = sum(r["out_window_contracts"] for r in rows_out)
    print()
    print("=" * 60)
    print("LABEL NOISE SUMMARY")
    print("=" * 60)
    print(f"Total vendor-case pairs:     {len(rows_out)}")
    print(f"Total contracts:             {ta:,}")
    pi = 100 * ti / ta
    po = 100 * to / ta
    print(f"In-window contracts:         {ti:,} ({pi:.1f}%)")
    print(f"Out-of-window contracts:     {to:,} ({po:.1f}%)")
    print(f"Overall label noise:         {po:.1f}%")

    ca = defaultdict(lambda: {"name": "", "total": 0, "in_w": 0, "out_w": 0})
    for r in rows_out:
        c = ca[r["case_id"]]
        c["name"] = r["case_name"]
        c["total"] += r["total_contracts"]
        c["in_w"] += r["in_window_contracts"]
        c["out_w"] += r["out_window_contracts"]

    hn = [(cid, x) for cid, x in ca.items()
         if x["total"] >= 100 and x["out_w"] / x["total"] > 0.30]
    hn.sort(key=lambda x: -x[1]["out_w"])
    print()
    print("HIGH-NOISE CASES (>30% noise, >=100 contracts):")
    for cid, x in hn[:20]:
        nv = 100 * x["out_w"] / x["total"]
        nm = x["name"][:50]
        tt = x["total"]
        ow = x["out_w"]
        print(f"  {cid:4d} {nm:50s} {tt:7,d} {ow:7,d} {nv:6.1f}%")

    conn.close()
    print(f"Completed in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
