#!/bin/sh
set -e
cd "$(git rev-parse --show-toplevel)"
D="$HOME/bis-backup/db"
mkdir -p "$D"
F="$D/university_$(date +%Y%m%d_%H%M).dump"
docker compose exec -T postgres sh -c 'pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -Fc' > "$F"
docker compose exec -T postgres pg_restore --list < "$F" > /dev/null
find "$D" -name '*.dump' -mtime +7 -delete
echo "OK $F"
