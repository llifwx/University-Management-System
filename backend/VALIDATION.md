# Executed validation — 2026-11-01

The backend was validated with a real isolated PostgreSQL 17 cluster, not SQLite.
Local tooling used Python 3.14.2; the Docker application was built and started with Python 3.12.

Commands below were executed from `backend/` with `DATABASE_URL` pointing to the disposable
`university_test` PostgreSQL database and a test-only `JWT_SECRET`. The pytest process also had
`TEST_DATABASE_URL` pointing to that database. `.venv/Scripts/` is the Windows equivalent of
`uv run` after dependency installation.

| Executed command | Observed result |
|---|---|
| `uv sync --directory backend` (from root, writable uv cache configured) | Dependencies resolved and installed; `uv.lock` written |
| `.venv\Scripts\alembic.exe revision --autogenerate -m "initial university schema"` | Created revision `b3d6518e6c20`; reviewed checks, keys, indexes and downgrade order |
| `.venv\Scripts\alembic.exe upgrade head` | Initial schema applied to clean PostgreSQL database |
| `.venv\Scripts\alembic.exe downgrade -1` | Initial schema successfully removed from disposable database |
| `.venv\Scripts\alembic.exe upgrade head` | Schema successfully reapplied |
| `.venv\Scripts\alembic.exe check` | No new upgrade operations detected |
| `.venv\Scripts\pytest.exe -q` | **56 passed in 54.57s**, no skipped tests |
| `.venv\Scripts\ruff.exe check .` | All checks passed |
| `.venv\Scripts\ruff.exe format --check .` | 74 files already formatted |
| `.venv\Scripts\python.exe -m compileall -q app scripts alembic` | Succeeded |
| `.venv\Scripts\python.exe -m scripts.seed` (twice) | Both succeeded; second preserved existing credentials and records |

Concurrency tests synchronize two independent sessions inside active PostgreSQL transactions,
assert different PostgreSQL backend PIDs, and verify exactly one successful enrollment for
overlapping requests, duplicate requests and the final seat. An additional test verifies that
an admin meeting change waits for enrollment and is then rejected. The other tests cover
authentication, refresh replay and revocation, authorization, timetable access, lifecycle,
database constraints, CRUD, filters, authoritative email updates and transaction rollback.

Docker commands were executed from the root:

```powershell
docker compose --env-file .env.validation -p university_validation config --quiet
docker compose --env-file .env.validation -p university_validation up --build -d
docker compose --env-file .env.validation -p university_validation up -d --wait
docker compose --env-file .env.validation -p university_validation exec -T backend .venv/bin/python -m scripts.seed
docker compose --env-file .env.validation -p university_validation exec -T backend .venv/bin/python -m scripts.seed
docker compose --env-file .env.validation -p university_validation ps
```

The built backend applied migrations before starting and both containers became **healthy**.
PostgreSQL uses host port **55433** because an existing local PostgreSQL server occupies 5432.
The backend is exposed at **http://localhost:8000**. Random local validation credentials are in
the ignored `.env.validation` file; no credentials were printed in the validation output.
The admin email is `admin@example.edu`. Demo users use the `SEED_PASSWORD` value from that file.

A live HTTP smoke check against the running container returned 200 for `/health`, `/ready`,
`/docs` and `/openapi.json`. OpenAPI exposed **40 operations**. Student login, profile,
weekly timetable and refresh succeeded; enrollment in the seeded conflicting class returned
409 `SCHEDULE_CONFLICT`; after logout, the access token returned 401.

The temporary native test cluster was stopped after validation. The Docker development stack
was left running for inspection. To stop it without removing data:

```powershell
docker compose --env-file .env.validation -p university_validation down
```

Environment notes: RTK execution was blocked, so validation used PowerShell directly.
Dependency downloads and Docker operations needed elevated tool execution. Those operations
were approved and completed. No required migration, test or container startup check remains
unexecuted. A frontend UI is intentionally outside this task's scope.
