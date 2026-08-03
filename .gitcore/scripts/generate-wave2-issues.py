#!/usr/bin/env python3
"""Generate Wave 2 issue bodies for NIDO (10 issues, Jules dispatch).

Lessons from wave 1 baked into every body:
  G1 ANTI-FALSE-POSITIVE: AC requires `git show HEAD --name-only | grep -E "src/|lib/"` >= 1
  G2 TEST-EMPTY GUARD: AC requires `wc -l` >= 20 on every test file + `grep -c "describe\\|it("` >= 3
  G3 CORE-VENDORED: @swal/ui already vendored at src/lib/vendor/swal-ui — import from there,
     NEVER create your own copy. For edge-mesh (#7): vendor it the same way.
Rule: create WITHOUT jules label → verify file islands → re-read → THEN label.
"""
import os

OUT = os.path.expanduser("~/.hermes/waves/nido-wave2")
os.makedirs(OUT, exist_ok=True)
REPO = "iberi22/floor-plan-designer"

CTX = """## Context (from Xavier, 2026-08-03 — wave 1 CLOSED)

- **Product:** NIDO = intelligent home administration (plans + rules + measures +
  taxes, leasing, parts inventory, costs, maintenance, utilities). Later: private
  GPS-proximity rental network with cross-app verified accounts (M5).
- **Wave 1 status:** 6 Jules PRs merged (#14,#17,#18,#19,#20,#21) + PR #2 dependabot.
  13/23 features stable (data-model, norms, inventory, costs, maintenance,
  analytics, utilities, taxes, export-cad, pwa-offline, gitcore-compliance,
  toolchain-ci, ui-swal). Master = 00911c9. **58 unit tests passing.**
- **@swal/ui is VENDORED** at `src/lib/vendor/swal-ui` (file: dep in package.json,
  types in index.d.ts, tokens at `@swal/ui/tokens`). **IMPORT from there — NEVER
  create your own UI library** (wave-1 failure P1: Jules forked the core because
  the package wasn't on npm; now it's vendored, use it).
- **UI RULE:** edge-hive-admin is the lab reference UI; replicated via @swal/ui.
  NO shadcn-svelte, NO project-local Tailwind (PR #3 rejected with evidence).
- **Cores (do not fork):** mesh = edge-mesh · memory = Xavier (:8006) · UI = @swal/ui.
- **features.json:** `.gitcore/features.json` is source of truth (23 features,
  13 stable, 10 planned — this wave targets the 10 planned).
- **Tests:** skeleton test files already exist under `test/` with
  `expect(true).toBe(false)` placeholders. IMPLEMENT the real assertions.
  **G2 GUARD: a test file with < 20 lines or 0 real cases FAILS the AC.**
- **G1 GUARD (anti-false-positive):** verify `git show HEAD --name-only` lists the
  SOURCE files you claim before committing. A commit whose message describes
  changes not present in the diff is a FALSE POSITIVE (wave-1 PRs #22/#23).
"""

def header(num, title, wave_label):
    return f"""# [Wave 2.{num:02d}] {title}

> Wave 2 — {wave_label}. Labels: `wave-2`, `nido`
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
| `npm run check` (svelte-check) fails | Fix type errors before commit |
| Test file is empty (0 lines) | G2: write >= 20 lines with real describe/it cases — empty test = FAILED AC |
| PR would have 0 source files | G1: check `git status` + `git show HEAD --name-only` — never open an empty PR |
| `@swal/ui` import fails | It's vendored at `src/lib/vendor/swal-ui` — import from there |
| File doesn't exist | Run `find . -name "<filename>"` to locate it |
| PR conflicts with parallel work | Rebase on master, re-run verification |
"""

# ─────────── Issue 1: plans-2d ───────────
issues = {}
issues[1] = dict(
  title="2D plan editor v2 — wall drawing, zone drag-create, measurements (Konva + @swal/ui)",
  wave_label="Plans",
  current="""- `src/lib/CanvasStage.svelte` (530 LOC) — Konva canvas: draws zones (rects) + labels, blueprint colors
- `src/lib/Toolbar.svelte` (141 LOC) — REBUILT on @swal/ui Button (wave-1 close): tools Select/Measure/Delete + library (wall/door/window/furniture/car/moto)
- `src/lib/FloorSelector.svelte` (95 LOC) — REBUILT on @swal/ui Button: floor tabs
- `src/lib/stores/floorPlanStore.svelte.ts` — runes store (floors, zones, currentTool, setTool, setFloor)
- features.json: `plans-2d` at 0% (planned)""",
  desired="""- `CanvasStage.svelte`: implement interactive wall-drawing (click-drag segments with live length in meters), zone drag-rectangle creation, room markers, measurement display, selection highlight
- Use the store's tool state (currentTool: select/wall/zone/room/measure/delete) — wire Toolbar buttons to canvas behavior
- Blueprint aesthetic preserved (blue bg + Hive accent tokens for selection/highlight)
- Implement REAL assertions in `test/unit/plans-2d.test.ts` + `test/e2e/plans-2d.spec.ts` (G2: >= 20 lines, >= 3 cases each)""",
  web="""1. search: "konva svelte-konva draw line wall editor 2026"
2. search: "konva drag rectangle creation transformer 2026"
3. search: "konva measurement line length display 2026"
4. search: "svelte 5 konva reactive redraw pattern 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/CanvasStage.svelte`, `Toolbar.svelte`, `FloorSelector.svelte` FULLY
2. Read `src/lib/stores/floorPlanStore.svelte.ts` (READ-ONLY — data-model owns it, but read to know the API: currentTool, setTool, floors, zones)
3. Research Konva Line/Rect/Transformer APIs (web)
4. Run `npm run dev` to see current canvas behavior
5. Check @swal/ui Button API in src/lib/vendor/swal-ui/components/Button.svelte""",
  patterns="""- Konva: `<Stage>`, `<Layer>`, `<Rect>`, `<Line>`, `<Text>` from svelte-konva (already in deps)
- Store: `floorPlanStore.currentTool`, `floorPlanStore.setTool(id)` from floorPlanStore.svelte.ts
- @swal/ui: `import { Button } from '@swal/ui'` (vendored)
- Blueprint colors from house-data.json config (blueprint_bg #1e3a5f, blueprint_line #87ceeb)""",
  acceptance="""- [ ] `grep -c "wall\\|Wall" src/lib/CanvasStage.svelte` >= 2 (wall drawing present)
- [ ] `grep -c "currentTool" src/lib/CanvasStage.svelte` >= 1 (tool-driven behavior)
- [ ] `grep -c "measure\\|Measure" src/lib/CanvasStage.svelte` >= 1 (measurements)
- [ ] `grep -c "toBe(false)" test/unit/plans-2d.test.ts test/e2e/plans-2d.spec.ts` = 0 (G2: no placeholders)
- [ ] `wc -l test/unit/plans-2d.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/plans-2d.test.ts` >= 3 (G2)
- [ ] `grep -c "shadcn\\|@tailwind" src/lib/` = 0 (no shadcn/Tailwind)
- [ ] `npx vitest run test/unit/plans-2d.test.ts` — passes
- [ ] `npm run check` + `npm run build` exit 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1 (source files committed)""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/CanvasStage.svelte` | 530 LOC zones-only | Wall drawing, zone drag-create, measurements, tool wiring | HIGH |
| `test/unit/plans-2d.test.ts` | skeleton (placeholders) | Implement real assertions (>=20 lines) | LOW |
| `test/e2e/plans-2d.spec.ts` | skeleton | Implement e2e (draw wall, add zone, measure) | LOW |""",
  dont_touch="""- `src/lib/Scene3D.svelte` + `src/lib/floors/*` (issue 2)
- `src/lib/domain/*` (issues 3-10)
- `src/lib/stores/floorPlanStore.svelte.ts` + `src/lib/domain/property.ts` (data-model — READ ONLY)
- `.gitcore/features.json` — reconciled at wave end""",
  guard="""1. **Store is READ-ONLY** — issue data-model owns floorPlanStore; import its API, don't modify
2. **G1 anti-false-positive** — verify `git show HEAD --name-only` lists CanvasStage.svelte before commit; a commit touching only package files FAILS
3. **G2 test-empty** — test files must have real assertions, no `toBe(false)`, >= 20 lines
4. **@swal/ui vendored** — import from src/lib/vendor/swal-ui, never create your own UI lib
5. **No shadcn/Tailwind** — UI rule
6. **READ before write** — read each file fully first""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1 — the commit MUST contain source files (not just package.json). If only package files: DO NOT open the PR, keep working.
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ─────────── Issue 2: plans-3d ───────────
issues[2] = dict(
  title="3D viewer — lazy-load Three.js + OrbitControls, code-split, store-derived scene",
  wave_label="Plans",
  current="""- `src/lib/Scene3D.svelte` (218 LOC) — Three.js viewer: simple scene from floors/zones, static camera
- `src/lib/floors/GroundFloor.svelte` (121 LOC) + `ApartmentFloor.svelte` (136 LOC) — floor wrappers
- three ^0.182 + @types/three in devDeps
- Bundle: single chunk >500KB (no code splitting) — 3D must be lazy-loaded
- features.json: `plans-3d` at 0% (planned)""",
  desired="""- `Scene3D.svelte`: scene derived from floorPlanStore (single source of truth), walls extruded by floor height_m, zone colors, floor switching
- OrbitControls camera (rotate/zoom/pan) — dynamic import
- **Lazy-load:** dynamic `import('three')` + `import('./Scene3D.svelte')` so 3D is a separate chunk; initial bundle < 500KB
- GroundFloor/ApartmentFloor refactored to consume store-derived data (or deleted if generic)
- Implement REAL assertions in `test/unit/plans-3d.test.ts` + `test/e2e/plans-3d.spec.ts` (G2: >= 20 lines)""",
  web="""1. search: "three.js orbitcontrols import example 2026"
2. search: "svelte 5 dynamic import lazy load component 2026"
3. search: "vite manualChunks code splitting three.js 2026"
4. search: "three.js extrude walls from floor plan height 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/Scene3D.svelte`, `src/lib/floors/*.svelte` FULLY
2. Read `src/lib/stores/floorPlanStore.svelte.ts` (READ-ONLY — data-model owns it)
3. Research Three.js OrbitControls + ExtrudeGeometry (web)
4. Check current bundle: `npm run build` and inspect dist/ chunks
5. Check how App.svelte mounts Scene3D (currentView === '3d')""",
  patterns="""- Three.js: `import * as THREE from 'three'` (dynamic), `THREE.Scene`, `THREE.WebGLRenderer`, OrbitControls from 'three/addons/controls/OrbitControls.js'
- Store-derived: zones → extruded boxes (width x height_m x depth)
- Lazy: `{@await import('./Scene3D.svelte')}` pattern in App.svelte (already present per wave-1)""",
  acceptance="""- [ ] `grep -c "OrbitControls" src/lib/Scene3D.svelte` >= 1
- [ ] `grep -c "import(.*three\\|import(.*Scene3D" src/App.svelte src/lib/Scene3D.svelte` >= 1 (lazy loading)
- [ ] `grep -c "height_m" src/lib/Scene3D.svelte` >= 1 (extrusion)
- [ ] `grep -c "toBe(false)" test/unit/plans-3d.test.ts test/e2e/plans-3d.spec.ts` = 0 (G2)
- [ ] `wc -l test/unit/plans-3d.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/plans-3d.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/plans-3d.test.ts` — passes
- [ ] `npm run build` — dist has >= 2 JS chunks (3D code-split)
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/Scene3D.svelte` | 218 LOC | OrbitControls, store-derived scene, lazy three import | HIGH |
| `src/lib/floors/GroundFloor.svelte` | 121 LOC | Refactor to store-derived or remove | MED |
| `src/lib/floors/ApartmentFloor.svelte` | 136 LOC | Refactor to store-derived or remove | MED |
| `test/unit/plans-3d.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/e2e/plans-3d.spec.ts` | skeleton | Implement | LOW |""",
  dont_touch="""- `src/lib/CanvasStage.svelte` + Toolbar/FloorSelector (issue 1)
- `src/lib/domain/*` (issues 3-10)
- `src/lib/stores/floorPlanStore.svelte.ts` (READ ONLY)
- `.gitcore/features.json` — wave end""",
  guard="""1. **Single source of truth** — 3D derives from floorPlanStore, never duplicate plan data
2. **Lazy-load mandatory** — three.js must be a separate chunk; check dist output
3. **Store READ-ONLY** — data-model owns it
4. **G1/G2 guards** — source files in commit; real tests >= 20 lines
5. **No shadcn/Tailwind** — UI rule
6. **READ before write** — read files fully first""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1 — source files REQUIRED. Wave-1 PR #22 was a false positive (message claimed Scene3D work, only package files committed). DO NOT repeat that.
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 3: accounts-auth ───────────
issues[3] = dict(
  title="Accounts & auth — localAuth + recovery seed + WebAuthn + roles",
  wave_label="Accounts",
  current="""- No auth code exists
- `src/lib/domain/` has property.ts, norms.ts, inventory.ts, costs.ts, utilities.ts, taxes.ts, maintenance.ts, analytics.ts, export.ts (all stable)
- features.json: `accounts-auth` at 0% (planned)""",
  desired="""- `src/lib/domain/accounts.ts`:
  - `createAccount(name)` → { id, name, seedPhrase, createdAt } — seed phrase generated (12 words, BIP39-style)
  - `confirmSeed(account, phrase)` → boolean (verification)
  - Roles: `export type Role = 'admin' | 'propietario' | 'inquilino' | 'supervisor'`
  - `assignRole(account, role)` — owner defaults to 'admin'
  - `createInstance()` → instance_id (UUID) for workspace isolation (REQ-004)
  - WebAuthn stub: `isWebAuthnAvailable()`, `enrollBiometric()` (returns credential id), `authenticateBiometric()` (boolean) — implement with @simplewebauthn/browser if installable, else typed stub with clear TODO
- Offline-first: account persisted to localStorage (via store or direct)
- Implement REAL assertions in `test/unit/accounts-auth.test.ts` + `test/integration/accounts-auth.test.ts` (G2)""",
  web="""1. search: "bip39 mnemonic typescript generate 2026"
2. search: "@simplewebauthn/browser svelte 5 2026"
3. search: "typescript uuid v4 browser crypto.randomUUID 2026"
4. search: "offline-first account creation localstorage pattern 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` (READ-ONLY — type patterns)
2. Skim `/home/belal/proyectosSWAL/shelf/apps/shelf-inventory/lib/localAuth.ts` for the seed/auth pattern (shelf is the reference)
3. Research BIP39 mnemonic generation (web) — a simple wordlist + 128-bit entropy is fine
4. Keep it offline-first: no server dependency (REQ-018)""",
  patterns="""- Pure TS functions; types from property.ts style
- Seed: `crypto.getRandomValues` for entropy; wordlist const array
- crypto.randomUUID() for ids (browser)
- Roles as union type""",
  acceptance="""- [ ] `grep -c "export function createAccount\\|export const createAccount" src/lib/domain/accounts.ts` >= 1
- [ ] `grep -c "seedPhrase\\|seed" src/lib/domain/accounts.ts` >= 2
- [ ] `grep -c "admin.*propietario.*inquilino.*supervisor\\|export type Role" src/lib/domain/accounts.ts` >= 1
- [ ] `grep -c "createInstance\\|instance_id" src/lib/domain/accounts.ts` >= 1
- [ ] `grep -c "toBe(false)" test/unit/accounts-auth.test.ts test/integration/accounts-auth.test.ts` = 0 (G2)
- [ ] `wc -l test/unit/accounts-auth.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/accounts-auth.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/accounts-auth.test.ts test/integration/accounts-auth.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/accounts.ts` | MISSING | Create accounts service (seed, roles, instance, WebAuthn) | MED |
| `test/unit/accounts-auth.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/integration/accounts-auth.test.ts` | skeleton | Implement instance isolation test | LOW |""",
  dont_touch="""- ALL other `src/lib/domain/*` files (issues 1,2,4-10 own them)
- UI files (issues 1,2) · `.gitcore/features.json` — wave end""",
  guard="""1. **Pure functions** — no DOM in accounts.ts except localStorage/WebAuthn stubs
2. **Seed security** — never log the seed; return it once
3. **G1/G2 guards** — source files in commit; real tests
4. **Don't touch other domain files** — file islands
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1 — accounts.ts MUST be in the commit
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 4: verified-invitations ───────────
issues[4] = dict(
  title="Verified 1-time invitations — token generate/verify, expiry, revoke, audit",
  wave_label="Accounts",
  current="""- No invitation/token code exists
- Reference pattern: `portafolio-mimatera/server.py` — 1-time-use token generate/verify (monorepo, EXTERNAL business but pattern reusable)
- features.json: `verified-invitations` at 0% (planned)""",
  desired="""- `src/lib/domain/invitations.ts`:
  - `generateToken(role, expiresInDays)` → { token, role, expiresAt, used: false } — URL-safe (base64url of crypto random, 24 bytes)
  - `verifyToken(token, store)` → consumes token (1-time), creates session { id, role, createdAt, expiresAt }
  - `revokeToken(token, store)` → marks revoked
  - `auditLog` — array of { action, tokenId, role, at } entries
  - Role scoped at creation: propietario/inquilino/supervisor
- In-memory store + localStorage persistence
- Implement REAL assertions in `test/unit/verified-invitations.test.ts` + `test/integration/verified-invitations.test.ts` (G2)""",
  web="""1. search: "base64url random token generation node crypto 2026"
2. search: "one-time-use token verify consume pattern typescript 2026"
3. search: "token expiry revoke audit trail pattern 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` (type patterns)
2. Read `/home/belal/proyectosSWAL/portafolio-mimatera/server.py` — the 1-time token generate/verify pattern (search for 'token' functions)
3. Design: token = crypto.getRandomValues(24) → base64url; verify consumes it atomically
4. Pure functions + a TokenStore interface (in-memory impl + localStorage)""",
  patterns="""- Token: `crypto.getRandomValues(new Uint8Array(24))` → base64url encode
- Verify: find token → if used/expired/revoked return error → mark used → create session
- Store: simple array + localStorage sync
- Audit: append-only array of entries""",
  acceptance="""- [ ] `grep -c "export function generateToken\\|export const generateToken" src/lib/domain/invitations.ts` >= 1
- [ ] `grep -c "verifyToken" src/lib/domain/invitations.ts` >= 1
- [ ] `grep -c "revokeToken" src/lib/domain/invitations.ts` >= 1
- [ ] `grep -c "audit" src/lib/domain/invitations.ts` >= 1
- [ ] `grep -c "base64url\\|btoa\\|Buffer" src/lib/domain/invitations.ts` >= 1 (URL-safe token)
- [ ] `grep -c "toBe(false)" test/unit/verified-invitations.test.ts test/integration/verified-invitations.test.ts` = 0 (G2)
- [ ] `wc -l test/unit/verified-invitations.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/verified-invitations.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/verified-invitations.test.ts test/integration/verified-invitations.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/invitations.ts` | MISSING | Create token service (generate/verify/revoke/audit) | MED |
| `test/unit/verified-invitations.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/integration/verified-invitations.test.ts` | skeleton | Implement token→session flow | LOW |""",
  dont_touch="""- ALL other `src/lib/domain/*` files (issues 1-3,5-10 own them)
- UI files · `.gitcore/features.json` — wave end""",
  guard="""1. **1-time-use is atomic** — verify must consume the token in the same call
2. **URL-safe tokens** — base64url, not base64 (no +/ chars)
3. **G1/G2 guards** — source files; real tests
4. **Don't touch other domain files** — file islands
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 5: leasing ───────────
issues[5] = dict(
  title="Leasing — contracts with eSignature, rent collection, deposits, screening",
  wave_label="Leasing",
  current="""- No leasing code exists
- `src/lib/domain/property.ts` has Lease type: { id, tenantName?, rentAmount?, startDate?, endDate? }
- features.json: `leasing` at 0% (planned)""",
  desired="""- `src/lib/domain/leasing.ts`:
  - `createLease(property, { tenantId, rent, deposit, startDate, endDate, servicesIncluded })` → Lease with id, status: 'draft' | 'signed' | 'active' | 'ended'
  - `signLease(lease, signature)` — eSignature: signature = hash of lease JSON (SHA-256 hex); returns signed lease (ML-DSA-65 real signing is M5/edge-mesh scope — this is the app-level signature)
  - `createInvoice(lease, month)` → { id, leaseId, amount, dueDate, status: 'pending' | 'paid' | 'late', paidAt? }
  - `markInvoicePaid(invoice)` → status 'paid'
  - `isLate(invoice, now)` → status 'late' if past due
  - `paymentHistory(lease, invoices)` → sorted list
- Implement REAL assertions in `test/unit/leasing.test.ts` + `test/integration/leasing-payments.test.ts` (G2)""",
  web="""1. search: "sha-256 hash typescript crypto subtle 2026"
2. search: "invoice due date late status typescript 2026"
3. search: "lease contract state machine draft signed active 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` Lease type (READ-ONLY)
2. Read `src/lib/domain/costs.ts` (transaction pattern reference)
3. Design lease state machine: draft → signed → active → ended
4. eSignature: `crypto.subtle.digest('SHA-256', text)` → hex string""",
  patterns="""- Lease status union: 'draft' | 'signed' | 'active' | 'ended'
- Invoice status union: 'pending' | 'paid' | 'late'
- Date math with ISO strings; isLate compares dueDate < today
- SHA-256 via crypto.subtle.digest""",
  acceptance="""- [ ] `grep -c "export function createLease\\|export const createLease" src/lib/domain/leasing.ts` >= 1
- [ ] `grep -c "signLease" src/lib/domain/leasing.ts` >= 1
- [ ] `grep -c "createInvoice" src/lib/domain/leasing.ts` >= 1
- [ ] `grep -c "markInvoicePaid\\|isLate" src/lib/domain/leasing.ts` >= 1
- [ ] `grep -c "SHA-256\\|sha-256\\|digest" src/lib/domain/leasing.ts` >= 1 (eSignature hash)
- [ ] `grep -c "toBe(false)" test/unit/leasing.test.ts test/integration/leasing-payments.test.ts` = 0 (G2)
- [ ] `wc -l test/unit/leasing.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/leasing.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/leasing.test.ts test/integration/leasing-payments.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/leasing.ts` | MISSING | Create leasing service (leases, eSignature, invoices) | MED |
| `test/unit/leasing.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/integration/leasing-payments.test.ts` | skeleton | Implement invoice→payment→receipt flow | LOW |""",
  dont_touch="""- ALL other `src/lib/domain/*` files (issues 1-4,6-10 own them)
- UI files · `.gitcore/features.json` — wave end""",
  guard="""1. **Lease type from property.ts** — import, don't redefine
2. **Invoice math** — amounts rounded to 2 decimals
3. **G1/G2 guards** — source files; real tests
4. **Don't touch other domain files** — file islands
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 6: tenant-portal ───────────
issues[6] = dict(
  title="Tenant portal — lease view, rent payment, issue reporting, P2P chat",
  wave_label="Leasing",
  current="""- No tenant code exists
- `src/lib/domain/leasing.ts` will exist (issue 5 — this issue depends on it)
- features.json: `tenant-portal` at 0% (planned)""",
  desired="""- `src/lib/domain/tenant.ts`:
  - `getTenantLease(leases, tenantId)` → lease or null
  - `getPaymentStatus(lease, invoices)` → { nextDue, amount, status: 'paid' | 'pending' | 'late' }
  - `reportIssue(issues, { tenantId, description, severity })` → Issue { id, tenantId, description, severity: 'low'|'medium'|'high', status: 'open'|'in_progress'|'resolved', createdAt }
  - `updateIssueStatus(issues, issueId, status)` → updated
  - `receiptFor(invoice)` → { id, amount, paidAt, leaseId } (downloadable data)
- Implement REAL assertions in `test/unit/tenant-portal.test.ts` + `test/e2e/tenant-portal.spec.ts` (G2)""",
  web="""1. search: "issue tracking status flow typescript 2026"
2. search: "tenant portal lease payment status pattern 2026"
3. search: "receipt generation data model 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` Lease type (READ-ONLY)
2. If `src/lib/domain/leasing.ts` exists (issue 5 merged), import Invoice/Lease from it; else import from property.ts
3. Issue severity union: low/medium/high; status flow: open → in_progress → resolved
4. Pure functions""",
  patterns="""- Issue type: { id, tenantId, description, severity, status, createdAt }
- Status union: 'open' | 'in_progress' | 'resolved'
- Receipt: derived from invoice + lease""",
  acceptance="""- [ ] `grep -c "export function getTenantLease\\|export const getTenantLease" src/lib/domain/tenant.ts` >= 1
- [ ] `grep -c "getPaymentStatus" src/lib/domain/tenant.ts` >= 1
- [ ] `grep -c "reportIssue" src/lib/domain/tenant.ts` >= 1
- [ ] `grep -c "updateIssueStatus" src/lib/domain/tenant.ts` >= 1
- [ ] `grep -c "receipt" src/lib/domain/tenant.ts` >= 1
- [ ] `grep -c "toBe(false)" test/unit/tenant-portal.test.ts` = 0 (G2)
- [ ] `wc -l test/unit/tenant-portal.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/tenant-portal.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/tenant-portal.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/tenant.ts` | MISSING | Create tenant portal service | MED |
| `test/unit/tenant-portal.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/e2e/tenant-portal.spec.ts` | skeleton | Implement tenant flow | LOW |""",
  dont_touch="""- `src/lib/domain/leasing.ts` (issue 5 — READ ONLY if merged; import types)
- ALL other `src/lib/domain/*` files (issues 1-5,7-10 own them)
- UI files · `.gitcore/features.json` — wave end""",
  guard="""1. **Import types from leasing.ts/property.ts** — don't redefine
2. **G1/G2 guards** — source files; real tests
3. **Don't touch other domain files** — file islands
4. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 7: mesh-integration ───────────
issues[7] = dict(
  title="edge-mesh integration — namespace swal/nido/{id}, presence, authz, chat, ML-DSA-65",
  wave_label="Network (M5)",
  current="""- No edge-mesh integration exists
- edge-mesh is a monorepo core at /home/belal/proyectosSWAL/edge-mesh (TS: PeerJS/WebRTC, Yjs CRDT, ML-DSA-65 identity, namespaces, presence, chat, authz, governance)
- NOT published on npm — must be vendored (same as @swal/ui was)
- features.json: `mesh-integration` at 0% (planned)""",
  desired="""- **Vendor edge-mesh** into `src/lib/vendor/edge-mesh/` (copy src/ + package.json, add `"edge-mesh": "file:src/lib/vendor/edge-mesh"` dep + types) — SAME pattern as @swal/ui vendoring (wave-1 close)
- `src/lib/domain/mesh.ts`:
  - `createMeshClient(instanceId)` → wraps edge-mesh EdgeMesh: namespace `swal/nido/{instanceId}`
  - `publishPresence(client, online)` → presence heartbeat
  - `authzCheck(client, resource, action)` → boolean (namespace authz)
  - `sendChatMessage(client, peerId, text)` → chat via Yjs
  - `signWithIdentity(payload)` → ML-DSA-65 signature stub (real signing if edge-mesh exposes it)
- Implement REAL assertions in `test/integration/mesh-integration.test.ts` (G2)""",
  web="""1. search: "edge-mesh yjs crdt webrtc typescript 2026"
2. search: "peerjs webrtc data channel typescript 2026"
3. search: "post-quantum ml-dsa-65 typescript 2026"
4. search: "namespace-based authorization pattern 2026\"""",
  prompt="""Before implementing:
1. Read `/home/belal/proyectosSWAL/edge-mesh/README.md` + `src/index.ts` — understand the public API (EdgeMesh class, namespaces, presence, chat, authz)
2. Look at how @swal/ui was vendored: `src/lib/vendor/swal-ui/` + package.json `"@swal/ui": "file:src/lib/vendor/swal-ui"` — replicate for edge-mesh
3. If edge-mesh's full API is heavy, wrap the minimal surface (namespace, presence, chat, authz) with clear types
4. Integration tests may use edge-mesh's InMemoryStorage (offline fallback)""",
  patterns="""- Vendor pattern: copy package src → src/lib/vendor/edge-mesh/ + file: dep
- Wrapper: `export class MeshClient { constructor(instanceId) ... }` with thin methods
- Namespace: `swal/nido/{instanceId}` (REQ-004, REQ-022)
- Tests: use InMemoryStorage / no real WebRTC needed for unit-level integration""",
  acceptance="""- [ ] `ls src/lib/vendor/edge-mesh/` — vendored (components or src dir present)
- [ ] `grep -c "edge-mesh" package.json` >= 1 (file: dep)
- [ ] `grep -c "export class MeshClient\\|export function createMeshClient" src/lib/domain/mesh.ts` >= 1
- [ ] `grep -c "swal/nido/" src/lib/domain/mesh.ts` >= 1 (namespace)
- [ ] `grep -c "publishPresence\\|presence" src/lib/domain/mesh.ts` >= 1
- [ ] `grep -c "authz\\|authoriz" src/lib/domain/mesh.ts` >= 1
- [ ] `grep -c "toBe(false)" test/integration/mesh-integration.test.ts` = 0 (G2)
- [ ] `wc -l test/integration/mesh-integration.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/integration/mesh-integration.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/integration/mesh-integration.test.ts` — passes
- [ ] `npm run check` + `npm run build` exit 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/vendor/edge-mesh/` | MISSING | Vendor edge-mesh core (copy + file: dep + types) | HIGH |
| `package.json` | current | Add `"edge-mesh": "file:src/lib/vendor/edge-mesh"` | LOW |
| `src/lib/domain/mesh.ts` | MISSING | Create mesh client wrapper (namespace, presence, chat, authz) | HIGH |
| `test/integration/mesh-integration.test.ts` | skeleton | Implement (>=20 lines) | MED |""",
  dont_touch="""- ALL other `src/lib/domain/*` files (issues 1-6,8-10 own them)
- `src/lib/vendor/swal-ui/` (already vendored — don't touch)
- UI files (issues 1,2) · `.gitcore/features.json` — wave end
- Do NOT fork edge-mesh logic — vendor the actual package, never rewrite it""",
  guard="""1. **Vendor, don't fork** — copy edge-mesh real source; never rewrite its logic (G3)
2. **Namespace correct** — `swal/nido/{instanceId}` exactly (REQ-004/REQ-022)
3. **G1/G2 guards** — source files in commit; real tests
4. **No shadcn/Tailwind** — UI rule (not a UI issue but keep)
5. **If edge-mesh package is too heavy** — wrap minimal surface with types; document what's wrapped""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1 — mesh.ts AND vendored edge-mesh MUST be in the commit
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 8: p2p-discovery ───────────
issues[8] = dict(
  title="GPS proximity discovery — geohash neighbors, radius filter, plan-anchored listings",
  wave_label="Network (M5)",
  current="""- No discovery code exists
- `src/lib/domain/property.ts` Location type has `geohash?: string` (data-model)
- edge-mesh vendored by issue 7 (this issue depends on it)
- features.json: `p2p-discovery` at 0% (planned)""",
  desired="""- `src/lib/domain/discovery.ts`:
  - `geohashEncode(lat, lng, precision)` → geohash string (pure function, implement geohash algorithm or use 'ngeohash' pkg if installable)
  - `neighbors(geohash)` → 8 adjacent geohashes (for radius search)
  - `listingsInRadius(listings, myGeohash, radius)` → filtered by geohash prefix match
  - `sortByDistanceAndTrust(listings, myLoc, trustScores)` → sorted
  - `isPlanAnchored(listing, property)` → boolean (listing requires plan reference — anti-scam, REQ-023)
- GPS consent: `requestLocationConsent()` → { granted, coords? } (typed wrapper around navigator.geolocation)
- Implement REAL assertions in `test/unit/p2p-discovery.test.ts` + `test/e2e/p2p-discovery.spec.ts` (G2)""",
  web="""1. search: "geohash algorithm typescript implementation 2026"
2. search: "ngeohash npm geohash neighbors 2026"
3. search: "geohash radius search prefix match 2026"
4. search: "navigator.geolocation typescript types 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` Location type (READ-ONLY — has geohash field)
2. Research geohash algorithm (web) — implement encode + neighbors (pure)
3. Listing type: define locally { id, propertyId, price, availability, geohash, planAnchor }
4. Anti-scam: listing requires plan anchor (REQ-023)""",
  patterns="""- geohash: base32 alphabet '0123456789bcdefghjkmnpqrstuvwxyz'; encode lat/lng interleaved
- neighbors: 8 adjacent cells via lat/lng offsets at same precision
- Radius: prefix match on geohash (same first N chars)
- Pure functions, no DOM except consent wrapper""",
  acceptance="""- [ ] `grep -c "export function geohashEncode\\|export const geohashEncode" src/lib/domain/discovery.ts` >= 1
- [ ] `grep -c "neighbors" src/lib/domain/discovery.ts` >= 1
- [ ] `grep -c "listingsInRadius" src/lib/domain/discovery.ts` >= 1
- [ ] `grep -c "isPlanAnchored\\|planAnchor" src/lib/domain/discovery.ts` >= 1 (anti-scam, REQ-023)
- [ ] `grep -c "toBe(false)" test/unit/p2p-discovery.test.ts` = 0 (G2)
- [ ] `wc -l test/unit/p2p-discovery.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/p2p-discovery.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/p2p-discovery.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/discovery.ts` | MISSING | Create geohash + discovery service | MED |
| `test/unit/p2p-discovery.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/e2e/p2p-discovery.spec.ts` | skeleton | Implement (two peers, GPS) | LOW |""",
  dont_touch="""- `src/lib/domain/mesh.ts` + `src/lib/vendor/edge-mesh/` (issue 7 — READ ONLY)
- ALL other `src/lib/domain/*` files (issues 1-7,9,10 own them)
- UI files · `.gitcore/features.json` — wave end""",
  guard="""1. **Geohash pure** — no DOM in geohash functions
2. **Anti-scam anchor** — isPlanAnchored is REQUIRED (REQ-023), don't skip
3. **G1/G2 guards** — source files; real tests
4. **Don't touch other domain files** — file islands
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 9: trust-score ───────────
issues[9] = dict(
  title="Cross-app verified trust score T1-T4 — link proofs, visibility control",
  wave_label="Network (M5)",
  current="""- No trust/verification code exists
- features.json: `trust-score` at 0% (planned)
- Market research (wave 0): no competitor does cross-app identity linking — this is the differentiator""",
  desired="""- `src/lib/domain/trust.ts`:
  - Link providers: gov-id, payment-history, review-history, social-graph
  - `addLink(links, { provider, proof })` → link with proof (OAuth/API proof, NOT manual upload — REQ-024)
  - `verifyLink(link)` → { valid, reason } — proof validation (typed stub: checks proof has expected shape; real OAuth validation is M5.5 scope)
  - `computeTrustScore(links, history)` → T1-T4: { tier, score, breakdown: { govId, payments, reviews, social } }
    - T1 = gov-id verified (base)
    - T2 = >= 1 linked external session (payments/reviews)
    - T3 = T2 + on-network history (>= N completed rentals)
    - T4 = T3 + Polygon deposit/collateral (boolean)
  - `setVisibility(links, provider, visible)` → privacy control (REQ-024)
  - Anti-gaming: `noSingleSourceInflates(score)` — a single provider cannot push score up more than X
- Implement REAL assertions in `test/unit/trust-score.test.ts` + `test/integration/trust-score.test.ts` (G2)""",
  web="""1. search: "trust score model tiers verification 2026"
2. search: "verifiable credentials oauth proof pattern 2026"
3. search: "identity verification gov-id selfie flow 2026"
4. search: "privacy preserving trust score design 2026\"""",
  prompt="""Before implementing:
1. Read the wave-0 market research: Airbnb = gov-ID + selfie + ML + reviews; NO competitor links sessions from other apps (our differentiator)
2. Design TrustTier = 1|2|3|4; compute from links + history
3. Anti-gaming rule: cap each provider's contribution
4. Pure functions""",
  patterns="""- Link: { id, provider: 'gov-id'|'payment-history'|'review-history'|'social-graph', proof, verified, visible }
- Tier progression: T1 (gov-id) → T2 (+external session) → T3 (+history) → T4 (+deposit)
- Score: weighted sum with per-provider cap (anti-gaming)
- Pure functions, no DOM""",
  acceptance="""- [ ] `grep -c "export function addLink\\|export const addLink" src/lib/domain/trust.ts` >= 1
- [ ] `grep -c "verifyLink" src/lib/domain/trust.ts` >= 1
- [ ] `grep -c "computeTrustScore" src/lib/domain/trust.ts` >= 1
- [ ] `grep -c "gov-id\\|govId" src/lib/domain/trust.ts` >= 1 (T1 base)
- [ ] `grep -c "noSingleSource\\|cap" src/lib/domain/trust.ts` >= 1 (anti-gaming)
- [ ] `grep -c "toBe(false)" test/unit/trust-score.test.ts test/integration/trust-score.test.ts` = 0 (G2)
- [ ] `wc -l test/unit/trust-score.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/unit/trust-score.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/unit/trust-score.test.ts test/integration/trust-score.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/trust.ts` | MISSING | Create trust score service (links, T1-T4, anti-gaming) | MED |
| `test/unit/trust-score.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/integration/trust-score.test.ts` | skeleton | Implement link proof validation | LOW |""",
  dont_touch="""- `src/lib/domain/mesh.ts` + `src/lib/vendor/edge-mesh/` (issue 7 — READ ONLY)
- `src/lib/domain/discovery.ts` (issue 8 — READ ONLY)
- ALL other `src/lib/domain/*` files (issues 1-8,10 own them)
- `.gitcore/features.json` — wave end""",
  guard="""1. **T1-T4 progression exact** — gov-id → external sessions → history → deposit (REQ-024)
2. **Anti-gaming mandatory** — per-provider cap (REQ-024: no single source inflates)
3. **G1/G2 guards** — source files; real tests
4. **Don't touch other domain files** — file islands
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Issue 10: escrow-disputes ───────────
issues[10] = dict(
  title="Escrow (Polygon) + dispute governance — deposits, release, voting",
  wave_label="Network (M5)",
  current="""- No escrow/dispute code exists
- edge-mesh governance module exists (voting/proposals) — vendored by issue 7
- features.json: `escrow-disputes` at 0% (planned)""",
  desired="""- `src/lib/domain/escrow.ts`:
  - Escrow states: 'funded' | 'locked' | 'release-requested' | 'partial-released' | 'released' | 'disputed'
  - `createEscrow(lease, depositAmount)` → Escrow { id, leaseId, amount, status: 'funded' }
  - `lockEscrow(escrow)` → 'locked' (deposit held)
  - `requestRelease(escrow, amount)` → 'release-requested' (full or partial)
  - `releaseEscrow(escrow, amount)` → 'partial-released' or 'released' (>= amount check)
  - `openDispute(escrow, { claimant, reason, evidence[] })` → 'disputed' + Dispute { id, escrowId, claimant, reason, evidence, status: 'opened' | 'voting' | 'decided' | 'enforced' }
  - `startVote(dispute)` → 'voting' (edge-mesh governance round — typed stub)
  - `resolveDispute(dispute, outcome)` → 'decided' + outcome { releaseAmount, to: 'landlord'|'tenant' }
  - `enforceOutcome(dispute, escrow)` → 'enforced' + escrow released per outcome
  - Dispute history on both profiles (REQ-025)
- Implement REAL assertions in `test/integration/escrow-disputes.test.ts` + `test/integration/dispute-governance.test.ts` (G2)""",
  web="""1. search: "escrow smart contract state machine 2026"
2. search: "dispute resolution governance voting flow 2026"
3. search: "deposit release partial refund pattern 2026"
4. search: "polygon escrow contract testnet 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/leasing.ts` (issue 5 — READ ONLY; Lease/Invoice types)
2. Read edge-mesh governance module (vendored by issue 7) — src/governance/ for voting API
3. Design escrow state machine (states above) + dispute flow
4. Polygon contract is M5.5 scope — this issue is the domain state machine + typed stubs""",
  patterns="""- Escrow states: union type with transitions (funded → locked → release-requested → released)
- Dispute: opened → voting → decided → enforced
- Outcome: { releaseAmount, to } — enforce updates escrow
- Pure functions + typed stubs for blockchain/governance calls""",
  acceptance="""- [ ] `grep -c "export function createEscrow\\|export const createEscrow" src/lib/domain/escrow.ts` >= 1
- [ ] `grep -c "releaseEscrow" src/lib/domain/escrow.ts` >= 1
- [ ] `grep -c "openDispute" src/lib/domain/escrow.ts` >= 1
- [ ] `grep -c "resolveDispute\\|enforceOutcome" src/lib/domain/escrow.ts` >= 1
- [ ] `grep -c "'funded'\\|'locked'\\|'released'\\|'disputed'" src/lib/domain/escrow.ts` >= 2 (state machine)
- [ ] `grep -c "toBe(false)" test/integration/escrow-disputes.test.ts test/integration/dispute-governance.test.ts` = 0 (G2)
- [ ] `wc -l test/integration/escrow-disputes.test.ts` >= 20 AND `grep -c "describe(\\|it(" test/integration/escrow-disputes.test.ts` >= 3 (G2)
- [ ] `npx vitest run test/integration/escrow-disputes.test.ts test/integration/dispute-governance.test.ts` — passes
- [ ] `npm run check` exits 0
- [ ] G1: `git show HEAD --name-only | grep -cE "src/|test/"` >= 1""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/escrow.ts` | MISSING | Create escrow + dispute service | MED |
| `test/integration/escrow-disputes.test.ts` | skeleton | Implement (>=20 lines) | LOW |
| `test/integration/dispute-governance.test.ts` | skeleton | Implement dispute→vote→payout flow | LOW |""",
  dont_touch="""- `src/lib/domain/mesh.ts` + `src/lib/vendor/edge-mesh/` (issue 7 — READ ONLY)
- `src/lib/domain/leasing.ts` (issue 5 — READ ONLY)
- ALL other `src/lib/domain/*` files (issues 1-9 own them)
- `.gitcore/features.json` — wave end""",
  guard="""1. **State machine complete** — all escrow states + transitions (REQ-025)
2. **Dispute flow** — opened → voting → decided → enforced (REQ-025)
3. **G1/G2 guards** — source files; real tests
4. **Don't touch other domain files** — file islands
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] **G1:** `git show HEAD --name-only | grep -cE "src/|test/"` >= 1
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker""",
)

# ─────────── Write bodies ───────────
depends = {1: "", 2: "#1", 3: "", 4: "#3", 5: "#3", 6: "#5", 7: "", 8: "#7", 9: "#7", 10: "#7, #5"}
parallel = {1: "#2, #3", 2: "#1, #3", 3: "#1, #2", 4: "#5", 5: "#4", 6: "— (after #5)",
            7: "#1, #2, #3", 8: "#9", 9: "#8", 10: "— (after #5, #7)"}
efforts = {1: "Large (4h+)", 2: "Medium (1-4h)", 3: "Medium (1-4h)", 4: "Medium (1-4h)",
           5: "Medium (1-4h)", 6: "Medium (1-4h)", 7: "Large (4h+)", 8: "Medium (1-4h)",
           9: "Medium (1-4h)", 10: "Medium (1-4h)"}

paths = {}
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

## Anti-Hallucination Guard ⚠️
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

{footer(num, depends[num], parallel[num], num, efforts[num])}
"""
    p = os.path.join(OUT, f"body-{num:02d}.md")
    with open(p, "w") as fh:
        fh.write(body)
    paths[num] = p
    print(f"✅ {p} ({len(body.splitlines())} lines)")

# Manifest
import json
FEATS = {1: ["plans-2d"], 2: ["plans-3d"], 3: ["accounts-auth"], 4: ["verified-invitations"],
         5: ["leasing"], 6: ["tenant-portal"], 7: ["mesh-integration"], 8: ["p2p-discovery"],
         9: ["trust-score"], 10: ["escrow-disputes"]}
manifest = {"repo": REPO, "wave": "nido-wave2",
            "issues": {str(n): {"body": paths[n], "features": FEATS[n],
                                 "title": issues[n]["title"]} for n in range(1, 11)}}
with open(os.path.join(OUT, "manifest.json"), "w") as fh:
    json.dump(manifest, fh, indent=2)
print(f"\n📦 manifest: {os.path.join(OUT, 'manifest.json')}")
