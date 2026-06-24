#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env.prod ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.prod
  set +a
fi

export VCS_REF="${VCS_REF:-$(git rev-parse --short HEAD)}"
export BUILD_DATE="${BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

docker compose -f docker-compose.prod.yml config >/dev/null
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans

for _ in $(seq 1 20); do
  if docker compose -f docker-compose.prod.yml exec -T web wget -q -O - http://127.0.0.1/healthz | grep -q '^ok$'; then
    echo "prod healthy on https://${SERVER_NAME:-atlas.neotel.com.br}"
    exit 0
  fi
  sleep 2
done

echo "prod healthcheck failed for web container" >&2
exit 1
