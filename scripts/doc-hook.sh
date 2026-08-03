#!/usr/bin/env bash
# NIDO doc-hook.sh — post-commit drift detection (WARNING-only, never blocks)
set -uo pipefail
cd "$(dirname "$0")/.."

LOG=".gitcore/srs/drift-log.json"
mkdir -p "$(dirname "$LOG")"

DRIFT=0
MESSAGES=()

# 1. SRC.md exists
[ -f SRC.md ] || { DRIFT=1; MESSAGES+=("SRC.md missing"); }

# 2. SRS files exist
for f in docs/SRS/index.md docs/SRS/REQUIREMENTS.md docs/SRS/ARCHITECTURE.md; do
  [ -f "$f" ] || { DRIFT=1; MESSAGES+=("$f missing"); }
done

# 3. features.json parseable
python3 -c "import json; json.load(open('.gitcore/features.json'))" 2>/dev/null \
  || { DRIFT=1; MESSAGES+=("features.json invalid JSON"); }

# 4. .git-core-protocol-version present
[ -f .git-core-protocol-version ] || { DRIFT=1; MESSAGES+=(".git-core-protocol-version missing"); }

if [ $DRIFT -eq 1 ]; then
  python3 - "$LOG" "${MESSAGES[@]}" <<'PY'
import json, sys, datetime
log, msgs = sys.argv[1], sys.argv[2:]
try:
    d = json.load(open(log))
except Exception:
    d = {"entries": []}
d["entries"].append({"date": datetime.date.today().isoformat(),
                     "messages": msgs})
json.dump(d, open(log, "w"), indent=2)
print("WARN: documentation drift detected → .gitcore/srs/drift-log.json")
for m in msgs: print("  -", m)
PY
fi
exit 0  # NEVER block the commit
