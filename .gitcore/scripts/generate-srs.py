#!/usr/bin/env python3
"""Generate NIDO docs/SRS/REQUIREMENTS.md from the canonical REQ/US spec
(kept in sync with .gitcore/scripts/generate-features.py sources)."""
import json, os, datetime

NIDO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
TODAY = "2026-08-03"

# Domain REQ descriptions (must match generate-features.py)
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

# User stories with acceptance (must match generate-features.py US map)
US = {
 "US-101": {"who":"owner","want":"draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements","why":"my property is mapped accurately",
   "accept": ["Canvas renders blueprint grid and plan from store", "User can add/move/resize wall segments", "User can define zones (garage, entrance, rooms) with dimensions", "Measurements shown in meters, exportable to data model", "State persists in floorPlanStore (runes) and IndexedDB"]},
 "US-102": {"who":"owner","want":"view my plan in 3D","why":"I can visualize spaces before making changes",
   "accept": ["3D scene derives from same plan data as 2D", "Camera orbits/zooms; floors switchable", "3D module lazy-loaded (code-split)", "No state divergence between 2D and 3D"]},
 "US-103": {"who":"owner","want":"validate my design against NSR-10/POT norms","why":"construction is compliant",
   "accept": ["Stair rule checked: 2R+H in 620-640mm, tread>=280mm, riser 100-180mm", "Garage min width 2.60m / depth 5.00m / independent access 3.20m", "Violations listed with severity and fix hints", "Validation re-runs on any plan change"]},
 "US-104": {"who":"owner","want":"export my plan as DXF/PDF/ZIP for my architect","why":"external CAD workflows work",
   "accept": ["DXF opens in CAD viewer preserving measurements", "PDF A1/A2 at 300dpi with title block (scale, date, owner)", "ZIP contains JSON + DXF + PDF", "Export button in toolbar"]},
 "US-201": {"who":"owner","want":"define my property type with floors/zones/rooms","why":"everything else anchors to the plan",
   "accept": ["Property types: house, apartment, bodega, construction", "Schema validated against property.schema.json", "Floors with height_m; zones with position/size/type", "Rooms linked to floor+zone with area_m2", "house-data.json migrates to schema-valid model"]},
 "US-301": {"who":"owner","want":"inventory furniture/parts per room with photos, QR, warranty, value","why":"I know what I own and its worth",
   "accept": ["CRUD item with roomId, category, value, warrantyUntil, photo, qr", "QR/barcode scan to add item (shelf pattern)", "Value totals per room and property", "Offline-first: items sync to edge-hive when online", "Warranty expiry alerts"]},
 "US-302": {"who":"owner","want":"log expenses and income with receipts","why":"I see my home's real cost of ownership",
   "accept": ["Expense/income CRUD with category, amount, date, receipt photo", "Monthly/annual summaries", "Export CSV for tax filing", "Budget vs actual per category"]},
 "US-303": {"who":"owner","want":"track water/energy/gas/internet consumption and due dates","why":"I never miss a bill and can budget",
   "accept": ["Utility CRUD by type with provider, account, dueDay, budget", "Consumption logging (value + date)", "Budget vs actual chart", "Due-date notifications", "Split bill support for tenants"]},
 "US-304": {"who":"owner","want":"track my predial tax","why":"I never miss payments",
   "accept": ["Predial config: jurisdiction, avaluo, rate_pct, installments", "Payment calendar with due dates", "Mark installments paid", "Colombia-first: estrato/jurisdiction presets", "Reminders before due date"]},
 "US-305": {"who":"owner","want":"schedule preventive maintenance per item/room","why":"nothing breaks silently",
   "accept": ["Schedule with interval_days, lastDone, nextDue", "Auto-compute nextDue from lastDone + interval", "Overdue alerts", "Work order creation (manteniapp pattern)", "Maintenance history log"]},
 "US-401": {"who":"owner","want":"create my account offline-first with recovery seed and biometrics","why":"my data is mine",
   "accept": ["localAuth: create account with seed phrase recovery", "WebAuthn biometric unlock", "Roles assigned (owner default)", "instance_id persisted per workspace", "No server dependency for account creation"]},
 "US-402": {"who":"owner","want":"invite a tenant/inspector with a 1-time-use token","why":"access is controlled and revocable",
   "accept": ["POST /api/token/generate creates URL-safe 1-time token", "Token consumed on first verify, creates session", "Token expiry + revoke", "Audit log of invitations", "Role scoped at creation"]},
 "US-501": {"who":"landlord","want":"create a lease contract and collect rent","why":"the rental is formal and traceable",
   "accept": ["Lease CRUD: tenant, start/end, rent, deposit, services included", "eSignature via ML-DSA-65 signed document", "Rent collection: invoice → payment (Stripe; later Polygon)", "Payment history per lease", "Late-payment reminders"]},
 "US-502": {"who":"tenant","want":"see my lease, pay rent, and report issues in a portal","why":"I have a trusted channel",
   "accept": ["Tenant sees own lease and payment status", "Pay rent online (Stripe/Polygon)", "Issue reporting with status tracking", "P2P chat with landlord (edge-mesh)", "Receipts downloadable"]},
 "US-601": {"who":"landlord","want":"publish a listing anchored to my floor plan","why":"nearby people can find it",
   "accept": ["Listing: property, floor plan reference, price, availability", "Geohash computed from property location", "Presence: landlord online indicator", "Listing only visible to authorized network radius"]},
 "US-602": {"who":"renter","want":"discover listings near me by GPS","why":"I can rent in my own neighborhood",
   "accept": ["GPS permission requested with consent", "Listings within radius (geohash neighbors)", "Sort by distance and trust score", "Anonymous browsing until interest confirmed", "No fake listings: listing requires plan anchor + geohash match"]},
 "US-603": {"who":"user","want":"link sessions from other apps to verify my identity","why":"my trust score is portable and scams are reduced",
   "accept": ["Link providers: gov-ID, payment history, review history, social graph", "Each link is an OAuth/API proof, not a manual upload", "Trust score T1-T4 computed from links", "Score shown with breakdown; user controls visibility", "No single source can inflate score"]},
 "US-604": {"who":"landlord","want":"require a deposit in escrow","why":"both parties are protected",
   "accept": ["Deposit held in Polygon escrow contract", "Released on lease end per agreement", "Partial release supported for damages", "Escrow state visible to both parties"]},
 "US-605": {"who":"user","want":"open a dispute that goes to governance","why":"conflicts resolve fairly",
   "accept": ["Dispute creation with evidence attachments", "edge-mesh governance voting round", "Outcome enforceable (escrow release/payout)", "Dispute history on both profiles"]},
}

# Feature -> user stories mapping (must match generate-features.py)
F_US = {
 "gitcore-compliance": [], "ui-swal": ["US-101"], "toolchain-ci": [], "pwa-offline": [],
 "data-model": ["US-201"], "plans-2d": ["US-101"], "plans-3d": ["US-102"], "norms-validation": ["US-103"],
 "inventory": ["US-301"], "costs": ["US-302"], "utilities": ["US-303"], "taxes": ["US-304"],
 "maintenance": ["US-305"], "analytics": ["US-302"], "export-cad": ["US-104"],
 "accounts-auth": ["US-401"], "verified-invitations": ["US-402"], "leasing": ["US-501"],
 "tenant-portal": ["US-502"], "mesh-integration": ["US-601"], "p2p-discovery": ["US-601","US-602"],
 "trust-score": ["US-603"], "escrow-disputes": ["US-604","US-605"],
}

FEAT_NAMES = {
 "gitcore-compliance": "GitCore protocol compliance", "ui-swal": "UI on @swal/ui",
 "toolchain-ci": "Toolchain & local CI", "pwa-offline": "PWA offline-first",
 "data-model": "Canonical property data model", "plans-2d": "2D floor plan editor",
 "plans-3d": "3D viewer", "norms-validation": "Building norms validation",
 "inventory": "Parts & furniture inventory", "costs": "Costs & income tracking",
 "utilities": "Public utilities administration", "taxes": "Property tax (predial) tracking",
 "maintenance": "Preventive maintenance planning", "analytics": "Home analytics & notifications",
 "export-cad": "Architect export (DXF/PDF/ZIP)", "accounts-auth": "Accounts, auth & roles",
 "verified-invitations": "Verified 1-time invitations", "leasing": "Leasing: contracts & payments",
 "tenant-portal": "Tenant portal", "mesh-integration": "edge-mesh rental network integration",
 "p2p-discovery": "GPS proximity discovery", "trust-score": "Cross-app verified trust score",
 "escrow-disputes": "Escrow & dispute governance",
}

def gen():
    L = []
    L.append("# Software Requirements Specification — NIDO")
    L.append("")
    L.append(f"> **Protocol:** GitCore 3.8.0 · **Updated:** {TODAY}")
    L.append("> IEEE 830 reduced. Structure **100%**. Keep REQ-IDs in sync with code.")
    L.append("> Product plan: monorepo `docs/SWAL/NIDO_PLAN.md` · Features: `.gitcore/features.json`")
    L.append("")
    L.append("## User stories index")
    L.append("")
    L.append("| US-ID | Actor | Want | So that | Features |")
    L.append("|-------|-------|------|---------|----------|")
    for usid in sorted(US, key=lambda x: int(x.split("-")[1])):
        u = US[usid]
        feats = [f for f, uss in F_US.items() if usid in uss]
        L.append(f"| {usid} | {u['who']} | {u['want']} | {u['why']} | {', '.join(feats)} |")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-001: Protocol compliance (GitCore)")
    L.append("")
    L.append("- **Category:** Process")
    L.append("- **Priority:** High")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `AGENTS.md`, `.gitcore/ARCHITECTURE.md`, `.git-core-protocol-version`, `SRC.md`, `docs/SRS/`")
    L.append("")
    L.append("### Description")
    L.append("The repository complies with GitCore 3.8.0: agent read order, local planning, SRC and SRS present, features.json as source of truth.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] `.git-core-protocol-version` = 3.8.0")
    L.append("- [ ] `AGENTS.md` defines read order")
    L.append("- [ ] `.gitcore/planning/PLANNING.md` and `TASK.md` exist")
    L.append("- [ ] `SRC.md` complete (mandatory sections)")
    L.append("- [ ] `docs/SRS/{index,REQUIREMENTS,ARCHITECTURE}.md` exist")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-002: Source map (SRC)")
    L.append("")
    L.append("- **Category:** Documentation")
    L.append("- **Priority:** High")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `SRC.md`")
    L.append("")
    L.append("### Description")
    L.append("SRC.md describes the real tree, build/test commands, and links to SRS/.gitcore.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] Tree reflects real modules")
    L.append("- [ ] Build/test commands documented")
    L.append("- [ ] Cross-links to docs/SRS and AGENTS.md")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-003: SWAL node Pro gate (product apps)")
    L.append("")
    L.append("- **Category:** Functional")
    L.append("- **Priority:** High")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `src/lib/domain/pro-gate.ts` (planned)")
    L.append("")
    L.append("### Description")
    L.append("Pro features enable only with an active SWAL node. No Stripe as Pro unlock.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] No Checkout/webhook Stripe as Pro unlock")
    L.append("- [ ] Free vs Pro gate documented")
    L.append("- [ ] Node heartbeat/identity defined or planned")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-004: Instance isolation (mesh / multi-workspace)")
    L.append("")
    L.append("- **Category:** Functional")
    L.append("- **Priority:** High")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `src/lib/domain/instance.ts` (planned)")
    L.append("")
    L.append("### Description")
    L.append("Two instances of NIDO never mix business data by default. Namespace `swal/nido/{instance_id}`.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] `instance_id` persisted per workspace")
    L.append("- [ ] Cross-instance sync only with explicit opt-in link")
    L.append("- [ ] Xavier memory namespaced by instance")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-005: Agentic memory (Xavier)")
    L.append("")
    L.append("- **Category:** Functional")
    L.append("- **Priority:** High")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `src/lib/domain/xavier.ts` (planned)")
    L.append("")
    L.append("### Description")
    L.append("Agentic memory via Xavier HTTP (`:8006`) and/or MCP, outside the business DB. Namespace `app/nido/instance/{id}`.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] Memory paths documented")
    L.append("- [ ] Working agentic memory not persisted only in domain DB")
    L.append("- [ ] Xavier failure does not corrupt business data")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-006: Security & secrets")
    L.append("")
    L.append("- **Category:** Non-functional")
    L.append("- **Priority:** High")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `.gitignore`, `.env.example`, `SECURITY.md` (if any)")
    L.append("")
    L.append("### Description")
    L.append("No secrets in git; `.env.example` with no real values.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] `.env` gitignored")
    L.append("- [ ] No API keys in example docs")
    L.append("- [ ] Repo **private** unless documented exception")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## REQ-007: Local CI preference")
    L.append("")
    L.append("- **Category:** Process")
    L.append("- **Priority:** Medium")
    L.append("- **SRS Status:** `draft`")
    L.append("- **Files:** `.github/workflows.disabled/` (if present)")
    L.append("")
    L.append("### Description")
    L.append("GitHub Actions disabled by default in SWAL private era; local tests preferred.")
    L.append("")
    L.append("### Acceptance criteria")
    L.append("- [ ] Workflows do not run on GitHub (disabled/moved)")
    L.append("- [ ] Local test commands in SRC.md")
    L.append("")
    L.append("---")
    L.append("")

    # Domain REQs
    req_feat = {}
    for fid, reqs in _REQ_FEAT.items():
        for r in reqs:
            req_feat.setdefault(r, []).append(fid)
    for rid in sorted(REQS, key=lambda x: int(x.split("-")[1])):
        feats = req_feat.get(rid, [])
        name = FEAT_NAMES.get(feats[0], "") if feats else rid
        L.append(f"## {rid}: {name}")
        L.append("")
        L.append("- **Category:** Functional")
        L.append("- **Priority:** High")
        L.append("- **SRS Status:** `draft`")
        L.append("- **Files:** *(see feature detail in `.gitcore/features/details/`)*")
        L.append("")
        L.append("### Description")
        L.append(REQS[rid])
        L.append("")
        L.append("### User stories")
        us_ids = sorted({u for f in feats for u in F_US.get(f, [])}, key=lambda x: int(x.split("-")[1]))
        for usid in us_ids:
            u = US[usid]
            L.append(f"- **{usid}:** As a *{u['who']}*, I want {u['want']} so that {u['why']}.")
        if not us_ids:
            L.append("- *(no user story — infrastructure/process req)*")
        L.append("")
        L.append("### Acceptance criteria")
        for usid in us_ids:
            for c in US[usid]["accept"]:
                L.append(f"- [ ] ({usid}) {c}")
        if not us_ids:
            L.append("- [ ] Behavior verified by integration tests (see `.gitcore/features.json` evidence)")
        L.append("")
        L.append("---")
        L.append("")

    out = "\n".join(L).rstrip() + "\n"

    # Append User Story Designs section (read from generated details JSON — single source)
    import glob
    designs = []
    for dp in sorted(glob.glob(os.path.join(NIDO, ".gitcore/features/details/*.json"))):
        fd = json.load(open(dp))
        for us in fd.get("user_stories", []):
            d = us.get("design", {})
            if not d.get("screen"):
                continue
            designs.append((us["id"], fd["id"], us["as_a"], us["i_want"], d))
    out += "\n## User story designs (UX spec)\n\n"
    out += "> Extension `user_story_design` (see `.gitcore/MANIFEST.json`). "
    out += "Each design: screen, layout wireframe, @swal/ui components, flow, states.\n\n"
    for usid, fid, actor, want, d in designs:
        out += f"### {usid} — {d['screen']} (feature: `{fid}`, actor: {actor})\n\n"
        out += f"- **Want:** {want}\n"
        out += f"- **Layout:** {d['layout']}\n"
        out += f"- **Components:** {', '.join(d.get('components', []))}\n"
        out += "- **Flow:**\n" + "".join(f"  1. {s}\n" for s in d.get("flow", []))
        out += f"- **States:** {', '.join(d.get('states', []))}\n\n---\n\n"

    p = os.path.join(NIDO, "docs", "SRS", "REQUIREMENTS.md")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as fh:
        fh.write(out)
    print(f"✅ REQUIREMENTS.md: {len(REQS)+7} REQ-IDs, {len(US)} user stories")

_REQ_FEAT = {
 "gitcore-compliance": ["REQ-001","REQ-002","REQ-003","REQ-004","REQ-005","REQ-006","REQ-007"],
 "ui-swal": ["REQ-027"], "toolchain-ci": ["REQ-028"], "pwa-offline": ["REQ-025"],
 "data-model": ["REQ-008"], "plans-2d": ["REQ-009"], "plans-3d": ["REQ-010"], "norms-validation": ["REQ-011"],
 "inventory": ["REQ-012"], "costs": ["REQ-013"], "utilities": ["REQ-014"], "taxes": ["REQ-015"],
 "maintenance": ["REQ-016"], "analytics": ["REQ-026"], "export-cad": ["REQ-017"],
 "accounts-auth": ["REQ-018"], "verified-invitations": ["REQ-019"], "leasing": ["REQ-020"],
 "tenant-portal": ["REQ-021"], "mesh-integration": ["REQ-022"], "p2p-discovery": ["REQ-023"],
 "trust-score": ["REQ-024"], "escrow-disputes": ["REQ-025"],
}

if __name__ == "__main__":
    gen()
