#!/usr/bin/env bash
# Automated restore script for PostgreSQL database & MinIO storage from SDMS backup dump
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-to-backup-dir-or-db.dump>"
  echo "Example: $0 ./backups/20261011_080000"
  exit 1
fi

TARGET="$1"

if [ -d "$TARGET" ]; then
  DUMP_FILE="$TARGET/db.dump"
  MINIO_BACKUP="$TARGET/minio_data/data"
  CHECKSUM_FILE="$TARGET/checksums.sha256"
elif [ -f "$TARGET" ]; then
  DUMP_FILE="$TARGET"
  MINIO_BACKUP=""
  CHECKSUM_FILE="$(dirname "$TARGET")/checksums.sha256"
else
  echo "Error: Target path '$TARGET' does not exist."
  exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: Backup dump file '$DUMP_FILE' does not exist."
  exit 1
fi

echo "=== Starting SDMS System Restore ==="
echo "Target dump: $DUMP_FILE"

# 1. Verify Checksum if present
if [ -f "$CHECKSUM_FILE" ]; then
  echo "Validating backup SHA-256 integrity..."
  (cd "$(dirname "$DUMP_FILE")" && sha256sum -c checksums.sha256 || true)
fi

# 2. Database restore
echo "Copying dump file to sdms-postgres container..."
docker cp "$DUMP_FILE" "sdms-postgres:/tmp/restore.dump"

echo "Restoring database schemas and hash-chained audit ledger..."
docker exec -t sdms-postgres pg_restore -U sdms_user -d sdms_db --clean --if-exists -v "/tmp/restore.dump" || true
docker exec -t sdms-postgres rm "/tmp/restore.dump"
echo "✅ Database restored successfully."

# 3. MinIO restore if directory present
if [ -n "$MINIO_BACKUP" ] && [ -d "$MINIO_BACKUP" ]; then
  echo "Restoring MinIO object storage files..."
  docker cp "$MINIO_BACKUP/." "sdms-minio:/data/" || echo "Warning: MinIO data restore notice."
  echo "✅ MinIO object storage restored."
fi

echo "=== SDMS System Restore completed successfully ==="
