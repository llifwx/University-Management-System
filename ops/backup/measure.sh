#!/bin/bash
set -u
cd "$(git rev-parse --show-toplevel)"
D="$HOME/bis-backup/db"
OUT="$HOME/bis-backup/timings.csv"
N="${1:-3}"
REMOTE="${REMOTE:-}"
now() { perl -MTime::HiRes=time -e 'printf "%.2f", time'; }
diffs() { awk "BEGIN{printf \"%.1f\", $2-$1}"; }
counts() { docker compose exec -T postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/counts.sql'; }

read -r -p "This DESTROYS and restores the database $N times. Type YES: " A
[ "$A" = "YES" ] || { echo Cancelled; exit 1; }

docker compose cp ops/backup/counts.sql postgres:/tmp/counts.sql
[ -f "$OUT" ] || echo "run,backup_s,dump_kb,upload_s,download_s,restore_s,counts_match" > "$OUT"

for i in $(seq 1 "$N"); do
  echo "=== Run $i/$N ==="
  t0=$(now); ./ops/backup/smart_backup.sh > /dev/null || { echo "backup FAILED"; exit 1; }; t1=$(now)
  F=$(ls -t "$D"/*.dump | head -1)
  KB=$(( $(stat -f%z "$F") / 1024 ))
  UP=NA; DOWN=NA

  counts > "$HOME/bis-backup/c_before_$i.txt"
  docker compose exec -T postgres sh -c 'dropdb -U $POSTGRES_USER --force $POSTGRES_DB'

  r0=$(now)
  if ! echo YES | ./ops/backup/restore.sh "$F" > /dev/null; then echo "restore FAILED"; exit 1; fi
  r1=$(now)

  counts > "$HOME/bis-backup/c_after_$i.txt"
  M=NO; diff -q "$HOME/bis-backup/c_before_$i.txt" "$HOME/bis-backup/c_after_$i.txt" > /dev/null && M=YES
  echo "$i,$(diffs "$t0" "$t1"),$KB,$UP,$DOWN,$(diffs "$r0" "$r1"),$M" >> "$OUT"
done

echo
column -s, -t "$OUT"
awk -F, 'NR>1{ if(bmin==""||$2<bmin)bmin=$2; if($2>bmax)bmax=$2; if(rmin==""||$6<rmin)rmin=$6; if($6>rmax)rmax=$6 }
END{ print "backup  min/max:", bmin, bmax, "s"; print "restore min/max:", rmin, rmax, "s" }' "$OUT"
