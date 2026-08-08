# ADR-0003 · Mission verification standard

- **Status:** Proposed (awaiting Love's sign-off — [DECISION D2])
- **Date:** 2026-07-13
- **Context:** `01_STATE_LAYER_SPEC.md` §4, `kai_submit_proof` / `kai_validate_proof`

## Context

"Real action heals the mirror" only holds if proofs are trustworthy. V1 must
ship a working loop (an admin panel is explicitly in scope) while not painting
us into a corner that blocks decentralized validation later.

## Decision

**A proof** = geotag + timestamp + media (R2 key + SHA-256) + mission type, bound
to an FBID. **Anti-fraud minimums enforced in the RPC** (never the client):

1. Geofence — action within `region.radiusM` of region center.
2. One pending proof per user per mission per day.
3. Duplicate-media rejection — `(region_id, media_hash)` unique.
4. Validator ≠ submitter.

**V1 validation authority = single admin approval** (`kai_mission_types.quorum = 1`,
approver must be in `kai_validators` or a superadmin). The schema already carries
a `kai_validators` roster and a per-mission `quorum` column, so **N-of-M quorum
validation turns on by config with no migration** when we're ready.

XP on approval is **soulbound** (append-only `kai_xp_ledger`, idempotent per
proof, no transfer, no redemption) — reputation only, never a token or cash
value (TulumCoin XP-integrity pattern).

## Alternatives considered

- **Quorum-from-launch (N validators).** Rejected for V1: no validator community
  yet; single trusted admin is enough to prove the loop and ship. Left as a
  config flip.
- **Automated CV/geospatial validation.** Deferred: valuable later, unnecessary
  and risky for V1; the admin is the ground truth now.
- **On-chain / token rewards.** Out of scope by explicit constraint. Any money/
  token surface stops and asks Love.

## Consequences

- V1 trust rests on the admin(s); acceptable at one region / one mission.
- The upgrade path (quorum, then automated pre-screening) needs no schema
  change — only new validators + a `quorum` value.
- **Open for Love:** confirm single-admin V1 vs. quorum-from-launch.
