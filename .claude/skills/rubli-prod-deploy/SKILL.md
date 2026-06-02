---
name: rubli-prod-deploy
description: |
  Deploy the RUBLI codebase to production at rubli.xyz / 37.60.232.109.
  Use this skill whenever the user asks to "deploy", "ship to prod",
  "push to production", "redeploy", "deploy this fix", "make it live",
  or any variant. Trigger eagerly — the procedure has multiple non-obvious
  gotchas (VPS branch is master, not main; --no-deps frontend silently
  breaks the docker network; bundle hash check is the real verification)
  that bite every fresh session that doesn't read this first. Reading this
  skill before deploying saves 15 minutes of recovery the first time the
  site 502s.
---

# Deploy RUBLI to Production

Production: `https://rubli.xyz` (and `https://37.60.232.109`).
VPS: Hetzner, root@37.60.232.109, repo at `/opt/rubli`.

The deploy isn't complicated, but four gotchas have repeatedly cost
real time. Read this first.

---

## Gotchas (read before doing anything)

### 1. The VPS is on the `master` branch, local repo pushes to `main`

```
local: claude/<branch> → origin/main
prod:  origin/main → master (HEAD)
```

If you `git pull` on the VPS, it will pull `master` not `main` and may
miss recent commits. Always:

```bash
ssh root@37.60.232.109 "cd /opt/rubli && git fetch origin && git reset --hard origin/main"
```

### 2. `--no-deps frontend` silently breaks the docker network

When you run `docker compose up -d --build --no-deps frontend`, the
backend container may drop off the bridge network. Frontend's nginx
then can't resolve `backend` upstream and you get 502 Bad Gateway.

**Always do a full stack restart when prod is broken or after any
structural change.** When in doubt, don't use `--no-deps`.

The `scripts/redeploy.sh` script in the repo uses `--no-deps`. It works
most of the time but **fails after backend changes or after the
backend container has been removed**. Prefer the full restart pattern
below for a guaranteed-clean deploy.

### 3. Container name collisions on rebuild

After certain partial deploys, `docker compose up` errors with
"name already in use". `docker rm -f` by name **does not reliably catch
partially-created containers** — the new container gets a fresh ID that
doesn't match the name yet. Use `docker compose down` instead:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans
```

This is already embedded in the canonical deploy command below. If you
hit a collision mid-deploy, extract the container ID from the error
message and `docker rm -f <ID>`, then re-run `docker compose up -d`
(no `--build` needed since images were already built).

### 4. The `RUBLI_WRITE_KEY` env var is required by aria-cron

Skipping `--env-file .env.prod` produces:

```
required variable RUBLI_WRITE_KEY is missing a value: RUBLI_WRITE_KEY must be set in .env.prod
```

**Always pass `--env-file /opt/rubli/.env.prod`** to compose commands.

---

## The canonical deploy command

**Always deploy via the lock-guarded script — never raw `docker compose up`.**
Multiple agent sessions sometimes deploy at once; two concurrent `compose up`
runs collide on container names + the network and take the site down. The
script serializes deploys with an flock(1) lock, does an in-place `up` (no
down-window), and auto-recovers from a collision.

```bash
ssh root@37.60.232.109 "bash /opt/rubli/scripts/deploy-safe.sh"
```

This is the safe path for any deploy — code change, env change, schema
change, doesn't matter. ~3-5 minutes total, idempotent, and concurrency-safe
(a second deploy queues on the lock instead of racing). The script lives at
`scripts/deploy-safe.sh` in the repo, so it ships with the code; if the VPS
predates it, `git fetch origin && git reset --hard origin/main` first.

### Raw fallback (only if the script is missing)

```bash
ssh root@37.60.232.109 "cd /opt/rubli && \
  git fetch origin && \
  git reset --hard origin/main && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --remove-orphans"
```

Note: prefer in-place `up -d --build` over `down && up` — the `down` opens a
window where the site is fully offline, and if another deploy interleaves
during that window you get the container-name collision (Gotcha 3). Only fall
back to `down --remove-orphans` + `docker rm -f <names>` when recovering a
stuck/collided state by hand.

For a frontend-only fast iteration where you've already deployed
recently and the backend container is healthy, you *can* use:

```bash
ssh root@37.60.232.109 "cd /opt/rubli && \
  git fetch origin && \
  git reset --hard origin/main && \
  docker rm -f rubli-frontend && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps frontend"
```

But if it 502s, fall back to the full-stack command above.

---

## Verification — the bundle-hash check is the real test

After deploy, confirm three things:

```bash
# 1. HTTP 200 from edge
curl -sI https://rubli.xyz/ | head -1
# Expected: HTTP/1.1 200 OK

# 2. Vite content-hash actually changed
curl -s https://rubli.xyz/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
# Expected: a different hash than before — confirms BUILD_ID was bumped

# 3. Backend is healthy + DB reachable
curl -s https://rubli.xyz/api/v1/health | head -c 200
# Expected: {"status":"ok","db_connected":true,"contract_count":...}
```

If the bundle hash didn't change, the BUILD_ID wasn't bumped in
`frontend/src/lib/constants.ts` and users will keep seeing the old
cached bundle. **Always bump BUILD_ID in the same commit as the change**
(every redesign, every fix). Force-pushing the same hash means CDN/
browser cache wins and your fix isn't visible.

---

## Common deploy scenarios

### Scenario A: regular code change

```bash
# (assumes commit + push to origin/main already done from local)
ssh root@37.60.232.109 "cd /opt/rubli && git fetch origin && git reset --hard origin/main && \
  docker rm -f rubli-frontend rubli-backend rubli-caddy rubli-aria-cron rubli-backup-cron 2>/dev/null && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

# Verify
curl -sI https://rubli.xyz/
curl -s https://rubli.xyz/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

### Scenario B: prod is broken, need to revert

```bash
# Roll back to a known-good commit (substitute the SHA)
ssh root@37.60.232.109 "cd /opt/rubli && git fetch origin && git reset --hard <good-sha> && \
  docker rm -f rubli-frontend rubli-backend rubli-caddy rubli-aria-cron rubli-backup-cron 2>/dev/null && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

# Verify before doing anything else
curl -sI https://rubli.xyz/
```

If you need to push a fresh fix-forward instead of reverting, do it on
a feature branch, push to `origin/main`, then run scenario A.

### Scenario C: database needs to ship too

The deploy DB is `backend/RUBLI_DEPLOY.db` (~5 GB). Don't include in
git. Upload via SCP **before** the compose up:

```bash
# 1. Stop backend so the WAL settles
ssh root@37.60.232.109 "docker compose -f /opt/rubli/docker-compose.prod.yml --env-file /opt/rubli/.env.prod stop backend"

# 2. Upload (this is slow — minutes to tens of minutes)
scp -o ServerAliveInterval=30 -o ServerAliveCountMax=20 \
  backend/RUBLI_DEPLOY.db root@37.60.232.109:/opt/rubli/backend/RUBLI_DEPLOY_NEW.db

# 3. Atomic swap + bring everything back
ssh root@37.60.232.109 "cd /opt/rubli/backend && \
  mv RUBLI_DEPLOY.db RUBLI_DEPLOY.db.prev && \
  mv RUBLI_DEPLOY_NEW.db RUBLI_DEPLOY.db && \
  cd /opt/rubli && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
```

Memory rule: `rsync` is not available on Windows clients in this repo;
use `scp` with the keepalive flags above so the connection doesn't
drop on big files.

---

## When to run as a background command

The `up -d --build` step can take 5+ minutes on first build of a fresh
feature (recharts/echarts vendor bundles dominate). Use the Bash tool's
`run_in_background: true` flag so you can do other work while it builds.

Don't poll — you'll get a completion notification when it finishes.

---

## After-deploy checklist

After a successful deploy, before moving on:

1. `curl -sI https://rubli.xyz/` returns 200.
2. The bundle hash is *different* from what it was before deploy.
3. `https://rubli.xyz/api/v1/health` returns `{"status":"ok"}` with the
   expected `contract_count` (3M+).
4. If the change touched a specific surface, hit it directly: e.g. for
   atlas-C work, `curl -s "https://rubli.xyz/api/v1/atlas/cluster-vendors?lens=patterns&code=P5&limit=2"`.
5. (Optional) tell the user the new bundle hash + commit SHA so they can
   refresh and verify.

---

## What this skill is NOT for

- **Local dev**: use `npm run dev` from `frontend/` (port 3009) and
  `uvicorn api.main:app --port 8001` from `backend/` for that.
- **Schema migrations**: those have their own pipelines (`scripts/etl_pipeline.py`,
  `scripts/aria_pipeline.py`). Deploy after the schema is settled.
- **Risk model rescore**: scoring has its own `_score_v6_now.py` /
  `_score_v8_now.py` flow with WAL guards.

If the user asks to deploy AND change one of those, separate the steps:
do the data work locally, stage the result, then deploy.
