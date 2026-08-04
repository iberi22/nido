# SRS — NIDO

> **Protocol:** GitCore 3.8.0 · **Updated:** 2026-08-03

## Status

| Document | Completeness | Estado |
|----------|:-----------:|--------|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 100% (48 REQ-IDs, 20 user stories) | draft |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 100% | draft |
| [../decisions/](../decisions/) ADRs | 100% (5 ADRs) | draft |

## REQ-ID index

| Range | Scope |
|-------|-------|
| REQ-001 – REQ-007 | GitCore base (protocol, SRC, Pro gate, instance isolation, Xavier, security, CI) |
| REQ-008 – REQ-011 | M1 — Data model & plans (schema, 2D editor, 3D viewer, norms validation) |
| REQ-012 – REQ-016, REQ-026 | M2 — Home administration (inventory, costs, utilities, taxes, maintenance, analytics) |
| REQ-017 – REQ-019 | M3 — Export & accounts (DXF/PDF, auth/roles, verified invitations) |
| REQ-020 – REQ-021 | M4 — Leasing (contracts/payments, tenant portal) |
| REQ-022 – REQ-025 | M5 — P2P network (mesh, GPS discovery, trust score, escrow/disputes) |
| REQ-027 – REQ-028 | Cross-phase — UI on @swal/ui, toolchain/CI |
| REQ-029 – REQ-047 | Per-feature requirements (wave 2 mapping) |
| REQ-048 | AI home assistant (wave 3) |

## Sources of truth

- Features + user stories + tests: `.gitcore/features.json` (+ `.gitcore/features/details/`)
- Product plan / roadmap: monorepo `docs/SWAL/NIDO_PLAN.md`
- Architecture: `.gitcore/ARCHITECTURE.md` and `./ARCHITECTURE.md`

## Keep in sync

Regenerate REQUIREMENTS.md from the canonical spec:

```bash
python3 .gitcore/scripts/generate-srs.py
python3 .gitcore/scripts/generate-features.py
```
