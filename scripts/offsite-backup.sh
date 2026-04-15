#!/usr/bin/env bash
# offsite-backup.sh — Push latest RUBLI on-VPS backup to off-site storage
#
# Prerequisites on the VPS:
#   - Docker + the rubli-backup-cron container is running (creates daily snapshots)
#   - Configure TARGET_* variables below, or export them as env vars before running
#
# Add to crontab (runs daily at 03:00 UTC, one hour after the local backup completes):
#   0 3 * * * /opt/rubli/scripts/offsite-backup.sh >> /var/log/rubli-offsite-backup.log 2>&1
#
# Supported backends (set TARGET_BACKEND):
#   s3       — AWS S3 or S3-compatible (Cloudflare R2, Backblaze B2 S3 mode)
#   rsync    — rsync over SSH to a second server
#   rclone   — rclone (any cloud: Backblaze B2, Google Drive, Dropbox, etc.)
#
# ── CONFIGURATION ────────────────────────────────────────────────────────────
TARGET_BACKEND="${RUBLI_BACKUP_BACKEND:-s3}"          # s3 | rsync | rclone

# S3 / S3-compatible
S3_BUCKET="${RUBLI_S3_BUCKET:-}"                      # e.g. my-rubli-backups
S3_PREFIX="${RUBLI_S3_PREFIX:-rubli/db}"              # key prefix inside the bucket
S3_ENDPOINT="${RUBLI_S3_ENDPOINT:-}"                  # leave empty for AWS; set for R2/B2
# AWS credentials: set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in environment

# rsync / SSH
RSYNC_DEST="${RUBLI_RSYNC_DEST:-user@backup-server:/backups/rubli}"
RSYNC_KEY="${RUBLI_RSYNC_KEY:-/root/.ssh/id_rsa}"

# rclone
RCLONE_REMOTE="${RUBLI_RCLONE_REMOTE:-backblaze:rubli-backups}"  # remote:bucket

# Retention: how many off-site copies to keep
OFFSITE_RETAIN="${RUBLI_OFFSITE_RETAIN:-14}"          # keep 14 days off-site
# ── END CONFIGURATION ────────────────────────────────────────────────────────

set -euo pipefail
DATE=$(date -u +%Y%m%d_%H%M%S)
LOGPREFIX="[rubli-offsite-backup $DATE]"

echo "$LOGPREFIX Starting off-site backup (backend: $TARGET_BACKEND)"

# ── Step 1: Find the latest local backup from the Docker volume ───────────────
LATEST_LOCAL=$(docker run --rm \
  -v rubli_backups:/backups:ro \
  busybox sh -c "ls -t /backups/rubli_*.db 2>/dev/null | head -1" 2>/dev/null || echo "")

if [ -z "$LATEST_LOCAL" ]; then
  echo "$LOGPREFIX ERROR: No local backup found in rubli_backups volume. Has the backup container run yet?"
  exit 1
fi

FILENAME=$(basename "$LATEST_LOCAL")
echo "$LOGPREFIX Latest local backup: $FILENAME"

# Copy from Docker volume to a temp file on the host
TMP_FILE="/tmp/${FILENAME}"
docker run --rm \
  -v rubli_backups:/backups:ro \
  -v /tmp:/out \
  busybox cp "/backups/${FILENAME}" "/out/${FILENAME}"

FILESIZE=$(du -sh "$TMP_FILE" | cut -f1)
echo "$LOGPREFIX Extracted to $TMP_FILE ($FILESIZE)"

# ── Step 2: Upload to off-site backend ───────────────────────────────────────
case "$TARGET_BACKEND" in
  s3)
    if [ -z "$S3_BUCKET" ]; then
      echo "$LOGPREFIX ERROR: S3_BUCKET not set. Export RUBLI_S3_BUCKET or edit this script."
      rm -f "$TMP_FILE"; exit 1
    fi
    ENDPOINT_FLAG=""
    [ -n "$S3_ENDPOINT" ] && ENDPOINT_FLAG="--endpoint-url $S3_ENDPOINT"
    aws s3 cp "$TMP_FILE" "s3://${S3_BUCKET}/${S3_PREFIX}/${FILENAME}" $ENDPOINT_FLAG
    echo "$LOGPREFIX Uploaded to s3://${S3_BUCKET}/${S3_PREFIX}/${FILENAME}"

    # Rotate: list objects by date and delete oldest beyond retention
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" $ENDPOINT_FLAG \
      | awk '{print $4}' | grep '^rubli_' | sort \
      | head -n -"$OFFSITE_RETAIN" \
      | while read old; do
          echo "$LOGPREFIX Rotating old backup: $old"
          aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${old}" $ENDPOINT_FLAG
        done
    ;;

  rsync)
    ssh -i "$RSYNC_KEY" -o StrictHostKeyChecking=no \
      "$(echo "$RSYNC_DEST" | cut -d: -f1)" "mkdir -p $(echo "$RSYNC_DEST" | cut -d: -f2)"
    rsync -az --progress -e "ssh -i $RSYNC_KEY -o StrictHostKeyChecking=no" \
      "$TMP_FILE" "${RSYNC_DEST}/${FILENAME}"
    echo "$LOGPREFIX Synced to ${RSYNC_DEST}/${FILENAME}"

    # Rotate on remote
    ssh -i "$RSYNC_KEY" -o StrictHostKeyChecking=no \
      "$(echo "$RSYNC_DEST" | cut -d: -f1)" \
      "ls -t $(echo "$RSYNC_DEST" | cut -d: -f2)/rubli_*.db 2>/dev/null | tail -n +$((OFFSITE_RETAIN+1)) | xargs rm -f --"
    ;;

  rclone)
    rclone copy "$TMP_FILE" "${RCLONE_REMOTE}/" --progress
    echo "$LOGPREFIX Uploaded via rclone to ${RCLONE_REMOTE}/${FILENAME}"

    # Rotate
    rclone ls "${RCLONE_REMOTE}/" \
      | awk '{print $2}' | grep '^rubli_' | sort \
      | head -n -"$OFFSITE_RETAIN" \
      | while read old; do
          echo "$LOGPREFIX Rotating: $old"
          rclone delete "${RCLONE_REMOTE}/${old}"
        done
    ;;

  *)
    echo "$LOGPREFIX ERROR: Unknown TARGET_BACKEND '$TARGET_BACKEND'. Use: s3 | rsync | rclone"
    rm -f "$TMP_FILE"; exit 1
    ;;
esac

# ── Step 3: Cleanup ───────────────────────────────────────────────────────────
rm -f "$TMP_FILE"
echo "$LOGPREFIX Done. Off-site backup complete."
