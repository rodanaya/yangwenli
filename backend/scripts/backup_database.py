"""
Database Backup Script for RUBLI

Creates compressed backups of RUBLI_NORMALIZED.db with integrity verification.
Retains last 7 daily backups, deletes older ones.

Usage:
    python scripts/backup_database.py
    python scripts/backup_database.py --output-dir /path/to/backups
"""
import argparse
import gzip
import shutil
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

# Default paths
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DEFAULT_BACKUP_DIR = Path(__file__).parent.parent / "backups"
BACKUP_PREFIX = "RUBLI_NORMALIZED_"
BACKUP_SUFFIX = ".db.gz"
MAX_BACKUPS = 7
GZIP_CHUNK_SIZE = 64 * 1024 * 1024  # 64MB chunks for streaming compression


def verify_integrity(db_path: Path) -> tuple[bool, str]:
    """Run PRAGMA integrity_check on a database file.

    Returns (passed, result_text).
    """
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.execute("PRAGMA integrity_check")
        result = cursor.fetchone()[0]
        conn.close()
        passed = result == "ok"
        return passed, result
    except Exception as e:
        return False, str(e)


def compress_file(source: Path, dest: Path) -> int:
    """Compress a file with gzip using streaming to handle large files.

    Returns the compressed file size in bytes.
    """
    with open(source, "rb") as f_in:
        with gzip.open(dest, "wb", compresslevel=6) as f_out:
            while True:
                chunk = f_in.read(GZIP_CHUNK_SIZE)
                if not chunk:
                    break
                f_out.write(chunk)
    return dest.stat().st_size


def cleanup_old_backups(backup_dir: Path) -> list[Path]:
    """Delete backups older than the most recent MAX_BACKUPS.

    Returns list of deleted files.
    """
    backups = sorted(
        backup_dir.glob(f"{BACKUP_PREFIX}*{BACKUP_SUFFIX}"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    deleted = []
    for old_backup in backups[MAX_BACKUPS:]:
        old_backup.unlink()
        deleted.append(old_backup)
    return deleted


def format_size(size_bytes: int) -> str:
    """Format byte count as human-readable string."""
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def run_backup(output_dir: Path | None = None) -> dict:
    """Run the full backup process.

    Returns a summary dict with backup details.
    """
    start_time = time.time()
    backup_dir = output_dir or DEFAULT_BACKUP_DIR
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Validate source database exists
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    source_size = DB_PATH.stat().st_size
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{BACKUP_PREFIX}{timestamp}{BACKUP_SUFFIX}"
    backup_path = backup_dir / backup_name

    # Temporary uncompressed copy for integrity check
    temp_copy = backup_dir / f"_temp_{timestamp}.db"

    print(f"=== RUBLI Database Backup ===")
    print(f"Source:    {DB_PATH}")
    print(f"Source size: {format_size(source_size)}")
    print(f"Output:    {backup_path}")
    print()

    # Step 1: Copy database using SQLite backup API for consistency
    print("[1/4] Copying database (SQLite backup API)...")
    try:
        src_conn = sqlite3.connect(str(DB_PATH))
        dst_conn = sqlite3.connect(str(temp_copy))
        src_conn.backup(dst_conn)
        dst_conn.close()
        src_conn.close()
    except Exception as e:
        print(f"ERROR: Failed to copy database: {e}")
        if temp_copy.exists():
            temp_copy.unlink()
        sys.exit(1)

    # Step 2: Verify integrity of the copy
    print("[2/4] Verifying backup integrity...")
    integrity_ok, integrity_result = verify_integrity(temp_copy)
    if not integrity_ok:
        print(f"ERROR: Integrity check FAILED: {integrity_result}")
        temp_copy.unlink()
        sys.exit(1)
    print(f"       Integrity check: PASSED")

    # Step 3: Compress
    print("[3/4] Compressing with gzip...")
    compressed_size = compress_file(temp_copy, backup_path)
    temp_copy.unlink()
    ratio = (1 - compressed_size / source_size) * 100 if source_size > 0 else 0
    print(f"       Compressed: {format_size(source_size)} -> {format_size(compressed_size)} ({ratio:.1f}% reduction)")

    # Step 4: Cleanup old backups
    print("[4/4] Cleaning up old backups...")
    deleted = cleanup_old_backups(backup_dir)
    remaining = list(backup_dir.glob(f"{BACKUP_PREFIX}*{BACKUP_SUFFIX}"))
    if deleted:
        for d in deleted:
            print(f"       Deleted: {d.name}")
    print(f"       Retained: {len(remaining)} backup(s)")

    duration = time.time() - start_time

    # Summary
    print()
    print(f"=== Backup Complete ===")
    print(f"File:       {backup_path.name}")
    print(f"Size:       {format_size(compressed_size)}")
    print(f"Integrity:  PASSED")
    print(f"Duration:   {duration:.1f}s")
    print(f"Backups:    {len(remaining)}/{MAX_BACKUPS} retained")

    return {
        "backup_path": str(backup_path),
        "backup_name": backup_name,
        "source_size": source_size,
        "compressed_size": compressed_size,
        "compression_ratio": round(ratio, 1),
        "integrity": "ok",
        "duration_seconds": round(duration, 1),
        "deleted_count": len(deleted),
        "retained_count": len(remaining),
        "timestamp": timestamp,
    }


def get_latest_backup_info(backup_dir: Path | None = None) -> dict | None:
    """Get info about the most recent backup. Used by the health endpoint."""
    search_dir = backup_dir or DEFAULT_BACKUP_DIR
    if not search_dir.exists():
        return None

    backups = sorted(
        search_dir.glob(f"{BACKUP_PREFIX}*{BACKUP_SUFFIX}"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not backups:
        return None

    latest = backups[0]
    stat = latest.stat()
    return {
        "file": latest.name,
        "size_bytes": stat.st_size,
        "size_human": format_size(stat.st_size),
        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "total_backups": len(backups),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Backup RUBLI_NORMALIZED.db with compression and integrity verification"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help=f"Directory for backup files (default: {DEFAULT_BACKUP_DIR})",
    )
    args = parser.parse_args()
    run_backup(output_dir=args.output_dir)


if __name__ == "__main__":
    main()
