"""Load the institution↔ASF audit crosswalk (exact-key entity match).

    python -m scripts.load_asf_crosswalk [db_path]

Source: data/asf_institution_crosswalk.csv, built by the 2026-09-24 entity-resolution
pass (_entity_res/inst/asf/build_crosswalk.py): exact normalized name, municipality
+ state check, state-prefixed name + state check, 10 curated aliases. 683 links,
605/692 asf_cases rows; 50/50 hand-checked correct. Replaces the 20/40-char prefix
LIKE joins in institutions.py / analysis.py (~2% correct).
Idempotent: replaces the table contents in one transaction.
"""
import csv
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
CSV = BACKEND / "data" / "asf_institution_crosswalk.csv"
DDL = """
CREATE TABLE IF NOT EXISTS asf_institution_crosswalk (
    asf_case_id    INTEGER NOT NULL REFERENCES asf_cases(id),
    institution_id INTEGER NOT NULL REFERENCES institutions(id),
    match_basis    TEXT NOT NULL,   -- exact_norm | exact_norm_dup | municipality | state_prefixed | alias
    confidence     TEXT NOT NULL,   -- high | medium | low
    note           TEXT,
    PRIMARY KEY (asf_case_id, institution_id)
);
CREATE INDEX IF NOT EXISTS idx_asf_xw_inst ON asf_institution_crosswalk(institution_id);
"""


def load(conn: sqlite3.Connection) -> int:
    rows = [
        (int(r["asf_case_id"]), int(r["institution_id"]), r["match_basis"], r["confidence"], r["note"] or None)
        for r in csv.DictReader(open(CSV, encoding="utf-8"))
    ]
    conn.executescript(DDL)
    with conn:
        conn.execute("DELETE FROM asf_institution_crosswalk")
        conn.executemany("INSERT INTO asf_institution_crosswalk VALUES (?,?,?,?,?)", rows)
    return len(rows)


if __name__ == "__main__":
    db = sys.argv[1] if len(sys.argv) > 1 else str(BACKEND / "RUBLI_NORMALIZED.db")
    conn = sqlite3.connect(db, timeout=60)
    n = load(conn)
    # IMSS (251) keeps its audits; Instituto Mexicano del Petróleo (250) gets none.
    q = "SELECT COUNT(*) FROM asf_institution_crosswalk WHERE institution_id=? AND confidence<>'low'"
    imss, imp = conn.execute(q, (251,)).fetchone()[0], conn.execute(q, (250,)).fetchone()[0]
    print(f"{n} links loaded into {db} | IMSS={imss} IMP={imp}")
    assert imss >= 1 and imp == 0
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()
