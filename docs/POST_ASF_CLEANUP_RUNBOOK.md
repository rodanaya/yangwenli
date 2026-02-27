# Post-ASF Cleanup Runbook

**Purpose:** Run this after the ASF scraper finishes to restore DB performance and prepare for frontend renovation.

**Context:** Multiple failed scoring attempts left a 28.4GB WAL file. Every API query scans this before reading anything — the backend is running 10–50× slower than normal. This runbook fixes that.

---

## Step 0: Confirm the ASF scraper is done

Check that the 748MB Python process is gone:

```bash
tasklist 2>&1 | grep python
```

Expected: no large Python process (anything < 50MB is fine — that's the MCP server).

Also confirm data landed:

```bash
cd /d/Python/yangwenli
python3 -c "
import sqlite3
conn = sqlite3.connect('backend/RUBLI_NORMALIZED.db')
print('asf_cases:', conn.execute('SELECT COUNT(*) FROM asf_cases').fetchone()[0])
print('asf_institution_findings:', conn.execute('SELECT COUNT(*) FROM asf_institution_findings').fetchone()[0])
conn.close()
"
```

---

## Step 1: Drop the junk staging table

```bash
cd /d/Python/yangwenli
python3 -c "
import sqlite3
conn = sqlite3.connect('backend/RUBLI_NORMALIZED.db')
conn.execute('DROP TABLE IF EXISTS _scoring_temp')
conn.commit()
conn.close()
print('_scoring_temp dropped')
"
```

---

## Step 2: VACUUM the database

This rewrites the entire DB, resets the WAL from 28.4GB → 0, and reclaims disk space. Takes ~5–10 minutes on a 5.6GB database.

> ⚠️ Make sure NO other process is writing to the DB before running this. Kill uvicorn and any other Python processes first.

```bash
# Kill the backend server if running
wmic process where "name='uvicorn.exe'" delete 2>&1

# Run VACUUM
cd /d/Python/yangwenli
python3 -c "
import sqlite3, time
print('Starting VACUUM — this takes 5-10 minutes...')
conn = sqlite3.connect('backend/RUBLI_NORMALIZED.db', timeout=600)
conn.execute('PRAGMA journal_mode=WAL')
start = time.time()
conn.execute('VACUUM')
conn.close()
print(f'VACUUM complete in {time.time()-start:.0f}s')
"
```

Verify WAL is gone:

```bash
ls -lh /d/Python/yangwenli/backend/RUBLI_NORMALIZED.db-wal 2>/dev/null || echo "WAL gone — good"
```

---

## Step 3: Refresh precomputed stats

```bash
cd /d/Python/yangwenli/backend
python -m scripts.precompute_stats
```

Expected output: ~15 stat keys computed, "Done" at the end.

---

## Step 4: Run the full test suite

Confirm nothing broke:

```bash
cd /d/Python/yangwenli
python -m pytest backend/tests/ -q --tb=short -p no:cacheprovider 2>&1 | tail -10
```

Expected: 251 passed (or more if ASF tests gained data).

---

## Step 5: Commit the ASF scraper output

Check what changed:

```bash
cd /d/Python/yangwenli
git status --short
```

Stage and commit the wayback scraper changes + any JSONL output:

```bash
cd /d/Python/yangwenli
git add backend/scripts/scrape_asf_wayback.py
# Add JSONL output only if it's small (<1MB)
ls -lh backend/scripts/asf_scraped_*.jsonl 2>/dev/null
# git add backend/scripts/asf_scraped_2021.jsonl  # only if small

git commit -m "$(cat <<'EOF'
feat: ASF wayback scraper + DB cleanup post scoring

- scrape_asf_wayback.py: finalized ASF scraper via Wayback Machine
- VACUUM: reset 28.4GB WAL to 0, restored normal API performance
- Dropped _scoring_temp staging table
- Refreshed precomputed_stats

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Step 6: Push to origin/main

We are 12+ commits ahead of origin/main:

```bash
cd /d/Python/yangwenli
git log --oneline origin/main..HEAD | wc -l  # confirm count
git push origin master:main
```

---

## Step 7: Restart dev servers

```bash
# Backend
cd /d/Python/yangwenli/backend
uvicorn api.main:app --reload --port 8001 &

# Frontend (separate terminal)
cd /d/Python/yangwenli/frontend
npm run dev
```

Verify API is healthy:

```bash
curl -s http://127.0.0.1:8001/health | python3 -m json.tool
```

---

## Done ✓

Once this runbook is complete, the project is ready for frontend renovation:

- WAL reset (normal query performance restored)
- All data loaded (ASF, SFP, SAT EFOS, ML anomalies, investigation cases)
- Tests green
- Pushed to origin/main
- Dev servers running

Next: work through `docs/FRONTEND_RENOVATION_PLAN.md`
