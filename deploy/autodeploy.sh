#!/bin/sh
# Run by the bis-autodeploy systemd timer on the demo VM: deploys origin/deploy (last green main commit).
set -eu
cd "$(dirname "$0")/.."
git fetch -q origin deploy
target=$(git rev-parse origin/deploy)
marker=.git/deployed-sha
[ "$target" = "$(cat "$marker" 2>/dev/null)" ] && exit 0
echo "Deploying $target"
# ponytail: hard reset is safe only because nobody edits tracked files on the server; .env is untracked.
git reset -q --hard "$target"
docker compose -f compose.prod.yaml up -d --build --remove-orphans
docker image prune -f >/dev/null
echo "$target" > "$marker"
echo "Deployed $target"
