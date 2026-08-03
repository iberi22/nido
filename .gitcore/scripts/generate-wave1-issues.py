#!/usr/bin/env python3
"""Generate Wave 1 issue bodies for NIDO (10 issues, Jules dispatch).

Template: gitcore-jules-issues v3.0 (canonical). All English.
Repo: iberi22/floor-plan-designer (PRIVATE, rename target iberi22/nido).
Rule: create WITHOUT jules label → verify file islands → re-read → THEN label.
"""
import os, json

OUT = os.path.expanduser("~/.hermes/waves/nido-wave1")
os.makedirs(OUT, exist_ok=True)

REPO = "iberi22/floor-plan-designer"

# Shared context block (gitcore context injected from Xavier)
CTX = """## Context (from Xavier, 2026-08-03)

- **Product:** NIDO = intelligent home administration (floor plans + rules +
  measures for house/apartment/bodega + taxes, leasing, parts inventory, costs,
  maintenance, public utilities). Later: private GPS-proximity rental network.
- **Origin:** `floor-plan-designer` prototype (maturity 39/100). Svelte 5 (runes)
  + Vite + TypeScript + Konva 2D + Three.js 3D. Rename target: `iberi22/nido`.
- **Plan:** monorepo `docs/SWAL/NIDO_PLAN.md` (see AGENTS.md).
- **UI RULE (mandatory):** `edge-hive/edge-hive-admin` is the lab reference UI
  (React 19 + Tailwind + Tauri, "Hive Dark" theme: slate 850/900/950, hive-cyan
  #06b6d4, hive-orange #f97316, hive-void #000000, neon shadows). `@swal/ui`
  (Svelte 5, zero-dep) is its faithful port — ALL UI MUST use `@swal/ui`.
  NO shadcn-svelte, NO project-local Tailwind. Missing components get ported
  INTO @swal/ui (never duplicated in the project).
- **Cores (do not fork):** mesh = edge-mesh · memory = Xavier (:8006) · UI = @swal/ui.
- **Tests:** every feature has skeleton test files (Vitest unit/integration +
  Playwright e2e) under `test/` with `expect(true).toBe(false)` placeholders.
  IMPLEMENT the real assertions.
- **features.json:** `.gitcore/features.json` is source of truth (23 features).
  Do NOT edit it during this wave (reconciled at wave end).
"""

def header(num, title, wave_label):
    return f"""# [Wave 1.{num:02d}] {title}

> Wave 1 — {wave_label}. Labels: `wave-1`, `nido`
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
| File doesn't exist | Run `find . -name "<filename>"` to locate it |
| Test fails on new code | Fix test logic or implementation; re-run |
| `@swal/ui` import fails | Verify `npm install @swal/ui`; check package exports (`@swal/ui`, `@swal/ui/tokens`) |
| PR conflicts with parallel work | Rebase on main, re-run verification |
| Vite 8 beta issues | Pin Vite to stable 7.x in package.json (overrides) |
"""

# ───────────────────────── Issue 1 ─────────────────────────
issues = {}

issues[1] = dict(
  title="GitCore compliance + CI toolchain (Vitest/Playwright/Biome scripts)",
  wave_label="Foundation",
  current="""- `.git-core-protocol-version` = `3.8.0` (exists)
- `scripts/` has `init.sh`, `build.sh`, `verify.sh`, `sync.sh`, `doc-hook.sh` (shell, executable) + `scripts/hooks/post-commit`
- `package.json`: NO test framework (no vitest, no playwright); scripts: dev/build/preview/check only
- `vite` pinned `^8.0.0-beta.13` (BETA — must pin stable)
- `biome.json` exists (Biome ^2.3.14); `svelte-check` + `tsc` in `check` script
- `test/` skeletons exist (39 files) but no runner configured; `expect(true).toBe(false)` placeholders
- features.json: `gitcore-compliance`, `toolchain-ci` at 0% (planned)""",
  desired="""- Add Vitest + @testing-library/svelte + jsdom + @playwright/test to devDependencies
- Add scripts: `test` (vitest run), `test:e2e` (playwright test), `test:watch`
- Add `vitest.config.ts` (environment jsdom, include test/unit + test/integration)
- Add `playwright.config.ts` (webServer vite preview, baseURL, projects chromium)
- Pin Vite to **stable** (7.x latest) in package.json + overrides (remove beta 8)
- `.github/workflows.disabled/` created (GH Actions OFF by default)
- `scripts/verify.sh` runs: svelte-check → biome check → vitest → writes `.gitcore/state-report.json`
- All 5 scripts executable + post-commit hook wired (warning-only, never blocks)
- Implement assertions in `test/integration/gitcore-compliance.test.ts` + `test/integration/toolchain-ci.test.ts`""",
  web="""1. search: "vitest svelte 5 setup 2026 @testing-library/svelte jsdom"
2. search: "vite 7 stable release version 2026"
3. search: "playwright config vite webServer baseURL 2026"
4. search: "svelte-check typescript strict mode svelte 5 2026"
5. search: "biome check format svelte files 2026\"""",
  prompt="""Before implementing:
1. Research current Vitest + Svelte 5 testing setup best practices (web)
2. Read `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig*.json`, `biome.json`
3. Read `test/integration/gitcore-compliance.test.ts` and `test/integration/toolchain-ci.test.ts` skeletons
4. Read `scripts/verify.sh` and the other scripts (they exist, may need fixes)
5. Note: repo has `node_modules/` installed; Vite 8 beta currently builds OK""",
  patterns="""- `scripts/*.sh` → `#!/usr/bin/env bash` shebang (NixOS requirement, NOT /bin/bash)
- `scripts/verify.sh` → runs checks then writes `.gitcore/state-report.json` via python3
- `package.json` scripts → short names: dev/build/preview/check/test/test:e2e
- `biome.json` → existing config; keep lint+format gates
- Test skeleton pattern: `import { describe, it, expect } from "vitest"`""",
  acceptance="""- [ ] `npm install` completes without errors
- [ ] `grep -c "vitest" package.json` >= 1
- [ ] `grep -c "@playwright/test" package.json` >= 1
- [ ] `grep -c "7\\." package.json` >= 1 (Vite pinned stable, not beta 8)
- [ ] `grep -c "test:unit\\|\\"test\\"" package.json` >= 1
- [ ] `ls vitest.config.ts playwright.config.ts` — both exist
- [ ] `ls .github/workflows.disabled/` — directory exists (GH Actions off)
- [ ] `./scripts/verify.sh` exits 0 and writes `.gitcore/state-report.json`
- [ ] `npx vitest run test/integration/gitcore-compliance.test.ts test/integration/toolchain-ci.test.ts` — passes (real assertions, no `toBe(false)`)
- [ ] `git diff --stat HEAD` shows >= 5 files""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `package.json` | 12 devDeps, no test runner, Vite beta | Add vitest, @testing-library/svelte, jsdom, @playwright/test; pin Vite stable; add test scripts | MED |
| `package-lock.json` | current | Regenerate with npm install | MED |
| `vite.config.ts` | existing | Keep; ensure test config compatible | LOW |
| `vitest.config.ts` | MISSING | Create (jsdom, include test/unit+integration) | LOW |
| `playwright.config.ts` | MISSING | Create (webServer, chromium project) | LOW |
| `.github/workflows.disabled/` | MISSING | Create dir (placeholder README) | LOW |
| `scripts/verify.sh` | exists | Wire vitest + biome + state-report | MED |
| `scripts/init.sh` | exists | Add npm install + hook copy idempotent | LOW |
| `test/integration/gitcore-compliance.test.ts` | skeleton | Implement real assertions | LOW |
| `test/integration/toolchain-ci.test.ts` | skeleton | Implement real assertions | LOW |""",
  dont_touch="""- `src/` (any file) — other issues own them
- `.gitcore/features.json` — reconciled at wave end
- `.gitcore/scripts/generate-*.py` — generator scripts (keep as-is)
- `test/unit/*`, `test/e2e/*` — other issues own them
- NO creating files outside root configs + scripts + the two integration tests listed""",
  guard="""1. **READ before write** — read every file fully before modifying
2. **NixOS shebang** — ALL .sh use `#!/usr/bin/env bash` (NOT /bin/bash)
3. **Vite stable** — pin 7.x, never beta 8; verify `npm run build` still passes
4. **Don't touch src/** — other issues own source files (file islands)
5. **Don't add Tailwind/shadcn** — UI rule: @swal/ui only
6. **Verify paths** — all test paths are from repo root (`test/integration/...`)""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 2 ─────────────────────────
issues[2] = dict(
  title="UI shell on @swal/ui replicating edge-hive-admin (dark Hive theme)",
  wave_label="Foundation",
  current="""- `src/App.svelte` (206 LOC) — app shell with toolbar/floor selector/canvas/3D, template styling
- `src/app.css` (79 LOC) — global styles, default Vite template CSS
- `src/main.ts` (9 LOC) — Vite entry, imports ./app.css
- `index.html` — default Vite template (svelte.svg favicon)
- `src/lib/Counter.svelte` (10 LOC) — **template leftover, DELETE**
- `src/assets/svelte.svg` — **template leftover, DELETE**
- `@swal/ui` NOT yet installed (package.json has no dep)
- PR #3 (shadcn dark theme) REJECTED — must NOT be merged; this issue ports its intent onto @swal/ui""",
  desired="""- `npm install @swal/ui` (workspace dep) — import `@swal/ui/tokens` in `main.ts`
- `src/App.svelte` rebuilt: dashboard shell replicating edge-hive-admin layout
  (top bar + sidebar nav + content area), using `@swal/ui` components
  (Button, Card, Badge, StatusBadge, Tabs, Modal, Toaster)
- Dark Hive theme via `--swal-*` tokens (bg #020617, accent cyan #06b6d4, orange #f97316)
- `src/app.css` — replace template CSS with @swal/ui tokens import + minimal global
- `index.html` — set title "NIDO", theme-color #020617, Inter/Fira Code fonts (edge-hive-admin style)
- DELETE `src/lib/Counter.svelte`, `src/assets/svelte.svg`; remove their imports from App.svelte
- Implement assertions in `test/unit/ui-swal.test.ts` + `test/e2e/ui-swal.spec.ts`""",
  web="""1. search: "@swal/ui svelte 5 components usage edge-hive theme"
2. search: "svelte 5 runes $props $state component best practices 2026"
3. search: "vite-plugin-pwa svelte 5 manifest 2026"
4. search: "edge-hive-admin dashboard layout dark theme react" (reference look)""",
  prompt="""Before implementing:
1. Read `src/App.svelte`, `src/main.ts`, `src/app.css`, `index.html` fully
2. Read `/home/belal/proyectosSWAL/swal-ui/USAGE.md` and `README.md` for @swal/ui API (component names, tokens, import paths)
3. Read `/home/belal/proyectosSWAL/edge-hive/edge-hive-admin/index.html` (tailwind config = theme source) and `layouts/DashboardLayout.tsx` (reference shell)
4. Check @swal/ui exports: components from '@swal/ui', tokens from '@swal/ui/tokens'
5. Run `npm run dev` to see current app before changing""",
  patterns="""- `@swal/ui` import: `import { Button, Card, StatusBadge } from '@swal/ui'`
- Tokens: `@import '@swal/ui/tokens'` once in main.ts/app.css
- Svelte 5 runes: `let { ... } = $props()`, `$state`, `$derived`
- edge-hive-admin shell: LandingPage → DashboardLayout (topbar + sidebar + content)""",
  acceptance="""- [ ] `grep -c "@swal/ui" package.json` >= 1
- [ ] `grep -c "@swal/ui/tokens" src/main.ts src/app.css` >= 1
- [ ] `grep -c "import.*from '@swal/ui'" src/App.svelte` >= 2
- [ ] `grep -c "Counter" src/App.svelte` = 0 (leftover deleted)
- [ ] `ls src/lib/Counter.svelte src/assets/svelte.svg` — both GONE (exit != 0)
- [ ] `npm run build` exits 0
- [ ] `npm run check` exits 0
- [ ] `npx vitest run test/unit/ui-swal.test.ts` — passes (real assertions)
- [ ] `npx playwright test test/e2e/ui-swal.spec.ts` — passes (app renders with Hive theme)""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `package.json` | no @swal/ui | Add `@swal/ui` dep | LOW |
| `src/main.ts` | 9 LOC | Import '@swal/ui/tokens' + app.css | LOW |
| `src/App.svelte` | 206 LOC | Rebuild shell on @swal/ui (Hive theme) | MED |
| `src/app.css` | 79 LOC template | Replace with SWAL tokens + minimal global | MED |
| `index.html` | template | Title "NIDO", theme-color, fonts | LOW |
| `src/lib/Counter.svelte` | 10 LOC leftover | DELETE | LOW |
| `src/assets/svelte.svg` | leftover | DELETE | LOW |
| `test/unit/ui-swal.test.ts` | skeleton | Implement assertions | LOW |
| `test/e2e/ui-swal.spec.ts` | skeleton | Implement e2e | LOW |""",
  dont_touch="""- `src/lib/CanvasStage.svelte`, `Toolbar.svelte`, `FloorSelector.svelte`, `Scene3D.svelte` (issues 4-5)
- `src/lib/stores/floorPlanStore.svelte.ts`, `src/lib/data/house-data.json` (issue 3)
- `src/lib/domain/*` (issues 3,6,7,8,9,10)
- `.gitcore/features.json` — reconciled at wave end
- NO shadcn-svelte, NO Tailwind, NO new CSS framework""",
  guard="""1. **@swal/ui is the ONLY UI source** — no shadcn, no Tailwind in this project
2. **READ before write** — read App.svelte fully before rewriting
3. **Tokens only** — colors from `--swal-*` variables, never hardcoded hex
4. **Don't touch canvas/3D files** — other issues own them (file islands)
5. **Delete leftovers** — Counter.svelte + svelte.svg MUST be removed, imports cleaned
6. **Verify build** — `npm run build` and `npm run check` must pass""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 3 ─────────────────────────
issues[3] = dict(
  title="Canonical data model + reactive store (property schema, floors, zones, rooms, items)",
  wave_label="Core",
  current="""- `src/lib/data/house-data.json` (208 LOC) — fixed sample: project (Casa 3 Pisos, Cali, estrato 3), config (wallThickness 0.15, scale 50, plot 6x26), norms (NSR10_stairs, POT_garage), floors (ground + more) with zones
- `src/lib/stores/floorPlanStore.svelte.ts` (224 LOC) — Svelte 5 runes store: floors, zones, selectedFloor, add/remove/update zone
- No canonical schema; no property/room/item/taxes/leases/maintenance/utilities model
- features.json: `data-model` at 0% (planned)""",
  desired="""- Create `src/lib/domain/property.ts` — TS types + validation for the canonical model:
  Property { id, name, type: house|apartment|bodega|construction, location { city, comuna, estrato, geohash }, norms, floors[], rooms[], items[], taxes, leases[], maintenance[], utilities[] }
- Floor { id, name, height_m, zones[] } · Zone { id, name, type, x, y, width, height, color }
- Room { id, floorId, zoneId, name, area_m2, items[] } · Item { id, roomId, name, category, value, warrantyUntil, photo, qr }
- Taxes { predial { jurisdiction, avaluo, rate_pct, installments, dueDates[] } }
- Maintenance { id, itemId, type, interval_days, lastDone, nextDue }
- Utilities { id, type: water|energy|gas|internet, provider, account, dueDay, budget }
- Export `property.schema.json` (JSON Schema v1) under `src/lib/data/`
- Extend `floorPlanStore.svelte.ts`: load/save property, rooms/items/taxes/leases/maintenance/utilities collections, offline persist (localStorage/IndexedDB stub)
- Migrate `house-data.json` to schema-valid form (keep as seed)
- Implement assertions in `test/unit/data-model.test.ts` + `test/integration/data-model.test.ts`""",
  web="""1. search: "JSON Schema typescript generation typescript-json-schema 2026"
2. search: "svelte 5 runes store pattern persist localStorage 2026"
3. search: "indexeddb wrapper idb keyval svelte 5 2026"
4. search: "typescript discriminated union enum literal types best practice 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/data/house-data.json` and `src/lib/stores/floorPlanStore.svelte.ts` FULLY
2. Read `docs/SWAL/NIDO_PLAN.md` §1.4 (canonical data model) and `docs/SRS/REQUIREMENTS.md` REQ-008
3. Check `@swal/ui` ConfigEditor component (schema-driven — reference for JSON schema)
4. Design types to cover ALL entities; export from `src/lib/domain/property.ts`
5. Keep floorPlanStore API backward-compatible (CanvasStage imports it)""",
  patterns="""- Store: Svelte 5 runes `let floors = $state([...])`, `$derived`, functions mutate state
- Types: exported interfaces + union literal types, `export type PropertyType = 'house' | ...`
- Schema: JSON Schema draft-07, `$schema` at top
- Seed: house-data.json imported and migrated at store init""",
  acceptance="""- [ ] `grep -c "export interface Property\\|export type PropertyType" src/lib/domain/property.ts` >= 1
- [ ] `grep -c "house|apartment|bodega|construction" src/lib/domain/property.ts` >= 1
- [ ] `grep -c "water|energy|gas|internet" src/lib/domain/property.ts` >= 1
- [ ] `ls src/lib/data/property.schema.json` — exists and is valid JSON (`python3 -m json.tool`)
- [ ] `grep -c "property" src/lib/stores/floorPlanStore.svelte.ts` >= 3
- [ ] `npx vitest run test/unit/data-model.test.ts` — passes
- [ ] `npx vitest run test/integration/data-model.test.ts` — passes (round-trip persistence)
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/property.ts` | MISSING | Create canonical types + validation | MED |
| `src/lib/data/property.schema.json` | MISSING | Create JSON Schema v1 | MED |
| `src/lib/data/house-data.json` | 208 LOC seed | Migrate to schema-valid form | MED |
| `src/lib/stores/floorPlanStore.svelte.ts` | 224 LOC | Extend: property load/save, collections, offline persist | HIGH |
| `test/unit/data-model.test.ts` | skeleton | Implement assertions | LOW |
| `test/integration/data-model.test.ts` | skeleton | Implement round-trip tests | LOW |""",
  dont_touch="""- `src/App.svelte`, `src/app.css`, `src/main.ts`, `index.html` (issue 2)
- `src/lib/CanvasStage.svelte` + Toolbar/FloorSelector (issue 4), `Scene3D.svelte` (issue 5)
- `src/lib/domain/norms.ts` (issue 6), inventory/costs (7), utilities/taxes (8), maintenance/analytics (9), export (10)
- `.gitcore/features.json` — reconciled at wave end""",
  guard="""1. **Keep store API compatible** — CanvasStage imports floorPlanStore; do not break its exports
2. **READ before write** — read both files fully first
3. **Types over any** — no `any` in domain types; use unions/interfaces
4. **Schema valid** — validate with `python3 -m json.tool`
5. **Don't touch other domain files** — file islands (issues 6-10 own them)
6. **Verify check** — `npm run check` must pass""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 4 ─────────────────────────
issues[4] = dict(
  title="2D floor plan editor (Konva canvas: walls, zones, rooms, measurements)",
  wave_label="Core",
  current="""- `src/lib/CanvasStage.svelte` (530 LOC) — Konva canvas: draws zones (rects) + labels, hover highlight, blueprint colors (blue bg #1e3a5f, lines #87ceeb), stores in floorPlanStore
- `src/lib/Toolbar.svelte` (141 LOC) — tool buttons (native buttons, PR #3 replaced some with shadcn — must be reverted to @swal/ui)
- `src/lib/FloorSelector.svelte` (95 LOC) — floor tabs selector
- Uses svelte-konva + konva ^10; store from issue 3 pattern
- features.json: `plans-2d` at 0% (planned)""",
  desired="""- `Toolbar.svelte`: tools Select | Wall | Zone | Room | Measure | Validate | Export using @swal/ui Button + Tooltip
- `CanvasStage.svelte`: add wall-drawing (click-drag segments with live length in meters), zone creation by drag rectangle, room markers, measurement display, selection + properties panel side
- `FloorSelector.svelte`: use @swal/ui Tabs/Button styling; floor add/remove
- Canvas keeps blueprint aesthetic but integrates Hive tokens (accent cyan/orange for selected/highlight)
- Implement assertions in `test/unit/plans-2d.test.ts` + `test/e2e/plans-2d.spec.ts`""",
  web="""1. search: "konva svelte-konva draw line wall editor 2026"
2. search: "konva drag rectangle selection transformer 2026"
3. search: "konva distance measurement line length 2026"
4. search: "svelte 5 konva canvas reactive redraw pattern 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/CanvasStage.svelte`, `Toolbar.svelte`, `FloorSelector.svelte` FULLY
2. Read `src/lib/stores/floorPlanStore.svelte.ts` (issue 3 may extend it — use compatible API; if store API changed by issue 3, adapt imports)
3. Research konva line/rect/transformer APIs (web)
4. Check @swal/ui Button/Tooltip/Tabs API in `swal-ui/USAGE.md`
5. Run `npm run dev` to see current canvas behavior""",
  patterns="""- Konva: `<Stage>`, `<Layer>`, `<Rect>`, `<Line>`, `<Text>` from svelte-konva
- Store: floors/zones from floorPlanStore (issue 3)
- Toolbar: `onclick` handlers set active tool in store/state
- @swal/ui: `import { Button, Tooltip } from '@swal/ui'`""",
  acceptance="""- [ ] `grep -c "Wall\\|wall" src/lib/Toolbar.svelte` >= 1 (wall tool present)
- [ ] `grep -c "@swal/ui" src/lib/Toolbar.svelte src/lib/CanvasStage.svelte src/lib/FloorSelector.svelte` >= 2
- [ ] `grep -c "measure\\|Measure" src/lib/CanvasStage.svelte` >= 1 (measurement display)
- [ ] `grep -c "shadcn\\|tailwind" src/lib/` = 0 (NO shadcn remnants)
- [ ] `npx vitest run test/unit/plans-2d.test.ts` — passes
- [ ] `npx playwright test test/e2e/plans-2d.spec.ts` — passes (draw wall, add zone, measure shown)
- [ ] `npm run build` + `npm run check` exit 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/Toolbar.svelte` | 141 LOC | Rebuild with @swal/ui, add Wall/Room/Measure tools | MED |
| `src/lib/CanvasStage.svelte` | 530 LOC | Wall drawing, zone drag-create, measurements, selection | HIGH |
| `src/lib/FloorSelector.svelte` | 95 LOC | @swal/ui styling, add/remove floor | MED |
| `test/unit/plans-2d.test.ts` | skeleton | Implement assertions | LOW |
| `test/e2e/plans-2d.spec.ts` | skeleton | Implement e2e | LOW |""",
  dont_touch="""- `src/App.svelte` (issue 2), `src/lib/Scene3D.svelte` (issue 5), `src/lib/floors/*` (issue 5)
- `src/lib/stores/floorPlanStore.svelte.ts` + `src/lib/domain/property.ts` (issue 3 — READ ONLY)
- `src/lib/domain/*` other files (issues 6-10)
- `.gitcore/features.json` — reconciled at wave end""",
  guard="""1. **Store is READ-ONLY here** — issue 3 owns it; import its API, don't modify
2. **No shadcn** — replace any shadcn imports with @swal/ui (PR #3 must not survive)
3. **Konva focus** — use svelte-konva components, not raw canvas
4. **READ before write** — read each file fully first
5. **Blueprint aesthetic preserved** — blue canvas + Hive tokens for UI chrome
6. **Verify build** — npm run build + check""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 5 ─────────────────────────
issues[5] = dict(
  title="3D viewer (Three.js, lazy-loaded, code-split)",
  wave_label="Core",
  current="""- `src/lib/Scene3D.svelte` (218 LOC) — Three.js viewer: builds simple 3D from floors/zones, static camera
- `src/lib/floors/GroundFloor.svelte` (121 LOC) + `ApartmentFloor.svelte` (136 LOC) — floor component wrappers
- three ^0.182 + @types/three in devDeps
- Bundle: single chunk >500KB (no code splitting) — must lazy-load 3D
- features.json: `plans-3d` at 0% (planned)""",
  desired="""- `Scene3D.svelte`: derive 3D scene from floorPlanStore (same data as 2D — single source), walls extruded by height_m, zone colors, floor switching
- OrbitControls camera (rotate/zoom/pan)
- **Lazy-load**: dynamic `import('three')` + `import('./Scene3D.svelte')` so 3D code is a separate chunk; initial bundle < 500KB
- 2D/3D toggle in App shell (App.svelte issue 2 provides toggle slot)
- GroundFloor/ApartmentFloor refactored to consume store-derived data (or deleted if Scene3D is generic)
- Implement assertions in `test/unit/plans-3d.test.ts` + `test/e2e/plans-3d.spec.ts`""",
  web="""1. search: "three.js orbitcontrols import example 2026"
2. search: "svelte 5 dynamic import lazy load component 2026"
3. search: "vite manualChunks code splitting three.js 2026"
4. search: "three.js extrude shape walls from floor plan 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/Scene3D.svelte`, `src/lib/floors/GroundFloor.svelte`, `ApartmentFloor.svelte` FULLY
2. Read `src/lib/stores/floorPlanStore.svelte.ts` (issue 3 owns API — read only)
3. Research Three.js OrbitControls + ExtrudeGeometry (web)
4. Research Svelte 5 dynamic import pattern for code splitting
5. Check current bundle size: `npm run build` and inspect dist output""",
  patterns="""- Three.js: `import * as THREE from 'three'` (lazy), `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer`, `OrbitControls` from 'three/addons/controls/OrbitControls.js'
- Store-derived: zones → extruded boxes (width x height_m x depth)
- Svelte 5 lazy: `{@await import('./Scene3D.svelte')}` or `$derived` + dynamic import""",
  acceptance="""- [ ] `grep -c "OrbitControls" src/lib/Scene3D.svelte` >= 1
- [ ] `grep -c "import(.*three\\|import(.*Scene3D" src/App.svelte src/lib/Scene3D.svelte` >= 1 (lazy loading present)
- [ ] `grep -c "height_m" src/lib/Scene3D.svelte` >= 1 (walls extruded by floor height)
- [ ] `npx vitest run test/unit/plans-3d.test.ts` — passes
- [ ] `npx playwright test test/e2e/plans-3d.spec.ts` — passes (3D renders, camera orbits)
- [ ] `npm run build` — 3D in separate chunk (check dist/*.js has >= 2 chunks)
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/Scene3D.svelte` | 218 LOC | OrbitControls, store-derived scene, height extrusion | HIGH |
| `src/lib/floors/GroundFloor.svelte` | 121 LOC | Refactor to store-derived or remove | MED |
| `src/lib/floors/ApartmentFloor.svelte` | 136 LOC | Refactor to store-derived or remove | MED |
| `test/unit/plans-3d.test.ts` | skeleton | Implement assertions | LOW |
| `test/e2e/plans-3d.spec.ts` | skeleton | Implement e2e | LOW |""",
  dont_touch="""- `src/App.svelte` (issue 2) — read only; toggle slot expected
- `src/lib/stores/floorPlanStore.svelte.ts` + `domain/property.ts` (issue 3 — READ ONLY)
- `src/lib/CanvasStage.svelte` + Toolbar/FloorSelector (issue 4)
- `src/lib/domain/*` (issues 6-10) · `.gitcore/features.json` — wave end""",
  guard="""1. **Single source of truth** — 3D derives from floorPlanStore, never duplicate plan data
2. **Lazy-load mandatory** — three.js must be a separate chunk; check dist output
3. **Store READ-ONLY** — issue 3 owns it
4. **READ before write** — read files fully first
5. **No canvas 2D changes** — issue 4 owns CanvasStage
6. **Verify build** — npm run build + check""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 6 ─────────────────────────
issues[6] = dict(
  title="Building norms validation engine (NSR-10 / POT rules)",
  wave_label="Core",
  current="""- `src/lib/data/house-data.json` contains norms sample: NSR10_stairs { minWidth_m 0.90, tread_min_mm 280, riser_min_mm 100, riser_max_mm 180, formula "2R + H = 620-640mm" }, POT_garage { minWidth_m 2.60, minDepth_m 5.00, accessWidth_independent_m 3.20 }
- No validation engine exists
- features.json: `norms-validation` at 0% (planned)""",
  desired="""- Create `src/lib/domain/norms.ts` — norms engine:
  - `validateStairs(zone)` → checks 2R+H in [620,640]mm, tread >= 280mm, riser in [100,180]mm; returns { pass, severity, message, fixHint }
  - `validateGarage(zone)` → width >= 2.60m, depth >= 5.00m, independent access >= 3.20m
  - `validateProperty(property)` → runs all rules across zones, returns list of Violation { ruleId, zoneId, severity: pass|warn|fail, message, fixHint }
  - Rule registry: extensible (add new rules)
- Wire to plan changes (recompute on store change; App.svelte shows panel — issue 2 integration point optional)
- Implement assertions in `test/unit/norms-validation.test.ts`""",
  web="""1. search: "NSR-10 escaleras requisitos dimensiones 2026"
2. search: "POT parqueadero dimensiones minimas Colombia 2026"
3. search: "typescript rule engine validation pattern 2026"
4. search: "svelte 5 derived store recompute on change 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/data/house-data.json` (norms section) and `src/lib/domain/property.ts` (issue 3 — read only)
2. Research NSR-10 stair/garage norms (web) to confirm values
3. Design Violation type + rule registry pattern
4. Pure functions (no UI) — testable in isolation""",
  patterns="""- Pure TS functions: `export function validateStairs(zone: Zone): Violation`
- Registry: `export const RULES: Rule[] = [{ id, name, validate }]`
- Severity: `'pass' | 'warn' | 'fail'`""",
  acceptance="""- [ ] `grep -c "export function validateStairs\\|export const validateStairs" src/lib/domain/norms.ts` >= 1
- [ ] `grep -c "export function validateGarage\\|export const validateGarage" src/lib/domain/norms.ts` >= 1
- [ ] `grep -c "2R\\|620\\|640\\|tread\\|riser" src/lib/domain/norms.ts` >= 2 (stair rule values)
- [ ] `grep -c "2.60\\|5.00\\|3.20" src/lib/domain/norms.ts` >= 1 (garage rule values)
- [ ] `grep -c "severity" src/lib/domain/norms.ts` >= 1
- [ ] `npx vitest run test/unit/norms-validation.test.ts` — passes
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/norms.ts` | MISSING | Create norms engine (stairs, garage, registry) | MED |
| `test/unit/norms-validation.test.ts` | skeleton | Implement assertions | LOW |""",
  dont_touch="""- `src/lib/domain/property.ts` (issue 3 — READ ONLY, import types)
- `src/lib/stores/floorPlanStore.svelte.ts` (issue 3 — READ ONLY)
- ALL other `src/lib/domain/*` (issues 7-10)
- UI files (issues 2,4,5) · `.gitcore/features.json` — wave end""",
  guard="""1. **Pure functions** — no UI/DOM access in norms.ts; keep testable
2. **Import types from property.ts** — don't redefine Zone/Property
3. **Rule values from house-data.json** — verify against NSR-10/POT
4. **READ before write** — read property.ts before importing
5. **No any** — typed Violation/Rule interfaces""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 7 ─────────────────────────
issues[7] = dict(
  title="Inventory + costs domain services (items, warranties, expenses, receipts)",
  wave_label="Admin",
  current="""- No inventory/costs code exists
- `src/lib/domain/` empty except property.ts (issue 3)
- features.json: `inventory`, `costs` at 0% (planned)
- Reference patterns: `shelf` (inventory offline-first), `hosteler-ia` (inventory API + transactions) in monorepo""",
  desired="""- `src/lib/domain/inventory.ts`:
  - `addItem`, `updateItem`, `removeItem`, `listItemsByRoom(property, roomId)`, `totalValueByRoom`, `totalValueByProperty`
  - Item fields: id, roomId, name, category, value, warrantyUntil, photo, qr (from property.ts)
  - `isWarrantyExpiring(item, days)` → boolean; `warrantyStatus(item)` → ok|soon|expired
- `src/lib/domain/costs.ts`:
  - `addTransaction`, `listTransactions`, `summarizeByMonth`, `summarizeByCategory`, `exportCSV(transactions)`
  - Transaction { id, type: expense|income, category, amount, date, receiptPhoto? }
- Implement assertions in `test/unit/inventory.test.ts`, `test/unit/costs.test.ts`, `test/integration/inventory-sync.test.ts`""",
  web="""1. search: "typescript domain service pattern crud 2026"
2. search: "csv export typescript browser 2026"
3. search: "date-fns or temporal api typescript dates 2026"
4. search: "warranty expiry calculation date compare typescript\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` (issue 3 — read only) for Item/Property types
2. Skim `/home/belal/proyectosSWAL/shelf/apps/shelf-inventory/lib/` for inventory patterns (inventoryConfig, csvProductImport)
3. Skim `/home/belal/proyectosSWAL/hosteler-ia/src/app/api/inventory/` for transaction patterns
4. Pure functions + a small store integration (optional): keep services framework-agnostic""",
  patterns="""- Pure TS modules with exported functions; types imported from property.ts
- CSV: build string with header row + escaped fields
- Dates: ISO strings; warranty compare with `new Date()`
- No UI imports — testable in node/vitest""",
  acceptance="""- [ ] `grep -c "export function addItem\\|export const addItem" src/lib/domain/inventory.ts` >= 1
- [ ] `grep -c "totalValueByRoom\\|totalValueByProperty" src/lib/domain/inventory.ts` >= 1
- [ ] `grep -c "warrantyStatus\\|isWarrantyExpiring" src/lib/domain/inventory.ts` >= 1
- [ ] `grep -c "export function addTransaction\\|export const addTransaction" src/lib/domain/costs.ts` >= 1
- [ ] `grep -c "exportCSV" src/lib/domain/costs.ts` >= 1
- [ ] `npx vitest run test/unit/inventory.test.ts test/unit/costs.test.ts test/integration/inventory-sync.test.ts` — all pass
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/inventory.ts` | MISSING | Create inventory service | MED |
| `src/lib/domain/costs.ts` | MISSING | Create costs service + CSV | MED |
| `test/unit/inventory.test.ts` | skeleton | Implement assertions | LOW |
| `test/unit/costs.test.ts` | skeleton | Implement assertions | LOW |
| `test/integration/inventory-sync.test.ts` | skeleton | Implement sync-queue test (IndexedDB stub or in-memory) | LOW |""",
  dont_touch="""- `src/lib/domain/property.ts` (issue 3 — READ ONLY)
- `src/lib/domain/norms.ts` (issue 6), utilities/taxes (8), maintenance/analytics (9), export (10)
- UI files (issues 2,4,5) · `.gitcore/features.json` — wave end""",
  guard="""1. **Types from property.ts** — import Item/Property, don't redefine
2. **Pure functions** — no DOM; vitest-friendly
3. **CSV escaping** — quote fields with commas/quotes
4. **No any** — typed signatures
5. **Don't touch other domain files** — file islands""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 8 ─────────────────────────
issues[8] = dict(
  title="Utilities + property tax (predial) domain services",
  wave_label="Admin",
  current="""- No utilities/taxes code exists
- features.json: `utilities`, `taxes` at 0% (planned)
- house-data.json has estrato 3 + city Cali (context for predial presets)""",
  desired="""- `src/lib/domain/utilities.ts`:
  - `addUtility`, `updateUtility`, `logReading(utilityId, value, date)`, `budgetVsActual(utility)` → { budget, actual, diff }
  - Utility { id, type: water|energy|gas|internet, provider, account, dueDay, budget } (from property.ts)
  - `splitBill(utility, shares)` → per-tenant amounts (equal split)
  - `nextDueDate(utility)` → date based on dueDay
- `src/lib/domain/taxes.ts`:
  - `configurePredial(jurisdiction, avaluo, rate_pct, installments)` → generates installments [{ index, amount, dueDate }]
  - `markInstallmentPaid`, `totalAnnual(predial)`, `nextDue(predial)`
  - Colombia presets: estrato → rate hints (documented, not enforced)
- Implement assertions in `test/unit/utilities.test.ts`, `test/unit/utilities-split.test.ts`, `test/unit/taxes.test.ts`""",
  web="""1. search: "impuesto predial Colombia liquidacion avaluo tarifa estrato 2026"
2. search: "typescript date calculations next due date month 2026"
3. search: "split bill calculation tenants equal share typescript 2026"
4. search: "colombia predial installments pago cuotas 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` (issue 3 — read only) for Utility/Taxes types
2. Research Colombian predial basics (web): avaluo × rate, installments by jurisdiction
3. Pure functions; date handling with ISO strings + Date
4. Keep rate presets as data (constants), not business rules enforcement""",
  patterns="""- Pure TS functions; types from property.ts
- Installments: `Array.from({length: installments}, (_,i) => ({index: i+1, amount: round2(total/installments), dueDate}))`
- nextDueDate: `new Date(year, month, dueDay)` handling month rollover""",
  acceptance="""- [ ] `grep -c "export function addUtility\\|export const addUtility" src/lib/domain/utilities.ts` >= 1
- [ ] `grep -c "budgetVsActual" src/lib/domain/utilities.ts` >= 1
- [ ] `grep -c "splitBill" src/lib/domain/utilities.ts` >= 1
- [ ] `grep -c "configurePredial\\|createInstallments" src/lib/domain/taxes.ts` >= 1
- [ ] `grep -c "markInstallmentPaid" src/lib/domain/taxes.ts` >= 1
- [ ] `grep -c "installments" src/lib/domain/taxes.ts` >= 1
- [ ] `npx vitest run test/unit/utilities.test.ts test/unit/utilities-split.test.ts test/unit/taxes.test.ts` — all pass
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/utilities.ts` | MISSING | Create utilities service (CRUD, readings, budget, split) | MED |
| `src/lib/domain/taxes.ts` | MISSING | Create predial service (installments, calendar) | MED |
| `test/unit/utilities.test.ts` | skeleton | Implement assertions | LOW |
| `test/unit/utilities-split.test.ts` | skeleton | Implement split math tests | LOW |
| `test/unit/taxes.test.ts` | skeleton | Implement assertions | LOW |""",
  dont_touch="""- `src/lib/domain/property.ts` (issue 3 — READ ONLY)
- Other domain files (issues 6,7,9,10) · UI files (2,4,5) · `.gitcore/features.json`""",
  guard="""1. **Types from property.ts** — import Utility/Taxes types
2. **Pure functions** — no DOM
3. **Date rollover** — nextDueDate must handle month/year boundaries (Dec→Jan)
4. **Round money** — 2 decimals for amounts
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 9 ─────────────────────────
issues[9] = dict(
  title="Maintenance + analytics domain services (schedules, work orders, alerts)",
  wave_label="Admin",
  current="""- No maintenance/analytics code exists
- features.json: `maintenance`, `analytics` at 0% (planned)
- Reference: `manteniapp` (work orders, approvals, offline) in monorepo""",
  desired="""- `src/lib/domain/maintenance.ts`:
  - `createSchedule(itemId, interval_days, lastDone)` → Schedule { id, itemId, type: preventive, interval_days, lastDone, nextDue }
  - `computeNextDue(schedule)` → lastDone + interval_days
  - `isOverdue(schedule, today)` → boolean; `daysUntilDue(schedule)`
  - `createWorkOrder(schedule, { assignee, notes })` → WorkOrder { id, scheduleId, status: open|in_progress|done, assignee, notes, createdAt }
  - `updateWorkOrderStatus`, `listMaintenanceHistory(property, itemId)`
- `src/lib/domain/analytics.ts`:
  - `spendingByCategory(transactions)` → [{ category, total }]
  - `utilityConsumptionPattern(utilities, readings)` → trend (avg, min, max, delta)
  - `budgetAlerts(utilities, transactions)` → list of alert strings (over budget, overdue)
- Implement assertions in `test/unit/maintenance.test.ts`, `test/integration/maintenance-workorder.test.ts`, `test/unit/analytics.test.ts`""",
  web="""1. search: "preventive maintenance schedule next due date calculation 2026"
2. search: "typescript date add days interval 2026"
3. search: "work order status flow field service 2026"
4. search: "typescript analytics aggregate reduce pattern 2026\"""",
  prompt="""Before implementing:
1. Read `src/lib/domain/property.ts` (issue 3 — read only) for Maintenance types
2. Skim `/home/belal/proyectosSWAL/manteniapp/` for work-order patterns (approvals, offline)
3. Pure functions; date math with milliseconds (Date.now) and day normalization
4. Analytics: pure aggregates over arrays""",
  patterns="""- nextDue: `new Date(lastDone.getTime() + interval_days * 86400000)` (normalize to midnight)
- WorkOrder status: `'open' | 'in_progress' | 'done'` union type
- Aggregates: reduce over arrays; sorted output""",
  acceptance="""- [ ] `grep -c "export function createSchedule\\|export const createSchedule" src/lib/domain/maintenance.ts` >= 1
- [ ] `grep -c "computeNextDue\\|isOverdue" src/lib/domain/maintenance.ts` >= 1
- [ ] `grep -c "createWorkOrder" src/lib/domain/maintenance.ts` >= 1
- [ ] `grep -c "spendingByCategory" src/lib/domain/analytics.ts` >= 1
- [ ] `grep -c "utilityConsumptionPattern" src/lib/domain/analytics.ts` >= 1
- [ ] `npx vitest run test/unit/maintenance.test.ts test/integration/maintenance-workorder.test.ts test/unit/analytics.test.ts` — all pass
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `src/lib/domain/maintenance.ts` | MISSING | Create maintenance service | MED |
| `src/lib/domain/analytics.ts` | MISSING | Create analytics aggregates | MED |
| `test/unit/maintenance.test.ts` | skeleton | Implement assertions | LOW |
| `test/integration/maintenance-workorder.test.ts` | skeleton | Implement work-order flow test | LOW |
| `test/unit/analytics.test.ts` | skeleton | Implement assertions | LOW |""",
  dont_touch="""- `src/lib/domain/property.ts` (issue 3 — READ ONLY)
- Other domain files (6,7,8,10) · UI files (2,4,5) · `.gitcore/features.json` — wave end""",
  guard="""1. **Types from property.ts** — import Maintenance types
2. **Day-normalize dates** — compare at midnight to avoid TZ flakiness
3. **Pure functions** — no DOM
4. **WorkOrder status union** — typed, no string soup
5. **No any** — typed""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ───────────────────────── Issue 10 ─────────────────────────
issues[10] = dict(
  title="Architect export (DXF/PDF/ZIP) + PWA offline-first",
  wave_label="Polish",
  current="""- No export code exists; no PWA config
- `vite.config.ts` exists (no PWA plugin)
- `index.html` template (no manifest/theme-color)
- Issue FEAT_architect-collaboration.md exists (DXF/PDF plan)
- features.json: `export-cad`, `pwa-offline` at 0% (planned)""",
  desired="""- `src/lib/domain/export.ts`:
  - `buildDXF(property)` → DXF string: LAYER definitions, LINE/RECT entities for walls/zones, TEXT for labels; measurements preserved
  - `buildPDF(property, { scale, paperSize })` → PDF via jspdf + html2canvas (or vector): title block (title, scale 1:50, date, owner), 300dpi A1/A2
  - `buildArchitectPackage(property)` → ZIP (JSZip) with property.json + plan.dxf + plan.pdf
  - `downloadBlob(blob, filename)` helper
- PWA offline-first:
  - Add `vite-plugin-pwa` (workbox) to vite.config.ts; manifest: name "NIDO", theme #020617, icons
  - `index.html`: manifest link, theme-color, apple-touch-icon
  - Service worker registers; app shell caches; offline reload keeps state (IndexedDB)
- Implement assertions in `test/unit/export-cad.test.ts`, `test/integration/export-cad.test.ts`, `test/integration/pwa-offline.test.ts`, `test/e2e/pwa-offline.spec.ts`""",
  web="""1. search: "dxf-writer npm typescript 2026"
2. search: "jspdf html2canvas pdf export title block 2026"
3. search: "jszip typescript browser zip download 2026"
4. search: "vite-plugin-pwa workbox svelte 5 2026"
5. search: "pwa offline first indexdb sync queue 2026\"""",
  prompt="""Before implementing:
1. Read `vite.config.ts`, `index.html`, `src/lib/domain/property.ts` (issue 3 — read only)
2. Research dxf-writer / jspdf / jszip / vite-plugin-pwa (web) — check current versions
3. Install: `npm install dxf-writer jspdf jszip` + `npm install -D vite-plugin-pwa html2canvas`
4. DXF: verify output opens in a CAD viewer (structure: HEADER, TABLES, ENTITIES)
5. PWA: register service worker; test offline reload""",
  patterns="""- DXF: `import DxfWriter from 'dxf-writer'`; sections HEADER/TABLES/ENTITIES
- PDF: `import { jsPDF } from 'jspdf'`; title block drawn with rects + text
- ZIP: `import JSZip from 'jszip'`; `zip.generateAsync({type:'blob'})`
- PWA: `import { VitePWA } from 'vite-plugin-pwa'` in vite.config.ts integrations""",
  acceptance="""- [ ] `grep -c "dxf\\|DxfWriter" src/lib/domain/export.ts` >= 1
- [ ] `grep -c "jsPDF\\|jspdf" src/lib/domain/export.ts` >= 1
- [ ] `grep -c "JSZip\\|jszip" src/lib/domain/export.ts` >= 1
- [ ] `grep -c "vite-plugin-pwa\\|VitePWA" vite.config.ts` >= 1
- [ ] `grep -c "theme-color\\|manifest" index.html` >= 1
- [ ] `npx vitest run test/unit/export-cad.test.ts test/integration/export-cad.test.ts test/integration/pwa-offline.test.ts` — all pass
- [ ] `npx playwright test test/e2e/pwa-offline.spec.ts` — passes (offline reload keeps state)
- [ ] `npm run build` — dist contains sw.js + manifest.webmanifest
- [ ] `npm run check` exits 0""",
  files="""| File | Current State | Change | Risk |
|------|--------------|--------|------|
| `package.json` | no export/pwa deps | Add dxf-writer, jspdf, jszip, html2canvas, vite-plugin-pwa | LOW |
| `src/lib/domain/export.ts` | MISSING | Create DXF/PDF/ZIP exporters | HIGH |
| `vite.config.ts` | existing | Add VitePWA plugin | MED |
| `index.html` | template | Add manifest link + theme-color | LOW |
| `test/unit/export-cad.test.ts` | skeleton | Implement assertions | LOW |
| `test/integration/export-cad.test.ts` | skeleton | Implement (DXF structure check) | LOW |
| `test/integration/pwa-offline.test.ts` | skeleton | Implement | LOW |
| `test/e2e/pwa-offline.spec.ts` | skeleton | Implement | LOW |""",
  dont_touch="""- `src/App.svelte` + UI files (issues 2,4,5)
- `src/lib/stores/floorPlanStore.svelte.ts` + `src/lib/domain/property.ts` (issue 3 — READ ONLY)
- Other domain files (6,7,8,9) · `.gitcore/features.json` — wave end
- Do NOT add Tailwind/shadcn (UI rule)""",
  guard="""1. **Types from property.ts** — import Property type (issue 3)
2. **DXF correctness** — structure must be valid (HEADER/TABLES/ENTITIES); test parses it
3. **PWA plugin** — use `vite-plugin-pwa` (workbox auto); verify sw.js in dist
4. **READ before write** — read vite.config.ts + index.html first
5. **No any** — typed exporters
6. **Verify build** — npm run build must produce sw.js + manifest""",
  pr_delivery="""## PR Delivery Requirements (ANTI-EMPTY-PR)
- [ ] `git status --porcelain` shows new/modified files BEFORE opening the PR
- [ ] `git diff --stat HEAD` lists the files (NOT empty)
- [ ] The PR MUST contain >= 1 file: verify with `git ls-files` before push
- [ ] If work could not be completed: DO NOT open a PR — comment the blocker on the issue""",
)

# ─────────────────────── Write bodies ───────────────────────
# File-island map (verified disjoint in design phase)
ISSUES = {
 1: {"files": ["scripts/init.sh", "scripts/build.sh", "scripts/verify.sh", "scripts/sync.sh",
               "scripts/doc-hook.sh", ".gitignore", ".git-core-protocol-version"],
     "features": ["gitcore-compliance", "toolchain-ci"]},
 2: {"files": ["src/App.svelte", "src/app.css", "src/main.ts", "index.html", "src/lib/Counter.svelte"],
     "features": ["ui-swal"]},
 3: {"files": ["src/lib/data/house-data.json", "src/lib/stores/floorPlanStore.svelte.ts",
               "src/lib/domain/property.ts"],
     "features": ["data-model"]},
 4: {"files": ["src/lib/CanvasStage.svelte", "src/lib/Toolbar.svelte", "src/lib/FloorSelector.svelte"],
     "features": ["plans-2d"]},
 5: {"files": ["src/lib/Scene3D.svelte", "src/lib/floors/GroundFloor.svelte", "src/lib/floors/ApartmentFloor.svelte"],
     "features": ["plans-3d"]},
 6: {"files": ["src/lib/domain/norms.ts"], "features": ["norms-validation"]},
 7: {"files": ["src/lib/domain/inventory.ts", "src/lib/domain/costs.ts"],
     "features": ["inventory", "costs"]},
 8: {"files": ["src/lib/domain/utilities.ts", "src/lib/domain/taxes.ts"],
     "features": ["utilities", "taxes"]},
 9: {"files": ["src/lib/domain/maintenance.ts", "src/lib/domain/analytics.ts"],
     "features": ["maintenance", "analytics"]},
 10: {"files": ["src/lib/domain/export.ts", "vite.config.ts"],
      "features": ["export-cad", "pwa-offline"]},
}

merge_orders = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10}
depends = {1: "", 2: "#1", 3: "#1", 4: "#1, #3", 5: "#1, #3", 6: "#1, #3",
           7: "#1, #3", 8: "#1, #3", 9: "#1, #3", 10: "#1, #3"}
parallel = {1: "—", 2: "#3", 3: "#2", 4: "#5, #6", 5: "#4, #6", 6: "#4, #5",
            7: "#8, #9", 8: "#7, #9", 9: "#7, #8", 10: "— (after most)"}
efforts = {1: "Medium (1-4h)", 2: "Medium (1-4h)", 3: "Large (4h+)", 4: "Large (4h+)",
           5: "Medium (1-4h)", 6: "Medium (1-4h)", 7: "Medium (1-4h)", 8: "Medium (1-4h)",
           9: "Medium (1-4h)", 10: "Large (4h+)"}

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

# E2E (if listed)
npx playwright test <the e2e spec(s)>

# No regressions
npx vitest run 2>&1 | tail -3
```

{footer(num, depends[num], parallel[num], merge_orders[num], efforts[num])}
"""
    p = os.path.join(OUT, f"body-{num:02d}.md")
    with open(p, "w") as fh:
        fh.write(body)
    paths[num] = p
    print(f"✅ {p} ({len(body.splitlines())} lines)")

# Save manifest for harness
manifest = {
  "repo": REPO,
  "wave": "nido-wave1",
  "issues": {str(n): {"body": paths[n], "files": spec["files"], "features": spec["features"],
                       "title": issues[n]["title"]} for n, spec in ISSUES.items()},
}
with open(os.path.join(OUT, "manifest.json"), "w") as fh:
    json.dump(manifest, fh, indent=2)
print(f"\n📦 manifest: {os.path.join(OUT, 'manifest.json')}")
