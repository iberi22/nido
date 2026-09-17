# SRC — Source Code Reference — NIDO

> **Protocol:** GitCore 3.8.0
> **Updated:** 2026-08-03
> **Completeness:** structure 100% (update tree when modules change)

## 1. Overview

NIDO — Intelligent Home Administration: floor plans + rules + measurements for any
dwelling, with internal administration (taxes, leasing, parts inventory, costs,
maintenance planning, public utilities) and a future private GPS-proximity rental
network with cross-app verified accounts.

| Field | Value |
|-------|--------|
| Path | `$SWAL_ROOT/nido` (workspace-relative; never a personal absolute path) |
| GitHub | `iberi22/floor-plan-designer` (PRIVATE, rename target: `iberi22/nido`) |
| Stack | Svelte 5 (runes) + Vite + TypeScript · Konva 2D · Three.js 3D · `@swal/ui` |
| Protocol | GitCore 3.9.0 |
| Visibility | **PUBLIC en GitHub (verificado 2026-09-16)** — contradice el default SWAL; decidir si pasa a privado |
| Pro model | SWAL node active (not Stripe) |
| Product plan | monorepo `docs/SWAL/NIDO_PLAN.md` |

## 2. Directory structure

```
nido/
├── AGENTS.md
├── SRC.md
├── README.md                  # project overview (product, not template)
├── package.json               # Svelte 5 + Vite + TS deps
├── vite.config.ts             # Vite build config (code-split 2D/3D planned)
├── svelte.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── biome.json                 # lint + format (Biome 2.x)
├── index.html
├── .git-core-protocol-version # 3.8.0
├── .gitignore
├── .gitcore/
│   ├── ARCHITECTURE.md        # non-negotiables + domain architecture
│   ├── AGENT_INDEX.md         # agent routing
│   ├── features.json          # source of truth: features + user stories + tests
│   ├── features/details/      # 1 JSON per feature (GitCore detail schema v1)
│   ├── MANIFEST.json          # protocol extensions (user_stories field)
│   ├── planning/PLANNING.md   # vision, phases, constraints
│   ├── planning/TASK.md       # active tasks
│   ├── docs/                  # canonical SWAL docs mirrors
│   ├── scripts/               # gitcore feature-verify helpers
│   └── state-report.json      # auto-generated (gitignored)
├── docs/
│   ├── SRS/index.md           # SRS status
│   ├── SRS/REQUIREMENTS.md    # REQ-001..007 base + REQ-008+ domain w/ user stories
│   ├── SRS/ARCHITECTURE.md    # component map
│   ├── decisions/             # ADR-001.. (stack, canvas, data model, P2P, trust)
│   └── spikes/                # feasibility experiments
├── scripts/
│   ├── init.sh, build.sh, verify.sh, sync.sh, doc-hook.sh
│   └── hooks/post-commit      # warning-only drift hook
├── src/
│   ├── main.ts                # Vite entry
│   ├── app.css                # global styles (SWAL tokens planned)
│   ├── App.svelte             # app shell (206 LOC)
│   ├── assets/svelte.svg      # ⚠️ template leftover — delete in M0
│   └── lib/
│       ├── CanvasStage.svelte     # 2D Konva canvas (530 LOC)
│       ├── Scene3D.svelte         # 3D Three.js viewer (218 LOC)
│       ├── Toolbar.svelte         # tools bar (141 LOC)
│       ├── FloorSelector.svelte   # floor picker (95 LOC)
│       ├── Counter.svelte         # ⚠️ template leftover — delete in M0
│       ├── floors/GroundFloor.svelte
│       ├── floors/ApartmentFloor.svelte
│       ├── stores/floorPlanStore.svelte.ts  # state store (224 LOC, runes)
│       ├── data/house-data.json   # data model (208 LOC, NSR-10/POT)
│       └── domain/                # (planned) canonical NIDO model + services
└── test/
    ├── unit/                  # Vitest specs per feature (planned)
    ├── integration/           # integration specs (Xavier, mesh, payments)
    └── e2e/                   # Playwright specs (planned)
```

## 3. Core components

| Component | Path | Purpose |
|-----------|------|---------|
| Protocol meta | `.gitcore/` | Architecture, features (source of truth), planning |
| SRS | `docs/SRS/` | Formal requirements w/ user stories (REQ-IDs) |
| Product plan | monorepo `docs/SWAL/NIDO_PLAN.md` | Vision, architecture, roadmap |
| Agent rules | `AGENTS.md` | Read order + SWAL constraints |
| 2D canvas | `src/lib/CanvasStage.svelte` | Konva blueprint editor |
| 3D viewer | `src/lib/Scene3D.svelte` | Three.js visualization |
| State | `src/lib/stores/floorPlanStore.svelte.ts` | Reactive plan state (runes) |
| Data model | `src/lib/data/house-data.json` | Sample property (NSR-10/POT norms) |

## 4. Build / run / test

```bash
# Install (pin Node + npm; see scripts/init.sh)
npm install

# Dev server
npm run dev

# Build (production)
npm run build            # vite build

# Type check
npm run check            # svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json

# Lint + format
npx biome check src/

# Tests (planned, M0: Vitest + Playwright)
npm run test             # vitest run
npm run test:e2e         # playwright test

# GitCore verification (computes .gitcore/state-report.json)
./scripts/verify.sh
```

> **M0 actions:** pin Vite to stable (not beta), delete `Counter.svelte` +
> `src/assets/svelte.svg`, add Vitest + Playwright, rebuild UI on `@swal/ui`,
> replace README template, add `vite-plugin-pwa`.
