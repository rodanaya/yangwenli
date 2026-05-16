"""
Fix FP structural monopoly memo texts — prepend disclaimer to the 31
template memos for fp_structural_monopoly=1 vendors that contain
REVISAR_URGENTE / accusatory language.

These vendors (SIEMENS, ABB, GE, BECTON DICKINSON, CARL ZEISS, etc.) are
legitimate multinationals. Their high IPS score reflects regulated-market
concentration, not corruption. The template memos include "REVISAR_URGENTE"
and corruption search prompts as algorithmic artifacts — not editorial judgment.

Runs on RUBLI_NORMALIZED.db + RUBLI_DEPLOY.db (if present).
"""
import sqlite3, os, sys

FP_DISCLAIMER = """\
⚠ AVISO: FALSO POSITIVO ESTRUCTURAL
Este proveedor ha sido clasificado como falso positivo estructural por RUBLI.
Su puntuación IPS elevada refleja su posición dominante en un mercado regulado
(proveedor multinacional / OEM), NO evidencia de fraude o corrupción.
El análisis automático a continuación fue generado por plantilla y contiene
lenguaje de alerta ("REVISAR_URGENTE", búsquedas de corrupción) que NO aplica
a este proveedor. Este perfil se mantiene únicamente para transparencia metodológica.
Para más contexto, ver la metodología en /methodology.
─────────────────────────────────────────────────

"""

SENTINEL = "⚠ AVISO: FALSO POSITIVO ESTRUCTURAL"

DBS = [
    "RUBLI_NORMALIZED.db",
    "RUBLI_DEPLOY.db",
]

os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/../")

for db_name in DBS:
    if not os.path.exists(db_name):
        print(f"Skipping {db_name} (not found)")
        continue
    print(f"\nProcessing {db_name}...")
    conn = sqlite3.connect(db_name)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    c = conn.cursor()

    c.execute("""
        SELECT vendor_id, memo_text
        FROM aria_queue
        WHERE fp_structural_monopoly = 1
          AND memo_provenance = 'template'
          AND memo_text IS NOT NULL
    """)
    rows = c.fetchall()
    print(f"  Found {len(rows)} FP template memos")

    updated = 0
    for vendor_id, memo_text in rows:
        if memo_text and SENTINEL in memo_text:
            continue  # already has disclaimer
        new_text = FP_DISCLAIMER + (memo_text or "")
        c.execute(
            "UPDATE aria_queue SET memo_text = ? WHERE vendor_id = ?",
            (new_text, vendor_id)
        )
        updated += 1

    conn.commit()
    conn.close()
    print(f"  Updated {updated} memos with FP disclaimer")

print("\nDone.")
