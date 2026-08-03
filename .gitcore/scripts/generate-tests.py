#!/usr/bin/env python3
"""Generate NIDO test skeleton files (Vitest unit/integration + Playwright e2e)
mapped 1:1 to user stories and acceptance criteria in docs/SRS/REQUIREMENTS.md.

Every test file referenced in .gitcore/features.json evidence is created with
describe/it cases derived from the US acceptance criteria. Tests are
skeletons (fail until M0+ implementation) — the mapping is the contract.
"""
import json, os

NIDO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

# Reuse the canonical spec by importing from generate-features.py sources
# (simplest robust path: re-declare the US map here — single source is the SRS generator;
#  keep this file in sync via verify below).
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

# feature -> (kind, path, us_ids)
PLAN = [
 ("gitcore-compliance","integration","test/integration/gitcore-compliance.test.ts",[]),
 ("ui-swal","unit","test/unit/ui-swal.test.ts",["US-101"]),
 ("ui-swal","e2e","test/e2e/ui-swal.spec.ts",["US-101"]),
 ("toolchain-ci","integration","test/integration/toolchain-ci.test.ts",[]),
 ("pwa-offline","integration","test/integration/pwa-offline.test.ts",[]),
 ("pwa-offline","e2e","test/e2e/pwa-offline.spec.ts",[]),
 ("data-model","unit","test/unit/data-model.test.ts",["US-201"]),
 ("data-model","integration","test/integration/data-model.test.ts",["US-201"]),
 ("plans-2d","unit","test/unit/plans-2d.test.ts",["US-101"]),
 ("plans-2d","e2e","test/e2e/plans-2d.spec.ts",["US-101"]),
 ("plans-3d","unit","test/unit/plans-3d.test.ts",["US-102"]),
 ("plans-3d","e2e","test/e2e/plans-3d.spec.ts",["US-102"]),
 ("norms-validation","unit","test/unit/norms-validation.test.ts",["US-103"]),
 ("inventory","unit","test/unit/inventory.test.ts",["US-301"]),
 ("inventory","integration","test/integration/inventory-sync.test.ts",["US-301"]),
 ("costs","unit","test/unit/costs.test.ts",["US-302"]),
 ("utilities","unit","test/unit/utilities.test.ts",["US-303"]),
 ("utilities","unit","test/unit/utilities-split.test.ts",["US-303"]),
 ("taxes","unit","test/unit/taxes.test.ts",["US-304"]),
 ("maintenance","unit","test/unit/maintenance.test.ts",["US-305"]),
 ("maintenance","integration","test/integration/maintenance-workorder.test.ts",["US-305"]),
 ("analytics","unit","test/unit/analytics.test.ts",["US-302"]),
 ("export-cad","unit","test/unit/export-cad.test.ts",["US-104"]),
 ("export-cad","integration","test/integration/export-cad.test.ts",["US-104"]),
 ("accounts-auth","unit","test/unit/accounts-auth.test.ts",["US-401"]),
 ("accounts-auth","integration","test/integration/accounts-auth.test.ts",["US-401"]),
 ("verified-invitations","unit","test/unit/verified-invitations.test.ts",["US-402"]),
 ("verified-invitations","integration","test/integration/verified-invitations.test.ts",["US-402"]),
 ("leasing","unit","test/unit/leasing.test.ts",["US-501"]),
 ("leasing","integration","test/integration/leasing-payments.test.ts",["US-501"]),
 ("tenant-portal","unit","test/unit/tenant-portal.test.ts",["US-502"]),
 ("tenant-portal","e2e","test/e2e/tenant-portal.spec.ts",["US-502"]),
 ("mesh-integration","integration","test/integration/mesh-integration.test.ts",["US-601"]),
 ("p2p-discovery","unit","test/unit/p2p-discovery.test.ts",["US-601","US-602"]),
 ("p2p-discovery","e2e","test/e2e/p2p-discovery.spec.ts",["US-601","US-602"]),
 ("trust-score","unit","test/unit/trust-score.test.ts",["US-603"]),
 ("trust-score","integration","test/integration/trust-score.test.ts",["US-603"]),
 ("escrow-disputes","integration","test/integration/escrow-disputes.test.ts",["US-604"]),
 ("escrow-disputes","integration","test/integration/dispute-governance.test.ts",["US-605"]),
]

def esc(s): return s.replace('"', '\\"')

def gen():
    created = []
    for feat, kind, path, us_ids in PLAN:
        abs_path = os.path.join(NIDO, path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        if kind in ("unit", "integration"):
            head = (
                'import { describe, it, expect } from "vitest";\n\n'
                f'// NIDO — {kind} tests for feature: {feat}\n'
                f'// User stories under test: {", ".join(us_ids) or "—"}\n'
                '// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.\n'
                '// Skeletons — implement assertions when the feature ships (M0+).\n\n'
            )
            body = []
            for usid in us_ids:
                u = US[usid]
                body.append(f'describe("{usid}: {u["want"]}", () => {{')
                for i, c in enumerate(u["accept"], 1):
                    body.append(f'  it("acceptance {i}: {esc(c)}", () => {{')
                    body.append("    // TODO(M0+): implement assertion")
                    body.append("    expect(true).toBe(false); // placeholder — replace")
                    body.append("  });")
                body.append("});\n")
            if not us_ids:
                body.append(f'describe("{feat}", () => {{')
                body.append('  it("complies with GitCore contract", () => {')
                body.append("    // TODO(M0+): implement assertion")
                body.append("    expect(true).toBe(false); // placeholder — replace")
                body.append("  });")
                body.append("});\n")
            content = head + "\n".join(body)
        else:  # e2e
            head = (
                'import { test, expect } from "@playwright/test";\n\n'
                f'// NIDO — e2e tests for feature: {feat}\n'
                f'// User stories under test: {", ".join(us_ids) or "—"}\n\n'
            )
            body = []
            for usid in us_ids:
                u = US[usid]
                body.append(f'test.describe("{usid}: {u["want"]}", () => {{')
                body.append('  test.beforeEach(async ({ page }) => {')
                body.append("    await page.goto(\"/\");")
                body.append("  });")
                for i, c in enumerate(u["accept"], 1):
                    body.append(f'  test("acceptance {i}: {esc(c)}", async ({{ page }}) => {{')
                    body.append("    // TODO(M0+): implement e2e flow")
                    body.append("    expect(true).toBe(false); // placeholder — replace")
                    body.append("  });")
                body.append("});\n")
            if not us_ids:
                body.append(f'test.describe("{feat}", () => {{')
                body.append('  test("works end-to-end", async ({ page }) => {')
                body.append("    await page.goto(\"/\");")
                body.append("    expect(true).toBe(false); // placeholder — replace")
                body.append("  });")
                body.append("});\n")
            content = head + "\n".join(body)
        with open(abs_path, "w") as fh:
            fh.write(content)
        created.append(path)

    # verify all referenced in features.json exist
    feats = json.load(open(os.path.join(NIDO, ".gitcore", "features.json")))
    missing = []
    for f in feats["features"]:
        for tst in f["tests"]:
            if not os.path.exists(os.path.join(NIDO, tst)):
                missing.append(f"{f['id']} → {tst}")
    print(f"✅ test files created: {len(created)}")
    print(f"✅ features.json references: {sum(len(f['tests']) for f in feats['features'])}")
    print("❌ missing:" if missing else "✅ all features.json test refs exist", missing if missing else "")

if __name__ == "__main__":
    gen()
