#!/bin/bash
set -u
cd "$(git rev-parse --show-toplevel)"
mkdir -p "$HOME/bis-backup"
OUT="$HOME/bis-backup/bench.csv"
J=4
now() { perl -MTime::HiRes=time -e 'printf "%.2f", time'; }
dt() { awk "BEGIN{printf \"%.1f\", $2-$1}"; }
sql() { docker compose exec -T postgres sh -c "psql -q -U \$POSTGRES_USER -d $1" <<< "$2"; }
dbx() { docker compose exec -T postgres sh -c "$1" < /dev/null; }
run() { local a=$(now); dbx "$1" > /dev/null 2>&1; local b=$(now); dt "$a" "$b"; }

dbx 'dropdb -U $POSTGRES_USER --if-exists university_bench; createdb -U $POSTGRES_USER university_bench' > /dev/null
sql university_bench "CREATE TABLE bench(id bigserial PRIMARY KEY, a int, payload text); CREATE INDEX ON bench(a);"
echo "rows,dump_mb,dump_s,dump_nocompress_s,dump_parallel_s,restore_s,restore_parallel_s" > "$OUT"

TOTAL=0
for N in 10000 100000 500000 1000000; do
  sql university_bench "INSERT INTO bench(a,payload) SELECT (random()*1000)::int, md5(random()::text)||md5(random()::text) FROM generate_series(1,$((N-TOTAL)));"
  TOTAL=$N

  D1=$(run 'pg_dump -U $POSTGRES_USER -d university_bench -Fc -f /tmp/b.dump')
  MB=$(dbx 'du -m /tmp/b.dump | cut -f1')
  D2=$(run 'pg_dump -U $POSTGRES_USER -d university_bench -Fc -Z0 -f /tmp/b0.dump')
  D3=$(run "rm -rf /tmp/bd; pg_dump -U \$POSTGRES_USER -d university_bench -Fd -j $J -f /tmp/bd")

  dbx 'dropdb -U $POSTGRES_USER --if-exists university_scratch; createdb -U $POSTGRES_USER university_scratch' > /dev/null
  R1=$(run 'pg_restore -U $POSTGRES_USER -d university_scratch --no-owner /tmp/b.dump')
  dbx 'dropdb -U $POSTGRES_USER --if-exists university_scratch; createdb -U $POSTGRES_USER university_scratch' > /dev/null
  R2=$(run "pg_restore -j $J -U \$POSTGRES_USER -d university_scratch --no-owner /tmp/b.dump")

  echo "$N,$MB,$D1,$D2,$D3,$R1,$R2" >> "$OUT"
  echo "done $N rows"
done

dbx 'dropdb -U $POSTGRES_USER --if-exists university_bench; dropdb -U $POSTGRES_USER --if-exists university_scratch; rm -rf /tmp/b.dump /tmp/b0.dump /tmp/bd' > /dev/null
column -s, -t "$OUT"
