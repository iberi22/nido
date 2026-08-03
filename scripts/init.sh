#!/usr/bin/env bash
# NIDO init.sh — toolchain pinning + install + git hooks (idempotent)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> NIDO init"

# 1. Node toolchain (project pins in package.json)
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found" >&2; exit 1
fi
node -v; npm -v

# 2. Install deps
npm install

# 3. Git hooks (warning-only)
mkdir -p scripts/hooks .git/hooks
cp scripts/hooks/post-commit .git/hooks/post-commit 2>/dev/null || true
chmod +x .git/hooks/post-commit 2>/dev/null || true

echo "==> init done"
