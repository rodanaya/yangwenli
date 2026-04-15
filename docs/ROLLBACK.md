# Rollback Runbook

> How to revert a bad production deployment on the RUBLI VPS (37.60.232.109).

---

## Service Architecture

| Component | Container | What it serves |
|-----------|-----------|---------------|
| Backend | `backend` | FastAPI + SQLite on port 8001 |
| Frontend | `frontend` | nginx serving React app on port 80 |
| Reverse proxy | Caddy (host) | TLS termination → port 80 |
| Database | Volume mount | `RUBLI_DEPLOY.db` at `/data/RUBLI_DEPLOY.db` |

---

## 1. Code Rollback (bad commit deployed)

```bash
ssh root@37.60.232.109

# Find the last good commit
git -C /opt/rubli log --oneline -10

# Revert to specific commit
git -C /opt/rubli checkout <good-commit-hash>

# Rebuild and restart
cd /opt/rubli && docker compose -f docker-compose.prod.yml up -d --build

# Verify
curl -s http://localhost:8001/health | python3 -m json.tool
```

---

## 2. Database Rollback (bad migration or data load)

> **WARNING**: The DB is 4+ GB. Always verify free disk space before restoring.

### Check available backups

```bash
ls -lh /data/backups/RUBLI_DEPLOY_*.db 2>/dev/null || ls -lh /data/RUBLI_DEPLOY.db.backup_*
```

### Restore a backup

```bash
# 1. Stop backend to release the DB file lock
docker stop backend

# 2. Swap in the backup (adjust filename to the specific backup)
cp /data/RUBLI_DEPLOY.db /data/RUBLI_DEPLOY_before_restore_$(date +%Y%m%d_%H%M%S).db
cp /data/backups/RUBLI_DEPLOY_20260325.db /data/RUBLI_DEPLOY.db

# 3. Restart
docker start backend

# 4. Verify
curl -s http://localhost:8001/health
curl -s http://localhost:8001/api/v1/stats/database | python3 -m json.tool | grep total_contracts
```

---

## 3. Full Service Restart

```bash
ssh root@37.60.232.109
cd /opt/rubli
docker compose -f docker-compose.prod.yml restart
```

---

## 4. Emergency Stop (take site offline)

```bash
ssh root@37.60.232.109
cd /opt/rubli
docker compose -f docker-compose.prod.yml stop
```

To bring back up: `docker compose -f docker-compose.prod.yml up -d`

---

## 5. Check Logs

```bash
# Backend API errors
docker logs backend --tail=200 -f

# Frontend nginx access/error logs
docker logs frontend --tail=200

# All services
docker compose -f docker-compose.prod.yml logs --tail=100 -f
```

---

## 6. Health Check URLs

After any rollback, verify these pass:

| Check | Command |
|-------|---------|
| Backend health | `curl -s http://localhost:8001/health` |
| Stats endpoint | `curl -s http://localhost:8001/api/v1/stats/database` |
| Frontend | `curl -sI http://localhost/ \| head -5` |
| ARIA queue | `curl -s http://localhost:8001/api/v1/aria/stats` |

---

## 7. Pre-Deployment Checklist

Before any production push:

- [ ] `python -m pytest backend/tests/ -q --tb=short` passes locally
- [ ] `npx tsc --noEmit && npm run build` passes in `frontend/`
- [ ] DB backup created: `cp RUBLI_DEPLOY.db RUBLI_DEPLOY_$(date +%Y%m%d).db`
- [ ] Disk space checked: `df -h /data`
- [ ] Not during business hours (Mexico City: UTC-6)

---

*Last updated: April 2026*
