# SRS — Architecture — NIDO

> **Protocol:** GitCore 3.8.0 · **Updated:** 2026-08-03
> See also `.gitcore/ARCHITECTURE.md` (non-negotiables) and monorepo `docs/SWAL/NIDO_PLAN.md`.

## Component map

| Component | Technology | REQ-IDs | Source |
|-----------|-----------|---------|--------|
| App shell | Svelte 5 (runes) + Astro, PWA | REQ-025, REQ-027, REQ-028 | `src/App.svelte` |
| **UI reference** | **`edge-hive-admin`** (React 19 + Tailwind + Tauri, 26 pages) | REQ-027 | `edge-hive/edge-hive-admin/` — lab reference UI, replicated in every SWAL project |
| UI kit | `@swal/ui` (15 components, edge-hive) — **Svelte 5 port of edge-hive-admin** | REQ-027 | `@swal/ui` package; port gaps: `DeployNodeModal`, `MetricsChart` → port INTO @swal/ui when needed |
| 2D canvas | Konva + svelte-konva | REQ-009 | `src/lib/CanvasStage.svelte` |
| 3D viewer | Three.js (lazy) | REQ-010 | `src/lib/Scene3D.svelte` |
| Plan state | Svelte runes store | REQ-008, REQ-009 | `src/lib/stores/floorPlanStore.svelte.ts` |
| Data model | property.schema.json | REQ-008 | `src/lib/data/house-data.json` → domain/ |
| Norms engine | TS domain service | REQ-011 | `src/lib/domain/norms.ts` (planned) |
| Inventory | domain service + IndexedDB | REQ-012 | shelf patterns |
| Costs | domain service | REQ-013 | — |
| Utilities | domain service | REQ-014 | — |
| Taxes (predial) | domain service | REQ-015 | — |
| Maintenance | domain service | REQ-016 | manteniapp patterns |
| Export | dxf-writer, jspdf, html2canvas | REQ-017 | — |
| Auth/roles | localAuth + seed + WebAuthn | REQ-018 | shelf patterns |
| Invitations | 1-time token API | REQ-019 | mimatera pattern |
| Leasing | domain + Stripe → Polygon | REQ-020, REQ-021 | hosteler-ia patterns |
| Mesh | edge-mesh (Yjs, WebRTC, ML-DSA-65) | REQ-022 | `edge-mesh` core |
| Discovery | geohash + presence | REQ-023 | edge-mesh |
| Trust | T1–T4 verifier | REQ-024 | in-house OAuth link proofs |
| Escrow | Polygon contract | REQ-025 | gara-g economic core |
| Memory | Xavier HTTP :8006 / MCP | REQ-005 | `app/nido/instance/{id}` |
| Analytics | TS service + charts | REQ-026 | hosteler-ia patterns |

## Data flow (high level)

```
[Svelte UI] ──runes──> [domain services] ──> IndexedDB (offline-first)
      │                                        │
      └──@swal/ui────> [edge-mesh CRDT] <──────┘ (multi-device / P2P rental)
                            │
                     [Xavier :8006] (semantic memory)
                     [edge-hive node] (SurrealDB sync, WASM edge fns)
                     [Stripe / Polygon] (payments, escrow)
```

## Deployment

- Web PWA hosted by edge-hive node (SurrealDB backend)
- Mobile: Tauri/Capacitor (tier 2)
- Local-first: fully functional offline (IndexedDB + localAuth)

## Security boundaries

- Geolocation consent required (REQ-023)
- Post-quantum signatures for contracts (ML-DSA-65, REQ-022)
- Escrow + governance for disputes (REQ-025)
- Secrets gitignored; private repo (REQ-006)
