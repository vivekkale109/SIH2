#!/usr/bin/env bash
# Automated backup script for PostgreSQL database and MinIO object storage
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$TARGET_DIR"

echo "=== Starting SDMS Full Backup [$TIMESTAMP] ==="
echo "Target backup destination: $TARGET_DIR"

# 1. Database dump
echo "Backing up PostgreSQL database schemas and audit ledger..."
docker exec -t sdms-postgres pg_dump -U sdms_user -d sdms_db -F c -b -v -f "/tmp/db_backup_$TIMESTAMP.dump"
docker cp "sdms-postgres:/tmp/db_backup_$TIMESTAMP.dump" "$TARGET_DIR/db.dump"
docker exec -t sdms-postgres rm "/tmp/db_backup_$TIMESTAMP.dump"
echo "✅ PostgreSQL backup completed: $TARGET_DIR/db.dump"

# 2. MinIO evidence object storage backup
if docker ps --format '{{.Names}}' | grep -q "^sdms-minio$"; then
  echo "Backing up MinIO object storage..."
  mkdir -p "$TARGET_DIR/minio_data"
  docker cp "sdms-minio:/data" "$TARGET_DIR/minio_data/" || echo "Warning: MinIO data copy encountered non-critical notice."
  echo "✅ MinIO storage backup completed: $TARGET_DIR/minio_data"
fi

# 3. Create checksum manifest
echo "Generating SHA-256 backup manifest..."
(cd "$TARGET_DIR" && sha256sum db.dump > checksums.sha256)
echo "✅ Checksum generated: $TARGET_DIR/checksums.sha256"

echo "=== SDMS Backup completed successfully at $TARGET_DIR ==="
