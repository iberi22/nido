# Wave 3 Analysis — NIDO (2026-08-03)

## Summary

- Issues: 9 (#48-#56) + 1 wave-close (#57) · PRs opened: 9 · Merged into master: 8
  (by CEO, merge commits, no force-push) · Completed locally: 1 (#50 e2e finalization)
- Features touched: mesh-integration (55% → 85% stable), escrow-disputes (90% → 100%),
  ai-assistant (NEW, 85%), e2e suite (14 → 28 specs), ui-swal (data-testid + a11y),
  webauthn (accounts.ts real), links/trust (OAuth real flow)
- Test delta: unit+integration 154 → **175** (34 files) · e2e 14 → **28** (all green,
  verified twice) · svelte-check 0 errors / 0 warnings · build OK
- Overall verdict: ✅ healthy — wave closed with all 9 issues delivered

## Per-issue verdicts

| Issue | Title | PR/branch | Delivered? | ACs met | Quality | Verdict |
|-------|-------|-----------|-----------|---------|---------|---------|
| #48 | Vendor edge-mesh | w3-issue-48 | yes | yes | good | ✅ |
| #49 | mesh real transport | w3-issue-49 | yes | yes | good | ✅ |
| #50 | e2e suite | w3-issue-50 | partial → completed locally | yes (after fix) | med | ✅ |
| #51 | WebAuthn real | w3-issue-51 | yes | yes | good | ✅ |
| #52 | Escrow Polygon | w3-issue-52 | yes | yes | good | ✅ |
| #53 | AI assistant | w3-issue-53 | yes | yes | good | ✅ |
| #54 | Placeholders G2 | w3-issue-54 | yes | yes | good | ✅ |
| #55 | Links OAuth | w3-issue-55 | yes | yes | good | ✅ |
| #56 | UI polish | w3-issue-56 | yes | yes | good | ✅ |

### #48 — Vendor edge-mesh
- **Delivered:** 56 files vendored to `src/lib/vendor/edge-mesh/` + `index.d.ts` + transport deps (file: dep).
- **AC results:** `ls src/lib/vendor/edge-mesh/src/` → adapters, authz, chat, core, governance, identity, index.ts. Pass.
- **Quality:** correct G3 core-vendoring pattern — no fork, no npm publish needed.

### #49 — mesh real transport
- **Delivered:** `src/lib/domain/mesh.ts` — real EdgeMesh transport: WebRTC/Yjs chat, presence, ML-DSA-65 signing (@noble/post-quantum 0.6.1), InMemoryStorage offline fallback. 5/5 tests, 0 stubs.
- **AC results:** `grep -cE "^\s*(it|test)\(" test/integration/mesh-integration.test.ts` → 5. Pass.

### #50 — e2e suite
- **Delivered:** 6 specs written; 14/14 passed in the agent's worktree. **However**: after
  integration, `ui-swal.spec.ts` still carried 5 `expect(true).toBe(false)` placeholders and
  the NixOS fix was lost from the merged `playwright.config.ts` (merge resolved against an old base).
- **Local completion (this close):** rewrote the 5 placeholders into real assertions using the
  #56 data-testids; restored the NixOS chromium fix (executablePath + LD_LIBRARY_PATH from
  nix-store); fixed 3 spec bugs discovered during verification:
  1. `page.locator("canvas").count()` without `await` (Playwright is async) — ui-swal a4.
  2. Tabs are `role="tab"`, not `role="button"` — ui-swal a5 selector.
  3. Stale scaffold title: `index.html` still said `floor-plan-designer-svelte`; pwa-offline
     expected `NIDO` while plans-2d expected the OLD title (contradictory specs) → set title to
     `NIDO`, aligned plans-2d.
  4. Flaky `count()` assertions in p2p-discovery (no auto-wait for Svelte mount) → converted to
     `expect(locator).toBeVisible()` (auto-wait).
  5. Stale `vite preview` (from a dead worktree) holding :4173 made Playwright reuse an OLD dist
     via reuseExistingServer — killed orphans; verified fresh build serves `<title>NIDO</title>`.
- **Final:** 28/28 e2e green, twice in a row (no flakes).

### #51 — WebAuthn real
- **Delivered:** @simplewebauthn/browser 13.3.0, real startRegistration/startAuthentication in `src/lib/domain/accounts.ts`.
- **Quality:** real browser WebAuthn API, no stub.

### #52 — Escrow Polygon
- **Delivered:** viem 2.55.10; `src/lib/domain/polygon-client.ts` (getDefaultPolygonClient) injectable
  into pure state machine `src/lib/domain/escrow.ts`; 8/8 mock tests (escrow-disputes 4 +
  dispute-governance 4).
- **AC results:** grep test counts → 4 + 4 = 8. Pass.

### #53 — AI assistant
- **Delivered:** `src/lib/domain/ai-skills.ts` + `src/lib/AIChat.svelte`; 4/4 tests
  (`test/unit/ai-skills.test.ts`).
- **Note:** AIChat.svelte landed in `src/lib/` (project), not inside the vendored @swal/ui copy —
  verify with the design-system owner whether the chat panel should be ported INTO @swal/ui
  (unified-cores rule) in a later wave.

### #54 — Placeholders G2
- **Delivered:** 9 files filled, +217 real lines; suite jumped 154 → 166 with real assertions.

### #55 — Links OAuth
- **Delivered:** `src/lib/domain/links.ts` (LinkProvider); trust score now consumes ONLY
  verified links; 12 tests.
- **Merge note:** trust-score.test.ts conflict resolved taking the #55 (OAuth real) version —
  correct choice (supersedes #54 placeholder fill in that file).

### #56 — UI polish
- **Delivered:** G4 token sweep (0 legacy-palette hits), a11y aria-labels (0 svelte-check
  warnings), data-testid hooks (tab-*, view-2d/3d, export-json) that the e2e suite now relies on.

## Recurring patterns

1. **E2E placeholders surviving integration** — #50 passed in its own worktree but delivered
   `expect(true).toBe(false)` placeholders + a config that lost the NixOS fix. Root cause: the
   agent ran only a subset / never re-ran the merged state. Fix for wave 4: AC must include
   `grep -c "toBe(false)" test/e2e/*.spec.ts` = 0 AND the integration step must re-run
   `npx playwright test` from master (fresh port) before closing.
2. **Non-auto-waiting count() assertions** — `locator.count()` returns 0 before Svelte mounts;
   caused a flaky p2p-discovery failure that appeared/disappeared between runs. Fix: AC rule
   "e2e assertions must use auto-waiting matchers (toBeVisible) or explicit expect().toHaveCount()".
3. **Stale scaffold identity** — index.html title (and package.json name) still
   `floor-plan-designer-svelte`; two e2e specs asserted different titles. Fix: product-identity
   guard in the wave-4 issues (grep index.html title = NIDO).
4. **Stale preview contamination** — orphan `vite preview` on :4173 served an old dist and made
   Playwright pass against stale builds (reuseExistingServer). Fix: e2e close step must
   `ss -tlnp | grep 4173` and kill orphans first.
5. **features.json not GitCore-CANONIC (pre-existing, waves 1-2)** — NIDO's features.json uses
   `implemented_in` as an ARRAY and `last_verified`, but the `xavier verify features` scanner
   (feature_scanner.rs) requires `implemented_in` as comma-separated STRING and `last_tested`
   (YYYY-MM-DD); several `notes` contain caveat keywords (FAILED/pending). The scanner currently
   aborts with `invalid type: sequence, expected a string`. JSON is valid; alignment is pending.

## Template/process improvements for Wave 4

1. [ ] Add e2e anti-placeholder AC: `grep -c "toBe(false)" test/e2e/` = 0 + run suite from master.
2. [ ] Add e2e robustness rule: auto-waiting matchers only (no bare `count()` without
      `expect().toHaveCount()`).
3. [ ] Add product-identity guard: `grep "<title>" index.html` = NIDO (new guard G5).
4. [ ] Add e2e port hygiene to the wave-close issue: kill stale previews on :4173 before running.
5. [ ] New reconciliation issue (wave 4): convert NIDO features.json to GitCore-CANONIC format
      (implemented_in → string, last_verified → last_tested, clean caveat notes, notes="PASS")
      and prove with `xavier verify features --path nido`.

## Actions

- [x] Integrate all 9 wave-3 PRs (8 merge commits + 1 local completion)
- [x] Verify: svelte-check 0/0, unit+integration 175/175, e2e 28/28 (x2), build OK
- [x] Reconcile features.json (mesh → stable 85%, escrow → 100%, ai-assistant added 85%)
- [x] Close issues #48-#57 with evidence comments
- [ ] Apply improvements to wave-4 issue bodies (guards G5, e2e rules)
- [ ] Wave 4: features.json GitCore-CANONIC conversion + `xavier verify features` proof
- [ ] Dependabot: 6 vulnerabilities reported on default branch (3 high, 3 moderate) — triage
