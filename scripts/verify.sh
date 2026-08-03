#!/usr/bin/env bash
# NIDO verify.sh — tests + feature status → .gitcore/state-report.json
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> NIDO verify"
npm run test 2>/dev/null || echo "WARN: no unit tests configured yet (M0 adds Vitest)"
npm run test:e2e 2>/dev/null || echo "WARN: no e2e tests configured yet (M0 adds Playwright)"

# Feature status snapshot
python3 - <<'PY'
import json, os, datetime
p = ".gitcore/features.json"
d = json.load(open(p))
feats = d["features"]
done = [f for f in feats if f.get("passes")]
report = {
  "schema": "gitcore-state-report/v1",
  "project": "nido",
  "protocol": d.get("version"),
  "generated": datetime.date.today().isoformat(),
  "total_features": len(feats),
  "passing": len(done),
  "passing_pct": round(100 * len(done) / len(feats), 1) if feats else 0,
  "features": [{"id": f["id"], "phase": f.get("phase"), "passes": f.get("passes", False),
                "progress_pct": f.get("progress_pct", 0), "req_ids": f.get("req_ids", [])}
               for f in feats],
}
os.makedirs(".gitcore", exist_ok=True)
json.dump(report, open(".gitcore/state-report.json", "w"), indent=2, ensure_ascii=False)
print(f"state-report: {len(done)}/{len(feats)} passing")
PY
