# PR #1 Harvest — AI Skills, Layers, Dynamic 3D (2026-08-03)

**Source branch:** `feat/floor-plan-ai-layers-3d-1329924071129539816` (base: b904537, stale)
**Verdict:** ⚠️ Harvest selectively — modules extracted, UI components NOT ported.
**PR state:** OPEN (kept open for reference; not mergeable as-is).

## Extracted modules (pure logic, no legacy UI)

| File (harvested) | Original | Lines | Value for NIDO |
|------------------|----------|-------|----------------|
| `ai_skills.ts` | `src/lib/ai/skills.ts` | 183 | AI skill definitions (addWall, addComponent…) with JSON-schema params — base for future AI assistant (NOT in current plan; candidate feature) |
| `utils_validator.ts` | `src/lib/utils/validator.ts` | 82 | DesignValidator: config checks (wallThickness >= 0.10m) + per-floor rules — OVERLAPS with our `src/lib/domain/norms.ts` (REQ-011). Merge the extra rules into norms.ts, don't duplicate |
| `utils_io.ts` | `src/lib/utils/io.ts` | 49 | IOManager export/import JSON — partially superseded by export.ts (REQ-017) + floorPlanStore persistence |

## NOT harvested (rejected as-is)

| Component | Reason |
|-----------|--------|
| `AIChat.svelte` | Legacy styling; needs @swal/ui port; AI assistant not in wave 2 scope |
| `LayerManager.svelte` | Layer concept (structure/furniture/zones/annotations/grid) is interesting but built for the OLD floorPlanStore API (LayerType) that changed in wave 1; would need re-architecture |
| `ValidationModal.svelte` | Superseded by norms-validation (REQ-011) |
| App/CanvasStage/Scene3D changes | Stale base b904537 — conflicts with wave-1 integration |

## Wave 2 usage plan
1. Port the extra validator rules (riser/tread/config) into `src/lib/domain/norms.ts`.
2. Reuse `IOManager` patterns in export.ts if needed (ZIP/JSON round-trip).
3. AI skills: keep harvested file as reference; if CEO adds an AI-assistant feature,
   port to a `src/lib/domain/ai-skills.ts` + @swal/ui chat component (new feature,
   new REQ-ID).
4. Delete this harvest dir after wave 2 integration (or move to docs/spikes/).
