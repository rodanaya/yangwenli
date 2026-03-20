
import pathlib

target = pathlib.Path(r"D:/Python/yangwenli/backend/scripts/_aria_cases_batch_B.py")

lines = []
lines.append('"""')
lines.append('ARIA Investigation Batch B - 5 Vendor Deep Dive')
lines.append('Generated: 2026-03-17')
lines.append('"""')
lines.append('')
lines.append('import sqlite3')
lines.append('from datetime import datetime')
lines.append('')
lines.append('DB_PATH = r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db"')
lines.append('')
lines.append('')
lines.append('def main():')
lines.append('    date = datetime.now().strftime("%Y-%m-%d %H:%M")')
lines.append('    print(f"ARIA Investigation Batch B - {date}")')
lines.append('    print("=" * 80)')
lines.append('')
lines.append('    conn = sqlite3.connect(DB_PATH)')
lines.append('    conn.execute("PRAGMA journal_mode=WAL")')
lines.append('    conn.execute("PRAGMA busy_timeout=10000")')
lines.append('')
lines.append('    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()')
lines.append('    next_id = (row[0] or 0) + 1')
lines.append('    case_id = f"CASE-{next_id:04d}"')
lines.append('    print(f"Next case ID: {next_id} ({case_id})")')

target.write_text(chr(10).join(lines), encoding="utf-8")
print(f"Wrote {len(lines)} lines")
