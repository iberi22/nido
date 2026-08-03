# ADR-003: Plan engine — Konva 2D + Three.js 3D, code-split

**Status:** Accepted
**Supersedes:** —
**Date:** 2026-08-03
**Context:** The repo already renders 2D via Konva/svelte-konva and 3D via
Three.js. Build passes (Vite 8 beta, chunk >500KB). Alternatives: rewrite on
Canvas API (loss of tooling), or WASM (overkill now).
**Decision:** Keep Konva (2D) + Three.js (3D) as the plan engine. Both views derive
from the same reactive plan store (single source of truth). Lazy-load `Scene3D`
and code-split 2D/3D so initial bundle < 500KB. Pin Vite to stable (not beta 8)
during M0; re-evaluate Vite 8 when stable.
**Consequences:** Positive — fastest path; proven canvas interaction; single data
model. Negative — Three.js weight; mitigated by lazy loading. svelte-konva is
maintained but low-activity: acceptable, wrapped behind `CanvasStage.svelte`.
**Spikes required:** M0 spike: bundle-size audit + dynamic import of Scene3D.
**References:** `src/lib/CanvasStage.svelte` (530 LOC), `src/lib/Scene3D.svelte`
(218 LOC), maturity audit §1.
