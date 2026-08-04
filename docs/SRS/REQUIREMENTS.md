# Software Requirements Specification — NIDO

> **Protocol:** GitCore 3.8.0 · **Updated:** 2026-08-03
> IEEE 830 reduced. Structure **100%**. Keep REQ-IDs in sync with code.
> Product plan: monorepo `docs/SWAL/NIDO_PLAN.md` · Features: `.gitcore/features.json`

## User stories index

| US-ID | Actor | Want | So that | Features |
|-------|-------|------|---------|----------|
| US-101 | owner | draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements | my property is mapped accurately | ui-swal, plans-2d |
| US-102 | owner | view my plan in 3D | I can visualize spaces before making changes | plans-3d |
| US-103 | owner | validate my design against NSR-10/POT norms | construction is compliant | norms-validation |
| US-104 | owner | export my plan as DXF/PDF/ZIP for my architect | external CAD workflows work | export-cad |
| US-201 | owner | define my property type with floors/zones/rooms | everything else anchors to the plan | data-model |
| US-301 | owner | inventory furniture/parts per room with photos, QR, warranty, value | I know what I own and its worth | inventory |
| US-302 | owner | log expenses and income with receipts | I see my home's real cost of ownership | costs, analytics |
| US-303 | owner | track water/energy/gas/internet consumption and due dates | I never miss a bill and can budget | utilities |
| US-304 | owner | track my predial tax | I never miss payments | taxes |
| US-305 | owner | schedule preventive maintenance per item/room | nothing breaks silently | maintenance |
| US-401 | owner | create my account offline-first with recovery seed and biometrics | my data is mine | accounts-auth |
| US-402 | owner | invite a tenant/inspector with a 1-time-use token | access is controlled and revocable | verified-invitations |
| US-501 | landlord | create a lease contract and collect rent | the rental is formal and traceable | leasing |
| US-502 | tenant | see my lease, pay rent, and report issues in a portal | I have a trusted channel | tenant-portal |
| US-601 | landlord | publish a listing anchored to my floor plan | nearby people can find it | mesh-integration, p2p-discovery |
| US-602 | renter | discover listings near me by GPS | I can rent in my own neighborhood | p2p-discovery |
| US-603 | user | link sessions from other apps to verify my identity | my trust score is portable and scams are reduced | trust-score |
| US-604 | landlord | require a deposit in escrow | both parties are protected | escrow-disputes |
| US-605 | user | open a dispute that goes to governance | conflicts resolve fairly | escrow-disputes |

---

## REQ-001: Protocol compliance (GitCore)

- **Category:** Process
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** `AGENTS.md`, `.gitcore/ARCHITECTURE.md`, `.git-core-protocol-version`, `SRC.md`, `docs/SRS/`

### Description
The repository complies with GitCore 3.8.0: agent read order, local planning, SRC and SRS present, features.json as source of truth.

### Acceptance criteria
- [ ] `.git-core-protocol-version` = 3.8.0
- [ ] `AGENTS.md` defines read order
- [ ] `.gitcore/planning/PLANNING.md` and `TASK.md` exist
- [ ] `SRC.md` complete (mandatory sections)
- [ ] `docs/SRS/{index,REQUIREMENTS,ARCHITECTURE}.md` exist

---

## REQ-002: Source map (SRC)

- **Category:** Documentation
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** `SRC.md`

### Description
SRC.md describes the real tree, build/test commands, and links to SRS/.gitcore.

### Acceptance criteria
- [ ] Tree reflects real modules
- [ ] Build/test commands documented
- [ ] Cross-links to docs/SRS and AGENTS.md

---

## REQ-003: SWAL node Pro gate (product apps)

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** `src/lib/domain/pro-gate.ts` (planned)

### Description
Pro features enable only with an active SWAL node. No Stripe as Pro unlock.

### Acceptance criteria
- [ ] No Checkout/webhook Stripe as Pro unlock
- [ ] Free vs Pro gate documented
- [ ] Node heartbeat/identity defined or planned

---

## REQ-004: Instance isolation (mesh / multi-workspace)

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** `src/lib/domain/instance.ts` (planned)

### Description
Two instances of NIDO never mix business data by default. Namespace `swal/nido/{instance_id}`.

### Acceptance criteria
- [ ] `instance_id` persisted per workspace
- [ ] Cross-instance sync only with explicit opt-in link
- [ ] Xavier memory namespaced by instance

---

## REQ-005: Agentic memory (Xavier)

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** `src/lib/domain/xavier.ts` (planned)

### Description
Agentic memory via Xavier HTTP (`:8006`) and/or MCP, outside the business DB. Namespace `app/nido/instance/{id}`.

### Acceptance criteria
- [ ] Memory paths documented
- [ ] Working agentic memory not persisted only in domain DB
- [ ] Xavier failure does not corrupt business data

---

## REQ-006: Security & secrets

- **Category:** Non-functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** `.gitignore`, `.env.example`, `SECURITY.md` (if any)

### Description
No secrets in git; `.env.example` with no real values.

### Acceptance criteria
- [ ] `.env` gitignored
- [ ] No API keys in example docs
- [ ] Repo **private** unless documented exception

---

## REQ-007: Local CI preference

- **Category:** Process
- **Priority:** Medium
- **SRS Status:** `draft`
- **Files:** `.github/workflows.disabled/` (if present)

### Description
GitHub Actions disabled by default in SWAL private era; local tests preferred.

### Acceptance criteria
- [ ] Workflows do not run on GitHub (disabled/moved)
- [ ] Local test commands in SRC.md

---

## REQ-008: Canonical property data model

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Canonical property data model (property.schema.json) covering property/floors/zones/rooms/items/taxes/leases/maintenance/utilities.

### User stories
- **US-201:** As a *owner*, I want define my property type with floors/zones/rooms so that everything else anchors to the plan.

### Acceptance criteria
- [ ] (US-201) Property types: house, apartment, bodega, construction
- [ ] (US-201) Schema validated against property.schema.json
- [ ] (US-201) Floors with height_m; zones with position/size/type
- [ ] (US-201) Rooms linked to floor+zone with area_m2
- [ ] (US-201) house-data.json migrates to schema-valid model

---

## REQ-009: 2D floor plan editor

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
2D floor plan editor: draw/edit walls, zones, rooms with real measurements on Konva canvas.

### User stories
- **US-101:** As a *owner*, I want draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements so that my property is mapped accurately.

### Acceptance criteria
- [ ] (US-101) Canvas renders blueprint grid and plan from store
- [ ] (US-101) User can add/move/resize wall segments
- [ ] (US-101) User can define zones (garage, entrance, rooms) with dimensions
- [ ] (US-101) Measurements shown in meters, exportable to data model
- [ ] (US-101) State persists in floorPlanStore (runes) and IndexedDB

---

## REQ-010: 3D viewer

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
3D viewer (Three.js) derived from the same plan data, lazy-loaded and code-split.

### User stories
- **US-102:** As a *owner*, I want view my plan in 3D so that I can visualize spaces before making changes.

### Acceptance criteria
- [ ] (US-102) 3D scene derives from same plan data as 2D
- [ ] (US-102) Camera orbits/zooms; floors switchable
- [ ] (US-102) 3D module lazy-loaded (code-split)
- [ ] (US-102) No state divergence between 2D and 3D

---

## REQ-011: Building norms validation

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Building norms validation (NSR-10 / POT) with severity-ranked warnings.

### User stories
- **US-103:** As a *owner*, I want validate my design against NSR-10/POT norms so that construction is compliant.

### Acceptance criteria
- [ ] (US-103) Stair rule checked: 2R+H in 620-640mm, tread>=280mm, riser 100-180mm
- [ ] (US-103) Garage min width 2.60m / depth 5.00m / independent access 3.20m
- [ ] (US-103) Violations listed with severity and fix hints
- [ ] (US-103) Validation re-runs on any plan change

---

## REQ-012: Parts & furniture inventory

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Parts & furniture inventory per room with photos, QR, warranty, value.

### User stories
- **US-301:** As a *owner*, I want inventory furniture/parts per room with photos, QR, warranty, value so that I know what I own and its worth.

### Acceptance criteria
- [ ] (US-301) CRUD item with roomId, category, value, warrantyUntil, photo, qr
- [ ] (US-301) QR/barcode scan to add item (shelf pattern)
- [ ] (US-301) Value totals per room and property
- [ ] (US-301) Offline-first: items sync to edge-hive when online
- [ ] (US-301) Warranty expiry alerts

---

## REQ-013: Costs & income tracking

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Costs & income tracking with receipts, categories, reports and exports.

### User stories
- **US-302:** As a *owner*, I want log expenses and income with receipts so that I see my home's real cost of ownership.

### Acceptance criteria
- [ ] (US-302) Expense/income CRUD with category, amount, date, receipt photo
- [ ] (US-302) Monthly/annual summaries
- [ ] (US-302) Export CSV for tax filing
- [ ] (US-302) Budget vs actual per category

---

## REQ-014: Public utilities administration

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Public utilities administration (water, energy, gas, internet): providers, due dates, consumption, budget.

### User stories
- **US-303:** As a *owner*, I want track water/energy/gas/internet consumption and due dates so that I never miss a bill and can budget.

### Acceptance criteria
- [ ] (US-303) Utility CRUD by type with provider, account, dueDay, budget
- [ ] (US-303) Consumption logging (value + date)
- [ ] (US-303) Budget vs actual chart
- [ ] (US-303) Due-date notifications
- [ ] (US-303) Split bill support for tenants

---

## REQ-015: Property tax (predial) tracking

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Property tax (predial) tracking: jurisdiction, avaluo, rate, installments, payment calendar (Colombia first).

### User stories
- **US-304:** As a *owner*, I want track my predial tax so that I never miss payments.

### Acceptance criteria
- [ ] (US-304) Predial config: jurisdiction, avaluo, rate_pct, installments
- [ ] (US-304) Payment calendar with due dates
- [ ] (US-304) Mark installments paid
- [ ] (US-304) Colombia-first: estrato/jurisdiction presets
- [ ] (US-304) Reminders before due date

---

## REQ-016: Preventive maintenance planning

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Preventive maintenance planning: schedules, next-due computation, work orders, history.

### User stories
- **US-305:** As a *owner*, I want schedule preventive maintenance per item/room so that nothing breaks silently.

### Acceptance criteria
- [ ] (US-305) Schedule with interval_days, lastDone, nextDue
- [ ] (US-305) Auto-compute nextDue from lastDone + interval
- [ ] (US-305) Overdue alerts
- [ ] (US-305) Work order creation (manteniapp pattern)
- [ ] (US-305) Maintenance history log

---

## REQ-017: Architect export (DXF/PDF/ZIP)

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Architect export: DXF vector + PDF with title block + JSON source, bundled as ZIP.

### User stories
- **US-104:** As a *owner*, I want export my plan as DXF/PDF/ZIP for my architect so that external CAD workflows work.

### Acceptance criteria
- [ ] (US-104) DXF opens in CAD viewer preserving measurements
- [ ] (US-104) PDF A1/A2 at 300dpi with title block (scale, date, owner)
- [ ] (US-104) ZIP contains JSON + DXF + PDF
- [ ] (US-104) Export button in toolbar

---

## REQ-018: Accounts, auth & roles

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Accounts, auth and roles: localAuth + seed + WebAuthn; ADMIN/PROPIETARIO/INQUILINO/SUPERVISOR; instance isolation.

### User stories
- **US-401:** As a *owner*, I want create my account offline-first with recovery seed and biometrics so that my data is mine.

### Acceptance criteria
- [ ] (US-401) localAuth: create account with seed phrase recovery
- [ ] (US-401) WebAuthn biometric unlock
- [ ] (US-401) Roles assigned (owner default)
- [ ] (US-401) instance_id persisted per workspace
- [ ] (US-401) No server dependency for account creation

---

## REQ-019: Verified 1-time invitations

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Verified 1-time-use invitations via token generate/verify with expiry, revoke and audit.

### User stories
- **US-402:** As a *owner*, I want invite a tenant/inspector with a 1-time-use token so that access is controlled and revocable.

### Acceptance criteria
- [ ] (US-402) POST /api/token/generate creates URL-safe 1-time token
- [ ] (US-402) Token consumed on first verify, creates session
- [ ] (US-402) Token expiry + revoke
- [ ] (US-402) Audit log of invitations
- [ ] (US-402) Role scoped at creation

---

## REQ-020: Leasing: contracts & payments

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Leasing: contracts with eSignature, rent collection, deposits, screening, payment history.

### User stories
- **US-501:** As a *landlord*, I want create a lease contract and collect rent so that the rental is formal and traceable.

### Acceptance criteria
- [ ] (US-501) Lease CRUD: tenant, start/end, rent, deposit, services included
- [ ] (US-501) eSignature via ML-DSA-65 signed document
- [ ] (US-501) Rent collection: invoice → payment (Stripe; later Polygon)
- [ ] (US-501) Payment history per lease
- [ ] (US-501) Late-payment reminders

---

## REQ-021: Tenant portal

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Tenant portal: lease view, rent payment, issue reporting, receipts, P2P chat.

### User stories
- **US-502:** As a *tenant*, I want see my lease, pay rent, and report issues in a portal so that I have a trusted channel.

### Acceptance criteria
- [ ] (US-502) Tenant sees own lease and payment status
- [ ] (US-502) Pay rent online (Stripe/Polygon)
- [ ] (US-502) Issue reporting with status tracking
- [ ] (US-502) P2P chat with landlord (edge-mesh)
- [ ] (US-502) Receipts downloadable

---

## REQ-022: edge-mesh rental network integration

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
edge-mesh integration: namespace swal/nido/{instanceId}, presence, authz, chat, governance, ML-DSA-65.

### User stories
- **US-601:** As a *landlord*, I want publish a listing anchored to my floor plan so that nearby people can find it.

### Acceptance criteria
- [ ] (US-601) Listing: property, floor plan reference, price, availability
- [ ] (US-601) Geohash computed from property location
- [ ] (US-601) Presence: landlord online indicator
- [ ] (US-601) Listing only visible to authorized network radius

---

## REQ-023: GPS proximity discovery

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
GPS proximity discovery: geohash neighbors, radius filtering, listings anchored to floor plan.

### User stories
- **US-601:** As a *landlord*, I want publish a listing anchored to my floor plan so that nearby people can find it.
- **US-602:** As a *renter*, I want discover listings near me by GPS so that I can rent in my own neighborhood.

### Acceptance criteria
- [ ] (US-601) Listing: property, floor plan reference, price, availability
- [ ] (US-601) Geohash computed from property location
- [ ] (US-601) Presence: landlord online indicator
- [ ] (US-601) Listing only visible to authorized network radius
- [ ] (US-602) GPS permission requested with consent
- [ ] (US-602) Listings within radius (geohash neighbors)
- [ ] (US-602) Sort by distance and trust score
- [ ] (US-602) Anonymous browsing until interest confirmed
- [ ] (US-602) No fake listings: listing requires plan anchor + geohash match

---

## REQ-024: Cross-app verified trust score

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Cross-app verified trust score T1-T4 from linked external sessions and on-network history.

### User stories
- **US-603:** As a *user*, I want link sessions from other apps to verify my identity so that my trust score is portable and scams are reduced.

### Acceptance criteria
- [ ] (US-603) Link providers: gov-ID, payment history, review history, social graph
- [ ] (US-603) Each link is an OAuth/API proof, not a manual upload
- [ ] (US-603) Trust score T1-T4 computed from links
- [ ] (US-603) Score shown with breakdown; user controls visibility
- [ ] (US-603) No single source can inflate score

---

## REQ-025: PWA offline-first

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Escrow on Polygon and dispute resolution via edge-mesh governance.

### User stories
- **US-604:** As a *landlord*, I want require a deposit in escrow so that both parties are protected.
- **US-605:** As a *user*, I want open a dispute that goes to governance so that conflicts resolve fairly.

### Acceptance criteria
- [ ] (US-604) Deposit held in Polygon escrow contract
- [ ] (US-604) Released on lease end per agreement
- [ ] (US-604) Partial release supported for damages
- [ ] (US-604) Escrow state visible to both parties
- [ ] (US-605) Dispute creation with evidence attachments
- [ ] (US-605) edge-mesh governance voting round
- [ ] (US-605) Outcome enforceable (escrow release/payout)
- [ ] (US-605) Dispute history on both profiles

---

## REQ-026: Home analytics & notifications

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Home analytics and notifications: consumption patterns, spending, alerts.

### User stories
- **US-302:** As a *owner*, I want log expenses and income with receipts so that I see my home's real cost of ownership.

### Acceptance criteria
- [ ] (US-302) Expense/income CRUD with category, amount, date, receipt photo
- [ ] (US-302) Monthly/annual summaries
- [ ] (US-302) Export CSV for tax filing
- [ ] (US-302) Budget vs actual per category

---

## REQ-027: UI on @swal/ui

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
All UI built with @swal/ui components and edge-hive theme; no shadcn/Tailwind.

### User stories
- **US-101:** As a *owner*, I want draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements so that my property is mapped accurately.

### Acceptance criteria
- [ ] (US-101) Canvas renders blueprint grid and plan from store
- [ ] (US-101) User can add/move/resize wall segments
- [ ] (US-101) User can define zones (garage, entrance, rooms) with dimensions
- [ ] (US-101) Measurements shown in meters, exportable to data model
- [ ] (US-101) State persists in floorPlanStore (runes) and IndexedDB

---

## REQ-028: Toolchain & local CI

- **Category:** Functional
- **Priority:** High
- **SRS Status:** `draft`
- **Files:** *(see feature detail in `.gitcore/features/details/`)*

### Description
Toolchain: Vitest + @testing-library/svelte + Playwright + Biome; verify.sh produces state-report.json.

### User stories
- *(no user story — infrastructure/process req)*

### Acceptance criteria
- [ ] Behavior verified by integration tests (see `.gitcore/features.json` evidence)

---

## User story designs (UX spec)

> Extension `user_story_design` (see `.gitcore/MANIFEST.json`). Each design: screen, layout wireframe, @swal/ui components, flow, states.

### US-401 — Account Setup (feature: `accounts-auth`, actor: owner)

- **Want:** create my account offline-first with recovery seed and biometrics
- **Layout:** [Modal: create account → show recovery seed (copy, confirm) → optional WebAuthn enroll] / [Role assigned]
- **Components:** @swal/ui: Modal, Input, Button, Terminal (seed display), Toaster
- **Flow:**
  1. Create account → seed phrase generated and confirmed → WebAuthn biometric enroll → role OWNER → instance_id created locally
- **States:** creating, seed-shown, seed-confirmed, webauthn-enrolled, ready

---

### US-302 — Costs Dashboard (feature: `analytics`, actor: owner)

- **Want:** log expenses and income with receipts
- **Layout:** [Summary cards: Month spend, Year spend, Budget vs actual] / [Table: date, category, amount, receipt thumb, delete] / [Export CSV button]
- **Components:** @swal/ui: Card, Table, Button, Input, Modal, Toaster, chart lib
- **Flow:**
  1. Add expense/income (category, amount, date, receipt photo) → totals recompute → CSV export
  1. Budget per category set in ConfigEditor
- **States:** entered, summarized, exported, over-budget

---

### US-302 — Costs Dashboard (feature: `costs`, actor: owner)

- **Want:** log expenses and income with receipts
- **Layout:** [Summary cards: Month spend, Year spend, Budget vs actual] / [Table: date, category, amount, receipt thumb, delete] / [Export CSV button]
- **Components:** @swal/ui: Card, Table, Button, Input, Modal, Toaster, chart lib
- **Flow:**
  1. Add expense/income (category, amount, date, receipt photo) → totals recompute → CSV export
  1. Budget per category set in ConfigEditor
- **States:** entered, summarized, exported, over-budget

---

### US-201 — Property Setup Wizard (feature: `data-model`, actor: owner)

- **Want:** define my property type with floors/zones/rooms
- **Layout:** [Wizard steps: 1 Type (house/apartment/bodega/construction) → 2 Location (city, comuna, estrato) → 3 Floors (add, height) → 4 Review]
- **Components:** @swal/ui: Button, Input, Card, Badge, Tabs, Toaster
- **Flow:**
  1. Onboarding creates property → schema validates → floors added with height_m → zones/rooms linked
  1. house-data.json imported as editable seed
- **States:** wizard-step-N, validated, saved

---

### US-604 — Escrow (M5) (feature: `escrow-disputes`, actor: landlord)

- **Want:** require a deposit in escrow
- **Layout:** [Escrow card: amount, contract address, status] / [Actions: release full, release partial, dispute] / [Timeline of events]
- **Components:** @swal/ui: Card, Button, Modal, StatusBadge, Toaster
- **Flow:**
  1. Deposit sent to Polygon escrow → status locked → at end release per agreement or partial for damages → both see state
- **States:** funded, locked, release-requested, partial-released, released, disputed

---

### US-605 — Disputes (M5) (feature: `escrow-disputes`, actor: user)

- **Want:** open a dispute that goes to governance
- **Layout:** [Dispute card: parties, claim, evidence attachments] / [Governance round: votes, timeline] / [Outcome: escrow release or payout]
- **Components:** @swal/ui: Card, Modal, Button, Input, StatusBadge, Toaster
- **Flow:**
  1. Open dispute with evidence → governance voting round → outcome enforced (escrow/payout) → history recorded
- **States:** opened, voting, decided, enforced

---

### US-104 — Export Dialog (feature: `export-cad`, actor: owner)

- **Want:** export my plan as DXF/PDF/ZIP for my architect
- **Layout:** [Modal: format options DXF|PDF|ZIP, paper size A1|A2, scale, title block fields] / [Progress + download link]
- **Components:** @swal/ui: Modal, Button, Input, Badge, Toaster
- **Flow:**
  1. Toolbar Export → modal → choose formats → Generate → ZIP with JSON+DXF+PDF downloaded
  1. PDF includes title block (scale, date, owner)
- **States:** configured, generating, done, error

---

### US-301 — Inventory (per room) (feature: `inventory`, actor: owner)

- **Want:** inventory furniture/parts per room with photos, QR, warranty, value
- **Layout:** [Left: room list (from plan)] / [Main: items Table with photo, name, category, value, warranty, QR button] / [Top: totals + Add Item]
- **Components:** @swal/ui: Table, Button, Modal, Input, Badge, StatusBadge, Toaster, QR scanner lib
- **Flow:**
  1. Select room → items filtered → Add Item modal (photo capture, QR scan, value, warranty) → saved to IndexedDB → queued sync
  1. Warranty expiry shows StatusBadge warning + toast
- **States:** offline-queued, syncing, synced, warranty-warning

---

### US-501 — Leasing (feature: `leasing`, actor: landlord)

- **Want:** create a lease contract and collect rent
- **Layout:** [Lease list → detail: terms, services, deposit] / [Contract viewer with sign button] / [Invoices: create, status, pay] / [Payment history table]
- **Components:** @swal/ui: Card, Table, Modal, Button, Input, Badge, StatusBadge, Toaster
- **Flow:**
  1. Create lease → both parties eSign (ML-DSA-65) → invoice generated monthly → tenant pays (Stripe) → receipt → late reminder if overdue
- **States:** draft, signed, active, paid, late, ended

---

### US-305 — Maintenance (feature: `maintenance`, actor: owner)

- **Want:** schedule preventive maintenance per item/room
- **Layout:** [List: item/room, interval, lastDone, nextDue, StatusBadge] / [Item detail: history log + Create work order] / [Overdue alerts banner]
- **Components:** @swal/ui: Table, Card, Button, Modal, StatusBadge, Toaster
- **Flow:**
  1. Schedule created → nextDue computed → overdue triggers alert → work order modal (assign, notes) → history log updated
- **States:** ok, due-soon, overdue, work-order-open

---

### US-601 — Publish Listing (M5) (feature: `mesh-integration`, actor: landlord)

- **Want:** publish a listing anchored to my floor plan
- **Layout:** [Modal: select property, price, availability, radius] / [Geohash badge auto] / [Live status]
- **Components:** @swal/ui: Modal, Input, Button, Badge, StatusBadge, Toaster
- **Flow:**
  1. Landlord creates listing linked to plan → geohash computed → presence starts → visible to radius
- **States:** draft, published, unavailable, unpublished

---

### US-103 — Norms Validation Panel (feature: `norms-validation`, actor: owner)

- **Want:** validate my design against NSR-10/POT norms
- **Layout:** [Right drawer: validation results] / [Rule: status badge + description + fix hint] / [Canvas highlights offending zones in danger color]
- **Components:** @swal/ui: Drawer/Modal, StatusBadge, Badge, Card, Button
- **Flow:**
  1. On plan change → norms engine recomputes → rules list with PASS/WARN/FAIL badges
  1. Click violation → canvas zooms to zone; fix hint shown
  1. Export validation report
- **States:** valid, violations-warn, violations-fail, checking

---

### US-601 — Publish Listing (M5) (feature: `p2p-discovery`, actor: landlord)

- **Want:** publish a listing anchored to my floor plan
- **Layout:** [Modal: select property, price, availability, radius] / [Geohash badge auto] / [Live status]
- **Components:** @swal/ui: Modal, Input, Button, Badge, StatusBadge, Toaster
- **Flow:**
  1. Landlord creates listing linked to plan → geohash computed → presence starts → visible to radius
- **States:** draft, published, unavailable, unpublished

---

### US-602 — Nearby Discovery (M5) (feature: `p2p-discovery`, actor: renter)

- **Want:** discover listings near me by GPS
- **Layout:** [Map/list: listings in radius sorted by distance + trust] / [Listing card: plan thumbnail, price, landlord trust badge] / [Consent banner for GPS]
- **Components:** @swal/ui: Card, Badge, StatusBadge, Button, Input, map lib + geohash
- **Flow:**
  1. GPS consent → geohash neighbors fetched → sort by distance+trust → browse anonymous → express interest
- **States:** consent-required, locating, results, interest-sent

---

### US-101 — Plan Editor (2D) (feature: `plans-2d`, actor: owner)

- **Want:** draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements
- **Layout:** [Toolbar: Select|Wall|Zone|Room|Measure|Validate|Export] / [Canvas 2D blueprint (Konva)] / [Right: FloorSelector + Properties panel]
- **Components:** @swal/ui: Button, Tooltip, Tabs, Input, Badge, StatusBadge
- **Flow:**
  1. Select tool Wall → click-drag on canvas to draw segment with live length in meters
  1. Zone tool → drag rectangle, name it (garage/entrance/room), color from palette
  1. Properties panel edits x/y/w/h and name; store updates; 3D mirrors
- **States:** idle, drawing, selected, validating, saved-offline

---

### US-102 — 3D Viewer (feature: `plans-3d`, actor: owner)

- **Want:** view my plan in 3D
- **Layout:** [Top: 2D|3D toggle (Tabs)] / [Three.js canvas: orbit controls, floor switch] / [Bottom: floor heights + layer toggles]
- **Components:** @swal/ui: Tabs, Button, Badge, three.js OrbitControls
- **Flow:**
  1. User clicks 3D tab → lazy import Scene3D → scene built from floorPlanStore → orbit/zoom with mouse
  1. Floor selector changes active floor; walls extrude by height_m
- **States:** loading-lazy, rendered, switching-floor, error-3d

---

### US-304 — Taxes (Predial) (feature: `taxes`, actor: owner)

- **Want:** track my predial tax
- **Layout:** [Card: jurisdiction, avaluo, rate, total/year] / [Installment calendar: date, amount, paid toggle] / [Reminder settings]
- **Components:** @swal/ui: Card, Table, Button, Input, StatusBadge, Toaster
- **Flow:**
  1. Configure jurisdiction/avaluo/rate → installments auto-generated → mark paid → reminder toast N days before due
- **States:** configured, upcoming, due, paid

---

### US-502 — Tenant Portal (feature: `tenant-portal`, actor: tenant)

- **Want:** see my lease, pay rent, and report issues in a portal
- **Layout:** [Header: my lease + payment status] / [Pay rent button] / [Issues list + report issue] / [Chat with landlord] / [Receipts downloads]
- **Components:** @swal/ui: Card, Button, Modal, Input, StatusBadge, Table, Toaster
- **Flow:**
  1. Tenant logs in via invitation → sees lease → pays → receipt → reports issue → status tracked → chat P2P
- **States:** lease-active, payment-due, payment-made, issue-open, issue-resolved

---

### US-603 — Trust Score (M5) (feature: `trust-score`, actor: user)

- **Want:** link sessions from other apps to verify my identity
- **Layout:** [Score card: T1-T4 bars with weights] / [Providers list: gov-ID, payments, reviews, social — each Linked/Not] / [Privacy toggles per provider]
- **Components:** @swal/ui: Card, Badge, StatusBadge, Button, Table, Toaster
- **Flow:**
  1. User links provider via OAuth → proof verified server-side → score recomputes → breakdown shown → visibility toggles
- **States:** no-links, partial, verified-t1, verified-t2, verified-t3, verified-t4

---

### US-101 — Plan Editor (2D) (feature: `ui-swal`, actor: owner)

- **Want:** draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements
- **Layout:** [Toolbar: Select|Wall|Zone|Room|Measure|Validate|Export] / [Canvas 2D blueprint (Konva)] / [Right: FloorSelector + Properties panel]
- **Components:** @swal/ui: Button, Tooltip, Tabs, Input, Badge, StatusBadge
- **Flow:**
  1. Select tool Wall → click-drag on canvas to draw segment with live length in meters
  1. Zone tool → drag rectangle, name it (garage/entrance/room), color from palette
  1. Properties panel edits x/y/w/h and name; store updates; 3D mirrors
- **States:** idle, drawing, selected, validating, saved-offline

---

### US-303 — Utilities (feature: `utilities`, actor: owner)

- **Want:** track water/energy/gas/internet consumption and due dates
- **Layout:** [Tabs: Water | Energy | Gas | Internet] / [Cards: provider, account, dueDay, budget, StatusBadge next-due] / [Consumption chart + Add reading]
- **Components:** @swal/ui: Tabs, Card, Table, Input, Button, StatusBadge, Toaster, chart lib
- **Flow:**
  1. Register utility → log monthly reading → chart budget vs actual → due-date reminder toast → optional split bill per tenant
- **States:** ok, due-soon, overdue, over-budget

---

### US-402 — Invitations (feature: `verified-invitations`, actor: owner)

- **Want:** invite a tenant/inspector with a 1-time-use token
- **Layout:** [Table: invitee, role, token, status (active/used/revoked), expiry, created] / [Generate Invite modal: role + expiry]
- **Components:** @swal/ui: Table, Modal, Button, Input, Badge, Toaster
- **Flow:**
  1. Owner generates token with role+expiry → shares link → invitee verifies (1-time) → session created with role → audit logged
- **States:** active, used, expired, revoked

---

---

## REQ-029: Accounts, auth & roles (feature accounts-auth)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature accounts-auth)*

*Feature: `accounts-auth` · status: planned*

## REQ-030: Costs & income tracking (feature costs)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature costs)*

*Feature: `costs` · status: stable*

## REQ-031: Canonical property data model (feature data-model)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature data-model)*

*Feature: `data-model` · status: stable*

## REQ-032: Escrow & dispute governance (feature escrow-disputes)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature escrow-disputes)*

*Feature: `escrow-disputes` · status: planned*

## REQ-033: Architect export (DXF/PDF/ZIP) (feature export-cad)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature export-cad)*

*Feature: `export-cad` · status: stable*

## REQ-034: GitCore protocol compliance (feature gitcore-compliance)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature gitcore-compliance)*

*Feature: `gitcore-compliance` · status: stable*

## REQ-035: Leasing: contracts & payments (feature leasing)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature leasing)*

*Feature: `leasing` · status: planned*

## REQ-036: edge-mesh rental network integration (feature mesh-integration)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature mesh-integration)*

*Feature: `mesh-integration` · status: planned*

## REQ-037: Building norms validation (feature norms-validation)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature norms-validation)*

*Feature: `norms-validation` · status: stable*

## REQ-038: GPS proximity discovery (feature p2p-discovery)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature p2p-discovery)*

*Feature: `p2p-discovery` · status: planned*

## REQ-039: 2D floor plan editor (feature plans-2d)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature plans-2d)*

*Feature: `plans-2d` · status: planned*

## REQ-040: 3D viewer (feature plans-3d)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature plans-3d)*

*Feature: `plans-3d` · status: planned*

## REQ-041: PWA offline-first (feature pwa-offline)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature pwa-offline)*

*Feature: `pwa-offline` · status: stable*

## REQ-042: Property tax (predial) tracking (feature taxes)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature taxes)*

*Feature: `taxes` · status: partial*

## REQ-043: Tenant portal (feature tenant-portal)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature tenant-portal)*

*Feature: `tenant-portal` · status: planned*

## REQ-044: Toolchain & local CI (feature toolchain-ci)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature toolchain-ci)*

*Feature: `toolchain-ci` · status: stable*

## REQ-045: Cross-app verified trust score (feature trust-score)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature trust-score)*

*Feature: `trust-score` · status: planned*

## REQ-046: UI on @swal/ui (feature ui-swal)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature ui-swal)*

*Feature: `ui-swal` · status: planned*

## REQ-047: Verified 1-time invitations (feature verified-invitations)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature verified-invitations)*

*Feature: `verified-invitations` · status: planned*

## REQ-048: AI home assistant (feature ai-assistant)

- **Category:** Functional
- **Priority:** P3
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature ai-assistant)*

*Feature: `ai-assistant` · status: stable*

**User story (US-306):** As a homeowner, I want an in-app AI assistant so I can
ask questions about my home (maintenance suggestions, inventory lookups, cost
queries) without leaving NIDO.
