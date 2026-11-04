#!/usr/bin/env bash
# Runs Playwright against the real stack on a throwaway database, then leaves it up for inspection.
# Uses its own Compose project, volume and ports, so a development stack is never touched.
# Needs ../.env.e2e: copy ../.env.e2e.example and fill in the generated values.
set -euo pipefail
cd "$(dirname "$0")/../.."

compose() { docker compose --env-file .env.e2e -p university_e2e "$@"; }

compose down -v
compose up --build -d --wait
compose exec -T backend .venv/bin/python -m scripts.seed

set -a
. ./.env.e2e
set +a

cd frontend
E2E_BASE_URL="http://localhost:${FRONTEND_PORT:-3001}" \
  E2E_ADMIN_EMAIL="$BOOTSTRAP_ADMIN_EMAIL" \
  E2E_ADMIN_PASSWORD="$BOOTSTRAP_ADMIN_PASSWORD" \
  E2E_SEED_PASSWORD="$SEED_PASSWORD" \
  npx playwright test "$@"
