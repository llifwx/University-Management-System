#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
now() { perl -MTime::HiRes=time -e 'printf "%.2f", time'; }
code() { curl -s -o /dev/null -w "%{http_code}" --max-time 5 localhost:8000/ready; }
counts() { docker compose exec -T postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/counts.sql' 2>&1; }
prep() { docker compose cp ops/backup/counts.sql postgres:/tmp/counts.sql > /dev/null 2>&1; }

status() {
  echo "--- /ready: $(code)"
  docker compose ps
  counts | tail -n 15
}

drop_db() {
  docker compose exec -T postgres sh -c 'dropdb -U $POSTGRES_USER --force $POSTGRES_DB'
  echo "Database deleted"
}

case "${1:-}" in
  status)        prep; status ;;
  drop)          read -r -p "Delete the database? Type YES: " A; [ "$A" = "YES" ] && drop_db ;;
  restore)       echo YES | ./ops/backup/restore.sh ;;
  stop-db)       docker compose stop postgres ;;
  start-db)      docker compose start postgres ;;
  stop-backend)  docker compose stop backend ;;
  start-backend) docker compose start backend ;;
  full)
    prep
    echo "== 1/6 Live system =="; status
    read -r -p "Open http://localhost:3000, then press Enter " _
    echo "== 2/6 Backup =="; ./ops/backup/smart_backup.sh
    counts > /tmp/demo_before.txt
    read -r -p "Press Enter to DELETE the database " _
    echo "== 3/6 Disaster =="; drop_db
    read -r -p "Refresh the browser (error expected), then press Enter " _
    echo "== 4/6 Status after disaster =="; status
    read -r -p "Press Enter to RESTORE " _
    echo "== 5/6 Restore =="
    t0=$(now); echo YES | ./ops/backup/restore.sh; t1=$(now)
    echo "Restore time: $(awk "BEGIN{printf \"%.1f\", $t1-$t0}") s"
    echo "== 6/6 Status after restore =="; status
    counts > /tmp/demo_after.txt
    diff -q /tmp/demo_before.txt /tmp/demo_after.txt > /dev/null && echo "COUNTS IDENTICAL" || echo "COUNTS DIFFER"
    ;;
  *) echo "Usage: ./ops/backup/demo.sh status | drop | restore | stop-db | start-db | stop-backend | start-backend | full" ;;
esac
