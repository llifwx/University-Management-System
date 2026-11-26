# Backup and Reliability Tooling

Scripts, verification queries, and benchmark results for backing up and restoring the PostgreSQL database in the local Docker Compose environment.

## Prerequisites

- **Docker Compose** (`docker compose`) with the `postgres` and `backend` services defined in `compose.yaml` running.
- **Perl** (`perl` with core `Time::HiRes`) for sub-second timing in `demo.sh`, `measure.sh`, `bench.sh`, and `bench_z.sh`.
- Standard POSIX/macOS utilities: `bash`, `sh`, `curl`, `awk`, `diff`, `column`, and `stat`.

## Scripts & Files

| File | Purpose |
| --- | --- |
| `smart_backup.sh` | Creates a compressed PostgreSQL custom-format dump (`pg_dump -Fc`) in `$HOME/bis-backup/db/`, verifies the dump archive with `pg_restore --list`, and deletes local `.dump` files older than 7 days. |
| `restore.sh` | Prompts for `YES` confirmation, creates the target database if missing, restores the specified dump (or latest `.dump` in `$HOME/bis-backup/db/`) with `pg_restore --clean --if-exists --no-owner`, restarts the `backend` service, waits for `localhost:8000/ready`, and prints table row counts via `counts.sql`. |
| `demo.sh` | Interactive demonstration helper for inspecting service/database status, simulating database loss (`drop`), stopping/starting `postgres` or `backend`, restoring, and running an end-to-end backup-drop-restore walkthrough (`full`) with before/after row-count comparison. |
| `measure.sh` | Destructive timing harness that backs up, drops, restores, and compares row counts across `N` iterations (default `3`), appending measurements to `$HOME/bis-backup/timings.csv`. |
| `bench.sh` | Synthetic scale benchmark (`10000`, `100000`, `500000`, `1000000` rows in a temporary `university_bench` database) comparing default `-Fc`, uncompressed `-Fc -Z0`, and parallel `-Fd -j 4` dumps as well as single-process vs `-j 4` `pg_restore`, writing results to `$HOME/bis-backup/bench.csv`. |
| `bench_z.sh` | Compression-level benchmark on a `1000000`-row synthetic table testing `pg_dump -Fc -Z` across levels `0`, `1`, `3`, `6`, and `9`, writing results to `$HOME/bis-backup/bench_z.csv`. |
| `counts.sql` | SQL query returning `table_name` and `row_count` for every base table in the `public` schema. |

## How to Run

Run scripts from anywhere inside the repository (each script changes directory to the repository root via `git rev-parse --show-toplevel`):

```bash
# 1. Create and verify a backup
./ops/backup/smart_backup.sh

# 2. Restore from the latest backup (or pass an explicit .dump path)
./ops/backup/restore.sh
./ops/backup/restore.sh "$HOME/bis-backup/db/university_YYYYMMDD_HHMM.dump"

# 3. Run interactive demo commands
./ops/backup/demo.sh status
./ops/backup/demo.sh full

# 4. Measure backup/restore timings (DESTRUCTIVE: drops and restores the database N times)
./ops/backup/measure.sh 3

# 5. Run synthetic benchmarks (creates and drops temporary university_bench / university_scratch DBs)
./ops/backup/bench.sh
./ops/backup/bench_z.sh
```

## Results

### Backup & Restore Timings (`results/timings.csv`)

| run | backup_s | dump_kb | upload_s | download_s | restore_s | counts_match |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.2 | 31 | NA | NA | 3.1 | YES |
| 2 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 3 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 1 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 2 | 0.2 | 31 | NA | NA | 3.1 | YES |
| 3 | 0.2 | 31 | NA | NA | 3.1 | YES |
| 1 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 2 | 0.2 | 31 | NA | NA | 3.1 | YES |
| 3 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 1 | 0.2 | 31 | NA | NA | 3.1 | YES |
| 2 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 3 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 1 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 2 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 3 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 1 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 2 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 3 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 1 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 2 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 3 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 1 | 0.2 | 31 | NA | NA | 3.0 | YES |
| 2 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 3 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 1 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 2 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 3 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 1 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 2 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 3 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 1 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 2 | 0.2 | 31 | NA | NA | 2.9 | YES |
| 3 | 0.2 | 31 | NA | NA | 2.9 | YES |

### Scale & Parallel Benchmark (`results/bench.csv`)

| rows | dump_mb | dump_s | dump_nocompress_s | dump_parallel_s | restore_s | restore_parallel_s |
| --- | --- | --- | --- | --- | --- | --- |
| 10000 | 1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 |
| 100000 | 5 | 0.3 | 0.1 | 0.3 | 0.1 | 0.2 |
| 500000 | 21 | 0.9 | 0.2 | 0.9 | 0.4 | 0.4 |
| 1000000 | 41 | 1.7 | 0.3 | 1.6 | 0.6 | 0.6 |

### Compression Level Benchmark (`results/bench_z.csv`)

| level | dump_s | dump_mb | restore_s |
| --- | --- | --- | --- |
| 0 | 0.2 | 78 | 0.6 |
| 1 | 0.6 | 42 | 0.6 |
| 3 | 1.0 | 42 | 0.6 |
| 6 | 1.7 | 41 | 0.6 |
| 9 | 2.0 | 41 | 0.6 |

## Limitations

- **Local Docker only**: All scripts target the local Docker Compose `postgres` and `backend` containers (`localhost:8000/ready`).
- **Manual backups**: Backups are triggered manually; there is no scheduled cron/timer or automated off-host upload (`upload_s` and `download_s` are `NA`).
- **Unencrypted dumps with sensitive data**: `.dump` archives produced by `pg_dump` are not encrypted and contain user password hashes from the database.
- **Synthetic single-table benchmark**: `bench.sh` and `bench_z.sh` test a single synthetic `bench(id, a, payload)` table with one index rather than the full multi-table production schema.
- **No parallel speedup observed**: Running `pg_dump -Fd -j 4` and `pg_restore -j 4` gave no meaningful speedup in this test (`1.6`s vs `1.7`s dump and `0.6`s vs `0.6`s restore at `1000000` rows), as single-table parallel jobs cannot split one table across workers.
- **Azure benchmark blocked**: Benchmarking on the remote Azure server could not be completed due to an SSH port 22 connection timeout.
