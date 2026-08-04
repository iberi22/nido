#!/usr/bin/env bash
# deploy-cloudflare.sh — Cloudflare Pages deployment script gated on full CI verify.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Starting deployment checks..."

# Run full CI gate
if ! bash scripts/verify.sh; then
  echo "==> [ERROR] Verification failed! Deployment aborted."
  exit 1
fi

echo "==> [SUCCESS] All checks passed. Proceeding with deployment to Cloudflare Pages..."

# Run wrangler Pages deploy
npx wrangler pages deploy dist --project-name nido
