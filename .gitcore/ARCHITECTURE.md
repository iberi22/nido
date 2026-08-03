# NIDO — Architecture

**GitCore:** 3.8.0 · **Updated:** 2026-08-03 · **AppId:** `nido`

## Non-negotiable

1. GitCore protocol compliance (SRC + SRS + features.json complete)
2. Repository **private**; GH Actions **disabled** by default
3. Product Pro = **SWAL node** (not Stripe)
4. instance_id isolation for multi-workspace
5. Xavier HTTP/MCP for agentic memory (outside business DB)
6. **UNIFIED CORES** (directive 2026-08-02): edge-mesh (P2P), Xavier (memory),
   @swal/ui (UI). No forks, no duplicated core logic.
7. **UI = lab reference `edge-hive-admin`, replicated via `@swal/ui`**
   (its Svelte 5 port) — NO shadcn-svelte, NO project-local Tailwind
8. Docs in English (SRS, SRC, ADRs, scripts, commits)
9. See monorepo `docs/SWAL/README.md` + `docs/SWAL/NIDO_PLAN.md` for roadmap

## Domain architecture

### Layers

```
┌─ UI (Svelte 5 runes + Astro islands) ────────────────────────────────┐
│  @swal/ui components · edge-hive tokens · PWA offline-first          │
├─ Domain services (src/lib/domain/) ──────────────────────────────────┤
│  plans · inventory · costs · utilities · taxes · maintenance ·       │
│  leasing · accounts · trust · network                                 │
├─ Infrastructure ─────────────────────────────────────────────────────┤
│  Konva 2D / Three.js 3D (lazy) · edge-mesh (P2P CRDT, ML-DSA-65) ·   │
│  Xavier :8006 (memory) · edge-hive node (SurrealDB, WASM edge fns) · │
│  Stripe (payments) · IndexedDB (offline)                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Data stores

| Store | Tech | Data |
|-------|------|------|
| Local-first | IndexedDB | plan state, inventory, costs, utilities (offline) |
| Backend | SurrealDB via edge-hive | synced multi-device data, leases, accounts |
| Memory | Xavier (`app/nido/instance/{id}`) | semantic home memory, Q&A, audit trail |
| P2P | edge-mesh Yjs CRDT (`swal/nido/{instanceId}`) | shared plan collaboration, rental network (M5) |
| Payments | Stripe (M4) → Polygon/$SWAL (M5 escrow) | rent collection, deposits |

### Identity & trust (M5)

- Accounts: localAuth + recovery seed + WebAuthn (shelf pattern)
- Roles: ADMIN / PROPIETARIO (owner) / INQUILINO (tenant) / SUPERVISOR (inspector)
- Invitations: 1-time-use tokens (portafolio-mimatera pattern)
- Trust score T1–T4: gov-ID+selfie → linked external sessions → on-network
  history → Polygon deposit/collateral
- Listing anchoring: geohash + floor plan + live presence (anti-scam)

### Integration points

| Core | Interface | Use |
|------|-----------|-----|
| `@swal/ui` | npm workspace dep | all UI components |
| `edge-mesh` | TS package | P2P sync, chat, governance, identity ML-DSA-65 |
| Xavier | HTTP :8006 + MCP | memory namespaces, semantic search |
| edge-hive | node API | backend hosting, SurrealDB, WASM edge functions |

## Platform tiers

| Tier | Target | Gate |
|------|--------|------|
| 1 (MVP) | web (PWA: desktop + mobile browsers) | Required: all M0–M4 features |
| 2 | Android/iOS via Tauri/Capacitor | Post-MVP, best-effort |
| 3 | Desktop native | Backlog |

## Security notes

- Geolocation (GPS proximity) requires explicit user consent + data minimization
- Lease contracts signed with ML-DSA-65 post-quantum keys (edge-mesh identity)
- Escrow on Polygon for deposits; disputes via edge-mesh governance
- Secrets: `.env` gitignored; `.env.example` with no real values
