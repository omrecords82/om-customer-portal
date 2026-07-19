#!/usr/bin/env bash
# Build Customer Portal for /portal2 and rsync static assets to the deploy dir.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${PORTAL_DEPLOY_DIR:-/var/www/orthodoxmetrics/portal}"
BASE_PATH="${VITE_PORTAL_BASE_PATH:-/portal2}"

export PATH="${HOME}/.local/node-v24.18.0/bin:${PATH}"
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@11.10.0 --activate >/dev/null 2>&1 || true

cd "$ROOT"

if [[ -z "${NODE_AUTH_TOKEN:-}" ]] && command -v gh >/dev/null 2>&1; then
  export NODE_AUTH_TOKEN
  NODE_AUTH_TOKEN="$(gh auth token)"
fi

echo "Building with VITE_PORTAL_BASE_PATH=${BASE_PATH}"
VITE_PORTAL_BASE_PATH="${BASE_PATH}" pnpm build

if [[ ! -d "${ROOT}/dist" ]]; then
  echo "error: dist/ missing after build" >&2
  exit 1
fi

# Safety: deploy dir must only hold static portal output (or be empty).
if [[ -e "${DEPLOY_DIR}/package.json" ]] || [[ -d "${DEPLOY_DIR}/.git" ]] || [[ -d "${DEPLOY_DIR}/node_modules" ]]; then
  echo "error: ${DEPLOY_DIR} looks like an application source tree; refusing rsync --delete" >&2
  exit 1
fi

echo "Deploying dist/ → ${DEPLOY_DIR}/"
rsync -av --delete "${ROOT}/dist/" "${DEPLOY_DIR}/"
echo "Deploy complete."
