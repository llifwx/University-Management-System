#!/bin/sh
# Demo-server backup: DB dump + media volume -> ~/backups/bis-<date>.tgz, keeps 7 days.
# --stream also writes the archive to stdout; used by the restricted backup-only SSH key:
#   ssh azureuser@<host> > bis-backup.tgz
set -eu
cd "$(dirname "$0")/.."
dir=$HOME/backups
mkdir -p "$dir"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
docker compose -f compose.prod.yaml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$tmp/db.sql"
docker run --rm -v bis_media_data:/m:ro alpine tar cf - -C /m . > "$tmp/media.tar"
out=$dir/bis-$(date +%F-%H%M).tgz
tar czf "$out" -C "$tmp" db.sql media.tar
find "$dir" -name 'bis-*.tgz' -mtime +7 -delete
if [ "${1:-}" = "--stream" ]; then cat "$out"; else echo "Backup written: $out" >&2; fi
