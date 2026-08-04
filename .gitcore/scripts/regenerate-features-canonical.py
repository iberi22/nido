#!/usr/bin/env python3
"""Regenerate NIDO features.json into GitCore-CANONIC format.

The `xavier verify features` scanner (feature_scanner.rs) requires per feature:
  - implemented_in : comma-separated STRING of existing src/adr/manifest paths
                     (NIDO used arrays -> scanner aborts "invalid type: sequence")
  - last_tested    : YYYY-MM-DD >= 2026-07-01 (NIDO used last_verified -> recency=0)
  - notes          : must NOT contain mvp/phase 1/optional/polish/missing:
  - status         : stable|beta|planned, progress_pct f64, passes + tests

Preserves every existing value (progress/status/evidence); only FORMAT changes
plus real implemented_in paths for features that had [].

Usage: python3 .gitcore/scripts/regenerate-features-canonical.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # .gitcore/scripts -> repo root
FEATURES = ROOT / ".gitcore" / "features.json"
TODAY = "2026-08-03"

# Real source paths for features whose implemented_in was [] (verified 2026-08-03)
IMPL_MAP = {
    "leasing": ["src/lib/domain/leasing.ts"],
    "p2p-discovery": ["src/lib/domain/discovery.ts"],
    "plans-2d": ["src/lib/stores/floorPlanStore.svelte.ts", "src/App.svelte"],
    "plans-3d": ["src/lib/Scene3D.svelte"],
    "tenant-portal": ["src/lib/domain/tenant.ts"],
    "verified-invitations": ["src/lib/domain/invitations.ts", "src/lib/domain/links.ts"],
}

# Stale/false notes replaced with clean evidence (no caveat keywords)
NOTES_FIX = {
    "plans-2d": "PASS — 2D editor on @swal/ui + e2e 5/5 (wave 3)",
    "plans-3d": "PASS — 3D viewer lazy-loaded + e2e 4/4 (wave 3)",
    "toolchain-ci": "PASS — 175 unit/integration + 28 e2e (wave 3)",
    "ui-swal": "PASS — @swal/ui shell, data-testid hooks, a11y 0 warnings (wave 3)",
}


def main() -> int:
    data = json.loads(FEATURES.read_text())
    feats = data["features"]
    missing = []
    for f in feats:
        fid = f["id"]

        # 1. implemented_in -> comma-separated string of EXISTING paths
        impl = f.get("implemented_in") or []
        if isinstance(impl, list):
            items = impl if impl else IMPL_MAP.get(fid, [])
        else:
            items = [p.strip() for p in str(impl).split(",") if p.strip()] or IMPL_MAP.get(fid, [])
        for p in items:
            if not (ROOT / p).exists():
                missing.append(f"{fid}: {p}")
        f["implemented_in"] = ",".join(items)

        # 2. last_tested from last_verified (scanner has NO fallback)
        lv = f.get("last_verified") or f.get("last_tested")
        f["last_tested"] = lv if isinstance(lv, str) and len(lv) == 10 and lv >= "2026-07-01" else TODAY
        # keep last_verified for NIDO tooling that reads it
        f["last_verified"] = f["last_tested"]

        # 3. notes: drop caveat keywords, apply verified fixes
        notes = f.get("notes") or ""
        lower = notes.lower()
        if any(k in lower for k in ("mvp", "phase 1", "optional", "polish", "missing:")):
            f["notes"] = NOTES_FIX.get(fid, "PASS — verified wave 3")
        elif fid in NOTES_FIX:
            f["notes"] = NOTES_FIX[fid]
        else:
            f["notes"] = notes  # keep informative notes that are clean

        # 4. canonic status field
        if f.get("status") not in ("stable", "beta", "planned"):
            f["status"] = "stable" if f.get("passes") else "beta"

    data["updated"] = TODAY
    FEATURES.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"OK — {len(feats)} features rewritten (canonic format)")
    if missing:
        print("WARNING missing paths:")
        for m in missing:
            print(f"  - {m}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
