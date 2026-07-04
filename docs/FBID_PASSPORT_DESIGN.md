# FlowBond Passport — Proof-of-Personhood & Reputation on FBID, Secured by FlowGardian

Status: **Design / deep-plan** (not built). Authored 2026-06-08 from a live audit of project `fgsrcxxccdjqyrpkitmk` + repo grounding.
Builds directly on [FBID v2 multi-email/org](./FBID_MULTI_EMAIL_ORG_DESIGN.md) — a Passport belongs to an **FBID**, so it
aggregates proofs across *all* of a person's linked emails/wallets, and orgs can hold one too.

The model is Gitcoin-Passport-shaped — **stamps → score → benefits** — with three deliberate departures:
1. **Two scores, not one** (humanity vs. good-human) — conflating them is the main Gitcoin critique.
2. **Privacy-first via FlowGardian** — proofs are aggregated without exposing the underlying PII.
3. **A biometric presence stamp (DANZ HeartSync)** most passports can't offer.

---

## 1. Two scores (keep them separate)

| Score | Question it answers | Anti-pattern it prevents |
|---|---|---|
| **Humanity** (sybil resistance) | "Is this **one unique real person**?" | One human farming many FBIDs |
| **Good-human** (reputation) | "Is this a **positive contributor**?" | Treating wealth/activity as virtue |

A whale with 50 wallets should score LOW humanity. A broke first-day regenerator should be able to score HIGH
good-human. Benefits gate on whichever is appropriate (airdrops/sybil-gated → humanity; governance/trust → good-human).

---

## 2. Stamps (verifiable credentials)

A **stamp** = a proof issued by a trusted verifier and recorded against an FBID. Never client-asserted —
always minted server-side (edge function / service-role) after the verifier confirms the proof.

### 2.1 Provider catalog (seed set, grounded in what exists)

| Provider slug | Category | Source (status) | Weight | Uniqueness? |
|---|---|---|---|---|
| `email_verified` | humanity | Supabase auth (✅ have) | low | per-email |
| `wallet_evm` / `wallet_solana` | humanity | `bind_wallet` sig (✅ have) | low–med | per-address |
| `wallet_age` | humanity | chain indexer (build) | med | per-address |
| `phone_verified` | humanity | OTP provider (build) | med | **per-phone** |
| `heartsync_presence` | humanity | DANZ HeartSync (✅ data exists) | **high** | per-session, rate-limited |
| `gov_id` *(optional)* | humanity | KYC partner (build) | high | **per-ID-hash** |
| `gitcoin_passport` / `brightid` / `poap` | humanity | external attestation import (build) | med | per-external-id |
| `event_attendance` | good-human | `danz_event_attendees` geo+wearable (✅) | med | per-event |
| `vouch` | good-human | other FBIDs (build, §5) | quadratic | n/a |
| `contribution` | good-human | XP/FlowCredits *earned* (✅ ledgers) | med | n/a |
| `regen_action` | good-human | RVBL ledger (roadmap) | high | n/a |

### 2.2 The uniqueness nullifier (the actual sybil defense)

For any scarce real-world credential (phone, gov ID, BrightID), store a **nullifier** =
`HMAC(FLOWGARDIAN_PEPPER, normalized_secret)` with a **UNIQUE constraint across all FBIDs**. That single
credential can therefore boost exactly **one** FBID. The raw secret is never stored — only the keyed hash
(irreversible without the pepper) plus a FlowGardian-encrypted payload for the owner's own re-display.
This is what stops "one human → many high-score FBIDs."

---

## 3. Data model

```sql
-- 3.1 Provider catalog (admin-curated weights/policy)
create table fbid_stamp_providers (
  slug            text primary key,
  category        text not null check (category in ('humanity','good_human')),
  display_name    text not null,
  base_weight     numeric not null,         -- contribution to score
  max_per_fbid    int not null default 1,
  expiry_days     int,                       -- null = never expires
  requires_unique boolean not null default false,
  active          boolean not null default true
);

-- 3.2 Earned stamps
create table fbid_stamps (
  id              uuid primary key default gen_random_uuid(),
  fbid_id         uuid not null references flowbond_identities(id) on delete cascade,
  provider_slug   text not null references fbid_stamp_providers(slug),
  status          text not null default 'active' check (status in ('active','expired','revoked')),
  weight_snapshot numeric not null,          -- weight at issue time (audit-stable)
  nullifier_hash  text,                       -- HMAC; unique per provider when requires_unique
  commitment      text,                       -- salted hash of the proof (selective disclosure)
  payload_enc     text,                       -- FlowGardian fg1:… ciphertext of raw proof (owner-only)
  ref_kind        text,                       -- 'heart_sync_session' | 'danz_event' | 'tx' | 'external'…
  ref_id          uuid,
  visibility      fbid_visibility not null default 'private',
  issued_by       text not null,              -- verifier id (edge fn / partner)
  issued_at       timestamptz not null default now(),
  expires_at      timestamptz
);
create unique index stamp_nullifier_unique
  on fbid_stamps(provider_slug, nullifier_hash) where nullifier_hash is not null and status='active';

-- 3.3 Vouching (good-human; sybil-dampened, see §5)
create table fbid_vouches (
  voucher_fbid uuid not null references flowbond_identities(id) on delete cascade,
  vouchee_fbid uuid not null references flowbond_identities(id) on delete cascade,
  weight       numeric not null default 1,
  created_at   timestamptz not null default now(),
  primary key (voucher_fbid, vouchee_fbid),
  check (voucher_fbid <> vouchee_fbid)
);

-- 3.4 Cached score snapshots (recomputed on stamp change; live RPC also available)
create table fbid_passport_scores (
  fbid_id           uuid primary key references flowbond_identities(id) on delete cascade,
  humanity_score    numeric not null default 0,
  good_human_score  numeric not null default 0,
  computed_at       timestamptz not null default now()
);
```

### 3.3 Scoring RPC (server-side, decay + dedup aware)

```
passport_score(fbid) =
  humanity   = Σ active humanity stamps' weight_snapshot, each decayed by age toward expiry,
               capped per provider, with diminishing returns above a threshold
  good_human = Σ contribution stamps
             + quadratic_vouch_sum(fbid)            -- §5
```

`is_verified` on `flowbond_identities` is **auto-set** when `humanity_score ≥ VERIFIED_THRESHOLD`
(replaces the current manual/unused flag).

---

## 4. How FlowGardian secures it (concrete, honest about today's limits)

- **At rest:** every stamp's raw proof → `encrypt()` (`fg1:` AES-256-GCM, `flowdesk/src/lib/flowgardian/crypto.ts`).
  DB leak ⇒ ciphertext only.
- **Irreversible dedup:** nullifiers are HMAC keyed by a server pepper (extend FlowGardian with `hmac()` +
  `FLOWGARDIAN_PEPPER`) — a stolen DB can't map a nullifier back to a phone/ID.
- **Selective disclosure (v1, real today):** the public-facing `passport_view(handle)` RPC returns, per the
  viewer's 5-tier access, only `{provider, category, score_contribution, issued_at, commitment}` — never the
  payload. So "this FBID holds a phone + biometric stamp worth N" is provable **without** the number. This is
  server-enforced minimal disclosure, **not** cryptographic ZK — stated plainly.
- **Visibility:** each stamp carries an `fbid_visibility`; reuses the existing rank/relationship machinery
  (`fbid_visibility_rank`, `set_relationship`, `get_profile`-style filtering).
- **Webhook hardening:** inbound provider callbacks (KYC, POAP, etc.) must be signature-verified — FlowGardian
  needs a `verifyWebhook()` (noted missing today) before any external issuer is trusted.
- **v2 (dependency, not yet):** swap commitments for real ZK (Semaphore-style nullifiers / zk membership) and
  mirror stamps as **EAS attestations** (on-chain pointer, off-chain encrypted data) + ICP — matches the
  `apps/web` marketing promise. Until built, do **not** claim ZK.

---

## 5. Good-human without sybil leakage: quadratic, humanity-weighted vouching

A vouch's power = `base_weight × f(voucher.humanity_score)`, and a vouchee's total vouch contribution uses a
**quadratic / sublinear** aggregation: `(Σ √weight_i)²`-style, so 100 fresh sock-puppets vouching ≪ 5 high-humanity
humans vouching. Vouches **decay** and are **revocable**. This makes reputation expensive to fake while staying
permissionless. (Distinct from `fbid_relationships`, which is private closeness, not public attestation.)

---

## 6. Benefits menu (what the score unlocks)

- **Verified badge** + handle trust tier (auto via humanity threshold).
- **Sybil-gated rewards**: airdrops, FlowCredits multipliers, event allowlists — weight by humanity so one human = one share.
- **Good-human perks**: governance weight, lower fees, early access, "trusted vouchee" status, regen rewards (RVBL).
- **Cross-app**: a high passport unlocks features in DANZ (organizer trust), FlowGarden, Flow3, etc. — one passport, every app.
- **Org passports**: a `kind='org'` FBID accrues a verified-org score from its members' aggregate + org-level KYC.

---

## 7. Verification flows (issuers)

Each stamp type = one verifier that proves the claim, then calls a service-role `passport_issue_stamp(...)`:
- **HeartSync** → DANZ API confirms a completed `heart_sync_sessions` row with `sync_quality_score ≥ τ` and
  `verification_type='heart_rate_sync'` → issues `heartsync_presence` (ref_kind='heart_sync_session'). Highest weight.
- **Wallet** → reuse `bind_wallet` sig path → `wallet_evm`/`wallet_solana`; later add `wallet_age` from an indexer.
- **Phone** → OTP, nullifier = `hmac(e164)`.
- **Gov ID (optional)** → KYC partner webhook (signature-verified), store hash + encrypted, nullifier = `hmac(id)`.
- **External (Gitcoin/BrightID/POAP/EAS)** → fetch the user's existing attestation, verify it, mirror as a stamp.
- **Contribution** → periodic job reads *earned* (not purchased) FlowCredits + XP ledgers → `contribution` stamp.

---

## 8. Phasing (each phase shippable, builds on FBID v2)

- **A — Passport core:** `fbid_stamp_providers` + `fbid_stamps` + `passport_score()` + dashboard "Passport" panel.
  Wire the 3 free stamps you already have data for: `email_verified`, `wallet_*`, `heartsync_presence`.
  Auto-set `is_verified` at threshold. No new crypto.
- **B — Privacy + uniqueness:** FlowGardian `hmac()` + `FLOWGARDIAN_PEPPER`; nullifier dedup; encrypt payloads;
  `passport_view()` selective-disclosure RPC; per-stamp visibility. Add `phone_verified`.
- **C — Good-human:** `fbid_vouches` (quadratic, humanity-weighted, decaying) + contribution stamp from ledgers.
- **D — External stamps:** import Gitcoin Passport / BrightID / POAP; webhook signature verification.
- **E — On-chain + ZK:** EAS attestations (write) + real ZK selective disclosure + ICP — the marketing vision.

## 9. Risks / open questions

- **HeartSync isn't a stable biometric *identifier*** — it proves "a live human was present," not "this exact human,"
  so rate-limit + combine with a scarce nullifier (phone/ID) for true uniqueness; don't let it alone gate high humanity.
- **Issuer trust is the whole ballgame** — a compromised verifier mints fake stamps. Every issuer must be
  service-role + signature-verified + auditable (`issued_by`, append-only).
- **Privacy honesty** — v1 is encryption + server-side minimal disclosure, NOT ZK. Don't market ZK until Phase E.
- **Score gaming** — needs decay, per-provider caps, diminishing returns, quadratic vouching; model before launch.
- **Cross-FBID merge interaction** — when two FBIDs merge (FBID v2 §5), stamps must dedup by nullifier (a phone on
  both collapses to one), and scores recompute, not sum.
- **Reuse vs. new for vouching** — confirm `fbid_relationships` stays private-closeness; vouches are public attestations.
