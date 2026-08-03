# AGENT_INDEX — NIDO

**Protocol:** 3.8.0 · **Updated:** 2026-08-03

## Agent routing

| Task type | Agent | Notes |
|-----------|-------|-------|
| Plan / design review | Kimi k3 | `kimi -p "Do NOT explore. Analyze: ..."` — never implements |
| Research | Hermes web-research | Brave + Tavily |
| Implementation (simple) | Cursor Agent (Grok LOW) | 1–2 files |
| Implementation (medium) | Agy (Gemini high) | 2–5 files |
| Implementation (complex) | Claude Code | 5+ files, domain logic |
| Async / GitHub PRs | Jules | 15-task limit per wave |
| Merge + verify | Hermes | always |
| M0–M5 waves | Hermes + delegate_task | file-island batches, max 3 parallel |

## Context loading

1. `.gitcore/ARCHITECTURE.md` — non-negotiables first
2. `.gitcore/features.json` — source of truth (features + user stories + tests)
3. `docs/SRS/REQUIREMENTS.md` — REQ-IDs with acceptance criteria
4. `SRC.md` — real tree + commands
5. monorepo `docs/SWAL/NIDO_PLAN.md` — product vision/roadmap

## Core repos (read-only, do not fork)

- `~/proyectosSWAL/edge-mesh` — P2P core
- `~/proyectosSWAL/xavier` — memory core
- `~/proyectosSWAL/swal-ui` — design system core
- `~/proyectosSWAL/shelf` — inventory/offline patterns
- `~/proyectosSWAL/hosteler-ia` — payments/tiers patterns
- `~/proyectosSWAL/manteniapp` — maintenance work-order patterns
