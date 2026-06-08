#!/usr/bin/env python3
"""
Validated federal/sub-national classifier for the /institutions league.

Problem: the league's "federal-only" filter keys on `institution_scope='federal'`,
which is leaking ~500 sub-national entities (state universities, state DIF,
state water commissions) into the federal ranking, while the real federal
marker `gobierno_nivel='APF'` is NULL for the biggest federal buyers
(IMSS, PEMEX, CFE, ISSSTE, secretarías). Neither column alone is usable.

This builds a layered `is_federal` flag from gobierno_nivel + institution_scope
+ institution_type + name patterns, and VALIDATES it against a hand-labeled set
of known-federal and known-sub-national institutions before anything is written.

Dry-run by default (classify + validate + review dumps). Pass --write to backfill
an `is_federal` INTEGER column on the institutions table.
"""
import argparse
import re
import sqlite3
import unicodedata
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def norm(s: str) -> str:
    """Uppercase + strip accents for robust matching."""
    s = (s or "").upper()
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


MX_STATES = [
    "AGUASCALIENTES", "BAJA CALIFORNIA SUR", "BAJA CALIFORNIA", "CAMPECHE", "COAHUILA",
    "COLIMA", "CHIAPAS", "CHIHUAHUA", "DURANGO", "GUANAJUATO", "GUERRERO", "HIDALGO",
    "JALISCO", "MICHOACAN", "MORELOS", "NAYARIT", "NUEVO LEON", "OAXACA", "PUEBLA",
    "QUERETARO", "QUINTANA ROO", "SAN LUIS POTOSI", "SINALOA", "SONORA", "TABASCO",
    "TAMAULIPAS", "TLAXCALA", "VERACRUZ", "YUCATAN", "ZACATECAS",
]
_STATES_ALT = "|".join(MX_STATES)

# institution_type values that are inherently FEDERAL (within scope='federal').
FEDERAL_TYPES = {
    "federal_secretariat", "federal_agency", "social_security",
    "state_enterprise_energy", "state_enterprise_infra", "state_enterprise_finance",
    "regulatory_agency", "autonomous_constitutional", "judicial", "legislative",
    "military", "research_education", "social_program",
}
# Inherently SUB-NATIONAL types.
SUBNATIONAL_TYPES = {"state_government", "state_agency", "municipal"}
# MIXED types — adjudicate by name.
MIXED_TYPES = {"educational", "health_institution", "other", None, ""}

# Strong sub-national keyword signals.
STATE_KW = [
    "ESTATAL", "MUNICIPAL", "MUNICIPIO", "DEL ESTADO DE", "EN EL ESTADO DE",
    "GOBIERNO DEL ESTADO", "PODER EJECUTIVO DEL ESTADO", "PODER JUDICIAL DEL ESTADO",
    "H. AYUNTAMIENTO", "AYUNTAMIENTO",
]
STATE_KW_RE = re.compile("|".join(re.escape(k) for k in STATE_KW))

# State universities / state-decentralized education + state health-services.
STATE_NAME_RE = re.compile(
    # ALL Universidades Tecnológicas / Politécnicas / Interculturales are
    # state-decentralized OPDs (no federal entity uses these names). The
    # Tecnológicos de Estudios Superiores (Edomex) and Institutos Tecnológicos
    # Superiores are likewise state; the federal TecNM "Instituto Tecnológico
    # de X" (no "Superior") is NOT matched and stays federal.
    r"\bUNIVERSIDAD TECNOLOGICA\b"
    r"|\bUNIVERSIDAD POLITECNICA\b"
    r"|\bUNIVERSIDAD INTERCULTURAL\b|\bUNIVERSIDAD POPULAR\b"
    r"|\bTECNOLOGICO DE ESTUDIOS SUPERIORES\b"
    r"|\bINSTITUTO TECNOLOGICO SUPERIOR\b"
    r"|\bUNIVERSIDAD VERACRUZANA\b|\bUNIVERSIDAD MICHOACANA\b|\bUNIVERSIDAD AUTONOMA DE LA CIUDAD DE MEXICO\b"
    r"|\bUNIVERSIDAD JUAREZ\b"
    # Generic "Universidad Autónoma de X" = state autonomous university.
    # Federal exceptions (UNAM, UAM, Chapingo, Antonio Narro) are caught earlier
    # by FEDERAL_OVERRIDE, so this generic rule is safe.
    r"|\bUNIVERSIDAD AUTONOMA DE\b"
    r"|\bUNIVERSIDAD (DE |DEL |)(" + _STATES_ALT + r")\b"
    # "<entity> EN <STATE>" suffix = state (e.g. Oaxaca's SUNEO universities).
    # Federal entities naming a state carry FEDERAL/NACIONAL → caught by override.
    r"|\bEN (" + _STATES_ALT + r")\b"
    # State housing institutes ("Instituto de [la] Vivienda de <STATE>"); federal
    # housing is CONAVI/INFONAVIT/FOVISSSTE (NACIONAL/ISSSTE → override).
    r"|\b(VIVIENDA|VIVENDA) DE (" + _STATES_ALT + r")\b|\bVIVIENDA DEL ESTADO\b"
    # State school-infrastructure bodies (CAPECE etc.). The federal CAPFCE
    # ("PROGRAMA FEDERAL DE CONSTRUCCION") and INIFED ("INSTITUTO NACIONAL DE
    # LA INFRAESTRUCTURA FISICA EDUCATIVA") are caught earlier by override.
    r"|\bCONSTRUCCION DE ESCUELAS\b|\bCONSTRUCCION DE ESPACIOS EDUCATIVOS\b"
    r"|\bINFRAESTRUCTURA FISICA EDUCATIVA\b"
    # State DIF (national SN-DIF has "SISTEMA NACIONAL" → override).
    r"|\bDESARROLLO INTEGRAL DE LA FAMILIA\b"
    r"|\bSERVICIOS DE SALUD DE (" + _STATES_ALT + r")\b"
    r"|\bSERVICIOS DE SALUD DEL ESTADO\b"
    r"|\bSERVICIOS DE SALUD PUBLICA DEL\b"
    r"|\bHOSPITAL CIVIL\b"
    r"|\bCOMISION ESTATAL\b|\bINSTITUTO ESTATAL\b|\bCONSEJO ESTATAL\b"
    r"|\bREGIMEN ESTATAL\b|\bSISTEMA ESTATAL\b"
)

# Federal overrides — these are federal even if a state name appears in the name.
FEDERAL_OVERRIDE = [
    "NACIONAL AUTONOMA DE MEXICO", "AUTONOMA METROPOLITANA", "PEDAGOGICA NACIONAL",
    "UNIVERSIDAD ABIERTA Y A DISTANCIA", "AUTONOMA CHAPINGO", "ANTONIO NARRO",
    "COLEGIO NACIONAL", "INSTITUTO POLITECNICO NACIONAL", "POLITECNICA NACIONAL",
    "HOSPITAL REGIONAL DE ALTA ESPECIALIDAD", "INSTITUTO NACIONAL",
    "HOSPITAL JUAREZ DE MEXICO", "HOSPITAL GENERAL DE MEXICO", "HOSPITAL INFANTIL DE MEXICO",
    "COMISION NACIONAL", "CONSEJO NACIONAL", "SISTEMA NACIONAL", "SERVICIO NACIONAL",
    "INSTITUTO MEXICANO", "PETROLEOS MEXICANOS", "FEDERAL DE ELECTRICIDAD",
    "PROGRAMA FEDERAL DE CONSTRUCCION",  # CAPFCE (federal) vs CAPECE (state)
    "DE INVESTIGACION CIENTIFICA",       # CONACYT public research centers (IPICYT etc.)
    "INVESTIGACION Y DE ESTUDIOS AVANZADOS",  # CINVESTAV
]


def classify(scope, niv, itype, name):
    """Return (is_federal:int, reason:str)."""
    n = norm(name)
    niv = (niv or "").strip()
    scope = (scope or "").strip()
    itype = (itype or "").strip() or None

    # 1. Definitive sub-national by government tier / scope.
    if niv in ("GE", "GEM", "GM"):
        return 0, f"gobierno_nivel={niv}"
    if scope in ("state", "municipal"):
        return 0, f"scope={scope}"
    # 2. Definitive federal by tier.
    if niv in ("APF", "GF"):
        return 1, f"gobierno_nivel={niv}"
    # ---- ambiguous bucket: scope='federal' (or foreign), gobierno_nivel NULL ----
    # 3. Federal override always wins.
    for ov in FEDERAL_OVERRIDE:
        if ov in n:
            return 1, f"federal_override:{ov[:24]}"
    # 4. Explicit municipal type.
    if itype == "municipal":
        return 0, "type=municipal"
    # 5. Sub-national name signal.
    if STATE_KW_RE.search(n):
        return 0, "name:state_keyword"
    if STATE_NAME_RE.search(n):
        return 0, "name:state_entity"
    # 6. Type-based.
    if itype in FEDERAL_TYPES:
        return 1, f"type={itype}"
    if itype in SUBNATIONAL_TYPES:
        return 0, f"type={itype}"
    # 7. Mixed / unknown type with no sub-national signal → default federal
    #    (scope was 'federal' and nothing flags it as state).
    return 1, f"default_federal(type={itype})"


# --- Hand-labeled validation set -------------------------------------------
KNOWN_FEDERAL = [
    "INSTITUTO MEXICANO DEL SEGURO SOCIAL", "PETROLEOS MEXICANOS", "PEMEX EXPLORACION",
    "COMISION FEDERAL DE ELECTRICIDAD", "INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRA",
    "COMISION NACIONAL DEL AGUA", "SECRETARIA DE COMUNICACIONES Y TRANSPORTES",
    "SECRETARIA DE LA DEFENSA NACIONAL", "SERVICIO DE ADMINISTRACION TRIBUTARIA",
    "INSTITUTO NACIONAL DE CANCEROLOGIA", "HOSPITAL JUAREZ DE MEXICO",
    "INSTITUTO POLITECNICO NACIONAL", "CAMINOS Y PUENTES FEDERALES",
    "LICONSA", "BANCO NACIONAL DE OBRAS Y SERVICIOS", "INSTITUTO NACIONAL DE ESTADISTICA",
    "BANCO DEL BIENESTAR", "FONDO NACIONAL DE FOMENTO AL TURISMO",
    "UNIVERSIDAD NACIONAL AUTONOMA DE MEXICO", "UNIVERSIDAD AUTONOMA METROPOLITANA",
    "COLEGIO NACIONAL DE EDUCACION PROFESIONAL", "NACIONAL FINANCIERA",
    "PROCURADURIA GENERAL DE LA REPUBLICA", "AEROPUERTOS Y SERVICIOS AUXILIARES",
]
KNOWN_SUBNATIONAL = [
    "UNIVERSIDAD TECNOLOGICA DE LEON", "AUTONOMA DE CIUDAD JUAREZ",
    "UNIVERSIDAD JUAREZ AUTONOMA DE TABASCO", "UNIVERSIDAD DE SONORA",
    "REGIMEN ESTATAL DE PROTECCION SOCIAL EN SALUD DE OAXACA",
    "DESARROLLO INTEGRAL DE LA FAMILIA EN EL ESTADO",
    "INSTITUTO PROMOTOR DE LA VIVIENDA DE NAYARIT",
    "COMISION ESTATAL DEL AGUA DE SAN LUIS POTOSI",
    "SERVICIOS DE AGUA Y DRENAJE DE MONTERREY", "SERVICIOS DE SALUD DE VERACRUZ",
    "COMISION ESTATAL DE AGUA Y SANEAMIENTO DE TABASCO", "AGUA DE HERMOSILLO",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="backfill is_federal column")
    ap.add_argument("--db", default=str(DB_PATH))
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    rows = cur.execute(
        """
        SELECT i.id, i.name, i.institution_scope, i.gobierno_nivel, i.institution_type,
               COALESCE(ist.total_contracts, i.total_contracts, 0) AS nc,
               COALESCE(ist.total_value_mxn, 0) AS val
        FROM institutions i
        LEFT JOIN institution_stats ist ON ist.institution_id = i.id
        """
    ).fetchall()

    results = {}  # id -> (is_fed, reason, row)
    for r in rows:
        isf, reason = classify(r["institution_scope"], r["gobierno_nivel"], r["institution_type"], r["name"])
        results[r["id"]] = (isf, reason, r)

    # Scored population (>=10 contracts) summary
    scored = [(isf, reason, r) for (isf, reason, r) in results.values() if (r["nc"] or 0) >= 10]
    fed = [x for x in scored if x[0] == 1]
    sub = [x for x in scored if x[0] == 0]
    print(f"Scored institutions (>=10 contracts): {len(scored)}")
    print(f"  -> federal:      {len(fed):4}  ({sum((x[2]['val'] or 0) for x in fed)/1e9:,.0f}B MXN)")
    print(f"  -> sub-national: {len(sub):4}  ({sum((x[2]['val'] or 0) for x in sub)/1e9:,.0f}B MXN)")

    # --- Validation ---------------------------------------------------------
    def find(needle):
        nn = norm(needle)
        hits = [(isf, reason, r) for (isf, reason, r) in results.values() if nn in norm(r["name"])]
        hits.sort(key=lambda x: -(x[2]["val"] or 0))
        return hits[0] if hits else None

    print("\n=== VALIDATION: known FEDERAL (expect is_federal=1) ===")
    fp = 0
    for nm in KNOWN_FEDERAL:
        h = find(nm)
        if not h:
            print(f"  [?] not found: {nm}")
            continue
        ok = "OK " if h[0] == 1 else "XX "
        if h[0] != 1:
            fp += 1
        print(f"  {ok} is_fed={h[0]} ({h[1]}) | {norm(h[2]['name'])[:50]}")
    print("\n=== VALIDATION: known SUB-NATIONAL (expect is_federal=0) ===")
    fn = 0
    for nm in KNOWN_SUBNATIONAL:
        h = find(nm)
        if not h:
            print(f"  [?] not found: {nm}")
            continue
        ok = "OK " if h[0] == 0 else "XX "
        if h[0] != 0:
            fn += 1
        print(f"  {ok} is_fed={h[0]} ({h[1]}) | {norm(h[2]['name'])[:50]}")
    print(f"\nValidation errors: {fp} federal misclassified as sub-national, {fn} sub-national kept as federal")

    # --- Review dumps: what got EXCLUDED from the old federal_only view -----
    print("\n=== REVIEW: top-25 newly EXCLUDED (was scope=federal/niv NULL, now sub-national) ===")
    excluded = [
        (isf, reason, r) for (isf, reason, r) in scored
        if isf == 0 and (r["institution_scope"] == "federal") and (r["gobierno_nivel"] is None)
    ]
    excluded.sort(key=lambda x: -(x[2]["val"] or 0))
    for isf, reason, r in excluded[:25]:
        print(f"    {(r['val'] or 0)/1e9:7.1f}B nc={str(r['nc']):>6} [{reason:22}] | {norm(r['name'])[:46]}")
    print(f"  ... total newly excluded: {len(excluded)}")

    # --- Review: federal-kept entities whose name contains a state token ----
    print("\n=== REVIEW: kept-federal but name has a state token (potential false keeps) ===")
    state_re = re.compile(r"\b(" + _STATES_ALT + r")\b")
    suspicious = [
        (isf, reason, r) for (isf, reason, r) in scored
        if isf == 1 and state_re.search(norm(r["name"])) and "MEXICO" not in norm(r["name"])
    ]
    suspicious.sort(key=lambda x: -(x[2]["val"] or 0))
    for isf, reason, r in suspicious[:20]:
        print(f"    {(r['val'] or 0)/1e9:7.1f}B nc={str(r['nc']):>6} [{reason:22}] | {norm(r['name'])[:46]}")
    print(f"  ... total kept-federal-with-state-token: {len(suspicious)}")

    # --- New federal league preview (using EXISTING scorecards) ------------
    sc = {r["institution_id"]: r for r in cur.execute(
        "SELECT institution_id, total_score, grade FROM institution_scorecards").fetchall()}
    fed_league = []
    for iid, (isf, reason, r) in results.items():
        if isf == 1 and iid in sc:
            fed_league.append((sc[iid]["total_score"], sc[iid]["grade"], norm(r["name"]), r["nc"]))
    fed_league.sort(key=lambda x: -x[0])
    print(f"\n=== NEW FEDERAL LEAGUE (is_federal=1 with scorecard): {len(fed_league)} institutions ===")
    print("  -- TOP 15 (Honor Roll) --")
    for s, g, nm, nc in fed_league[:15]:
        print(f"    {s:5.1f} {g:3} nc={str(nc):>6} | {nm[:48]}")
    print("  -- BOTTOM 12 (Red Flags) --")
    for s, g, nm, nc in fed_league[-12:]:
        print(f"    {s:5.1f} {g:3} nc={str(nc):>6} | {nm[:48]}")

    if args.write:
        print("\nWriting is_federal column ...")
        cur.execute("PRAGMA table_info(institutions)")
        have = any(c[1] == "is_federal" for c in cur.fetchall())
        if not have:
            cur.execute("ALTER TABLE institutions ADD COLUMN is_federal INTEGER")
        cur.executemany("UPDATE institutions SET is_federal = ? WHERE id = ?",
                        [(isf, iid) for iid, (isf, _, _) in results.items()])
        conn.commit()
        print(f"  wrote is_federal for {len(results)} institutions")
    conn.close()


if __name__ == "__main__":
    main()
