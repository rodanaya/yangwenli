"""Post-score patch for v0.8.5: ghost companion boost + structural FP cap.

Two adjustments applied after the main logistic regression scoring:

1. GHOST COMPANION BOOST (same tiers as v0.6.5)
   Ghost vendors scored near-zero in v0.8.5 (HR dropped 14%→0.4%) because the
   regression features don't fully internalize the P2 shell-company signal.
   Fix: add ghost_confidence_score × weight to each ghost vendor's contract scores.
   Weight tiers: >=0.8→0.40, >=0.6→0.30, >=0.4→0.20 (only vendors >=0.4 boosted).

2. STRUCTURAL FP CAP
   is_false_positive=1 vendors (BAXTER, PRAXAIR, FRESENIUS, INFRA SA DE CV) are
   structural monopolies whose high scores are false positives by design — they are
   excluded from training but still score high. Cap them at 0.05 / 'low'.

Writes to: risk_score, risk_level, risk_score_v8 (risk_model_version unchanged = v0.8.5).

Usage:
    cd backend
    python scripts/_patch_v85_ghost_fp.py [--db PATH] [--dry-run]
"""
import argparse
import sqlite3
import sys
import time

DB = r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db"

THRESHOLD_CRITICAL = 0.60
THRESHOLD_HIGH     = 0.40
THRESHOLD_MEDIUM   = 0.25
BATCH_SIZE = 50_000


def get_risk_level(score):
    if score >= THRESHOLD_CRITICAL: return 'critical'
    if score >= THRESHOLD_HIGH:     return 'high'
    if score >= THRESHOLD_MEDIUM:   return 'medium'
    return 'low'


def ghost_boost_weight(ghost_score):
    if ghost_score >= 0.8: return 0.40
    if ghost_score >= 0.6: return 0.30
    return 0.20  # 0.4–0.6 tier


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', default=DB)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    conn = sqlite3.connect(args.db, timeout=300)
    conn.execute('PRAGMA busy_timeout=300000')
    conn.execute('PRAGMA synchronous=OFF')
    conn.execute('PRAGMA cache_size=-200000')
    conn.execute('PRAGMA wal_autocheckpoint=0')

    # ── 1. Structural FP cap ──────────────────────────────────────────────────
    fp_ids = [r[0] for r in conn.execute(
        "SELECT DISTINCT vendor_id FROM ground_truth_vendors WHERE is_false_positive=1"
    ).fetchall()]
    print(f"\n[FP] Capping {len(fp_ids)} structural FP vendor IDs: {fp_ids}", flush=True)

    placeholders = ','.join('?' * len(fp_ids))
    before = conn.execute(
        f"SELECT risk_level, COUNT(*) FROM contracts WHERE vendor_id IN ({placeholders}) "
        f"GROUP BY risk_level", fp_ids
    ).fetchall()
    print(f"[FP] Before: {dict(before)}", flush=True)

    if not args.dry_run:
        conn.execute(
            f"UPDATE contracts SET risk_score=0.05, risk_level='low', risk_score_v8=0.05 "
            f"WHERE vendor_id IN ({placeholders})", fp_ids
        )
        conn.commit()
        after = conn.execute(
            f"SELECT risk_level, COUNT(*) FROM contracts WHERE vendor_id IN ({placeholders}) "
            f"GROUP BY risk_level", fp_ids
        ).fetchall()
        print(f"[FP] After:  {dict(after)}", flush=True)
    print("[FP] Done.", flush=True)

    # ── 2. Ghost companion boost ──────────────────────────────────────────────
    ghost_vendors = conn.execute(
        "SELECT vendor_id, ghost_confidence_score FROM ghost_confidence_scores "
        "WHERE ghost_confidence_score >= 0.4"
    ).fetchall()
    # Exclude FP vendors from boost (they're already capped)
    fp_set = set(fp_ids)
    ghost_vendors = [(vid, gs) for vid, gs in ghost_vendors if vid not in fp_set]
    print(f"\n[GHOST] {len(ghost_vendors)} ghost vendors to boost", flush=True)

    boosted = 0
    changed_level = 0
    t0 = time.time()

    for i in range(0, len(ghost_vendors), 500):
        batch_vendors = ghost_vendors[i:i + 500]
        vid_to_gs = {vid: gs for vid, gs in batch_vendors}
        vids = list(vid_to_gs.keys())
        placeholders_v = ','.join('?' * len(vids))

        rows = conn.execute(
            f"SELECT id, vendor_id, risk_score FROM contracts "
            f"WHERE vendor_id IN ({placeholders_v}) AND risk_score IS NOT NULL",
            vids
        ).fetchall()

        updates = []
        for cid, vid, base_score in rows:
            gs = vid_to_gs[vid]
            weight = ghost_boost_weight(gs)
            new_score = round(min(1.0, base_score + gs * weight), 6)
            if new_score == base_score:
                continue
            old_lvl = get_risk_level(base_score)
            new_lvl = get_risk_level(new_score)
            if new_lvl != old_lvl:
                changed_level += 1
            updates.append((new_score, new_lvl, new_score, cid))

        boosted += len(updates)

        if not args.dry_run and updates:
            conn.executemany(
                "UPDATE contracts SET risk_score=?, risk_level=?, risk_score_v8=? WHERE id=?",
                updates
            )
            conn.commit()

        if (i // 500) % 20 == 0 or i + 500 >= len(ghost_vendors):
            pct = 100 * min(i + 500, len(ghost_vendors)) / len(ghost_vendors)
            print(f"  {min(i+500,len(ghost_vendors))}/{len(ghost_vendors)} vendors "
                  f"({pct:.0f}%) — {boosted:,} contracts updated, "
                  f"{changed_level:,} level changes — {time.time()-t0:.0f}s", flush=True)

    print(f"\n[GHOST] Done. {boosted:,} contracts boosted, {changed_level:,} level changes.",
          flush=True)

    # ── 3. Final distribution ─────────────────────────────────────────────────
    dist = dict(conn.execute(
        "SELECT risk_level, COUNT(*) FROM contracts WHERE risk_level IS NOT NULL GROUP BY risk_level"
    ).fetchall())
    total = sum(dist.values())
    hr = 100 * (dist.get('critical', 0) + dist.get('high', 0)) / total
    print(f"\n{'='*55}")
    print(f"v0.8.5 POST-PATCH DISTRIBUTION {'(DRY RUN) ' if args.dry_run else ''}")
    print(f"{'='*55}")
    for lvl in ['critical', 'high', 'medium', 'low']:
        n = dist.get(lvl, 0)
        print(f"  {lvl:12s} {n:>10,} ({100*n/total:.1f}%)")
    print(f"\nHigh-risk rate: {hr:.2f}%  [gate: 9-13%]")
    print('  => PASS' if 9.0 <= hr <= 13.0 else f'  => WARN: outside gate')

    conn.execute('PRAGMA wal_checkpoint(PASSIVE)')
    conn.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
