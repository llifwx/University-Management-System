# University Management System: frontend

Next.js App Router, strict TypeScript and Feature-Sliced Design, on top of the existing FastAPI backend.
There is no frontend database and no mock data: every screen reads and writes through the real API.

## Why two `app` folders and two `pages` folders

| Folder | Owner | Contents |
|---|---|---|
| `app/` | Next.js | Routes only: small `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, route handlers |
| `src/app/` | FSD app layer | Global providers (TanStack Query, theme, toasts) |
| `src/pages/` | FSD pages layer | Page components that routes render |
| `pages/` | Next.js guard | Only a README. Without it, Next.js would treat `src/pages/` as Pages Router routes |

Next.js picks root `app/` and `pages/` over their `src/` versions, so the FSD layers are never routed.

## Feature-Sliced Design

Imports point down only: `app -> pages -> widgets -> features -> entities -> shared`.
Slices on one layer never import each other, and other slices use a slice's public `index.ts`.
`tests/fsd-boundaries.test.ts` enforces this on every `npm test`.

| Layer | Responsibility | Slices |
|---|---|---|
| `pages` | Compose a screen | `login`, `student-dashboard`, `teacher-dashboard`, `admin-dashboard`, `course-catalog`, `course-details`, `my-courses`, `my-schedule`, `profile`, `student-management`, `course-management`, `section-management`, `semester-management`, `registrations-management`, `staff-management`, `forbidden` |
| `widgets` | Large reusable sections | `app-shell`, `weekly-timetable`, `course-catalog`, `course-sections`, `enrollment-table` |
| `features` | User actions and their mutations | `auth-by-email`, `logout`, `select-semester`, `register-for-section`, `cancel-registration`, `manage-course`, `manage-section`, `manage-semester`, `manage-student`, `manage-staff`, `manage-registration` |
| `entities` | Domain types, read queries, query keys, display parts | `user`, `student`, `course`, `course-section`, `semester`, `registration`, `schedule` |
| `shared` | Domain-free code | `api` (transport, BFF, generated types), `lib`, `ui` |

`entities/user/server.ts` is a second, server-only public API, kept apart so client bundles cannot pull it in.

## Authentication

FastAPI returns tokens as JSON and has no cookie support, so Next.js acts as a thin backend-for-frontend:

```text
Browser --HttpOnly cookies--> Next.js route handlers --Authorization: Bearer--> FastAPI
```

- `POST /api/auth/login` exchanges credentials, stores both tokens in HttpOnly `SameSite=Lax` cookies and returns only the user.
- `/api/proxy/*` forwards API calls with the bearer token. It refuses `auth/*` other than `auth/me`, so raw tokens cannot leak to the browser.
- `POST /api/auth/logout` revokes the session in FastAPI, then clears the cookies.
- `GET /api/auth/refresh?next=` renews a session for full page loads, because Server Components cannot set cookies.

**Refresh rotation.** FastAPI refresh tokens are single-use, and replaying one revokes the whole session. All renewals
therefore go through `refreshSession` (`src/shared/api/server/session.ts`), which shares one rotation between parallel
requests and answers late requests carrying the old cookie for 30 seconds. This state is per process: running several
Next.js instances needs a shared store first.

**CSRF.** State-changing BFF routes require `Sec-Fetch-Site: same-origin`, or a matching `Origin` where that header is absent.

**Authorization.** `proxy.ts` only routes optimistically. `requireUser` verifies against `/auth/me` in server layouts and
shows a 403 screen for the wrong role. FastAPI is the authority on all data. Private pages render dynamically, and proxied
responses are `Cache-Control: private, no-store`. Each login is a full page load, so no query cache crosses users.

## API integration

The browser calls only same-origin `/api/proxy/*`, so no CORS setup or public API URL is needed.
Types in `src/shared/api/schema.d.ts` are generated from FastAPI's OpenAPI schema; regenerate with `npm run gen:api` while
the backend runs on port 8000. Backend data lives in TanStack Query. Zustand holds only the sidebar state.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `API_INTERNAL_URL` | `http://localhost:8000/api/v1` | Server-side FastAPI URL. Never sent to the browser |
| `COOKIE_SECURE` | `true` in production builds | Secure flag on session cookies. Set `false` only for a production build on plain local HTTP |

There are no `NEXT_PUBLIC_*` variables. Copy `.env.example` to `.env.local` to override locally.

## Local development

Start the backend first (see the root README), then:

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc` in strict mode |
| `npm test` | Vitest and React Testing Library, with mocked network |
| `npm run test:e2e` | Playwright against an already running stack |

For `npm run start` over plain HTTP outside `localhost`, set `COOKIE_SECURE=false`.
The Docker image builds with `STANDALONE_BUILD=true` and runs the smaller standalone server instead of `next start`.

## End-to-end tests

These run against the real FastAPI and PostgreSQL. The script uses its own Compose project, volume and ports
(3001, 8001, 55434), and **destroys that project's database on each run**. Other stacks are not touched.

```bash
cp .env.e2e.example .env.e2e     # at the repository root; fill in random values
npx playwright install chromium  # from frontend/, first time only
bash frontend/e2e/run.sh         # from the repository root
docker compose --env-file .env.e2e -p university_e2e down -v   # when finished
```

Specs need a fresh database, because they use fixed weekly time slots that would conflict with an earlier run's registrations.

## Supported features

- **Student:** dashboard, catalog with search and filters, section details, registration, My courses with cancellation, weekly timetable, profile.
- **Teacher:** assigned sections, teaching schedule, section rosters, profile.
- **Admin:** totals and charts; student, course, section (multiple meetings), semester and staff management; registrations with filters, status changes and enrollment.

## Known limitations

These come from the current API, and the UI does not simulate around them:

- **No server-side search.** Courses and students have no search parameter, and registrations cannot be filtered by status or student. Those filters load the complete list (100 rows per request) and run in the browser, which suits thousands of rows rather than millions.
- **No instructor names.** Accounts have no name, and `/users` is admin-only, so students see `Instructor #id`. Admins see the teacher's email.
- **No schedule conflict details.** `SCHEDULE_CONFLICT` does not say which class conflicts, so the message does not either.
- **No current semester concept.** Several semesters can be active. The UI picks the active term containing today, then the next active term, then the latest term.
- **No self-service profile or password change.** These exist only for admins. Student passwords cannot be changed through the API at all.
- **Account status on students.** `StudentOut` has no active flag, so the admin table joins it from `/users`.
- **Meeting edits.** The backend refuses them while students are enrolled, and the form explains this.
