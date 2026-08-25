# 🪺 NIDO — Intelligent Home Administration

> Plans, rules and measurements for any dwelling — plus a private, verified
> peer-to-peer rental network.

**NIDO** is an intelligent home-administration platform (formerly
`floor-plan-designer`). It turns any dwelling — house, apartment, bodega or
construction project — into a living, governable digital model: draw the floor
plan in 2D, explore it in 3D, keep every measurement and rule, and run the whole
home from a single offline-first workspace.

Beyond a single home, NIDO grows into a **private GPS-proximity rental
network**: a P2P marketplace with cross-app **verified accounts** (trust score,
WebAuthn, identity anchoring) designed to be **anti-scam** by default.

## ✨ Core capabilities

### Dwellings & plans
- **2D floor-plan editor** (Konva) and **3D viewer** (Three.js)
- Canonical property **data model** + building **norms validation**
- **Architect export**: DXF / PDF / ZIP

### Home administration
- **Property tax (predial)** tracking
- **Leasing**: contracts & payments, tenant portal
- **Parts & furniture inventory**
- **Costs & income** tracking + home **analytics & notifications**
- **Preventive maintenance** planning
- **Public utilities** administration
- **AI home assistant** over the property model

### P2P rental network (M5)
- **GPS-proximity discovery** of nearby listings
- **Cross-app verified accounts** with **trust score** (T1–T4: gov-ID+selfie →
  linked sessions → on-network history → Polygon deposit/collateral)
- **Verified 1-time invitations**, escrow & **dispute governance**
- Post-quantum **ML-DSA-65** lease signing via **edge-mesh**

## 🧱 Stack

| Layer | Technology |
|-------|-----------|
| UI | **Svelte 5** (runes) + **Astro** islands |
| Design system | **`@swal/ui`** (edge-hive theme — SWAL lab reference UI) |
| Plans | **Konva** 2D · **Three.js** 3D |
| P2P | **edge-mesh** (Yjs CRDT, ML-DSA-65 identity) |
| Memory | **Xavier** (HTTP `:8006` / MCP) |
| Backend | **edge-hive** (SurrealDB, WASM edge functions) |
| Offline | **IndexedDB** local-first · **PWA** |
| Payments | Stripe (M4) → Polygon/`$SWAL` escrow (M5) |

## 🚀 Quickstart

```bash
# 1. Install dependencies
pnpm install

# 2. Start the dev server
pnpm dev

# 3. Type-check + unit & integration tests
pnpm check
pnpm test
```

### Useful scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm check` | `svelte-check` + `tsc` type checking |
| `pnpm test` | Run unit + integration tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm test:coverage` | Coverage report |
| `pnpm security` | Security verification (`gitleaks` etc.) |
| `pnpm deploy` | Deploy to Cloudflare (Wrangler) |

## 📋 Roadmap & feature tracking

The source of truth for features, user stories and tests lives in
**[`.gitcore/features.json`](.gitcore/features.json)** (GitCore 3.8.0 protocol).

Roadmap phases: **M0** Foundation → **M1** Data model & plans → **M2** Home
administration → **M3** Export & accounts → **M4** Leasing → **M5** P2P
network. See also `docs/SRS/` for formal requirements and
`.gitcore/ARCHITECTURE.md` for the architecture.

## 🏗️ Project structure

```
src/lib/
  domain/     # domain services (plans, inventory, costs, taxes, leasing, …)
  vendor/     # vendored @swal/ui + edge-mesh
test/
  unit/       # unit tests
  integration/# integration tests
  e2e/        # Playwright e2e
```

## 🔒 Security & governance

- Post-quantum key signing (**ML-DSA-65**) via edge-mesh
- Geolocation only with explicit user consent (data minimization)
- Escrow on Polygon; disputes via edge-mesh governance
- Secrets in `.env` (gitignored); `.env.example` carries no real values

## 📄 License

Private — part of the SWAL ecosystem (`@iberi22`).
