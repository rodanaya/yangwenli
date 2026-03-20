"""
GT Batch YY: All structural skips — 2026-03-20

v203996 OPERADORA Y ADMINISTRADORA DE VALES — SKIP
  1.08B ISSSTE contract is competitive (SB=0, DA=0). 8 small DA contracts trivial.
  Not a capture pattern.

v47004 CONDUMEX SA DE CV — STRUCTURAL SKIP
  Grupo Carso (Carlos Slim), 390 contracts, 2.1B, only 3 institutions.
  Legitimate wire/cable supplier in energy/infrastructure sector.

v148992 VITER MEDICAL SA DE CV — SKIP
  618 contracts, 1.1B, DA=26%, SB=10%. Multiple institutions (IMSS/ISSSTE/SEDENA).
  Legitimate competitive medical equipment supplier 2015-2025.

v188125 IMEHI DE MEXICO S DE RL DE CV — SKIP
  598.6M single contract at INCMNSZ via Invitacion a Cuando Menos 3 Personas
  (restricted tender, not DA or SB). Single maintenance contract — insufficient.

Guard: max_id >= 857
"""
import sqlite3
import sys

DB = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
if max_id < 857:
    print(f"ABORT: max_id={max_id}, expected >= 857")
    sys.exit(1)

print(f"max_id={max_id} — no new cases (all structural skips)")

skips = [
    (203996, "SKIP: 1.08B ISSSTE contract is competitive (DA=0, SB=0); 8 trivial small DA contracts. Not a capture pattern."),
    (47004,  "SKIP: Grupo Carso (Carlos Slim). Legitimate wire/cable supplier to energy/infra. 390c, 2.1B, only 3 institutions. Structural monopoly."),
    (148992, "SKIP: Legitimate competitive medical equipment supplier. 618c, 1.1B, DA=26%, SB=10% across IMSS/ISSSTE/SEDENA 2015-2025. Low DA and SB rates."),
    (188125, "SKIP: Single 598.6M contract at INCMNSZ via restricted tender (Invitacion 3 personas). Not DA or SB. Insufficient evidence."),
]

for vid, note in skips:
    conn.execute("""
        UPDATE aria_queue SET review_status='reviewed',
            reviewer_notes=?
        WHERE vendor_id=?
    """, (note, vid))
    print(f"  v{vid} -> reviewed (skip)")

conn.commit()
conn.close()
print("Done. 0 new GT cases, 4 vendors marked reviewed.")
