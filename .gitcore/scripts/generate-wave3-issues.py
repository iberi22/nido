#!/usr/bin/env python3
"""Generate Wave 3 issue bodies for NIDO (10 issues, Jules dispatch).

Wave 3 = Production hardening + real M5 network.
Guards carried from waves 1-2:
  G1 ANTI-FALSE-POSITIVE: AC requires `git show HEAD --name-only | grep -E "src/|lib/"` >= 1
  G2 TEST-EMPTY GUARD: AC requires `wc -l` >= 20 + `grep -c "describe\\|it("` >= 3
  G3 CORE-VENDORED: @swal/ui vendored at src/lib/vendor/swal-ui — NEVER fork
  G4 TOKEN-GUARD (new, from wave-2 lesson): `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0
"""
import os

OUT = os.path.expanduser("~/.hermes/waves/nido-wave3")
os.makedirs(OUT, exist_ok=True)
REPO = "iberi22/floor-plan-designer"

CTX = """## Context (from Xavier, 2026-08-04 — waves 1-2 CLOSED)

- **Product:** NIDO = intelligent home administration + private GPS-verified rental
  network. Waves 1-2 delivered ALL domain features. This wave = production hardening
  + real M5 network transport.
- **Waves 1-2 status:** 22/23 features stable, 1 partial (mesh-integration 55%),
  0 planned. **154/154 unit+integration tests passing.** Master = 2f367cc.
- **@swal/ui VENDORED** at `src/lib/vendor/swal-ui` (file: dep). **edge-mesh is NOT
  vendored yet** — @iberi22/edge-mesh@1.0.0 lives at ~/proyectosSWAL/edge-mesh
  (deps: @noble/post-quantum, idb, peerjs, y-protocols, yjs).
- **UI RULE:** edge-hive-admin is the lab reference; replicated via @swal/ui.
  NO shadcn-svelte, NO project Tailwind. **G4: no prototype palette**
  (#1e3a5f/#87ceeb/#4dd0e1) anywhere in src/lib — use --swal-* tokens
  (#020617 bg, #06b6d4 accent, #f97316 orange).
- **Harvests (PR #1, closed):** .gitcore/harvest/pr1-ai-layers/ has ai_skills.ts,
  utils_io.ts, utils_validator.ts — reusable logic awaiting integration.
- **Open decisions (CEO):** repo rename to iberi22/nido (admin, not this wave);
  trust provider in-house OAuth links (chosen).
- **features.json:** `.gitcore/features.json` is source of truth (23 features,
  22 stable / 1 partial / 0 planned). Reconcile at wave end.
"""

def header(num, title, wave_label):
    return f"""# [Wave 3.{num:02d}] {title}

> Wave 3 — {wave_label}. Labels: `wave-3`, `nido`
> Repo: {REPO} (PRIVATE)

{CTX}
---
"""

def footer(num, depends, parallel, merge_order, effort):
    return f"""## Dependencies & Merge Order
- **Depends on:** {depends or "None (root)"}
- **Parallel with:** {parallel or "—"}
- **Merge order within wave:** {merge_order}
- **Expected effort:** {effort}

## Failure Recovery
| If this happens | Action |
|----------------|--------|
| `npm run build` fails | Fix errors, do NOT commit broken code |
| `npm run check` fails | Fix type errors before commit |
| Test file empty (0 lines) | G2: write >= 20 lines with real cases |
| PR would have 0 source files | G1: check `git show HEAD --name-only` — never open an empty PR |
| Playwright can't launch Chromium | NixOS: needs libnspr4 — `sudo nixos-rebuild switch` or install libs; document |
| edge-mesh import fails | Vendor @iberi22/edge-mesh first (issue 1) or import from src/lib/vendor/edge-mesh |
| PR conflicts with parallel work | Rebase on master, re-run verification |
| Palette colors appear | G4: replace with --swal-* tokens — #1e3a5f/#87ceeb/#4dd0e1 are FORBIDDEN |
"""

PR_DELIVERY = """## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1 — source files REQUIRED (wave-1 PRs #22/#23 were false positives: message claimed work, only package files committed)
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker"""

GUARD_TMPL = """## Anti-Hallucination Guard ⚠️
1. **G1 anti-false-positive** — verify `git show HEAD --name-only` lists source files before commit
2. **G2 test-empty** — test files need real assertions, no `toBe(false)`, `wc -l` >= 20 lines
3. **G3 core-vendored** — @swal/ui vendored; edge-mesh vendored by issue 1; never fork cores
4. **G4 token-guard** — no prototype palette in src/lib; use --swal-* tokens
5. **Don't touch other islands** — file islands are disjoint
6. **READ before write** — read each file fully first"""

# ─────────── Issue 1: vendor edge-mesh ───────────
issues = {}
issues[1] = dict(
  title="Vendor @iberi22/edge-mesh core into src/lib/vendor/edge-mesh (G3 pattern)",
  wave_label="Network (M5)",
  current="""- `src/lib/vendor/` has only `swal-ui` (vendored wave-1 close)
- @iberi22/edge-mesh@1.0.0 exists at /home/belal/proyectosSWAL/edge-mesh (deps: @noble/post-quantum, idb, peerjs, y-protocols, yjs)
- NOT on npm — must be vendored like @swal/ui was
- features.json: `mesh-integration` at 55% partial (wrapper exists, transport missing)""",
  desired="""- Copy @iberi22/edge-mesh source into `src/lib/vendor/edge-mesh/` (src/ + package.json + README)
- Add `"@iberi22/edge-mesh": "file:src/lib/vendor/edge-mesh"` to dependencies (or alias `"edge-mesh": "file:..."`)
- Install its deps (yjs, peerjs, @noble/post-quantum, idb, y-protocols) in nido package.json
- Add index.d.ts types mapping (same pattern as swal-ui vendoring)
- Verify the package resolves: `node -e "console.log(require('@iberi22/edge-mesh'))"` or TS import compiles
- Do NOT modify edge-mesh source — vendor as-is""",
  web="""1. search: "vendor npm package file: dependency pattern 2026"
2. search: "yjs peerjs webrtc typescript integration 2026"
3. search: "@noble/post-quantum ml-dsa-65 2026\"""",
  prompt="""Before implementing:
1. Read /home/belal/proyectosSWAL/edge-mesh/package.json + src/index.ts — public API surface
2. Look at the @swal/ui vendoring precedent: src/lib/vendor/swal-ui/ + package.json file: dep + index.d.ts
3. Copy the package source (NOT dist, source) into src/lib/vendor/edge-mesh/
4. Wire deps into nido package.json (npm install yjs peerjs @noble/post-quantum idb y-protocols)
5. Verify import works from a scratch file""",
  patterns="""- Vendor layout: src/lib/vendor/edge-mesh/{src,package.json,index.d.ts}
- package.json dep: "edge-mesh": "file:src/lib/vendor/edge-mesh"
- Types: index.d.ts with the classes/functions nido uses (EdgeMesh, namespaces, presence, chat, authz, governance)
- Do NOT rewrite edge-mesh internals — vendor as-is (G3)""",
  acceptance="""- [ ] `ls src/lib/vendor/edge-mesh/src/` — vendored source present
- [ ] `grep -c "edge-mesh" package.json` >= 1 (file: dep)
- [ ] `grep -c "yjs\\|peerjs\\|post-quantum" package.json` >= 2 (transport deps)
- [ ] `ls src/lib/vendor/edge-mesh/index.d.ts` — types present (or src/index.ts if TS source)
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0 (no palette)""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/vendor/edge-mesh/` | MISSING | Vendor @iberi22/edge-mesh source | HIGH |
| `package.json` | current | Add file: dep + transport deps | LOW |
| `src/lib/vendor/edge-mesh/index.d.ts` | MISSING | Type surface for nido usage | MED |""",
  dont_touch="""- `src/lib/vendor/swal-ui/` (already vendored)
- `src/lib/domain/mesh.ts` (issue 2 owns the transport wiring)
- ALL other src/lib/domain/* — file islands
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#2", merge_order=1, effort="Medium (1-4h)",
)

# ─────────── Issue 2: mesh transport real ───────────
issues[2] = dict(
  title="mesh.ts real transport — connect wrapper to vendored edge-mesh (WebRTC/Yjs, real ML-DSA-65)",
  wave_label="Network (M5)",
  current="""- `src/lib/domain/mesh.ts` (110 LOC) — typed wrapper: createMeshClient, namespace swal/nido/{id}, publishPresence, authzCheck, signWithIdentity STUB (`stub-signature:` prefix), sendChatMessage (in-memory)
- 5 integration tests passing (offline state transitions)
- edge-mesh NOT vendored yet (issue 1 must merge first)
- features.json: mesh-integration 55% partial""",
  desired="""- Replace the in-memory/offline behavior with REAL edge-mesh transport:
  - `createMeshClient(instanceId)` → real EdgeMesh instance (namespaces swal/nido/{id})
  - `publishPresence` → real presence via edge-mesh presence module
  - `sendChatMessage` → real chat via edge-mesh chat (Yjs CRDT)
  - `signWithIdentity` → REAL ML-DSA-65 signature via @noble/post-quantum (edge-mesh identity module)
  - Keep the same public API (createMeshClient, publishPresence, authzCheck, sendChatMessage, signWithIdentity) — tests must pass with real impl
- InMemoryStorage fallback when offline (edge-mesh supports it) — tests can run without WebRTC
- Update test/integration/mesh-integration.test.ts: signature test asserts a REAL signature (no 'stub-signature:' prefix)
- features.json mesh-integration → stable 85%+""",
  web="""1. search: "edge-mesh yjs crdt namespaces typescript 2026"
2. search: "ml-dsa-65 noble post-quantum sign verify 2026"
3. search: "peerjs webrtc data channel chat 2026"
4. search: "yjs crdt document sync offline 2026\"""",
  prompt="""Before implementing:
1. Wait for issue 1 (edge-mesh vendored) to merge, OR vendor it yourself if not merged yet
2. Read /home/belal/proyectosSWAL/edge-mesh/src/edge-mesh.ts + index.ts — the real API
3. Read src/lib/domain/mesh.ts fully (keep the public surface identical)
4. Wire real transport behind the same functions; keep offline fallback for tests
5. ML-DSA-65: use @noble/post-quantum ml_dsa65 (keygen/sign/verify)
6. Update the signature test to assert real signature format""",
  patterns="""- Keep mesh.ts public API byte-identical (createMeshClient, publishPresence, authzCheck, sendChatMessage, signWithIdentity)
- EdgeMesh: `new EdgeMesh({ namespace, storage })` — read the vendored source for exact constructor
- Presence: edge-mesh presence module (publish/subscribe)
- Chat: edge-mesh chat module (Yjs doc)
- Signature: @noble/post-quantum ml_dsa65.sign(privKey, msg) → Uint8Array; verify with pubKey
- Tests: InMemoryStorage fallback keeps them deterministic""",
  acceptance="""- [ ] `grep -c "import.*edge-mesh\\|from ['\"]edge-mesh" src/lib/domain/mesh.ts` >= 1 (real import)
- [ ] `grep -c "stub-signature" src/lib/domain/mesh.ts` = 0 (G-stub removed)
- [ ] `grep -c "ml_dsa65\\|ML-DSA\\|post-quantum" src/lib/domain/mesh.ts` >= 1 (real signing)
- [ ] `grep -c "InMemoryStorage\\|offline" src/lib/domain/mesh.ts` >= 1 (offline fallback)
- [ ] `grep -c "toBe(false)" test/integration/mesh-integration.test.ts` = 0 (G2)
- [ ] `npx vitest run test/integration/mesh-integration.test.ts` — 5/5 pass with REAL impl
- [ ] `npm run check` + `npm run build` exit 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/mesh.ts` | 110 LOC wrapper | Real transport + ML-DSA-65 | HIGH |
| `test/integration/mesh-integration.test.ts` | 5 passing | Signature test → real format | MED |
| `package.json` | vendored deps | (already from issue 1) | LOW |""",
  dont_touch="""- `src/lib/vendor/edge-mesh/` (issue 1 — READ ONLY)
- ALL other src/lib/domain/* — file islands
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="#1", parallel="—", merge_order=2, effort="Large (4h+)",
)

# ─────────── Issue 3: e2e suite ───────────
issues[3] = dict(
  title="E2E suite — implement 6 Playwright specs, make Chromium run on NixOS",
  wave_label="QA / Platform",
  current="""- test/e2e/ has 6 spec files: plans-2d, plans-3d, p2p-discovery, pwa-offline, tenant-portal, ui-swal — ALL with `expect(true).toBe(false)` placeholders
- playwright.config.ts exists (testDir ./test/e2e, baseURL :4173)
- Playwright NOT runnable yet on NixOS (Chromium needs libnspr4.so)
- features.json: e2e coverage absent for these features""",
  desired="""- Fix Chromium launch on NixOS (document + workaround: LD_LIBRARY_PATH or nixos-rebuild with libnspr4)
- Implement ALL 6 e2e specs with real flows:
  - plans-2d: load /, see canvas, draw a wall via toolbar, see a zone
  - plans-3d: switch to 3D view, see canvas element, no console errors
  - pwa-offline: load app, check service worker registered, offline reload works
  - tenant-portal: navigate tenant section, see lease summary
  - ui-swal: shell renders NIDO brand + 2D/3D toggles, @swal/ui buttons present
  - p2p-discovery: discovery panel renders, geohash shown
- `npx playwright test` — ALL specs pass headless
- Add npm script `test:e2e` (exists) → working""",
  web="""1. search: "playwright nixos libnspr4 chromium fix 2026"
2. search: "playwright service worker offline test 2026"
3. search: "playwright svelte app e2e best practices 2026\"""",
  prompt="""Before implementing:
1. Run `npx playwright install chromium` — if it fails on NixOS, install libnspr4 via system or LD_LIBRARY_PATH workaround
2. Read each spec file (they have acceptance criteria comments)
3. Start dev server `npm run dev` (or build+preview for pwa) — specs use baseURL :4173 (preview)
4. Implement flows one spec at a time; run `npx playwright test <file>` to verify
5. Mark PWA spec to use `npm run preview` (production build) since service workers need it""",
  patterns="""- Playwright: page.goto('/'), expect(page.getByText('NIDO')).toBeVisible()
- Konva canvas: locate by data-testid or class; use page.mouse for draw interactions
- PWA: page.waitForServiceWorker() or check registration via page.evaluate
- Run: `npx playwright test` (headless, chromium project)""",
  acceptance="""- [ ] `grep -c "toBe(false)" test/e2e/*.spec.ts` = 0 (all 6 specs implemented)
- [ ] `npx playwright test 2>&1 | tail -3` — all specs PASS (chromium headless)
- [ ] `grep -c "describe(\\|test(" test/e2e/ui-swal.spec.ts` >= 3 (real cases)
- [ ] Each spec has >= 2 real test cases
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `test/e2e/plans-2d.spec.ts` | placeholder | Real draw-wall flow | MED |
| `test/e2e/plans-3d.spec.ts` | placeholder | 3D view flow | MED |
| `test/e2e/p2p-discovery.spec.ts` | placeholder | Discovery panel flow | MED |
| `test/e2e/pwa-offline.spec.ts` | placeholder | SW + offline reload | HIGH |
| `test/e2e/tenant-portal.spec.ts` | placeholder | Tenant flow | MED |
| `test/e2e/ui-swal.spec.ts` | placeholder | Shell render flow | LOW |
| `playwright.config.ts` | exists | Maybe webServer config for preview | LOW |""",
  dont_touch="""- src/lib/* — no source changes (e2e only)
- test/unit + test/integration — issue 7 owns unit placeholders
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#1,#2,#4,#5,#6,#7", merge_order=3, effort="Large (4h+)",
)

# ─────────── Issue 4: WebAuthn real ───────────
issues[4] = dict(
  title="WebAuthn real — enrollBiometric/authenticateBiometric with @simplewebauthn/browser",
  wave_label="Accounts",
  current="""- `src/lib/domain/accounts.ts` (16 exports): createAccount, generateSeedPhrase, confirmSeed, assignRole, createInstance, WebAuthn stubs (isWebAuthnAvailable, enrollBiometric, authenticateBiometric)
- Tests: 10 passing (unit+integration)
- features.json: accounts-auth 95% stable""",
  desired="""- Replace WebAuthn stubs with REAL @simplewebauthn/browser:
  - `isWebAuthnAvailable()` → true when navigator.credentials exists
  - `enrollBiometric(account)` → real WebAuthn registration (PublicKeyCredentialCreationOptions) — returns credential id
  - `authenticateBiometric(account)` → real assertion (PublicKeyCredentialRequestOptions) — returns boolean
- Keep the offline-first fallback: if WebAuthn unavailable, return typed error (no crash)
- Add @simplewebauthn/browser dep
- Tests: unit tests mock navigator.credentials (jsdom); integration verifies the API shape
- accounts-auth → 100%""",
  web="""1. search: "@simplewebauthn/browser register authentication 2026"
2. search: "webauthn passkeys svelte 5 2026"
3. search: "mock navigator.credentials jsdom vitest 2026\"""",
  prompt="""Before implementing:
1. Read src/lib/domain/accounts.ts FULLY (keep the public API identical)
2. Research @simplewebauthn/browser API (startRegistration, startAuthentication)
3. Install @simplewebauthn/browser
4. Keep the stub fallback path for non-secure contexts (tests use it)
5. Update unit tests to mock navigator.credentials; integration tests check the API surface""",
  patterns="""- @simplewebauthn/browser: startRegistration(options) → credential; startAuthentication(options) → assertion
- navigator.credentials.create/get for the raw API if not using the package
- Mock: vi.stubGlobal('navigator', { credentials: { create: vi.fn() } })
- Keep sync-friendly wrappers; async internally""",
  acceptance="""- [ ] `grep -c "@simplewebauthn/browser" package.json` >= 1 (real dep)
- [ ] `grep -c "startRegistration\\|credentials.create" src/lib/domain/accounts.ts` >= 1 (real enroll)
- [ ] `grep -c "startAuthentication\\|credentials.get" src/lib/domain/accounts.ts` >= 1 (real auth)
- [ ] `grep -c "toBe(false)" test/unit/accounts-auth.test.ts` = 0 (G2)
- [ ] `npx vitest run test/unit/accounts-auth.test.ts test/integration/accounts-auth.test.ts` — pass
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/accounts.ts` | WebAuthn stubs | Real @simplewebauthn/browser | MED |
| `test/unit/accounts-auth.test.ts` | 111 lines | Mock navigator.credentials | LOW |
| `test/integration/accounts-auth.test.ts` | 127 lines | API surface tests | LOW |
| `package.json` | current | + @simplewebauthn/browser | LOW |""",
  dont_touch="""- src/lib/domain/invitations.ts (issue 5 may touch tokens? No — it doesn't)
- ALL other src/lib/domain/* — file islands
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#1,#3,#5,#6,#7", merge_order=4, effort="Medium (1-4h)",
)

# ─────────── Issue 5: Polygon escrow real ───────────
issues[5] = dict(
  title="Escrow (Polygon) real — testnet deposit/release, Stripe→Polygon bridge pattern",
  wave_label="Network (M5)",
  current="""- `src/lib/domain/escrow.ts` — state machine: createEscrow, lockEscrow, requestRelease, releaseEscrow, openDispute, startVote, resolveDispute, enforceOutcome (8 integration tests passing)
- Blockchain calls are typed stubs (no real Polygon interaction)
- features.json: escrow-disputes 90% stable""",
  desired="""- Add REAL Polygon testnet integration behind the state machine:
  - `createEscrow(lease, depositAmount)` → also create a Polygon escrow contract call (typed client stub using ethers/viem — viem preferred)
  - `lockEscrow` → tx lock (testnet Amoy or Mumbai)
  - `releaseEscrow` → tx release (partial/full)
  - Config: RPC URL + contract address in a config module (env-driven, testnet defaults)
  - **Keep the domain state machine PURE** — blockchain calls behind a `PolygonClient` interface; tests use a mock client
- Add viem dep (or ethers)
- Integration tests: mock PolygonClient (no real RPC in CI); unit tests unchanged
- escrow-disputes → 100%""",
  web="""1. search: "viem polygon testnet deposit contract 2026"
2. search: "polygon amoy testnet faucet contract 2026"
3. search: "escrow smart contract solidity minimal 2026"
4. search: "viem wagmi typescript 2026\"""",
  prompt="""Before implementing:
1. Read src/lib/domain/escrow.ts FULLY (state machine is stable — DON'T change its logic)
2. Research viem Polygon testnet API
3. Create src/lib/domain/polygon-client.ts: PolygonClient interface + viem implementation (testnet)
4. Wire escrow.ts to use the client via optional injection (constructor/param) — mock in tests
5. Keep state machine pure; client does the tx
6. Update integration tests to inject mock client""",
  patterns="""- PolygonClient interface: createEscrowContract(leaseId, amount), lock(escrowId), release(escrowId, amount), getBalance(escrowId)
- viem: createPublicClient + createWalletClient (testnet chain)
- Config: src/lib/domain/polygon-config.ts with RPC_URL + ESCROW_ADDRESS (env, testnet defaults)
- Injection: createEscrow(lease, amount, client = defaultClient) — tests pass mock
- NO real RPC in CI — mock client""",
  acceptance="""- [ ] `ls src/lib/domain/polygon-client.ts` — exists
- [ ] `grep -c "viem\\|ethers" package.json` >= 1 (real lib)
- [ ] `grep -c "PolygonClient\\|polygonClient" src/lib/domain/escrow.ts` >= 1 (client injected)
- [ ] `grep -c "mock\\|vi.fn\\|stub" test/integration/escrow-disputes.test.ts` >= 1 (mock client)
- [ ] `grep -c "toBe(false)" test/integration/escrow-disputes.test.ts test/integration/dispute-governance.test.ts` = 0 (G2)
- [ ] `npx vitest run test/integration/escrow-disputes.test.ts test/integration/dispute-governance.test.ts` — pass
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/polygon-client.ts` | MISSING | PolygonClient + viem testnet impl | MED |
| `src/lib/domain/escrow.ts` | state machine | Wire client injection (pure logic unchanged) | MED |
| `src/lib/domain/polygon-config.ts` | MISSING | RPC/contract config (env, testnet) | LOW |
| `test/integration/escrow-disputes.test.ts` | 8 passing | Mock client tests | LOW |
| `package.json` | current | + viem | LOW |""",
  dont_touch="""- src/lib/domain/mesh.ts + src/lib/vendor/edge-mesh/ (issues 1-2)
- src/lib/domain/leasing.ts (READ ONLY — import types)
- ALL other src/lib/domain/* — file islands
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#1,#3,#4,#6,#7", merge_order=5, effort="Large (4h+)",
)

# ─────────── Issue 6: AI assistant harvest ───────────
issues[6] = dict(
  title="AI assistant — port harvested ai_skills.ts to src/lib/domain/ai-skills.ts + chat UI (@swal/ui)",
  wave_label="AI (new capability)",
  current="""- .gitcore/harvest/pr1-ai-layers/ai_skills.ts (183 LOC) — SKILLS[] definitions (addWall, addComponent…) with JSON-schema params — harvested from closed PR #1
- No AI feature exists in the app
- No REQ-ID yet — this is a NEW capability (CEO may add REQ-ID at review)
- features.json: NO ai-assistant feature (add it as planned→stable at wave end)""",
  desired="""- Port ai_skills.ts to `src/lib/domain/ai-skills.ts` (keep the SKILLS registry)
- Add executor: `executeSkill(name, params, store)` → applies the skill to floorPlanStore (addWall adds wall component, etc.)
- Chat UI: `AIChat.svelte` in src/lib/ on @swal/ui (Input, Button, Toaster) — text command input, skill detection, execution result as toast
- Wire into App.svelte as a collapsible chat panel (or tab in the right sidebar)
- Tests: unit for executeSkill (each skill applies correctly), component smoke for AIChat
- New feature entry in features.json at wave end: `ai-assistant` stable 85%""",
  web="""1. search: "json schema function calling pattern 2026"
2. search: "svelte 5 chat component input stream 2026"
3. search: "command parser skill detection 2026\"""",
  prompt="""Before implementing:
1. Read .gitcore/harvest/pr1-ai-layers/ai_skills.ts (the registry)
2. Read src/lib/stores/floorPlanStore.svelte.ts (READ ONLY — know the API: addComponent, zones, currentTool)
3. Read @swal/ui components: src/lib/vendor/swal-ui/components/Input.svelte, Button.svelte, Toaster usage in App.svelte
4. Design: SKILLS registry + executeSkill(name, params) mapping to store calls
5. AIChat.svelte: Input + Send button → parse command → execute → toast result
6. Tests: executeSkill cases (addWall creates component), AIChat renders""",
  patterns="""- Skill: { name, description, parameters: { type:'object', properties, required } }
- executeSkill: switch on skill name → floorPlanStore.addComponent({ type, ...params })
- @swal/ui: Input (placeholder), Button (onclick), toast.success('Wall added')
- App.svelte: sidebar section with AIChat (collapsible via <details> or a tab)""",
  acceptance="""- [ ] `ls src/lib/domain/ai-skills.ts` — exists (ported registry)
- [ ] `grep -c "export function executeSkill\\|export const executeSkill" src/lib/domain/ai-skills.ts` >= 1
- [ ] `grep -c "addWall\\|addComponent" src/lib/domain/ai-skills.ts` >= 2 (skills wired)
- [ ] `ls src/lib/AIChat.svelte` — exists
- [ ] `grep -c "@swal/ui" src/lib/AIChat.svelte` >= 1 (vendored UI)
- [ ] `grep -c "toBe(false)" test/unit/ai-skills.test.ts` = 0 (G2) — create the test if missing
- [ ] `wc -l test/unit/ai-skills.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/ai-skills.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/ai-skills.test.ts` — pass
- [ ] `npm run check` + `npm run build` exit 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/ai-skills.ts` | MISSING | Port + executor | MED |
| `src/lib/AIChat.svelte` | MISSING | Chat panel on @swal/ui | MED |
| `src/App.svelte` | shell | Add chat panel section | LOW |
| `test/unit/ai-skills.test.ts` | MISSING | executeSkill cases | LOW |
| `.gitcore/harvest/pr1-ai-layers/ai_skills.ts` | reference | READ ONLY (source) | — |""",
  dont_touch="""- src/lib/domain/mesh.ts, escrow.ts, accounts.ts, discovery.ts (issues 2,4,5,8 own them)
- src/lib/vendor/* — cores
- ALL other src/lib/domain/* — file islands
- .gitcore/features.json — wave end (add ai-assistant entry)""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#1,#3,#4,#5,#7", merge_order=6, effort="Medium (1-4h)",
)

# ─────────── Issue 7: unit placeholders ───────────
issues[7] = dict(
  title="Fill remaining test placeholders — data-model, inventory, maintenance, trust-score, utilities, mesh (G2 sweep)",
  wave_label="QA / Platform",
  current="""- 15 `expect(true).toBe(false)` placeholders across 8 files:
  - test/unit/data-model.test.ts: 2
  - test/unit/inventory.test.ts: 2
  - test/unit/maintenance.test.ts: 2
  - test/unit/trust-score.test.ts: 4
  - test/unit/utilities.test.ts: 1
  - test/integration/inventory-sync.test.ts: 1
  - test/integration/mesh-integration.test.ts: 1
  - test/integration/trust-score.test.ts: 2
- Suite: 154/154 passing (placeholders are in non-failing paths but represent missing coverage)""",
  desired="""- Replace ALL 15 placeholders with real assertions against the actual domain functions
- Read each test file + the domain module it tests; write meaningful assertions (not trivial)
- The placeholder blocks are acceptance criteria from docs/SRS/REQUIREMENTS.md — implement them properly
- Suite must stay green: 154+ passing
- Add a G2 sweep AC: `grep -rc "toBe(false)" test/ | grep -v ":0"` → empty""",
  web="""1. search: "vitest mock indexeddb fake-indexeddb 2026"
2. search: "testing svelte stores runes vitest 2026\"""",
  prompt="""Before implementing:
1. For EACH file: read the domain module it imports (property.ts, inventory.ts, maintenance.ts, trust.ts, utilities.ts, mesh.ts)
2. Read the test file — each placeholder has an acceptance-criteria comment
3. Write real assertions (e.g. validateProperty with bad input → errors array non-empty)
4. Run the full unit+integration suite — must stay 100% green
5. If a placeholder tests something NOT yet implemented in the domain, either implement the domain function or mark the test with a clear TODO comment (do NOT leave toBe(false))""",
  patterns="""- Data-model: validateProperty({...bad}) → expect(result.errors.length).toBeGreaterThan(0)
- Inventory: addItem/updateItem/removeItem round-trip
- Maintenance: scheduleWorkorder/completeWorkorder state flow
- Trust: computeTrustScore with links → tier expectations
- Utilities: splitBill sum = total
- Mesh: authzCheck role matrix
- Use fake-indexeddb if a test needs IndexedDB (jsdom lacks it)""",
  acceptance="""- [ ] `grep -rc "toBe(false)" test/ | grep -v ":0"` → EMPTY (all placeholders gone)
- [ ] `npx vitest run test/unit test/integration 2>&1 | tail -3` — 0 failures (>= 154 passing)
- [ ] Every replaced assertion is against a real domain function (no trivial true===true)
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Placeholders | Change |
|------|--------------|--------|
| `test/unit/data-model.test.ts` | 2 | Real assertions |
| `test/unit/inventory.test.ts` | 2 | Real assertions |
| `test/unit/maintenance.test.ts` | 2 | Real assertions |
| `test/unit/trust-score.test.ts` | 4 | Real assertions |
| `test/unit/utilities.test.ts` | 1 | Real assertions |
| `test/integration/inventory-sync.test.ts` | 1 | Real assertions |
| `test/integration/mesh-integration.test.ts` | 1 | Real assertions |
| `test/integration/trust-score.test.ts` | 2 | Real assertions |""",
  dont_touch="""- test/e2e/* (issue 3 owns them)
- src/lib/* — NO source changes unless a placeholder exposes a real bug (then fix + test)
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#1,#3,#4,#5,#6", merge_order=7, effort="Medium (1-4h)",
)

# ─────────── Issue 8: verified-invitations real links ───────────
issues[8] = dict(
  title="Verified invitations — real link proofs (in-house OAuth pattern), trust-score wiring",
  wave_label="Network (M5)",
  current="""- verified-invitations (95% stable): token generate/verify/revoke/audit — all tested
- trust-score (88% stable): addLink/verifyLink with typed proof validation (shape-only)
- Proof validation is a stub: checks proof has expected shape, no real OAuth flow
- Decision (CEO): in-house OAuth link proofs (chosen over Proof/Persona)""",
  desired="""- Real link-proof flow for payment-history and review-history providers:
  - `startLinkFlow(provider)` → returns OAuth URL/state (typed — actual OAuth2 flow for a demo provider, e.g. a mock provider endpoint)
  - `completeLinkFlow(state, callbackParams)` → validates state, fetches the profile, stores proof { provider, proofId, claims, verifiedAt }
  - `verifyLink(link)` → REAL verification: checks proof has proofId + claims + verifiedAt + signature/structure per provider
- wire into trust-score: computeTrustScore uses verified links only (unverified excluded)
- Demo provider endpoint: in-memory mock (tests) + config for real provider URL
- trust-score → 95%+""",
  web="""1. search: "oauth2 authorization code flow pkce typescript 2026"
2. search: "openid connect claims verification 2026"
3. search: "verifiable credential proof format 2026\"""",
  prompt="""Before implementing:
1. Read src/lib/domain/trust.ts + invitations.ts FULLY
2. Research OAuth2 PKCE flow (authorization code + state)
3. Design: LinkProvider interface { startFlow, completeFlow, verifyProof } with impl for payment-history/review-history
4. Add src/lib/domain/links.ts (provider flows) — trust.ts imports verify from there
5. computeTrustScore filters links by link.verified === true
6. Tests: mock provider, complete flow, verify link, score uses verified only""",
  patterns="""- LinkProvider: { provider, startFlow(): { url, state }, completeFlow(state, params): Link, verifyProof(link): boolean }
- OAuth: state = crypto random; callback validates state matches
- Link: { id, provider, proofId, claims, verified, verifiedAt }
- trust.ts: computeTrustScore(links) → only links.filter(l => l.verified)
- Mock provider in tests: completeFlow returns fixed claims""",
  acceptance="""- [ ] `ls src/lib/domain/links.ts` — exists (provider flows)
- [ ] `grep -c "startFlow\\|completeFlow" src/lib/domain/links.ts` >= 2
- [ ] `grep -c "verified" src/lib/domain/trust.ts` >= 3 (score uses verified only)
- [ ] `grep -c "toBe(false)" test/unit/trust-score.test.ts test/integration/trust-score.test.ts` = 0 (G2)
- [ ] `npx vitest run test/unit/trust-score.test.ts test/integration/trust-score.test.ts` — pass
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/links.ts` | MISSING | OAuth provider flows | MED |
| `src/lib/domain/trust.ts` | 88% | Use verified links only | MED |
| `test/unit/trust-score.test.ts` | placeholders | Real flow tests | LOW |
| `test/integration/trust-score.test.ts` | placeholders | Mock provider flow | LOW |""",
  dont_touch="""- src/lib/domain/mesh.ts + vendor (issues 1-2)
- src/lib/domain/escrow.ts (issue 5)
- ALL other src/lib/domain/* — file islands
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="", parallel="#1,#3,#4,#5,#6,#7", merge_order=8, effort="Medium (1-4h)",
)

# ─────────── Issue 9: UI polish + tokens ───────────
issues[9] = dict(
  title="UI polish — token consistency sweep, a11y fixes, edge-hive-admin parity",
  wave_label="UI / Design system",
  current="""- UI on @swal/ui (vendored) — shell + Toolbar + FloorSelector + CanvasStage + AIChat (after issue 6)
- svelte-check: 1 a11y warning (button label)
- G4 applies: NO prototype palette anywhere
- @swal/ui parity gaps (from wave-0 audit): DeployNodeModal, MetricsChart not ported (only if NIDO needs them)""",
  desired="""- G4 sweep: replace any remaining hardcoded colors with --swal-* tokens (bg #020617, surface #0f172a, accent #06b6d4, orange #f97316, text #f1f5f9, border)
- Fix the a11y warning (svelte-check to 0 warnings if feasible)
- Ensure 2D/3D view toggle + tabs have proper aria states
- Check contrast: text on surface meets AA for interactive elements
- Add data-testid attributes where e2e specs (issue 3) need them
- (Optional) port MetricsChart from edge-hive-admin if analytics view needs a chart — else skip with comment""",
  web="""1. search: "wcag aa contrast check colors 2026"
2. search: "svelte 5 a11y aria attributes button 2026\"""",
  prompt="""Before implementing:
1. `grep -rnE "#[0-9a-fA-F]{6}" src/ | grep -v vendor` — find all hardcoded colors
2. Map each to the --swal-* token system (check src/lib/vendor/swal-ui/tokens/theme.css)
3. Fix a11y: run `npm run check`, address warnings (aria-label on icon buttons)
4. Add data-testid to: view toggle buttons, floor buttons, toolbar tools (e2e uses them)
5. Contrast check on primary surfaces""",
  patterns="""- Colors → var(--swal-*, fallback)
- Icon-only buttons → aria-label
- data-testid: 'view-2d', 'view-3d', 'floor-<id>', 'tool-<id>'
- Keep blueprint canvas colors via config (house-data.json) — but config values already Hive Dark""",
  acceptance="""- [ ] `grep -rnE "#[0-9a-fA-F]{6}" src/ | grep -v vendor | grep -v "house-data"` — only --swal-* fallbacks remain (<= 5 matches, each with var(--swal))
- [ ] `npm run check` — 0 errors (warnings reduced or documented)
- [ ] `grep -c "aria-label" src/App.svelte src/lib/Toolbar.svelte src/lib/FloorSelector.svelte` >= 3 (a11y)
- [ ] `grep -c "data-testid" src/App.svelte src/lib/*.svelte` >= 4 (e2e hooks)
- [ ] `npm run build` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] G4: `grep -cE "#1e3a5f|#87ceeb|#4dd0e1" src/lib/` = 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/App.svelte` | shell | aria-labels, data-testid, tokens | LOW |
| `src/lib/Toolbar.svelte` | @swal/ui | aria/data-testid | LOW |
| `src/lib/FloorSelector.svelte` | @swal/ui | aria/data-testid | LOW |
| `src/lib/CanvasStage.svelte` | tokens applied | remaining hardcoded → tokens | LOW |
| `src/app.css` | base | token consistency | LOW |""",
  dont_touch="""- src/lib/vendor/* — cores (never edit vendored UI)
- src/lib/domain/* — issues 1-8 own them
- test/* — issues 3,7 own tests
- .gitcore/features.json — wave end""",
  guard=GUARD_TMPL,
  pr_delivery=PR_DELIVERY,
  depends="#6 (AIChat exists)", parallel="#1,#3,#4,#5,#7,#8", merge_order=9, effort="Medium (1-4h)",
)

# ─────────── Issue 10: wave close ───────────
issues[10] = dict(
  title="Wave 3 close — integrate PRs in order, reconcile features.json (100% target), write wave-3-analysis.md",
  wave_label="Integration",
  current="""- 9 PRs expected from issues 1-9 (this wave)
- Master = 2f367cc (wave-2 close)
- features.json: 22 stable / 1 partial (mesh) / 0 planned
- 154/154 unit+integration passing; e2e after issue 3""",
  desired="""- Merge wave-3 PRs in dependency order (1→9): vendor → transport → e2e → webauthn → escrow-polygon → ai → placeholders → links → ui-polish
- Resolve conflicts with merge commits in worktrees (NO force-push — user blocks it)
- Run: npm run check, npm run build, npx vitest run, npx playwright test (if runnable)
- Reconcile features.json → ALL 23 features stable (mesh-integration → stable 85%+, escrow → 100%, accounts → 100%, trust → 95%) + new ai-assistant feature
- Write .gitcore/waves/wave-3-analysis.md (verdicts per issue + lessons for v1.0)
- Update docs/SWAL/NIDO_PLAN.md roadmap status (M5 complete)
- Result: 100% features stable, tests green, master pushed""",
  web="""1. search: "git worktree merge conflict resolution 2026"
2. search: "release readiness checklist 2026\"""",
  prompt="""Before implementing:
1. List PRs: gh pr list --repo iberi22/floor-plan-designer --state open
2. Read .gitcore/waves/wave-2-analysis.md (protocol reference)
3. Merge in dependency order; for each: worktree → merge master → resolve → push → gh pr merge
4. Reconcile features.json with REAL progress (verify tests, not claims)
5. Write wave-3-analysis.md + update NIDO_PLAN.md
6. Mark the repo READY for v1.0 review (rename to iberi22/nido is CEO admin, note it)""",
  patterns="""- Merge protocol: worktree + merge commit + push normal + gh pr merge (no force-push, no reset --hard)
- features.json: verify each feature's tests before marking stable
- Analysis: .gitcore/waves/wave-N-analysis.md (Summary, verdicts, patterns, lessons)""",
  acceptance="""- [ ] `gh pr list --repo iberi22/floor-plan-designer --state open` → 0 open PRs
- [ ] `npx vitest run test/unit test/integration 2>&1 | tail -3` — 0 failures
- [ ] `npm run check` + `npm run build` — 0 errors
- [ ] `python3 -c "import json; d=json.load(open('.gitcore/features.json')); print(sum(1 for f in d['features'] if f['status']=='stable'))"` — ALL stable
- [ ] `.gitcore/waves/wave-3-analysis.md` exists with verdicts
- [ ] `git log origin/master --oneline -5` — merge commits present
- [ ] `git status` clean""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `.gitcore/features.json` | 22 stable/1 partial | All stable + ai-assistant | LOW |
| `.gitcore/waves/wave-3-analysis.md` | MISSING | Wave close report | LOW |
| `docs/SWAL/NIDO_PLAN.md` | M0-M5 roadmap | Mark M5 complete | LOW |""",
  dont_touch="""- Source files owned by issues 1-9 — integrate, don't rewrite
- src/lib/vendor/* cores
- Stable features — keep green""",
  guard="""## Anti-Hallucination Guard ⚠️
1. **NO force-push** — user blocks; merge commits in worktrees
2. **NO reset --hard** — user blocks; checkout selectivo
3. **Verify with real commands** — git log/vitest evidence for every verdict
4. **Don't "fix" skeletons of unimplemented features** — there should be none after issue 7
5. **features.json = source of truth** — update to match reality
6. **G2** — test files with `toBe(false)` placeholders are FAILED AC; `wc -l` >= 20""",
  pr_delivery="""## PR Delivery Requirements
- Integration is committed to master directly (merge commits), NOT a PR — unless a substantial conflict resolution warrants review""",
  depends="ALL (1-9)", parallel="—", merge_order=10, effort="Large (4h+)",
)

# ─────────── Write bodies ───────────
for num in range(1, 11):
    it = issues[num]
    body = header(num, it["title"], it["wave_label"])
    body += f"""## Current State (MEASURABLE)
{it["current"]}

## Desired State (DELTA)
{it["desired"]}

## 🌐 Web Research Required
**MANDATORY — research before implementing.**
{it["web"]}

## 🔬 Agent Session Prompt
{it["prompt"]}

## Existing Code Patterns (FOLLOW THESE)
{it["patterns"]}

## Acceptance Criteria (COMMAND-VERIFIABLE)
{it["acceptance"]}

{it["pr_delivery"]}

## Files to Modify
{it["files"]}

## DO NOT touch (Anti-Regression)
{it["dont_touch"]}

{it["guard"]}

## Verification
```bash
# Build + type check
npm run build && npm run check

# Unit + integration tests for this issue
npx vitest run <the test files listed in Acceptance Criteria>

# No regressions
npx vitest run 2>&1 | tail -3
```

{footer(num, it["depends"], it["parallel"], num, it["effort"])}
"""
    p = os.path.join(OUT, f"body-{num:02d}.md")
    with open(p, "w") as fh:
        fh.write(body)
    print(f"✅ {p} ({len(body.splitlines())} lines)")

import json
FEATS = {1: ["mesh-integration"], 2: ["mesh-integration"], 3: ["toolchain-ci"],
         4: ["accounts-auth"], 5: ["escrow-disputes"], 6: ["ai-assistant"],
         7: ["gitcore-compliance"], 8: ["trust-score", "verified-invitations"],
         9: ["ui-swal"], 10: ["wave-3-close"]}
manifest = {"repo": REPO, "wave": "nido-wave3",
            "issues": {str(n): {"body": os.path.join(OUT, f"body-{n:02d}.md"),
                                 "features": FEATS[n], "title": issues[n]["title"]} for n in range(1, 11)}}
with open(os.path.join(OUT, "manifest.json"), "w") as fh:
    json.dump(manifest, fh, indent=2)
print(f"\n📦 manifest: {os.path.join(OUT, 'manifest.json')}")
