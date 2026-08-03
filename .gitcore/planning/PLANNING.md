# PLANNING — NIDO

**Protocol:** 3.8.0 · **Updated:** 2026-08-03

## Vision

NIDO makes any dwelling "alive": its floor plan is the interactive map, every room
carries its inventory, every month its utilities, every object its maintenance
schedule — plus taxes, leasing and costs. Later, a private GPS-proximity rental
network with cross-app verified accounts eliminates rental scams.

## Goals

1. GitCore 3.8.0 compliance (SRC + SRS + features.json 100%)
2. M0–M5 delivery per `docs/SWAL/NIDO_PLAN.md` roadmap (~15–20 weeks)
3. UI 100% on `@swal/ui` (reject PR #3 shadcn fork)
4. Reuse SWAL cores (edge-mesh, Xavier, @swal/ui, shelf patterns) — no re-invention
5. Market-first: Colombia (predial, estratos, NSR-10/POT)

## Phases

| Phase | Name | Target | Status |
|-------|------|--------|--------|
| M0 | Foundation | 1–2 wk | pending |
| M1 | Data model & plans v2 | 2–3 wk | pending |
| M2 | Home administration | 3–4 wk | pending |
| M3 | Export & accounts | 2 wk | pending |
| M4 | Leasing | 3 wk | pending |
| M5 | P2P network | 4–6 wk | pending |

## Constraints

- Private repo; no GH Actions unless exception; no Stripe Pro
- Vite pinned stable (not beta 8)
- 2D/3D code-split (bundle < 500KB initial)
- Test coverage: every feature has unit + integration + e2e defined (features.json)
- All docs in English
