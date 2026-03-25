"""
backup_db.py — RUBLI database backup script with rotation.

Uses SQLite's ``VACUUM INTO`` to produce a clean, defragmented snapshot
rather than a raw file copy.  This is atomic (SQLite writes the entire
new file before it becomes visible) and avoids copying WAL / shm
sidecar files.

Naming convention: RUBLI_NORMALIZED_YYYYMMDD_HHMMSS.db
                   RUBLI_DEPLOY_YYYYMMDD_HHMMSS.db      (if present)

Rotation policy:
  - Keep only the last 5 backups per source database (simple count-based).
  - Older backups beyond that are deleted.

Usage:
    python -m scripts.backup_db
    python -m scripts.backup_db --dest /path/to/backup/dir/
    python backend/scripts/backup_db.py --dest backups/
"""

import argparse
import logging
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
import json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [backup_db] %(levelname)s %(message)s",
)
log = logging.getLogger("backup_db")

# ─── Defaults ────────────────────────────────────────────────────────────────

_SCRIPT_DIR = Path(__file__).resolve().parent          # backend/scripts/
_BACKEND_DIR = _SCRIPT_DIR.parent                      # backend/
_DEFAULT_BACKUP_DIR = _BACKEND_DIR / "backups"
_LAST_BACKUP_JSON_NAME = "LAST_BACKUP.json"

SOURCES = {
    "RUBLI_NORMALIZED": _BACKEND_DIR / "RUBLI_NORMALIZED.db",
    "RUBLI_DEPLOY":     _BACKEND_DIR / "RUBLI_DEPLOY.db",
}

KEEP_LAST = 5   # keep only the N most recent backups per source


# ─── Rotation ────────────────────────────────────────────────────────────────

def _rotate(backup_dir: Path, prefix: str) -> list[str]:
    """Delete old backups beyond KEEP_LAST for the given source prefix.

    Returns list of deleted filenames.
    """
    pattern = f"{prefix}_*.db"
    candidates = sorted(
        backup_dir.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,   # newest first
    )

    to_delete = candidates[KEEP_LAST:]   # everything beyond the last N
    deleted = []
    for p in to_delete:
        try:
            p.unlink()
            deleted.append(p.name)
            log.info("Deleted old backup: %s", p.name)
        except OSError as exc:
            log.warning("Could not delete %s: %s", p.name, exc)
    return deleted


# ─── Main logic ──────────────────────────────────────────────────────────────

def run_backup(backup_dir: Path) -> int:
    """Perform backup and rotation. Returns exit code (0=ok, 1=partial error)."""
    backup_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    now_iso = datetime.now(timezone.utc).isoformat()

    backed_up: list[dict] = []
    deleted_all: list[str] = []
    had_error = False

    for label, src in SOURCES.items():
        if not src.exists():
            log.info("Source not found, skipping: %s", src)
            continue

        dest_name = f"{label}_{stamp}.db"
        dest = backup_dir / dest_name

        t0 = time.monotonic()
        log.info("Backing up %s → %s (VACUUM INTO)", src.name, dest_name)

        try:
            # VACUUM INTO writes a clean, fully-checkpointed copy of the
            # database to dest without affecting the source connection.
            # It requires no WAL/shm handling and is safe for hot copies.
            conn = sqlite3.connect(str(src), timeout=10)
            try:
                conn.execute(f"VACUUM INTO '{dest}'")
            finally:
                conn.close()

            duration = time.monotonic() - t0
            size = dest.stat().st_size
            log.info(
                "  Done: %s  (%.1f MB, %.1fs)",
                dest_name,
                size / 1024 / 1024,
                duration,
            )
            backed_up.append({
                "file": dest_name,
                "size_bytes": size,
                "duration_s": round(duration, 2),
            })
        except sqlite3.Error as exc:
            log.error("VACUUM INTO failed for %s: %s", src.name, exc)
            had_error = True
            # Clean up incomplete dest file if it exists
            if dest.exists():
                try:
                    dest.unlink()
                except OSError:
                    pass
            continue
        except OSError as exc:
            log.error("OS error backing up %s: %s", src.name, exc)
            had_error = True
            continue

        # Rotate after each source independently
        deleted = _rotate(backup_dir, label)
        deleted_all.extend(deleted)

    # ── Summary ──────────────────────────────────────────────────────────────
    total_size = sum(b["size_bytes"] for b in backed_up)
    total_duration = sum(b["duration_s"] for b in backed_up)

    print("\n" + "=" * 60)
    print("RUBLI DB Backup Summary")
    print("=" * 60)
    if backed_up:
        for b in backed_up:
            print(
                f"  Backed up : {b['file']}"
                f"  ({b['size_bytes'] / 1e6:.1f} MB, {b['duration_s']:.1f}s)"
            )
    else:
        print("  Backed up : (none)")
    if deleted_all:
        for d in deleted_all:
            print(f"  Deleted   : {d}")
    else:
        print("  Deleted   : (none — rotation not required)")
    print(f"  Total size: {total_size / 1e6:.1f} MB")
    print(f"  Duration  : {total_duration:.1f}s")
    print(f"  Dest dir  : {backup_dir}")
    print("=" * 60 + "\n")

    # ── Write LAST_BACKUP.json ────────────────────────────────────────────────
    last_backup_json = backup_dir / _LAST_BACKUP_JSON_NAME
    if backed_up:
        meta = {
            "last_backup": now_iso,
            "files": [b["file"] for b in backed_up],
            "size_bytes": total_size,
        }
        try:
            last_backup_json.write_text(json.dumps(meta, indent=2))
            log.info("Updated %s", last_backup_json)
        except OSError as exc:
            log.warning("Could not write LAST_BACKUP.json: %s", exc)

    return 1 if had_error else 0


# ─── CLI ─────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backup RUBLI database files using VACUUM INTO.",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=_DEFAULT_BACKUP_DIR,
        metavar="DIR",
        help=f"Destination directory for backups (default: {_DEFAULT_BACKUP_DIR})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    sys.exit(run_backup(args.dest))
