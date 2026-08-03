# ADR-004: Data model — canonical JSON schema, offline-first

**Status:** Accepted
**Supersedes:** —
**Date:** 2026-08-03
**Context:** `house-data.json` is a fixed sample (project/norms/floors/zones).
NIDO needs a canonical property model covering property/floors/zones/rooms/items/
taxes/leases/maintenance/utilities that validates, migrates, and syncs offline.
**Decision:** Define `property.schema.json` (JSON Schema v1) as the canonical
model. Extend `floorPlanStore.svelte.ts` into a `nidoStore` family (Svelte runes).
Persistence: IndexedDB local-first; sync via edge-hive SurrealDB; P2P CRDT via
edge-mesh for collaboration/rental data. house-data.json migrates to schema-valid
form (kept as seed/sample).
**Consequences:** Positive — one model powers 2D/3D/admin/network; offline-first;
schema-validated. Negative — migration cost of existing sample + store; managed in
M1 with a migration test.
**Spikes required:** M1 spike: JSON Schema → TS types generation
(typescript-json-schema or zod); validate with sample.
**References:** `src/lib/data/house-data.json`, `src/lib/stores/floorPlanStore.svelte.ts`.
