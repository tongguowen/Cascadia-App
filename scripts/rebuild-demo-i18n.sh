#!/usr/bin/env bash
# Rebuild & start Cascadia demo app with fresh i18n BUILD_SHA.
set -euo pipefail
cd "$(dirname "$0")/.."
BUILD_SHA="i18n-fix-$(date +%s)"
echo "BUILD_SHA=$BUILD_SHA"
docker rm -f cascadia-demo-app 2>/dev/null || true
docker compose -f docker-compose.demo-with-build.yml build --build-arg "BUILD_SHA=$BUILD_SHA" app
docker compose -f docker-compose.demo-with-build.yml run -d \
  --name cascadia-demo-app \
  --service-ports \
  --no-deps \
  --entrypoint sh \
  app \
  -c 'node scripts/app-tsx.mjs scripts/boot-migrate.ts && tsx scripts/seed-minimal.ts && npm run serve'
echo "Started. Open http://127.0.0.1:3000 and hard-refresh (Cmd+Shift+R)."
docker ps --filter name=cascadia-demo-app --format '{{.Names}}  {{.Status}}  {{.Ports}}'
