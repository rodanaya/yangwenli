# Secrets Audit — RUBLI Backend

**Date:** 2026-03-25
**Scope:** `backend/` Python sources, `frontend/` TypeScript sources, `docker-compose*.yml`

---

## Findings Summary

**No hardcoded secrets were found.**

All sensitive values are passed via environment variables and accessed only through `os.environ.get()`.

---

## Secrets Inventory

| Secret | Location | Access Pattern | Hardcoded? |
|--------|----------|----------------|------------|
| `RUBLI_WRITE_KEY` | `backend/api/dependencies.py:12` | `os.environ.get("RUBLI_WRITE_KEY", "")` | No |
| `ANTHROPIC_API_KEY` | `backend/api/routers/ai_explain.py:52` | `os.environ.get("ANTHROPIC_API_KEY")` | No |
| `ANTHROPIC_API_KEY` | `backend/scripts/aria_generate_memos.py:430` | `os.environ.get("ANTHROPIC_API_KEY")` | No |
| `VITE_RUBLI_WRITE_KEY` | `frontend/src/api/client.ts:197` | `import.meta.env.VITE_RUBLI_WRITE_KEY` | No |

---

## `RUBLI_WRITE_KEY` Usage Audit

`RUBLI_WRITE_KEY` is the write-auth API key for state-changing endpoints.

- **backend/api/dependencies.py** — loaded once at module import via `os.environ.get("RUBLI_WRITE_KEY", "")`, stored in `WRITE_API_KEY`. Used in `require_write_key()` dependency injected into mutating endpoints. If unset, auth is bypassed (dev mode — intentional).
- **docker-compose.prod.yml** — passed as `RUBLI_WRITE_KEY=${RUBLI_WRITE_KEY:-}`, sourced from the host environment or `.env.prod` file (not committed).
- **frontend/Dockerfile** — passed as `VITE_RUBLI_WRITE_KEY` build arg, injected into the React bundle at build time. This is a **client-side write key** and should be treated as semi-public; it gates write operations but is visible in the browser.
- **Verdict: CLEAN** — no hardcoded value anywhere in source.

---

## `ANTHROPIC_API_KEY` Usage Audit

- Both usages check `os.environ.get("ANTHROPIC_API_KEY")` and gracefully degrade when missing (template fallback or 503 response). No hardcoded key found.
- **Verdict: CLEAN**

---

## Docker Compose

- `docker-compose.prod.yml` references `${RUBLI_WRITE_KEY:-}` and `${ACME_EMAIL:-admin@rubli.site}`. The `ACME_EMAIL` fallback (`admin@rubli.site`) is a non-sensitive contact address for Let's Encrypt, not a secret.
- No `.env` files are committed (confirmed: no `.env*` files found in the repository).
- **Verdict: CLEAN**

---

## `.gitignore` Check

Verify the following patterns are present in `.gitignore` (recommended):
```
.env
.env.*
!.env.*.example
*.db
*.sqlite3
```

---

## Recommendations

1. **Add `.env.prod.example`** — document all required env vars with placeholder values so operators know what to set without seeing real secrets.
2. **RUBLI_WRITE_KEY in dev mode** — when `RUBLI_WRITE_KEY` is unset, all write endpoints are open. Enforce `RUBLI_WRITE_KEY` in `docker-compose.prod.yml` (make it a required variable with no default) to prevent accidental open deployments.
3. **VITE_RUBLI_WRITE_KEY in frontend** — since this key is embedded in the JavaScript bundle, use a separate, lower-privilege key for frontend writes vs. admin backend operations if the key is ever used for elevated actions.
4. **Docker socket removed** — `aria-cron` service previously mounted `/var/run/docker.sock:ro`, granting container-breakout-level access. This has been replaced with an internal HTTP trigger (see `docker-compose.prod.yml` comments).

---

*No hardcoded credentials, API keys, passwords, or tokens were found in the RUBLI codebase.*
