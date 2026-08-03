# ADR-001: Product identity and scope

**Status:** Accepted
**Supersedes:** —
**Date:** 2026-08-03
**Context:** `floor-plan-designer` (iberi22, private) is an early-stage 2D/3D floor
plan editor (maturity 39/100). The CEO wants it to become NIDO: intelligent home
administration (plans, rules, measures, taxes, leasing, parts inventory, costs,
maintenance, utilities) plus a future private GPS-proximity rental network with
cross-app verified accounts.
**Decision:** Rename the product to **NIDO** (appId `nido`, repo rename target
`iberi22/nido`). Keep the existing Konva/Three.js codebase as the plan engine and
build the admin layers on SWAL shared cores. Registry: add to SWAL PROJECT_MAP as
product (pending wave).
**Consequences:** Positive — strong differentiation (no competitor combines plans +
admin + P2P). Negative — scope is large (8 modules); mitigated by phase gates M0–M5.
**Spikes required:** None for this ADR; M1 spike: JSON-schema data model migration.
**References:** `docs/SWAL/NIDO_PLAN.md`, audit evidence in plan §1.
