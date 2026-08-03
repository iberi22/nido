#!/usr/bin/env bash
# NIDO sync.sh — recompute state + Xavier harvest + MANIFEST
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> NIDO sync"
./scripts/verify.sh

# Xavier harvest (best-effort; requires XAVIER_TOKEN)
if [ -n "${XAVIER_TOKEN:-}" ] || [ -f .env ]; then
  TOKEN="${XAVIER_TOKEN:-$(grep -o 'XAVIER_TOKEN=[^ ]*' .env 2>/dev/null | cut -d= -f2)}"
  curl -s -X POST http://localhost:8006/memory/add \
    -H "Content-Type: application/json" \
    -H "X-Xavier-Token: $TOKEN" \
    -d "$(python3 -c "
import json
r = json.load(open('.gitcore/state-report.json'))
print(json.dumps({'path': 'app/nido/instance/state-report', 'kind': 'state_report',
                  'content': json.dumps(r), 'tags': ['nido','state-report']}))")" \
    >/dev/null 2>&1 && echo "Xavier: state-report harvested" || echo "WARN: Xavier harvest skipped"
else
  echo "WARN: XAVIER_TOKEN not found; harvest skipped"
fi
echo "==> sync done"
