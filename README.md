# University Management System

A BIS university project for course registration and recurring weekly timetables.
The monorepo contains a FastAPI API and a Next.js frontend (see [frontend/README.md](frontend/README.md)).
Python 3.12+, PostgreSQL 17, SQLAlchemy 2 async ORM/asyncpg, Alembic, Pydantic 2,
Argon2, JWT, pytest/httpx and Ruff are used. `backend/uv.lock` pins the resolved dependencies.

## Modular architecture

```text
backend/
  app/
    modules/
      auth/           # accounts, sessions, JWT rotation, staff administration
      students/       # student profiles and account provisioning
      courses/        # academic subject catalog
      semesters/      # academic terms and registration eligibility
      sections/       # capacity, teacher assignment, meetings and rosters
      registrations/  # enrollment lifecycle and transaction invariants
      schedules/      # weekly calendar read model
    common/           # shared repository, CRUD mechanics, transactions, schemas
    core/             # environment config, cryptography, errors
    db/               # declarative metadata and async session factory
    models/           # domain model registry for Alembic
    api/              # authentication dependencies and versioned router composition
    main.py
  alembic/versions/    # explicit initial schema; reversible migrations
  scripts/            # explicit bootstrap, idempotent development seed, startup
  tests/              # unit, HTTP, integrity, PostgreSQL concurrency tests
frontend/              # Next.js App Router + Feature-Sliced Design
compose.yaml
.env.example
```

Each domain owns its routes, schemas and service. Persistent domains also own their ORM models.
Routers handle HTTP input and call services; services control business rules and transactions,
using repository functions for database access. Shared CRUD supports small catalog modules
without duplicating their transaction mechanics. Authentication runs in a separate short session
and passes a validated identity to services, avoiding accidentally nested transactions.

## Quick start with Docker

1. Copy `.env.example` to `.env` at the repository root.
2. Set `POSTGRES_PASSWORD`, generate `JWT_SECRET`, and set your initial admin email/password.
   The sample JWT secret is deliberately rejected. Use at least 12 characters for passwords.
   Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
   For Compose's interpolated connection URL, use URL-safe database credentials (or percent-encode
   special characters in a manually configured URL).
3. Run:

```bash
docker compose up --build -d
docker compose exec backend .venv/bin/python -m scripts.bootstrap_admin
```

Frontend: <http://localhost:3000>, API: <http://localhost:8000>, Swagger: <http://localhost:8000/docs>,
OpenAPI: <http://localhost:8000/openapi.json>. `/health` checks process health;
`/ready` checks PostgreSQL connectivity and returns 503 on failure.

Compose persists data in `postgres_data`, waits for PostgreSQL's health check, and runs
`alembic upgrade head` before starting Uvicorn. A migration failure prevents API startup.
The backend runs as an unprivileged container user. The source mount permits editing code;
restart the backend after edits. The frontend starts after the backend is healthy, holds no data, and
never touches the database or its volume. Set `BACKEND_PORT`, `FRONTEND_PORT` and `POSTGRES_PORT` to change host ports.
Behind HTTPS, set `COOKIE_SECURE=true`.
Only run one migration runner at a time when scaling beyond the supplied single backend service.
If a local PostgreSQL instance already uses port 5432, set `POSTGRES_PORT=55433` and update
the local `DATABASE_URL` port accordingly; containers still communicate on PostgreSQL port 5432.

## Local setup

Install Python 3.12 or newer, [uv](https://docs.astral.sh/uv/), and PostgreSQL 17.
Create a PostgreSQL login and an owned application database using your PostgreSQL administrator:

```sql
CREATE USER university WITH PASSWORD 'your-generated-local-password';
CREATE DATABASE university OWNER university;
CREATE DATABASE university_test OWNER university;
```

Set `.env` at the root (both local settings paths and Compose use this file):

```dotenv
DATABASE_URL=postgresql+asyncpg://university:your-generated-local-password@localhost:5432/university
JWT_SECRET=<your-generated-secret>
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
ENVIRONMENT=development
BOOTSTRAP_ADMIN_EMAIL=admin@example.edu
BOOTSTRAP_ADMIN_PASSWORD=<your-private-bootstrap-password>
SEED_PASSWORD=<your-development-only-demo-password>
```

From the repository root:

```bash
cd backend
uv sync --frozen
uv run alembic upgrade head
uv run python -m scripts.bootstrap_admin
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On Windows the same commands work in PowerShell. `uv run` uses the backend virtual environment.
Environment variables override `.env`. No tables are automatically created at application startup.
Use a least-privileged database account and TLS/secret management for a deployed environment.

## Migrations

From `backend/`, with `DATABASE_URL` pointing to the intended PostgreSQL database:

```bash
uv run alembic upgrade head
uv run alembic current
uv run alembic downgrade -1
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "description"
uv run alembic check
```

Downgrading the initial revision drops application tables and their data. Review generated
revisions, including checks and composite foreign keys; autogenerate does not infer business rules.
The initial revision includes all nine tables, checks, foreign keys, unique keys and query indexes.

## Bootstrap and fictional demo data

There is no public signup endpoint. The explicit bootstrap command reads environment variables,
creates the admin if absent, and never resets an existing account or promotes a non-admin.
Remove the bootstrap password from the environment after provisioning. An authenticated admin
can create teachers and additional admins using `POST /api/v1/users`, or students using
`POST /api/v1/students`. Passwords are always hashed with Argon2.

```bash
# Local (from backend/)
uv run python -m scripts.seed
# Docker
docker compose exec backend .venv/bin/python -m scripts.seed
```

Seeding requires `ENVIRONMENT=development`, `SEED_PASSWORD`, and the bootstrap variables.
Fictional demo accounts are `teacher1@demo.example.edu` through `teacher3@demo.example.edu`
and `student1@demo.example.edu` through `student4@demo.example.edu`; their password is the
development-only value **you** supply in `SEED_PASSWORD`. The admin uses your separate bootstrap
password. There are no fixed passwords. Repeating seed preserves existing credentials and records.
It adds six subjects, two terms, twelve sections and weekly meetings. Student 1 starts in CS101;
IS201 in the same semester intentionally conflicts with it. Never run demo seeding in production.

## Authentication and permissions

`POST /api/v1/auth/login` accepts OAuth2 form data, with email in `username` and the raw
password in `password`. Swagger's **Authorize** button supports this flow. The response is:

```json
{"access_token":"...","refresh_token":"...","token_type":"bearer","expires_in":900}
```

Send `Authorization: Bearer <access_token>` on protected requests. Refresh by posting
`{"refresh_token":"..."}` to `/api/v1/auth/refresh`. Each refresh token can be used once;
rotation returns a replacement pair without extending the session's absolute lifetime.
Only SHA-256 digests of refresh tokens are stored. Refresh replay revokes the entire session
family and is logged as `refresh_replay`. Logout revokes the server-side session, immediately
invalidating its access and refresh tokens; it accepts either the access bearer token or
`{"refresh_token":"..."}`, so an expired access token is no obstacle. `/auth/logout-all` revokes
every session of the user. Other login sessions remain independent of a plain logout.
Access tokens expire in 15 minutes by default; session lifetime is seven days, both configurable.
JWT claims include issuer, audience, type, expiration, identity and session ID. Roles and active
status come from the database on every request. Staff accounts carry a profile (`full_name`, required on
creation; optional `title`, `department`, `office`, `phone`); sections and timetables expose the
teacher's name as `teacher_name`. Password changes via admin revoke all user sessions;
`POST /auth/password` (`current_password`, `new_password`) keeps the caller's session and revokes the rest.

Failed password checks are recorded in `login_failures`. Five failures for one email, or thirty from
one client IP, within 15 minutes answer `429 TOO_MANY_ATTEMPTS` until the window passes; a successful
sign-in clears that email's count. The client IP comes from `X-Forwarded-For` only when the direct peer
is listed in uvicorn's `FORWARDED_ALLOW_IPS`. Revoked and expired sessions and stale failures are
purged at startup and hourly. Sign-in events (`login_ok`, `login_failed`, `login_locked`, `logout`,
`password_changed`) are written as JSON log lines.

Students see their own private data, register and cancel their own enrollment. The request body
cannot override the authenticated student's ID. Teachers see assigned sections and their rosters;
section responses contain meeting schedules. They cannot inspect unrelated student timetables.
Admins manage academic records and use a separate administrative enrollment endpoint with the
same validation and locking rules. Student deletion deactivates the account and cancels registrations,
preserving history. Course/section/semester deletion is rejected when foreign-key references remain.

## API inventory

All routes below, except health routes, are prefixed with `/api/v1` and require authentication
unless marked public. JSON responses and detailed schemas are available in OpenAPI.

| Methods | Route | Access |
|---|---|---|
| POST | `/auth/login`, `/auth/refresh` | Public, valid credentials/token required |
| POST | `/auth/logout`, `/auth/logout-all` | Access bearer or refresh token |
| POST | `/auth/password` | Authenticated |
| GET | `/auth/me` | Authenticated |
| GET, POST | `/users` | Admin |
| PATCH | `/users/{user_id}` | Admin; active status, password, profile |
| GET | `/students/me` | Student |
| GET, POST | `/students` | Admin |
| GET | `/students/{student_id}` | Owner or admin |
| PATCH, DELETE | `/students/{student_id}` | Admin |
| GET | `/courses`, `/courses/{course_id}` | Authenticated |
| POST | `/courses` | Admin |
| PATCH, DELETE | `/courses/{course_id}` | Admin |
| GET | `/semesters`, `/semesters/{semester_id}` | Authenticated |
| POST | `/semesters` | Admin |
| PATCH, DELETE | `/semesters/{semester_id}` | Admin |
| GET | `/sections`, `/sections/{section_id}` | Authenticated |
| GET | `/sections/assigned` | Teacher/admin; current user's assignments |
| GET | `/sections/{section_id}/enrollments` | Assigned teacher or admin |
| POST | `/sections` | Admin |
| PATCH, DELETE | `/sections/{section_id}` | Admin |
| GET | `/registrations/me` | Student |
| POST | `/registrations` | Student |
| DELETE | `/registrations/{registration_id}` | Owner or admin; cancellation |
| GET | `/registrations` | Admin |
| POST | `/registrations/admin` | Admin; explicit student_id |
| PATCH | `/registrations/{registration_id}/status` | Admin; non-enrolled states |
| GET | `/schedules/me?semester_id=1` | Student |
| GET | `/schedules/students/{student_id}?semester_id=1` | Owner or admin |
| GET | `/health`, `/ready` (no prefix) | Public |

Lists use `offset=0&limit=20` (maximum 100) and return
`{"items": [...], "total": 42, "offset": 0, "limit": 20}`. Section filters are `semester_id`,
`course_id`, `teacher_id`, and `available_only=true`; results include `meetings`, `enrolled_count`
and `remaining_capacity`. Registration lists support `semester_id`, and the admin list also
supports `section_id`. PATCH updates only supplied fields; nullable fields may be explicitly cleared.
Meeting replacement replaces the whole meeting collection. Weekdays are Monday=0 to Sunday=6.
Times are campus-local, same-day and offset-free. Overnight meetings are rejected.

Example enrollment:

```http
POST /api/v1/registrations
Authorization: Bearer <access_token>
Content-Type: application/json

{"section_id":1,"semester_id":1}
```

```json
{"registration_id":1,"student_id":1,"section_id":1,"semester_id":1,
 "registered_at":"2026-11-01T10:00:00Z","status":"Enrolled"}
```

The schedule response contains `student_id`, `semester_id`, `timezone: "campus-local"`, and
an `entries` array, ordered by weekday and start time. Each entry has registration/section IDs,
course code/title, section number, teacher ID, weekday, start time and end time. Multi-meeting
sections produce multiple entries. Only enrolled registrations appear.

Errors use `{"error":{"code":"SCHEDULE_CONFLICT","message":"..."}}`.
Validation errors (422) also provide field locations and messages without echoing passwords.
The API uses 400 for invalid academic changes, 401 for invalid authentication, 403 for permission
failures, 404 for missing records, 409 for enrollment/integrity conflicts, and 503 for database failure.

## Database and enrollment lifecycle

Users have roles STUDENT, TEACHER or ADMIN. A student has one unique user account. **Users.email
is authoritative**: student responses expose it through the user relationship, avoiding duplicated
email state. Students retain `student_id` as their own primary key for foreign keys and routes.
What people see is the permanent `student_number`: the enrollment year's last two digits, `ID`, and six
random digits (`24ID583019`). Random rather than sequential so it reveals neither enrollment counts nor
order; a unique constraint backs it, and creation retries on a hit under the academic lock.
`POST /students` accepts an optional `enrollment_year` (default: the current year). Courses have sections within
semesters; sections optionally reference a teacher user and own multiple weekly meetings.
Registrations link students to sections and semesters. The composite foreign key
`(section_id, semester_id)` guarantees registration/section semester consistency in PostgreSQL.
Unique `(student_id, section_id, semester_id)` prevents duplicate historical rows. Other database
checks enforce capacities, intervals, weekday range, role/status values, credits and student years.
Foreign-key and schedule/seat query indexes are included.

Normal registration immediately becomes `Enrolled`. Failed validation rolls back, leaving no row.
`Pending`, `Rejected` and `Cancelled` are non-enrolled administrative states; none occupy seats
or block a timetable. Admins can move existing records into these states. Student cancellation
sets `Cancelled`. A later successful enrollment reactivates the existing row and refreshes
`registered_at`. Enrolling from any non-enrolled state must pass all validation again. Use the
normal/admin POST enrollment endpoints to enter `Enrolled`; a generic status PATCH cannot bypass
these rules. Registration eligibility means an active student account, active semester, matching
section semester and a valid meeting schedule. `is_active` explicitly controls registration;
dates describe the teaching period rather than an implicit enrollment window.

## Conflict detection and concurrency

The system uses PostgreSQL **READ COMMITTED**, with one fresh async session and explicit
transaction per service operation. A student is enrolled only after all requested weekly
meetings have been compared with all their existing enrolled meetings in that semester.
The predicate is `old.start < new.end and new.start < old.end` on the same weekday.
Touching endpoints, different weekdays and different semesters are allowed.

Lock order for enrollment/cancellation/status changes:

1. Shared transaction advisory lock on the academic mutation key.
2. Student row `FOR UPDATE` (exists even when no registration exists).
3. Section row `FOR UPDATE`.
4. Read active registrations/seat counts, validate, insert or reactivate, commit.

Student locks serialize conflicting requests for one student; section locks serialize capacity
checks across students. Locks remain until commit/rollback. READ COMMITTED ensures queries after
waiting see the latest committed registrations. All administrative academic writes take the same
advisory lock exclusively **before** other locks, preventing edits from racing with registrations.
This conservative design keeps independent enrollment requests concurrent while briefly serializing
infrequent admin mutations. It has no cross-request process-memory locks and works across workers.
Deadlocks (`40P01`) and serialization failures (`40001`) retry the complete transaction up to
three times with jitter; exhausted retries return a safe 409. Integrity errors roll back and return
a generic 409, never SQL details. Failures do not leave partial enrollment records.

Meeting changes are rejected while any enrolled student remains in that section. Capacity cannot
fall below enrolled count. Course/semester reassignment is rejected when any registration history
exists. These policies plus exclusive coordination preserve accepted timetables. Direct arbitrary
SQL writes must not bypass the service protocol: cross-row capacity/conflict rules are implemented
by the transactional service, while local and referential rules are enforced by DB constraints.

## Tests and lint

Use a **separate disposable PostgreSQL database** whose name ends in `_test`. Tests truncate its
application tables before each integration test; never point them at a useful database. Test
fixtures require an applied migration and deliberately do not call `create_all`. SQLite is unsupported.
Run tests serially; one database must not be shared by concurrent pytest workers.

PowerShell, from `backend/`:

```powershell
$env:TEST_DATABASE_URL='postgresql+asyncpg://university:your-password@localhost:5432/university_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
uv run alembic upgrade head
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

On Bash use `export TEST_DATABASE_URL=...` and `export DATABASE_URL="$TEST_DATABASE_URL"`.
`JWT_SECRET` must also be configured for migrations. Tests have an explicit test-only default
secret when the environment does not supply one. Without `TEST_DATABASE_URL`, integration tests
are reported as skipped; unit tests still execute. Connection/migration failures are real test failures.
Concurrency tests use independent PostgreSQL connections, synchronize inside real transactions,
and assert distinct PostgreSQL backend PIDs. They cover simultaneous overlapping requests, the final
seat, duplicate registration and an admin meeting edit racing enrollment.

See [the executed validation report](backend/VALIDATION.md) for actual commands, test results,
migration round-trip verification and Docker smoke checks from this implementation session.

## Frontend

`frontend/` is a Next.js App Router application structured with Feature-Sliced Design. Browsers talk only to
Next.js, which keeps tokens in HttpOnly cookies and forwards API calls with the bearer token, so `CORS_ORIGINS` is not
needed for it. No frontend source or build pipeline is embedded in FastAPI. JSON request logs include request ID, method,
path, status and duration; credentials and token bodies are not logged. Architecture, authentication, testing and known
limitations are in [frontend/README.md](frontend/README.md).

```bash
docker compose up --build -d                                   # postgres, backend, frontend
docker compose exec backend .venv/bin/python -m scripts.bootstrap_admin
docker compose exec backend .venv/bin/python -m scripts.seed   # optional demo data, development only
cd frontend && npm install && npm run dev                      # or run the frontend outside Docker
```
