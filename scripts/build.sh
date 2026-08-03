#!/usr/bin/env bash
# NIDO build.sh — production build + type check + lint
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> NIDO build"
npm run check        # svelte-check + tsc
npx biome check src/ # lint/format gate
npm run build        # vite build
echo "==> build OK"
