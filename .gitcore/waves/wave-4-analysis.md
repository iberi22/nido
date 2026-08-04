# Wave 4 Analysis — NIDO (2026-08-03)

## Summary

- Issues: 13 (#58-#70) · Integrated into main: 12 · In flight: 1 (#63 mesh — re-dispatched after FALSE POSITIVE)
- All 13 issues dispatched to Jules (grok-backed sessions); 3 arrived as PRs, 9 as branches WITHOUT PRs
  (agents pushed branches but never opened PRs — integrator must watch branches, not just PRs)
- Features: 23/24 at 100% in features.json (mesh-integration 85% pending #63) — avg 99.4%
- Test delta: unit+integration 175 → **243** (42 files) · e2e 28 → **33** · svelte-check 0/0 · build OK
- Scanner `xavier verify features`: avg_gap 0.0, 24/24 features OK, 0 stale/0 no-tests/0 mvp
- Overall verdict: ✅ healthy — wave 4 delivered the 100% push for 21 features + real integration/e2e coverage

## Per-issue verdicts

| Issue | Title | Delivery | CI local | Verdict |
|-------|-------|----------|----------|---------|
| #58 | financials (costs+taxes+utilities) | branch → merged | 23/23 | ✅ |
| #59 | operations (inventory+maintenance+analytics) | branch → merged | 13/13 | ✅ |
| #60 | export-cad 100% | branch → merged | 10/10 | ✅ |
| #61 | accounts-auth 100% (requireRole) | branch → merged | 15/15 | ✅ |
| #62 | leasing+tenant-portal 100% | branch → merged | 10/10 | ✅ |
| #63 | mesh sync wiring | **NO DELIVERY (session COMPLETED, no branch/PR)** | — | ❌ re-dispatched |
| #64 | p2p-discovery + trust-score | branch → merged | 9/9 | ✅ |
| #65 | plans-3d real extrusion | branch → merged | 10/10 | ✅ |
| #66 | plans-2d + data-model IndexedDB | PR #82 → merged | 16/16 + 5 e2e | ✅ (needed 2 fixes) |
| #67 | UI shell (NormsPanel + AIChat) | PR #81 → merged | 9/9 + 15 e2e | ✅ |
| #68 | pwa-offline + toolchain CI | branch → merged | 199/199 suite | ✅ (merge conflict main.ts) |
| #69 | ai-assistant data wiring | branch → merged | 204/204 suite | ✅ |
| #70 | verified-invitations 100% | PR #80 → merged | 15/15 + 2 e2e | ✅ |

### Delivery notes

- **3 PRs** (#80/#81/#82) arrived as draft PRs → `gh pr ready` → verified → merged (GitHub auto-marked MERGED on push).
- **9 branches WITHOUT PRs**: agents pushed `origin/<branch>` but never opened PRs. Verified each in a
  worktree (merge origin/main + per-branch vitest) and integrated directly with merge commits.
- **#63 false positive**: Jules session 3333938350833079167 COMPLETED (per REST API) with NO branch and NO PR —
  classic false positive (session ended without pushing). sync.svelte.ts in main had zero mesh references →
  work genuinely missing. Re-dispatched via label toggle (new session running).

## Recurring patterns

1. **Branches without PRs (9/12)** — agents push the branch and never open the PR. The `gh pr list` view
   alone misses 75% of deliveries. Fix for wave 5: monitor `git ls-remote --heads origin` for new branches,
   not just PRs; the branch IS the delivery unit.
2. **Svelte 5 $state proxies are NOT structuredClone-able** — the #66 persistence crashed at runtime with
   `IDBObjectStore.put: #<Object> could not be cloned`; its own e2e missed it (happy path only). Detected by
   the ui-swal shell smoke test (asserts zero pageerrors). Two puts fixed with JSON round-trip
   (sync.svelte.ts triggerSave + store.saveToIndexedDB). Documented in wave-pr-local-integration skill.
3. **Shared-file island violation: src/main.ts** (#64 added nidoDiscovery hooks, #68 added offline handler —
   both touched main.ts which was assigned to #68 only). The second merge left conflict markers IN main;
   auto-resolution (git add -A) committed them. Fixed by manual union rewrite. Lesson: when a merge shows a
   conflict, resolve EVERY conflicted file explicitly — `git add -A` can commit markers.
4. **gitcore-compliance.test.ts touched by every agent** — trivial conflicts on every merge; agents added
   no-op assertions. Resolution: take main's version (the canonical GitCore test). Wave 5: remove this file
   from agent islands (add to DO NOT touch).
5. **Stale vite preview on :4173** — one e2e failure was caused by Playwright reuseExistingServer against an
   old dist (missing window.floorPlanStore hook). Kill stale previews before e2e runs (already documented).

## Template/process improvements for Wave 5

1. [ ] E2E ACs must include a zero-pageerror smoke test (`page.on('pageerror')` → []) — catches runtime
      crashes the happy-path tests miss.
2. [ ] Add `src/main.ts` to a SINGLE wave-5 island (shell integration) — never split shared entry files.
3. [ ] Add `test/integration/gitcore-compliance.test.ts` to DO NOT touch in every wave-5 body.
4. [ ] Monitor branches (`ls-remote`) not just PRs; every new branch = candidate delivery.
5. [ ] Merge-conflict discipline: resolve each conflicted file explicitly; verify zero markers
      (`grep -rn "<<<<<<<" src/`) before commit.

## Actions

- [x] Integrate 12/12 deliveries (3 PRs + 9 branches) with local CI per branch + full gate at end
- [x] Fix 2 persistence bugs (Svelte proxies → JSON round-trip) + 1 merge-conflict corruption (main.ts)
- [x] Reconcile features.json: 23/24 → 100% (mesh 85% pending #63)
- [x] Close issues #58-#62, #64-#70 with evidence; #63 stays open (re-dispatched)
- [ ] Integrate #63 when the new session delivers, then mesh-integration → 100%
- [ ] Dispatch wave 5 (#83-#93) AFTER #63 lands (islands overlap: sync.svelte.ts)
- [ ] Deploy gate (Cloudflare): 100% features + full e2e green → `npm run deploy` (wave 5.11 checklist)
