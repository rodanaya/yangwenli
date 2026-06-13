"""
Backfill Spanish accents into category names (Day-9 /sectors QA, audit D1).

30 of the 72 active category `name_es` values were stored accent-stripped
('Equipo Medico', 'Construccion de Edificios', 'Vias', 'Quimicas', …). On a
Spanish-first investigative platform that reads as a defect — it surfaces in the
WHAT-view swimlane/dumbbell labels, the category catalog, and the sector dossier
§ Categorías rows.

Fixes both the source table and the denormalized copy:
  - categories.name_es
  - category_stats.category_name

Keyed by the exact old (un-accented) string → new (accented) string, so it is
idempotent (re-running matches nothing once applied) and id-independent (works on
RUBLI_NORMALIZED.db and RUBLI_DEPLOY.db regardless of id drift). name_en is
correct accent-free English and is left untouched; the regex keywords are
intentionally accent-stripped (they match strip_accents(title)) and are NOT
touched here.

Usage:
    python -m scripts._fix_category_accents [DB_PATH]
    DB_PATH defaults to RUBLI_NORMALIZED.db (run dir = backend/).
"""
import sqlite3
import sys

# old (stored, un-accented)  →  new (correct Spanish)
FIXES = {
    "Medicamentos y Farmaceuticos": "Medicamentos y Farmacéuticos",
    "Equipo Medico": "Equipo Médico",
    "Material de Curacion": "Material de Curación",
    "Laboratorio y Diagnostico": "Laboratorio y Diagnóstico",
    "Sangre y Transfusion": "Sangre y Transfusión",
    "Construccion de Edificios": "Construcción de Edificios",
    "Carreteras y Vias": "Carreteras y Vías",
    "Infraestructura Hidraulica": "Infraestructura Hidráulica",
    "Infraestructura Electrica": "Infraestructura Eléctrica",
    "Energia Renovable": "Energía Renovable",
    "Vehiculos y Flotilla": "Vehículos y Flotilla",
    "Boletos de Avion": "Boletos de Avión",
    "Fletes y Logistica": "Fletes y Logística",
    "Papeleria y Oficina": "Papelería y Oficina",
    "Impresion y Publicaciones": "Impresión y Publicaciones",
    "Servicios Juridicos": "Servicios Jurídicos",
    "Contabilidad y Auditoria": "Contabilidad y Auditoría",
    "Consultoria": "Consultoría",
    "Arquitectura e Ingenieria": "Arquitectura e Ingeniería",
    "Investigacion y Estudios": "Investigación y Estudios",
    "Capacitacion y Cursos": "Capacitación y Cursos",
    "Alimentos y Viveres": "Alimentos y Víveres",
    "Servicio de Alimentacion": "Servicio de Alimentación",
    "Material Electrico": "Material Eléctrico",
    "Plomeria e Hidraulico": "Plomería e Hidráulico",
    "Herramientas y Ferreteria": "Herramientas y Ferretería",
    "Libros de Texto y Educacion": "Libros de Texto y Educación",
    "Equipo Cientifico": "Equipo Científico",
    "Fotografia y Audiovisual": "Fotografía y Audiovisual",
    "Sustancias Quimicas": "Sustancias Químicas",
}


def fix(db_path: str) -> None:
    print(f"Fixing category accents in: {db_path}  ({len(FIXES)} names)")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout=60000")
    cur.execute("BEGIN IMMEDIATE")
    n_cat = 0
    n_stats = 0
    for old, new in FIXES.items():
        cur.execute("UPDATE categories SET name_es = ? WHERE name_es = ?", (new, old))
        n_cat += cur.rowcount
        cur.execute(
            "UPDATE category_stats SET category_name = ? WHERE category_name = ?",
            (new, old),
        )
        n_stats += cur.rowcount
    conn.commit()
    print(f"  categories.name_es updated:        {n_cat}")
    print(f"  category_stats.category_name fixed: {n_stats}")

    # Verify: no active category name_es should remain in the un-accented set.
    remaining = cur.execute(
        "SELECT COUNT(*) FROM categories WHERE name_es IN ({})".format(
            ",".join("?" * len(FIXES))
        ),
        tuple(FIXES.keys()),
    ).fetchone()[0]
    print(f"  remaining un-accented (expect 0):   {remaining}")
    conn.close()


if __name__ == "__main__":
    fix(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db")
