#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
D="$HOME/bis-backup/db"
F="${1:-$(ls -t "$D"/*.dump | head -1)}"
echo "Restoring from: $F"
read -r -p "This OVERWRITES the database. Type YES: " A
[ "$A" = "YES" ] || { echo "Cancelled"; exit 1; }

echo "[1/5] create database"
docker compose exec -T postgres sh -c 'createdb -U $POSTGRES_USER $POSTGRES_DB' < /dev/null 2>/dev/null || true
echo "[2/5] copy dump"
docker compose cp "$F" postgres:/tmp/restore.dump
echo "[3/5] pg_restore"
docker compose exec -T postgres sh -c 'pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists --no-owner /tmp/restore.dump' < /dev/null
echo "[4/5] restart backend"
docker compose restart backend
echo "[5/5] wait for /ready"
for i in $(seq 1 30); do
  if curl -fs --max-time 3 localhost:8000/ready > /dev/null; then echo "READY after ~$((i*2))s"; break; fi
  sleep 2
  [ "$i" = 30 ] && echo "WARNING: not ready after 60s"
done

echo "Row counts:"
docker compose cp ops/backup/counts.sql postgres:/tmp/counts.sql
docker compose exec -T postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/counts.sql' < /dev/null
echo "DONE"
