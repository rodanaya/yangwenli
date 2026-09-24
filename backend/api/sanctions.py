"""Registry matching (SFP sanctions, ASF cases) against vendors.

RFC is missing at source for most records (sfp_sanctions: 22/2,395 rows carry
one; vendors: 14%), so name matching is unavoidable. It must be strict: the
whole normalized name must be equal — never a prefix/substring (the old
`LIKE '%<first 20 chars>%'` flagged ~7,600 vendors, most of them wrongly).

Every hit carries `match_basis`:
  'rfc'            — same well-formed RFC on both sides
  'name'           — identical normalized name, RFC not available to confirm
  'name_ambiguous' — identical normalized name, but that name belongs to >1 vendor id
A name hit is dropped when both sides have RFCs and they differ.
"""
from __future__ import annotations

import re
import threading
import unicodedata
from typing import Optional

from .pii import public_rfc

_RFC = re.compile(r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$")
# Longest forms first so "S A DE C V" is removed whole, not as "S A" + "DE C V".
_LEGAL_SUFFIX = re.compile(
    r"\b(S A B DE C V|S A P I DE C V|SAPI DE CV|S A DE C V|SA DE CV|"
    r"S DE R L DE C V|S DE RL DE CV|S DE R L|S EN C|S C|S A|DE C V)\b"
)


def valid_rfc(rfc: Optional[str]) -> Optional[str]:
    if not rfc:
        return None
    cleaned = str(rfc).strip().upper()
    return cleaned if _RFC.match(cleaned) else None


def normalize_name(name: Optional[str]) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode().upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    s = " ".join(s.split())
    s = _LEGAL_SUFFIX.sub(" ", s)
    return " ".join(s.split())


class _RegistryIndex:
    def __init__(self, rows: list[dict], rfc_col: str, name_col: str, name_counts: dict[str, int]):
        self.by_rfc: dict[str, list[dict]] = {}
        self.by_name: dict[str, list[dict]] = {}
        self.rfc_col, self.name_col = rfc_col, name_col
        self.name_counts = name_counts
        for d in rows:
            r = valid_rfc(d.get(rfc_col))
            if r:
                self.by_rfc.setdefault(r, []).append(d)
            k = normalize_name(d.get(name_col))
            if k:
                self.by_name.setdefault(k, []).append(d)


# ponytail: indexes are built once per process (registries change only on reload,
# which is followed by a redeploy/restart). Add a TTL if registries ever update live.
_INDEXES: dict[str, _RegistryIndex] = {}
_LOCK = threading.Lock()


def _index(conn, key: str, sql: str, rfc_col: str, name_col: str) -> _RegistryIndex:
    idx = _INDEXES.get(key)
    if idx is not None:
        return idx
    with _LOCK:
        idx = _INDEXES.get(key)
        if idx is not None:
            return idx
        rows = [dict(r) for r in conn.execute(sql).fetchall()]
        names = {normalize_name(d.get(name_col)) for d in rows} - {""}
        counts = dict.fromkeys(names, 0)
        for (vname,) in conn.execute("SELECT name FROM vendors"):
            k = normalize_name(vname)
            if k in counts:
                counts[k] += 1
        idx = _INDEXES[key] = _RegistryIndex(rows, rfc_col, name_col, counts)
        return idx


def _match(idx: _RegistryIndex, vendor_name: Optional[str], vendor_rfc: Optional[str], limit: int) -> list[dict]:
    rfc = valid_rfc(vendor_rfc)
    hits: dict[int, dict] = {}
    if rfc:
        for d in idx.by_rfc.get(rfc, []):
            hits[id(d)] = {**d, "match_basis": "rfc"}
    key = normalize_name(vendor_name)
    if key:
        basis = "name_ambiguous" if idx.name_counts.get(key, 0) > 1 else "name"
        for d in idx.by_name.get(key, []):
            if id(d) in hits:
                continue
            other = valid_rfc(d.get(idx.rfc_col))
            if rfc and other and other != rfc:
                continue  # same name, different taxpayer
            hits[id(d)] = {**d, "match_basis": basis}
    out = list(hits.values())[:limit]
    for d in out:
        d[idx.rfc_col] = public_rfc(d.get(idx.rfc_col))
    return out


def match_sfp(conn, vendor_name, vendor_rfc, limit: int = 20) -> list[dict]:
    idx = _index(
        conn, "sfp",
        "SELECT id, rfc, company_name, sanction_type, sanction_start, sanction_end, amount_mxn, authority FROM sfp_sanctions",
        "rfc", "company_name",
    )
    return _match(idx, vendor_name, vendor_rfc, limit)


def match_asf(conn, vendor_name, vendor_rfc, limit: int = 50) -> list[dict]:
    idx = _index(conn, "asf", "SELECT * FROM asf_cases", "vendor_rfc", "vendor_name")
    rows = _match(idx, vendor_name, vendor_rfc, limit)
    rows.sort(key=lambda d: d.get("report_year") or 0, reverse=True)
    return rows


def summarize_basis(rows: list[dict]) -> Optional[str]:
    """Strongest basis across hits: rfc > name > name_ambiguous."""
    bases = {d["match_basis"] for d in rows}
    for b in ("rfc", "name", "name_ambiguous"):
        if b in bases:
            return b
    return None


if __name__ == "__main__":
    assert normalize_name("Constructora Pérez, S.A. de C.V.") == "CONSTRUCTORA PEREZ"
    assert normalize_name("CONSTRUCTORA PEREZ SA DE CV") == "CONSTRUCTORA PEREZ"
    assert normalize_name("S.A. de C.V.") == ""
    assert valid_rfc(" abc010101ab1 ") == "ABC010101AB1" and valid_rfc("10861.0") is None
    idx = _RegistryIndex(
        [{"id": 1, "rfc": None, "company_name": "GRUPO CONSTRUCTOR DEL NORTE SA DE CV"},
         {"id": 2, "rfc": "GCS010101AB1", "company_name": "GRUPO CONSTRUCTOR DEL SUR"}],
        "rfc", "company_name", {"GRUPO CONSTRUCTOR DEL NORTE": 1, "GRUPO CONSTRUCTOR DEL SUR": 2},
    )
    # old prefix bug: "GRUPO CONSTRUCTOR DE" would have matched both — now neither
    assert _match(idx, "GRUPO CONSTRUCTOR DE LA COSTA", None, 20) == []
    assert _match(idx, "Grupo Constructor del Norte, S.A. de C.V.", None, 20)[0]["match_basis"] == "name"
    assert _match(idx, "GRUPO CONSTRUCTOR DEL SUR", None, 20)[0]["match_basis"] == "name_ambiguous"
    assert _match(idx, "GRUPO CONSTRUCTOR DEL SUR", "GCS010101AB1", 20)[0]["match_basis"] == "rfc"
    assert _match(idx, "GRUPO CONSTRUCTOR DEL SUR", "XYZ010101AB1", 20) == []  # RFC conflict
    print("sanctions self-check ok")
