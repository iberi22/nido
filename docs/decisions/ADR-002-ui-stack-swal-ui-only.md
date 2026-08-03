# ADR-002: UI stack — edge-hive-admin as lab reference, replicated via @swal/ui

**Status:** Accepted
**Supersedes:** —
**Date:** 2026-08-03 (updated: reference-UI rule clarified from source)
**Context:** PR #3 (Jules) added a shadcn-svelte + Tailwind v4 dark theme to
floor-plan-designer. The SWAL lab reference UI is **`edge-hive-admin`**
(`~/proyectosSWAL/edge-hive/edge-hive-admin`): a React 19 + Tailwind + Tauri
control plane (26 pages) that was **designed first for edge-hive** and is the
canonical look of the whole lab. Its "Hive Dark" theme tokens live in its
`index.html` tailwind config (slate 850/900/950, `hive-cyan #06b6d4`,
`hive-orange #f97316`, `hive-void #000000`, neon shadows, glitch/flicker/marquee).
`@swal/ui` is the **faithful Svelte 5 port** of that UI (README: "portado
fielmente de edge-hive/edge-hive-admin", zero-dependency, `--swal-*` tokens).
**Decision:**
1. **Reference:** `edge-hive-admin` is THE UI of the SWAL lab. Every SWAL project
   replicates its look (dashboard shell, tokens, component language).
2. **Mechanism:** replication happens through `@swal/ui` (the Svelte 5 port).
   NIDO builds all UI on `@swal/ui`.
3. **Reject PR #3 as-is** (shadcn-svelte + Tailwind): it installs a second,
   redundant UI layer (bits-ui + CVA + tailwind-merge + lucide) duplicating what
   `@swal/ui` already provides; violates the unified-core directive
   (2026-08-02: centralize, don't fork). The dark-theme intent is preserved by
   porting onto `--swal-*` tokens.
4. **Gap rule:** if a component exists in edge-hive-admin but not in `@swal/ui`,
   port it INTO `@swal/ui` (centralize), never re-create ad-hoc in the project.
5. Delete template leftovers (`Counter.svelte`, `src/assets/svelte.svg`).
**Consequences:** Positive — NIDO (and all apps) look identical to the lab
reference; UI stays unified in one core. Negative — rework of Jules' PR; small M0
delay (1–2 days).
**Spikes required:** M0 spike: import `@swal/ui` in the Vite+Svelte app and
render one Card/Button matching edge-hive-admin styling; compare visually.
**References:** `edge-hive/edge-hive-admin/index.html` (theme tokens),
`edge-hive/edge-hive-admin/README.md`, `swal-ui/README.md` (port origin),
`docs/SWAL/PROJECT_MAP.md` (swal-ui infra).
