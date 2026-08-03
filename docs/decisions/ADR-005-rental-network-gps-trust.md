# ADR-005: Rental network — GPS proximity + cross-app verified trust

**Status:** Proposed (M5 design; accepted for planning)
**Supersedes:** —
**Date:** 2026-08-03
**Context:** CEO vision: a private "Airbnb" network — people nearby (GPS) who want
to rent, with verified accounts that link sessions from other apps to prevent
scams. Market research: no existing platform combines GPS proximity with
cross-app identity linking.
**Decision:** M5 builds the network on edge-mesh: namespace `swal/nido/{instanceId}`,
geohash-based discovery, listings anchored to the floor plan + live presence,
chat P2P. Trust score T1–T4: (T1) gov-ID + selfie; (T2) linked external sessions
(OAuth/API proofs: reviews, payment history, social graph); (T3) on-network history
(rentals, reviews, payments); (T4) Polygon deposit/collateral. Deposits in Polygon
escrow; disputes via edge-mesh governance voting. GPS requires explicit consent;
data minimization; legal review in M4 (Colombia arrendamiento + protección de datos).
**Consequences:** Positive — unique differentiator; scam resistance via
multi-factor trust + escrow. Negative — legal/regulatory complexity; edge-mesh
production maturity risk; mitigated with offline fallback and dogfooding.
**Spikes required:** M5 spikes: (1) geohash discovery over edge-mesh presence;
(2) Polygon escrow contract on testnet; (3) OAuth link-proof verification.
**References:** Market research §2 (gap matrix), `edge-mesh/` core, `docs/SWAL/GARA_G_UNIFICATION.md` (economic core).
