# Wave 1 Analysis — NIDO (floor-plan-designer) — 2026-08-03

## Summary
- Issues: 10 (#4-#13) · Sessions: 10 (7 COMPLETED, 3 FAILED)
- PRs opened: 7 (#14, #15, #16, #17, #18, #19, #20, #21, #22) — 9 total incl. false positives
- **Merged: 6** (#17 data-model, #18 norms, #19 maintenance/analytics, #21 inventory/costs, #14 utilities/taxes, #20 export+PWA)
- **Closed no-merge: 3** (#15 0-files research, #16 blocked @swal/ui, #22 false-positive 3D)
- Features: 10 passing / 2 partial / 11 planned (reconciled in features.json)
- Tests: **36 real tests passing** (6 domain suites), 48 skeleton failures remain (features not delivered this wave)

## Per-issue verdicts

| Issue | Title | PR | Delivered? | Verdict |
|-------|-------|----|-----------|---------|
| #4 | GitCore compliance + CI toolchain | #15 (0 files) | ⚠️ partial | ⚠️ research-only PR closed; infra actually delivered via #17/#19 |
| #5 | UI shell @swal/ui | #16 (blocked) | ❌ | ❌ FAILED — @swal/ui not on npm registry |
| #6 | Canonical data model | #17 (+1560) | ✅ | ✅ merged, tests pass |
| #7 | 2D plan editor | — | ❌ | ❌ FAILED — @swal/ui not on npm |
| #8 | 3D viewer | #22 (0 code) | ❌ | ❌ FAILED + FALSE POSITIVE (commit msg claims work, only package files committed) |
| #9 | Norms validation | #18 (+478) | ✅ | ✅ merged, 7 real tests pass |
| #10 | Inventory + costs | #21 (+721) | ✅ | ✅ merged, tests pass |
| #11 | Utilities + taxes | #14 (+5 files) | ⚠️ partial | ⚠️ merged BUT test files delivered EMPTY (0 lines) |
| #12 | Maintenance + analytics | #19 (+491) | ✅ | ✅ merged, tests pass |
| #13 | Export DXF/PDF + PWA | #20 (+7743) | ✅ | ✅ merged (largest PR), tests pass |

## Root-cause patterns (critical — fixes for Wave 2)

### P1. @swal/ui NOT published on npm — 3 issues failed (#5, #7, #8)
**Evidence:** PR #16 body: "Attempted to locate and install @swal/ui... those dependencies and directories are completely missing from the system and registry." Session 2D created a LOCAL COPY `src/lib/swal-ui/` (fork of the core — forbidden).
**Root cause:** Issue bodies said `npm install @swal/ui` but @swal/ui is monorepo-local (`~/proyectosSWAL/swal-ui`), NOT on npm. The Jules sandbox only has the cloned repo.
**Fix for Wave 2:**
- [ ] Vendor `@swal/ui` INTO the repo (e.g. `src/lib/vendor/swal-ui/` or `packages/swal-ui/` local copy) OR add it as `"@swal/ui": "file:../swal-ui"` dependency + commit a copy so the sandbox can resolve it
- [ ] Issue bodies must state explicitly: "@swal/ui is vendored at <path> — import from there, DO NOT create your own copy"
- [ ] Add AC: `grep -c "swal-ui" package.json` >= 1 AND no `src/lib/swal-ui/` dir

### P2. False-positive PRs (message claims work, code not committed) — #22
**Evidence:** Session 3D (FAILED) pushed commit 52fcbad with message "feat: implement 3D viewer... configured Scene3D.svelte, extruded walls..." but `git show 52fcbad --name-only` = only `package.json` + `package-lock.json`. Scene3D.svelte untouched.
**Root cause:** Agent ran out of VM time / session failed mid-work; the progress messages described intended work, but only staged package files got committed.
**Fix for Wave 2:**
- [ ] AC must include: `git diff HEAD^ --name-only | grep -c "Scene3D\|src/lib"` >= 1 (code files, not just package.json)
- [ ] PR Delivery Requirements already exists — strengthen: "verify `git show HEAD --name-only` lists the SOURCE files claimed in the PR title"
- [ ] Re-dispatch #8 with explicit "commit the actual .svelte/.ts changes, verify with git status before push"

### P3. Test files delivered EMPTY — #11 (utilities/taxes)
**Evidence:** After merge: `test/unit/taxes.test.ts` = 0 lines, `test/unit/utilities.test.ts` = 0 lines, `utilities-split.test.ts` = 0 lines. Code delivered (utilities.ts, taxes.ts exist) but test files empty.
**Root cause:** Issue said "implement assertions in test/unit/taxes.test.ts" but agent created empty files (or the skeleton was empty and it didn't fill it).
**Fix for Wave 2:**
- [ ] AC must include: `wc -l test/unit/taxes.test.ts` >= 20 (non-empty test file)
- [ ] AC: `grep -c "describe\|it(" test/unit/taxes.test.ts` >= 3
- [ ] Re-dispatch tests for utilities/taxes (code already merged)

### P4. Stash/workdir contamination on integration (Hermes-side, not Jules)
**Evidence:** Local skeletons (untracked test files) overwrote Jules' real tests after `git stash pop`; 1330 lines of real tests masked. Restored via `git checkout origin/master -- test/ src/`.
**Fix:** Before merging agent PRs, verify working dir is clean or use worktrees exclusively (already the pattern). Never stash-pop over a freshly merged master without re-checkout.

## Template/process improvements for Wave 2
1. [ ] **Vendor @swal/ui** into the repo (or file: dep) BEFORE dispatching any UI issue
2. [ ] Add P2 guard to template: "verify git show HEAD --name-only lists source files"
3. [ ] Add P3 guard to template: "test files must be non-empty (wc -l >= 20)"
4. [ ] Sharpen #11 re-dispatch: tests for utilities/taxes (code merged, tests empty)
5. [ ] Re-dispatch #5, #7, #8 with vendored @swal/ui + explicit "commit source files" ACs
6. [ ] Wave 2 scope: ui-swal, plans-2d, plans-3d, utilities-tests, taxes-tests, + M3-M5 features (accounts, leasing, mesh, trust, p2p)

## Actions
- [x] Merged 6 PRs (#14, #17, #18, #19, #20, #21) with conflict resolution (property.ts, package.json)
- [x] Closed 3 false positives (#15, #16, #22) with evidence comments
- [x] Reconcile features.json: 10 passing / 2 partial / 11 planned
- [x] Restore real tests from origin/master (stash contamination fixed)
- [ ] Vendor @swal/ui (prereq for Wave 2)
- [ ] Re-dispatch #5, #7, #8, #11 with corrected bodies
