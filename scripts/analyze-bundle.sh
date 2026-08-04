#!/usr/bin/env bash
# NIDO analyze-bundle.sh — runs build and prints top 10 chunk sizes from dist/assets
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building NIDO for production..."
npm run build

echo ""
echo "==> Top 10 chunk sizes from dist/assets (raw sizes):"
ls -lhS dist/assets | head -n 11
