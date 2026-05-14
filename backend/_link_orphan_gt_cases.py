"""S.5 GT orphan triage: link orphan ground_truth_cases rows to vendors."""
import sqlite3
import re
import unicodedata
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

STOP_TOKENS = {
    "COVID", "IMSS", "ISSSTE", "PEMEX", "CFE", "SEMAR", "SEDENA",
    "CONAGUA", "CONAPESCA", "FONACOT", "INM", "ISEM", "ISSFAM",
    "SAT", "SFP", "ASF", "SAE",
    "GHOST", "SHELL", "DA", "SB", "COMPLEMENTO", "MONOPOLY",
    "EMERGENCY", "CAPTURE", "RING", "MISMATCH", "FRAUD",
    "YEAR-END", "BUDGET", "DUMP", "DEBUT", "BURST",
    "PHARMA", "PHARMACEUTICAL", "CHEMICAL", "INFRASTRUCTURE",
    "CONSTRUCTION", "OBRA", "CONTRATISTA",
}

DENYLIST = {"ICA", "SAE", "AP", "OPM", "SOS", "INM", "CFE", "SOSA", "ASPID"}

def strip_accents(s):
    return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")

def normalize(s):
    s = strip_accents(s).upper().strip()
    # Strip punctuation FIRST so dotless suffixes are easier to handle
    s = re.sub(r"[.,&]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    # Now strip legal suffixes (dotless after collapse)
    # Order matters: most specific first
    patterns = [
        r"\s+S\s+A\s+P\s+I\s+DE\s+C\s+V$",
        r"\s+SAPI\s+DE\s+CV$",
        r"\s+S\s+A\s+DE\s+C\s+V$",
        r"\s+SA\s+DE\s+CV$",
        r"\s+SADECV$",
        r"\s+S\s+DE\s+R\s+L\s+DE\s+C\s+V$",
        r"\s+S\s+DE\s+RL\s+DE\s+CV$",
        r"\s+S\s+A\s+B\s+DE\s+C\s+V$",
        r"\s+SAB\s+DE\s+CV$",
        r"\s+S\s+C$",
        r"\s+SC$",
        r"\s+A\s+C$",
        r"\s+AC$",
    ]
    for p in patterns:
        s = re.sub(p, "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def extract_candidate(case_name):
    if " - " in case_name:
        cand = case_name.split(" - ", 1)[0].strip()
    else:
        cand_tokens = []
        for tok in case_name.split():
            tok_up = strip_accents(tok).upper().strip(",.")
            if cand_tokens and tok_up in STOP_TOKENS:
                break
            if re.fullmatch(r"(19|20)\d{2}", tok_up):
                break
            if re.fullmatch(r"\d+(\.\d+)?[MB]?", tok_up):
                break
            cand_tokens.append(tok)
            if len(cand_tokens) >= 6:
                break
        cand = " ".join(cand_tokens).strip()
    return cand or None

def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    print("Building vendor index...")
    c.execute("SELECT id, name, name_normalized FROM vendors")
    idx = {}
    for vid, vname, vnorm in c.fetchall():
        for key in {normalize(vname or ""), normalize(vnorm or "")}:
            if not key or len(key) < 4:
                continue
            idx.setdefault(key, []).append((vid, vname))
    print(f"  indexed {sum(len(v) for v in idx.values())} tuples, {len(idx)} unique norms")
    c.execute("SELECT id, case_name, case_type FROM ground_truth_cases WHERE id NOT IN (SELECT DISTINCT case_id FROM ground_truth_vendors WHERE case_id IS NOT NULL) ORDER BY id")
    orphans = c.fetchall()
    print(f"Orphan cases: {len(orphans)}")
    high_matches = []
    medium_matches = []
    unmatched = []
    denylist_skips = []
    for row in orphans:
        cid, cname = row["id"], row["case_name"]
        cand = extract_candidate(cname)
        if not cand:
            unmatched.append((cid, cname, ""))
            continue
        norm = normalize(cand)
        if len(norm) < 4:
            unmatched.append((cid, cname, cand))
            continue
        first_tok = norm.split()[0] if norm else ""
        if first_tok in DENYLIST and len(norm.split()) <= 1:
            denylist_skips.append((cid, cname, cand))
            continue
        hits = idx.get(norm, [])
        unique_vids = sorted({h[0] for h in hits})
        if len(unique_vids) == 1 and hits:
            vid = unique_vids[0]
            vname = [h[1] for h in hits if h[0] == vid][0]
            high_matches.append((cid, vid, vname, cand))
        elif len(unique_vids) > 1:
            medium_matches.append((cid, cand, hits[:5]))
        else:
            prefix_hits = []
            for k, vs in idx.items():
                if k == norm: continue
                if k.startswith(norm + " ") or norm.startswith(k + " "):
                    prefix_hits.extend(vs)
                    if len(prefix_hits) > 16: break
            prefix_unique_vids = sorted({h[0] for h in prefix_hits})
            if len(prefix_unique_vids) == 1 and prefix_hits:
                vid = prefix_unique_vids[0]
                vname = [h[1] for h in prefix_hits if h[0] == vid][0]
                high_matches.append((cid, vid, vname, cand))
            elif prefix_hits:
                medium_matches.append((cid, cand, prefix_hits[:5]))
            else:
                unmatched.append((cid, cname, cand))
    print(f"HIGH confidence (exact, unique): {len(high_matches)}")
    print(f"MEDIUM confidence (ambiguous): {len(medium_matches)}")
    print(f"DENYLIST skips: {len(denylist_skips)}")
    print(f"UNMATCHED (before token pass): {len(unmatched)}")

    # ---- Pass 2: distinctive-token search ----
    # Build a substring-token index: token -> set(vendor_ids that contain it)
    # Only index tokens >= 5 chars
    print("Building token index for distinctive-token pass...")
    token_idx = {}
    for key, vlist in idx.items():
        for tok in key.split():
            if len(tok) < 5:
                continue
            if tok in STOP_TOKENS:
                continue
            # Skip very common spanish words
            if tok in {"GRUPO", "EMPRESARIAL", "COMERCIAL", "COMERCIALIZADORA", "DISTRIBUIDORA", "CONSTRUCTORA", "CONSULTORES", "SOLUCIONES", "SERVICIOS", "INDUSTRIAL", "MEDICAL", "MEDICA", "FARMACEUTICA", "TECNOLOGIA", "CORPORATIVO", "PROYECTOS", "DESPACHO", "JURIDICO", "OPERADORA", "DESARROLLOS", "INGENIERIA", "MATERIALES"}:
                continue
            for vid, vname in vlist:
                token_idx.setdefault(tok, set()).add((vid, vname))

    still_unmatched = []
    token_promoted = 0
    for cid, cname, cand in unmatched:
        norm = normalize(cand) if cand else ""
        if not norm:
            still_unmatched.append((cid, cname, cand))
            continue
        # Find tokens unique enough
        toks = [t for t in norm.split() if len(t) >= 5 and t not in STOP_TOKENS]
        # Intersect vendor sets across tokens
        candidate_sets = []
        for t in toks:
            vs = token_idx.get(t)
            if vs is None:
                candidate_sets = []
                break
            candidate_sets.append(vs)
        if not candidate_sets:
            still_unmatched.append((cid, cname, cand))
            continue
        common = set.intersection(*candidate_sets) if len(candidate_sets) > 1 else candidate_sets[0]
        unique_vids = sorted({v[0] for v in common})
        if len(unique_vids) == 1:
            vid = unique_vids[0]
            vname = next(v[1] for v in common if v[0] == vid)
            high_matches.append((cid, vid, vname, cand))
            token_promoted += 1
        else:
            still_unmatched.append((cid, cname, cand))
    unmatched = still_unmatched
    print(f"Pass 2 promoted to HIGH: {token_promoted}")
    print(f"UNMATCHED (after token pass): {len(unmatched)}")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    inserted = 0
    for cid, vid, vname, cand in high_matches:
        c.execute("INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence, notes, created_at) VALUES (?, ?, ?, 'primary', 'moderate', 'name_match', 0.95, 'auto-linked S.5 orphan triage', ?)", (cid, vid, vname, now))
        inserted += 1
    conn.commit()
    print(f"INSERTED {inserted} rows.")
    c.execute("SELECT COUNT(*) FROM ground_truth_cases WHERE id NOT IN (SELECT DISTINCT case_id FROM ground_truth_vendors WHERE case_id IS NOT NULL)")
    remaining = c.fetchone()[0]
    print(f"Remaining orphans: {remaining}")
    print("--- Top 25 unmatched ---")
    for cid, cname, cand in unmatched[:25]:
        print(f"  [{cid}] {cname[:80]} -> cand={cand!r}")
    print("--- 15 MEDIUM samples ---")
    for cid, cand, hits in medium_matches[:15]:
        vlist = ", ".join(f"{v[0]}:{v[1][:30]}" for v in hits[:3])
        print(f"  [{cid}] {cand!r} -> {vlist}")
    print(f"--- {len(denylist_skips)} DENYLIST skips ---")
    for cid, cname, cand in denylist_skips[:10]:
        print(f"  [{cid}] {cname[:70]} (cand={cand!r})")
    conn.close()

if __name__ == "__main__":
    main()