#!/usr/bin/env bash
# Automated backup script for PostgreSQL and MinIO evidence records
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$TARGET_DIR"

echo "=== Starting SDMS Backup [$TIMESTAMP] ==="

# Database dump
echo "Backing up PostgreSQL database..."
docker exec -t sdms-postgres pg_dump -U sdms_user -d sdms_db -F c -b -v -f "/tmp/db_backup_$TIMESTAMP.dump"
docker cp "sdms-postgres:/tmp/db_backup_$TIMESTAMP.dump" "$TARGET_DIR/db.dump"
docker exec -t sdms-postgres rm "/tmp/db_backup_$TIMESTAMP.dump"

echo "PostgreSQL backup completed: $TARGET_DIR/db.dump"
echo "=== Backup completed successfully ==="
