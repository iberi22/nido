# Wave 2 Analysis — NIDO (floor-plan-designer) — 2026-08-04

## Summary
- Issues dispatched: 12 (#25-#36) · PRs delivered by Jules: **10** (#37-#46)
- **10/12 merged from Jules** + 1 implemented locally (mesh-integration #31) + 1 integration issue closed (#36)
- Final: **154/154 tests passing** (33 files), svelte-check 0 errors, build OK
- features.json: **22 stable / 1 partial (mesh) / 0 planned — 90.8% avg**

## Verdicts per issue
| Issue | Feature | PR | Verdict |
|-------|---------|----|---------|
| #25 | plans-2d | #42 | ✅ MERGED (with Hive Dark color fix) |
| #26 | plans-3d | #45 | ✅ MERGED (lazy-load verified: 3× import(), OrbitControls) |
| #27 | accounts-auth | #41 | ✅ MERGED (10/10 tests) |
| #28 | verified-invitations | #39 | ✅ MERGED (10/10) |
| #29 | leasing | #37 | ✅ MERGED (7/7) |
| #30 | tenant-portal | #43 | ✅ MERGED (5/5) |
| #31 | mesh-integration | — | ⚠️ NO PR FROM JULES → implemented locally (mesh.ts wrapper, 5/5) |
| #32 | p2p-discovery | #44 | ✅ MERGED (11/11) |
| #33 | trust-score | #38 | ✅ MERGED (7/7) |
| #34 | escrow-disputes | #40 | ✅ MERGED (8/8) |
| #35 | validator-port | #46 | ✅ MERGED (13/13 — norms.ts +34 LOC) |
| #36 | wave-close | — | ✅ Closed (integration done by harness) |

## UI / Design-system issue (user-reported)
- **Problem:** house-data.json + CanvasStage used the PROTOTYPE palette (#1e3a5f, #87ceeb,
  #4dd0e1) instead of the Hive Dark design system (@swal/ui tokens).
- **Fix:** house-data.json colors → #020617 bg / #06b6d4 accent / #f97316 highlight /
  #f1f5f9 text; CanvasStage CSS → var(--swal-*) tokens. Tests updated to match.
- **Lesson:** ANY PR that touches colors must verify against @swal/ui tokens —
  add to issue template: `grep -c "#1e3a5f\|#87ceeb" src/` = 0.

## Common patterns (Jules this wave)
1. ✅ **All 10 PRs had real source files** — G1 guard worked (no #22/#23 repeats).
2. ✅ **All test files ≥ 100 lines, 0 placeholders in critical paths** — G2 worked.
3. ⚠️ **#31 mesh-integration NOT delivered** — edge-mesh vendoring too heavy for one
   issue. Lesson: split core-vendoring into its own small issue, wrapper in another.
4. ⚠️ **Palette drift** — Jules copies existing colors; needs the token-check AC.
5. ⚠️ **package-lock noise** — every PR included lockfile churn; harness reverts it.

## Improvements for Wave 3
- Split edge-mesh into: (a) vendor edge-mesh core (small, mechanical), (b) mesh.ts
  wrapper + transport wiring.
- Add token-guard AC to UI issues: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0.
- Keep G1/G2 guards — they eliminated false positives entirely this wave.
- Draft PRs arrive ~30-60 min after dispatch; integration in dependency order works.

## Evidence
- Suite: `npx vitest run test/unit test/integration` → 154 passed (2026-08-04 19:28)
- Master: f7add90 (wave-2 close commit)
- feature %: see .gitcore/features.json (last_verified 2026-08-04)
