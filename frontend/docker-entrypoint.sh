#!/bin/sh
# Runtime config injection — runs at nginx container startup.
#
# Injects window.__RUBLI_CONFIG__ into index.html so the frontend can read
# runtime secrets (e.g. RUBLI_WRITE_KEY) without baking them into the JS
# bundle at build time.  Build-time Vite env vars are visible to anyone with
# browser devtools; this approach keeps the key server-side until the page load.
#
# The placeholder comment <!-- __RUBLI_RUNTIME_CONFIG__ --> must exist in
# public/index.html (or be produced by the Vite build via index.html).

INDEX=/usr/share/nginx/html/index.html

# Escape the write key for safe JSON embedding (strip quotes, newlines)
WRITE_KEY=$(printf '%s' "${RUBLI_WRITE_KEY:-}" | tr -d '"' | tr -d "'" | tr -d '\n' | tr -d '|' | tr -d '&' | tr -d '\\')

# Build the inline config script
CONFIG_SCRIPT="<script>window.__RUBLI_CONFIG__ = { writeKey: \"${WRITE_KEY}\" };</script>"

# Replace the placeholder in index.html (in-place, using tmp file for safety)
if grep -q '<!-- __RUBLI_RUNTIME_CONFIG__ -->' "${INDEX}"; then
  sed "s|<!-- __RUBLI_RUNTIME_CONFIG__ -->|${CONFIG_SCRIPT}|" "${INDEX}" > "${INDEX}.tmp"
  mv "${INDEX}.tmp" "${INDEX}"
else
  echo "[docker-entrypoint] WARNING: placeholder '<!-- __RUBLI_RUNTIME_CONFIG__ -->' not found in index.html — write key NOT injected"
fi

echo "[docker-entrypoint] Runtime config injected. RUBLI_WRITE_KEY set: $([ -n "${RUBLI_WRITE_KEY}" ] && echo yes || echo no)"

exec "$@"
