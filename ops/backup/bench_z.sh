#!/bin/bash
set -u
cd "$(git rev-parse --show-toplevel)"
mkdir -p "$HOME/bis-backup"
OUT="$HOME/bis-backup/bench_z.csv"
now() { perl -MTime::HiRes=time -e 'printf "%.2f", time'; }
dt() { awk "BEGIN{printf \"%.1f\", $2-$1}"; }
sql() { docker compose exec -T postgres sh -c "psql -q -U \$POSTGRES_USER -d $1" <<< "$2"; }
dbx() { docker compose exec -T postgres sh -c "$1" < /dev/null; }

dbx 'dropdb -U $POSTGRES_USER --if-exists university_bench; createdb -U $POSTGRES_USER university_bench' > /dev/null 2>&1
sql university_bench "CREATE TABLE bench(id bigserial PRIMARY KEY, a int, payload text); CREATE INDEX ON bench(a); INSERT INTO bench(a,payload) SELECT (random()*1000)::int, md5(random()::text)||md5(random()::text) FROM generate_series(1,1000000);"
echo "level,dump_s,dump_mb,restore_s" > "$OUT"
for Z in 0 1 3 6 9; do
  a=$(now); dbx "pg_dump -U \$POSTGRES_USER -d university_bench -Fc -Z $Z -f /tmp/z.dump" > /dev/null; b=$(now)
  MB=$(dbx 'du -m /tmp/z.dump | cut -f1')
  dbx 'dropdb -U $POSTGRES_USER --if-exists university_scratch; createdb -U $POSTGRES_USER university_scratch' > /dev/null 2>&1
  c=$(now); dbx 'pg_restore -U $POSTGRES_USER -d university_scratch --no-owner /tmp/z.dump' > /dev/null 2>&1; d=$(now)
  echo "$Z,$(dt $a $b),$MB,$(dt $c $d)" >> "$OUT"
done
dbx 'dropdb -U $POSTGRES_USER --if-exists university_bench; dropdb -U $POSTGRES_USER --if-exists university_scratch; rm -f /tmp/z.dump' > /dev/null 2>&1
column -s, -t "$OUT"
