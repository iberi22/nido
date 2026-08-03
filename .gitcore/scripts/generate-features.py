#!/usr/bin/env python3
"""Generate NIDO .gitcore/features.json + features/details/*.json (GitCore 3.8.0).

Source of truth: NIDO_PLAN.md phases M0-M5. Each feature detail follows
gitcore.feature_detail/v1 schema + user_stories extension (MANIFEST.json).
"""
import json, os, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
NIDO = os.path.abspath(os.path.join(ROOT, "..", ".."))
TODAY = "2026-08-03"

# ---- Feature master spec: id -> (phase, reqs, us_ids, name, category, summary) ----
F = {}

def feat(fid, phase, reqs, us, name, cat, summary):
    F[fid] = dict(phase=phase, reqs=reqs, us=us, name=name, cat=cat, summary=summary)

# M0 Foundation
feat("gitcore-compliance", 0, ["REQ-001","REQ-002","REQ-003","REQ-004","REQ-005","REQ-006","REQ-007"],
     [], "GitCore protocol compliance", "process",
     "Repo complies with GitCore 3.8.0: AGENTS.md read order, SRC/SRS present, planning local, features.json source of truth.")
feat("ui-swal", 0, ["REQ-027"], ["US-101"], "UI on @swal/ui", "ui",
     "All UI rebuilt with @swal/ui components and edge-hive theme; PR #3 shadcn-svelte fork rejected.")
feat("toolchain-ci", 0, ["REQ-028"], [], "Toolchain & local CI", "process",
     "Vitest + @testing-library/svelte unit, Playwright e2e, Biome, Vite pinned stable, verify.sh → state-report.json.")
feat("pwa-offline", 0, ["REQ-025"], [], "PWA offline-first", "infra",
     "vite-plugin-pwa workbox, IndexedDB local-first, installable, offline plan editing.")
# M1
feat("data-model", 1, ["REQ-008"], ["US-201"], "Canonical property data model", "core",
     "property.schema.json: property/floors/zones/rooms/items/taxes/leases/maintenance/utilities; extends house-data.json.")
feat("plans-2d", 1, ["REQ-009"], ["US-101"], "2D floor plan editor", "core",
     "Konva canvas: draw/edit walls, zones, rooms; measurements; floor selector; blueprint aesthetic.")
feat("plans-3d", 1, ["REQ-010"], ["US-102"], "3D viewer", "core",
     "Three.js lazy-loaded viewer from plan data; code-split to keep bundle small.")
feat("norms-validation", 1, ["REQ-011"], ["US-103"], "Building norms validation", "domain",
     "Validate design against NSR-10 / POT rules (stairs, garage, setbacks) with actionable warnings.")
# M2
feat("inventory", 2, ["REQ-012"], ["US-301"], "Parts & furniture inventory", "domain",
     "Per-room inventory with photos, QR, warranty, value; shelf patterns; offline-first.")
feat("costs", 2, ["REQ-013"], ["US-302"], "Costs & income tracking", "domain",
     "Expenses/income with receipts, categories, reports, tax-ready exports.")
feat("utilities", 2, ["REQ-014"], ["US-303"], "Public utilities administration", "domain",
     "Water/energy/gas/internet: providers, due dates, consumption, budget vs actual, split bills.")
feat("taxes", 2, ["REQ-015"], ["US-304"], "Property tax (predial) tracking", "domain",
     "Predial by jurisdiction (Colombia first): avaluo, rate, installments, due dates, payment calendar.")
feat("maintenance", 2, ["REQ-016"], ["US-305"], "Preventive maintenance planning", "domain",
     "Schedules per item/room: interval, last done, next due, work orders, alerts; manteniapp patterns.")
feat("analytics", 2, ["REQ-026"], ["US-302"], "Home analytics & notifications", "domain",
     "Utility consumption patterns, spending by category, alerts (payments due, maintenance due, budget overrun).")
# M3
feat("export-cad", 3, ["REQ-017"], ["US-104"], "Architect export (DXF/PDF/ZIP)", "domain",
     "Export DXF vector + PDF A1/A2 with title block + JSON source; architect package ZIP.")
feat("accounts-auth", 3, ["REQ-018"], ["US-401"], "Accounts, auth & roles", "core",
     "localAuth + recovery seed + WebAuthn; roles ADMIN/PROPIETARIO/INQUILINO/SUPERVISOR; instance isolation.")
feat("verified-invitations", 3, ["REQ-019"], ["US-402"], "Verified 1-time invitations", "security",
     "1-time-use token generate/verify (mimatera pattern) to invite tenant/inspector; revocable, audited.")
# M4
feat("leasing", 4, ["REQ-020"], ["US-501"], "Leasing: contracts & payments", "domain",
     "Lease creation with eSignature (ML-DSA-65 signed), rent collection (Stripe → Polygon), deposits, screening.")
feat("tenant-portal", 4, ["REQ-021"], ["US-502"], "Tenant portal", "domain",
     "Tenant sees lease, pays rent, reports issues, receives receipts; P2P chat with landlord.")
# M5
feat("mesh-integration", 5, ["REQ-022"], ["US-601"], "edge-mesh rental network integration", "core",
     "edge-mesh namespace swal/nido/{instanceId}: presence, authz, chat, governance, ML-DSA-65 identity.")
feat("p2p-discovery", 5, ["REQ-023"], ["US-601","US-602"], "GPS proximity discovery", "domain",
     "Geohash-based discovery of listings near you; listings anchored to floor plan + live presence (anti-scam).")
feat("trust-score", 5, ["REQ-024"], ["US-603"], "Cross-app verified trust score", "security",
     "Trust T1-T4: gov-ID+selfie → linked external sessions (reviews, payments, social) → on-network history → Polygon deposit.")
feat("escrow-disputes", 5, ["REQ-025"], ["US-604","US-605"], "Escrow & dispute governance", "security",
     "Deposits in Polygon escrow; disputes resolved via edge-mesh governance voting; payout rules.")

# ---- User story detail map (acceptance per US) ----
US = {
 "US-101": {"who":"owner","want":"draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements","why":"my property is mapped accurately",
   "accept": ["Canvas renders blueprint grid and plan from store", "User can add/move/resize wall segments", "User can define zones (garage, entrance, rooms) with dimensions", "Measurements shown in meters, exportable to data model", "State persists in floorPlanStore (runes) and IndexedDB"],
   "design": {
     "screen": "Plan Editor (2D)",
     "layout": "[Toolbar: Select|Wall|Zone|Room|Measure|Validate|Export] / [Canvas 2D blueprint (Konva)] / [Right: FloorSelector + Properties panel]",
     "components": ["@swal/ui: Button, Tooltip, Tabs, Input, Badge, StatusBadge"],
     "flow": ["Select tool Wall → click-drag on canvas to draw segment with live length in meters", "Zone tool → drag rectangle, name it (garage/entrance/room), color from palette", "Properties panel edits x/y/w/h and name; store updates; 3D mirrors"],
     "states": ["idle", "drawing", "selected", "validating", "saved-offline"]
   }},
 "US-102": {"who":"owner","want":"view my plan in 3D","why":"I can visualize spaces before making changes",
   "accept": ["3D scene derives from same plan data as 2D", "Camera orbits/zooms; floors switchable", "3D module lazy-loaded (code-split)", "No state divergence between 2D and 3D"],
   "design": {
     "screen": "3D Viewer",
     "layout": "[Top: 2D|3D toggle (Tabs)] / [Three.js canvas: orbit controls, floor switch] / [Bottom: floor heights + layer toggles]",
     "components": ["@swal/ui: Tabs, Button, Badge", "three.js OrbitControls"],
     "flow": ["User clicks 3D tab → lazy import Scene3D → scene built from floorPlanStore → orbit/zoom with mouse", "Floor selector changes active floor; walls extrude by height_m"],
     "states": ["loading-lazy", "rendered", "switching-floor", "error-3d"]
   }},
 "US-103": {"who":"owner","want":"validate my design against NSR-10/POT norms","why":"construction is compliant",
   "accept": ["Stair rule checked: 2R+H in 620-640mm, tread>=280mm, riser 100-180mm", "Garage min width 2.60m / depth 5.00m / independent access 3.20m", "Violations listed with severity and fix hints", "Validation re-runs on any plan change"],
   "design": {
     "screen": "Norms Validation Panel",
     "layout": "[Right drawer: validation results] / [Rule: status badge + description + fix hint] / [Canvas highlights offending zones in danger color]",
     "components": ["@swal/ui: Drawer/Modal, StatusBadge, Badge, Card, Button"],
     "flow": ["On plan change → norms engine recomputes → rules list with PASS/WARN/FAIL badges", "Click violation → canvas zooms to zone; fix hint shown", "Export validation report"],
     "states": ["valid", "violations-warn", "violations-fail", "checking"]
   }},
 "US-104": {"who":"owner","want":"export my plan as DXF/PDF/ZIP for my architect","why":"external CAD workflows work",
   "accept": ["DXF opens in CAD viewer preserving measurements", "PDF A1/A2 at 300dpi with title block (scale, date, owner)", "ZIP contains JSON + DXF + PDF", "Export button in toolbar"],
   "design": {
     "screen": "Export Dialog",
     "layout": "[Modal: format options DXF|PDF|ZIP, paper size A1|A2, scale, title block fields] / [Progress + download link]",
     "components": ["@swal/ui: Modal, Button, Input, Badge, Toaster"],
     "flow": ["Toolbar Export → modal → choose formats → Generate → ZIP with JSON+DXF+PDF downloaded", "PDF includes title block (scale, date, owner)"],
     "states": ["configured", "generating", "done", "error"]
   }},
 "US-201": {"who":"owner","want":"define my property type with floors/zones/rooms","why":"everything else anchors to the plan",
   "accept": ["Property types: house, apartment, bodega, construction", "Schema validated against property.schema.json", "Floors with height_m; zones with position/size/type", "Rooms linked to floor+zone with area_m2", "house-data.json migrates to schema-valid model"],
   "design": {
     "screen": "Property Setup Wizard",
     "layout": "[Wizard steps: 1 Type (house/apartment/bodega/construction) → 2 Location (city, comuna, estrato) → 3 Floors (add, height) → 4 Review]",
     "components": ["@swal/ui: Button, Input, Card, Badge, Tabs, Toaster"],
     "flow": ["Onboarding creates property → schema validates → floors added with height_m → zones/rooms linked", "house-data.json imported as editable seed"],
     "states": ["wizard-step-N", "validated", "saved"]
   }},
 "US-301": {"who":"owner","want":"inventory furniture/parts per room with photos, QR, warranty, value","why":"I know what I own and its worth",
   "accept": ["CRUD item with roomId, category, value, warrantyUntil, photo, qr", "QR/barcode scan to add item (shelf pattern)", "Value totals per room and property", "Offline-first: items sync to edge-hive when online", "Warranty expiry alerts"],
   "design": {
     "screen": "Inventory (per room)",
     "layout": "[Left: room list (from plan)] / [Main: items Table with photo, name, category, value, warranty, QR button] / [Top: totals + Add Item]",
     "components": ["@swal/ui: Table, Button, Modal, Input, Badge, StatusBadge, Toaster", "QR scanner lib"],
     "flow": ["Select room → items filtered → Add Item modal (photo capture, QR scan, value, warranty) → saved to IndexedDB → queued sync", "Warranty expiry shows StatusBadge warning + toast"],
     "states": ["offline-queued", "syncing", "synced", "warranty-warning"]
   }},
 "US-302": {"who":"owner","want":"log expenses and income with receipts","why":"I see my home's real cost of ownership",
   "accept": ["Expense/income CRUD with category, amount, date, receipt photo", "Monthly/annual summaries", "Export CSV for tax filing", "Budget vs actual per category"],
   "design": {
     "screen": "Costs Dashboard",
     "layout": "[Summary cards: Month spend, Year spend, Budget vs actual] / [Table: date, category, amount, receipt thumb, delete] / [Export CSV button]",
     "components": ["@swal/ui: Card, Table, Button, Input, Modal, Toaster", "chart lib"],
     "flow": ["Add expense/income (category, amount, date, receipt photo) → totals recompute → CSV export", "Budget per category set in ConfigEditor"],
     "states": ["entered", "summarized", "exported", "over-budget"]
   }},
 "US-303": {"who":"owner","want":"track water/energy/gas/internet consumption and due dates","why":"I never miss a bill and can budget",
   "accept": ["Utility CRUD by type with provider, account, dueDay, budget", "Consumption logging (value + date)", "Budget vs actual chart", "Due-date notifications", "Split bill support for tenants"],
   "design": {
     "screen": "Utilities",
     "layout": "[Tabs: Water | Energy | Gas | Internet] / [Cards: provider, account, dueDay, budget, StatusBadge next-due] / [Consumption chart + Add reading]",
     "components": ["@swal/ui: Tabs, Card, Table, Input, Button, StatusBadge, Toaster", "chart lib"],
     "flow": ["Register utility → log monthly reading → chart budget vs actual → due-date reminder toast → optional split bill per tenant"],
     "states": ["ok", "due-soon", "overdue", "over-budget"]
   }},
 "US-304": {"who":"owner","want":"track my predial tax","why":"I never miss payments",
   "accept": ["Predial config: jurisdiction, avaluo, rate_pct, installments", "Payment calendar with due dates", "Mark installments paid", "Colombia-first: estrato/jurisdiction presets", "Reminders before due date"],
   "design": {
     "screen": "Taxes (Predial)",
     "layout": "[Card: jurisdiction, avaluo, rate, total/year] / [Installment calendar: date, amount, paid toggle] / [Reminder settings]",
     "components": ["@swal/ui: Card, Table, Button, Input, StatusBadge, Toaster"],
     "flow": ["Configure jurisdiction/avaluo/rate → installments auto-generated → mark paid → reminder toast N days before due"],
     "states": ["configured", "upcoming", "due", "paid"]
   }},
 "US-305": {"who":"owner","want":"schedule preventive maintenance per item/room","why":"nothing breaks silently",
   "accept": ["Schedule with interval_days, lastDone, nextDue", "Auto-compute nextDue from lastDone + interval", "Overdue alerts", "Work order creation (manteniapp pattern)", "Maintenance history log"],
   "design": {
     "screen": "Maintenance",
     "layout": "[List: item/room, interval, lastDone, nextDue, StatusBadge] / [Item detail: history log + Create work order] / [Overdue alerts banner]",
     "components": ["@swal/ui: Table, Card, Button, Modal, StatusBadge, Toaster"],
     "flow": ["Schedule created → nextDue computed → overdue triggers alert → work order modal (assign, notes) → history log updated"],
     "states": ["ok", "due-soon", "overdue", "work-order-open"]
   }},
 "US-401": {"who":"owner","want":"create my account offline-first with recovery seed and biometrics","why":"my data is mine",
   "accept": ["localAuth: create account with seed phrase recovery", "WebAuthn biometric unlock", "Roles assigned (owner default)", "instance_id persisted per workspace", "No server dependency for account creation"],
   "design": {
     "screen": "Account Setup",
     "layout": "[Modal: create account → show recovery seed (copy, confirm) → optional WebAuthn enroll] / [Role assigned]",
     "components": ["@swal/ui: Modal, Input, Button, Terminal (seed display), Toaster"],
     "flow": ["Create account → seed phrase generated and confirmed → WebAuthn biometric enroll → role OWNER → instance_id created locally"],
     "states": ["creating", "seed-shown", "seed-confirmed", "webauthn-enrolled", "ready"]
   }},
 "US-402": {"who":"owner","want":"invite a tenant/inspector with a 1-time-use token","why":"access is controlled and revocable",
   "accept": ["POST /api/token/generate creates URL-safe 1-time token", "Token consumed on first verify, creates session", "Token expiry + revoke", "Audit log of invitations", "Role scoped at creation"],
   "design": {
     "screen": "Invitations",
     "layout": "[Table: invitee, role, token, status (active/used/revoked), expiry, created] / [Generate Invite modal: role + expiry]",
     "components": ["@swal/ui: Table, Modal, Button, Input, Badge, Toaster"],
     "flow": ["Owner generates token with role+expiry → shares link → invitee verifies (1-time) → session created with role → audit logged"],
     "states": ["active", "used", "expired", "revoked"]
   }},
 "US-501": {"who":"landlord","want":"create a lease contract and collect rent","why":"the rental is formal and traceable",
   "accept": ["Lease CRUD: tenant, start/end, rent, deposit, services included", "eSignature via ML-DSA-65 signed document", "Rent collection: invoice → payment (Stripe; later Polygon)", "Payment history per lease", "Late-payment reminders"],
   "design": {
     "screen": "Leasing",
     "layout": "[Lease list → detail: terms, services, deposit] / [Contract viewer with sign button] / [Invoices: create, status, pay] / [Payment history table]",
     "components": ["@swal/ui: Card, Table, Modal, Button, Input, Badge, StatusBadge, Toaster"],
     "flow": ["Create lease → both parties eSign (ML-DSA-65) → invoice generated monthly → tenant pays (Stripe) → receipt → late reminder if overdue"],
     "states": ["draft", "signed", "active", "paid", "late", "ended"]
   }},
 "US-502": {"who":"tenant","want":"see my lease, pay rent, and report issues in a portal","why":"I have a trusted channel",
   "accept": ["Tenant sees own lease and payment status", "Pay rent online (Stripe/Polygon)", "Issue reporting with status tracking", "P2P chat with landlord (edge-mesh)", "Receipts downloadable"],
   "design": {
     "screen": "Tenant Portal",
     "layout": "[Header: my lease + payment status] / [Pay rent button] / [Issues list + report issue] / [Chat with landlord] / [Receipts downloads]",
     "components": ["@swal/ui: Card, Button, Modal, Input, StatusBadge, Table, Toaster"],
     "flow": ["Tenant logs in via invitation → sees lease → pays → receipt → reports issue → status tracked → chat P2P"],
     "states": ["lease-active", "payment-due", "payment-made", "issue-open", "issue-resolved"]
   }},
 "US-601": {"who":"landlord","want":"publish a listing anchored to my floor plan","why":"nearby people can find it",
   "accept": ["Listing: property, floor plan reference, price, availability", "Geohash computed from property location", "Presence: landlord online indicator", "Listing only visible to authorized network radius"],
   "design": {
     "screen": "Publish Listing (M5)",
     "layout": "[Modal: select property, price, availability, radius] / [Geohash badge auto] / [Live status]",
     "components": ["@swal/ui: Modal, Input, Button, Badge, StatusBadge, Toaster"],
     "flow": ["Landlord creates listing linked to plan → geohash computed → presence starts → visible to radius"],
     "states": ["draft", "published", "unavailable", "unpublished"]
   }},
 "US-602": {"who":"renter","want":"discover listings near me by GPS","why":"I can rent in my own neighborhood",
   "accept": ["GPS permission requested with consent", "Listings within radius (geohash neighbors)", "Sort by distance and trust score", "Anonymous browsing until interest confirmed", "No fake listings: listing requires plan anchor + geohash match"],
   "design": {
     "screen": "Nearby Discovery (M5)",
     "layout": "[Map/list: listings in radius sorted by distance + trust] / [Listing card: plan thumbnail, price, landlord trust badge] / [Consent banner for GPS]",
     "components": ["@swal/ui: Card, Badge, StatusBadge, Button, Input", "map lib + geohash"],
     "flow": ["GPS consent → geohash neighbors fetched → sort by distance+trust → browse anonymous → express interest"],
     "states": ["consent-required", "locating", "results", "interest-sent"]
   }},
 "US-603": {"who":"user","want":"link sessions from other apps to verify my identity","why":"my trust score is portable and scams are reduced",
   "accept": ["Link providers: gov-ID, payment history, review history, social graph", "Each link is an OAuth/API proof, not a manual upload", "Trust score T1-T4 computed from links", "Score shown with breakdown; user controls visibility", "No single source can inflate score"],
   "design": {
     "screen": "Trust Score (M5)",
     "layout": "[Score card: T1-T4 bars with weights] / [Providers list: gov-ID, payments, reviews, social — each Linked/Not] / [Privacy toggles per provider]",
     "components": ["@swal/ui: Card, Badge, StatusBadge, Button, Table, Toaster"],
     "flow": ["User links provider via OAuth → proof verified server-side → score recomputes → breakdown shown → visibility toggles"],
     "states": ["no-links", "partial", "verified-t1", "verified-t2", "verified-t3", "verified-t4"]
   }},
 "US-604": {"who":"landlord","want":"require a deposit in escrow","why":"both parties are protected",
   "accept": ["Deposit held in Polygon escrow contract", "Released on lease end per agreement", "Partial release supported for damages", "Escrow state visible to both parties"],
   "design": {
     "screen": "Escrow (M5)",
     "layout": "[Escrow card: amount, contract address, status] / [Actions: release full, release partial, dispute] / [Timeline of events]",
     "components": ["@swal/ui: Card, Button, Modal, StatusBadge, Toaster"],
     "flow": ["Deposit sent to Polygon escrow → status locked → at end release per agreement or partial for damages → both see state"],
     "states": ["funded", "locked", "release-requested", "partial-released", "released", "disputed"]
   }},
 "US-605": {"who":"user","want":"open a dispute that goes to governance","why":"conflicts resolve fairly",
   "accept": ["Dispute creation with evidence attachments", "edge-mesh governance voting round", "Outcome enforceable (escrow release/payout)", "Dispute history on both profiles"],
   "design": {
     "screen": "Disputes (M5)",
     "layout": "[Dispute card: parties, claim, evidence attachments] / [Governance round: votes, timeline] / [Outcome: escrow release or payout]",
     "components": ["@swal/ui: Card, Modal, Button, Input, StatusBadge, Toaster"],
     "flow": ["Open dispute with evidence → governance voting round → outcome enforced (escrow/payout) → history recorded"],
     "states": ["opened", "voting", "decided", "enforced"]
   }},
}

# ---- REQ-ID descriptions (used by SRS generator, kept here for coherence) ----
REQS = {
 "REQ-008": "Canonical property data model (property.schema.json) covering property/floors/zones/rooms/items/taxes/leases/maintenance/utilities.",
 "REQ-009": "2D floor plan editor: draw/edit walls, zones, rooms with real measurements on Konva canvas.",
 "REQ-010": "3D viewer (Three.js) derived from the same plan data, lazy-loaded and code-split.",
 "REQ-011": "Building norms validation (NSR-10 / POT) with severity-ranked warnings.",
 "REQ-012": "Parts & furniture inventory per room with photos, QR, warranty, value.",
 "REQ-013": "Costs & income tracking with receipts, categories, reports and exports.",
 "REQ-014": "Public utilities administration (water, energy, gas, internet): providers, due dates, consumption, budget.",
 "REQ-015": "Property tax (predial) tracking: jurisdiction, avaluo, rate, installments, payment calendar (Colombia first).",
 "REQ-016": "Preventive maintenance planning: schedules, next-due computation, work orders, history.",
 "REQ-017": "Architect export: DXF vector + PDF with title block + JSON source, bundled as ZIP.",
 "REQ-018": "Accounts, auth and roles: localAuth + seed + WebAuthn; ADMIN/PROPIETARIO/INQUILINO/SUPERVISOR; instance isolation.",
 "REQ-019": "Verified 1-time-use invitations via token generate/verify with expiry, revoke and audit.",
 "REQ-020": "Leasing: contracts with eSignature, rent collection, deposits, screening, payment history.",
 "REQ-021": "Tenant portal: lease view, rent payment, issue reporting, receipts, P2P chat.",
 "REQ-022": "edge-mesh integration: namespace swal/nido/{instanceId}, presence, authz, chat, governance, ML-DSA-65.",
 "REQ-023": "GPS proximity discovery: geohash neighbors, radius filtering, listings anchored to floor plan.",
 "REQ-024": "Cross-app verified trust score T1-T4 from linked external sessions and on-network history.",
 "REQ-025": "Escrow on Polygon and dispute resolution via edge-mesh governance.",
 "REQ-026": "Home analytics and notifications: consumption patterns, spending, alerts.",
 "REQ-027": "All UI built with @swal/ui components and edge-hive theme; no shadcn/Tailwind.",
 "REQ-028": "Toolchain: Vitest + @testing-library/svelte + Playwright + Biome; verify.sh produces state-report.json.",
}

# ---- test file plan: feature -> list of (kind, path, focus) ----
def t(kind, path, focus): return {"kind": kind, "path": path, "focus": focus}

TESTS = {
 "gitcore-compliance": [t("integration","test/integration/gitcore-compliance.test.ts","AGENTS/SRC/SRS/features present; protocol version 3.8.0")],
 "ui-swal": [t("unit","test/unit/ui-swal.test.ts","components import from @swal/ui; no shadcn deps"),
             t("e2e","test/e2e/ui-swal.spec.ts","app renders with edge-hive theme")],
 "toolchain-ci": [t("integration","test/integration/toolchain-ci.test.ts","verify.sh emits state-report.json; biome clean")],
 "pwa-offline": [t("integration","test/integration/pwa-offline.test.ts","manifest + service worker generated"),
                 t("e2e","test/e2e/pwa-offline.spec.ts","offline reload keeps plan state")],
 "data-model": [t("unit","test/unit/data-model.test.ts","schema validation; house-data.json migration"),
                t("integration","test/integration/data-model.test.ts","store round-trip persistence")],
 "plans-2d": [t("unit","test/unit/plans-2d.test.ts","wall/zone/room CRUD in store"),
              t("e2e","test/e2e/plans-2d.spec.ts","draw wall, add zone, measure displayed")],
 "plans-3d": [t("unit","test/unit/plans-3d.test.ts","scene derives from store; lazy import"),
              t("e2e","test/e2e/plans-3d.spec.ts","3D renders, camera orbits")],
 "norms-validation": [t("unit","test/unit/norms-validation.test.ts","stair + garage rules; severity")],
 "inventory": [t("unit","test/unit/inventory.test.ts","item CRUD, totals, warranty alerts"),
               t("integration","test/integration/inventory-sync.test.ts","offline queue → edge-hive sync")],
 "costs": [t("unit","test/unit/costs.test.ts","expense/income CRUD, summaries, CSV export")],
 "utilities": [t("unit","test/unit/utilities.test.ts","utility CRUD, consumption, budget vs actual"),
               t("unit","test/unit/utilities-split.test.ts","split bill math")],
 "taxes": [t("unit","test/unit/taxes.test.ts","predial calendar, installments, paid tracking")],
 "maintenance": [t("unit","test/unit/maintenance.test.ts","nextDue computation, overdue alerts"),
                 t("integration","test/integration/maintenance-workorder.test.ts","work order flow")],
 "analytics": [t("unit","test/unit/analytics.test.ts","consumption patterns, spending by category")],
 "export-cad": [t("unit","test/unit/export-cad.test.ts","DXF builder, PDF title block, ZIP bundle"),
                t("integration","test/integration/export-cad.test.ts","DXF parses in external validator")],
 "accounts-auth": [t("unit","test/unit/accounts-auth.test.ts","localAuth seed recovery, WebAuthn, roles"),
                   t("integration","test/integration/accounts-auth.test.ts","instance isolation")],
 "verified-invitations": [t("unit","test/unit/verified-invitations.test.ts","token generate/verify 1-time, expiry, revoke"),
                          t("integration","test/integration/verified-invitations.test.ts","token → session flow")],
 "leasing": [t("unit","test/unit/leasing.test.ts","lease CRUD, eSignature, payment history"),
             t("integration","test/integration/leasing-payments.test.ts","invoice → payment → receipt")],
 "tenant-portal": [t("e2e","test/e2e/tenant-portal.spec.ts","tenant sees lease, pays, reports issue"),
                   t("unit","test/unit/tenant-portal.test.ts","issue status flow")],
 "mesh-integration": [t("integration","test/integration/mesh-integration.test.ts","namespace, presence, authz, chat CRDT")],
 "p2p-discovery": [t("unit","test/unit/p2p-discovery.test.ts","geohash neighbors, radius filter, plan anchor"),
                   t("e2e","test/e2e/p2p-discovery.spec.ts","two peers discover listing by GPS")],
 "trust-score": [t("unit","test/unit/trust-score.test.ts","T1-T4 computation, link proofs, visibility control"),
                 t("integration","test/integration/trust-score.test.ts","OAuth link proof validation")],
 "escrow-disputes": [t("integration","test/integration/escrow-disputes.test.ts","Polygon escrow deposit/release"),
                     t("integration","test/integration/dispute-governance.test.ts","dispute → governance vote → payout")],
}

# ---- build features.json ----
features_json = []
for fid, spec in sorted(F.items(), key=lambda kv: kv[0]):
    d = spec
    features_json.append({
        "id": fid,
        "name": d["name"],
        "sdlc_phase": "PENDING",
        "phase": d["phase"] + 1,  # 1-based phases M0=1
        "passes": False,
        "status": "planned",
        "progress_pct": 0,
        "claimed_pct": 0,
        "verified_pct": 0,
        "req_ids": d["reqs"],
        "user_stories": d["us"],
        "tests": [tst["path"] for tst in TESTS[fid]],
        "evidence": [{"type": "test", "path": tst["path"]} for tst in TESTS[fid]]
                    + [{"type": "srs_req", "req_id": r} for r in d["reqs"]],
        "implemented_in": [],
        "last_updated": None,
    })

master = {
    "version": "3.8.0",
    "project": "nido",
    "updated": TODAY,
    "phases": {
        "1": {"name": "M0 Foundation", "status": "pending", "target_week": "1-2"},
        "2": {"name": "M1 Data model & plans", "status": "pending", "target_week": "3-5"},
        "3": {"name": "M2 Home administration", "status": "pending", "target_week": "6-9"},
        "4": {"name": "M3 Export & accounts", "status": "pending", "target_week": "10-11"},
        "5": {"name": "M4 Leasing", "status": "pending", "target_week": "12-14"},
        "6": {"name": "M5 P2P network", "status": "pending", "target_week": "15-20"},
    },
    "features": features_json,
    "agents": {"planner": {"active": True, "last_run": None},
               "guardian": {"active": True, "auto_merge_threshold": 70},
               "dispatcher": {"active": True, "default_strategy": "round-robin"}},
}

# ---- build per-feature detail files ----
details_dir = os.path.join(NIDO, ".gitcore", "features", "details")
os.makedirs(details_dir, exist_ok=True)
detail_paths = []
for fid, spec in sorted(F.items(), key=lambda kv: kv[0]):
    d = spec
    us_list = []
    for usid in d["us"]:
        u = US[usid]
        us_list.append({
            "id": usid,
            "as_a": u["who"],
            "i_want": u["want"],
            "so_that": u["why"],
            "acceptance": [{"criterion": c, "test": None} for c in u["accept"]],
            "design": u.get("design", {"screen": "", "layout": "", "components": [], "flow": [], "states": []}),
        })
    detail = {
        "schema": "gitcore.feature_detail/v1",
        "id": fid,
        "name": d["name"],
        "category": d["cat"],
        "status": "planned",
        "progress_pct": 0,
        "claimed_pct": 0,
        "verified_pct": 0,
        "github_issue": None,
        "srs_reqs": d["reqs"],
        "description": d["summary"],
        "functional_summary": d["summary"],
        "user_stories": us_list,
        "security": {"notes": "", "threats": [], "mitigations": []},
        "implemented_in": [],
        "auto_docs": [],
        "detail_path": f".gitcore/features/details/{fid}.json",
        "sub_features": [],
        "tests": {
            "unit": [tst["path"] for tst in TESTS[fid] if tst["kind"] == "unit"],
            "integration": [tst["path"] for tst in TESTS[fid] if tst["kind"] == "integration"],
            "e2e": [tst["path"] for tst in TESTS[fid] if tst["kind"] == "e2e"],
        },
        "acceptance": [c for us in us_list for c in us["acceptance"]],
        "gaps": [],
        "decision_ids": [],
        "microtasks": [],
        "plan_refs": ["docs/SWAL/NIDO_PLAN.md"],
        "last_tested": None,
        "last_verified": None,
        "passes": False,
        "notes": "",
    }
    p = os.path.join(details_dir, f"{fid}.json")
    with open(p, "w") as fh:
        json.dump(detail, fh, indent=2, ensure_ascii=False)
    detail_paths.append(p)

# ---- write features.json ----
with open(os.path.join(NIDO, ".gitcore", "features.json"), "w") as fh:
    json.dump(master, fh, indent=2, ensure_ascii=False)

print(f"✅ features.json: {len(features_json)} features")
print(f"✅ details: {len(detail_paths)} files → {details_dir}")
print(f"✅ test files referenced: {len({tst['path'] for v in TESTS.values() for tst in v})}")
