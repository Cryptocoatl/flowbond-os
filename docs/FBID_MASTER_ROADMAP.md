# FBID — Master Roadmap (converged)

Status: **sequencing plan.** Converges the four design docs into one dependency-ordered build.
Read the specs for detail: [identity v2](./FBID_MULTI_EMAIL_ORG_DESIGN.md) · [Passport](./FBID_PASSPORT_DESIGN.md) ·
[Personas & Linking](./FBID_PERSONAS_AND_LINKING.md) · [FlowMe Agent](./FLOWME_AGENT_CONSENT.md).

**One spine:** the **root is the human**; everything else (emails, wallets, personas, works, stamps, agent actions)
attaches to it and is **provable, portable, and consent-gated**. Live project: `fgsrcxxccdjqyrpkitmk`.

---

## The dependency graph (what unblocks what)

```
P1 indirection (logins/emails/personas + current_fbid)   ← FOUNDATION, non-breaking
   │
   ├─► P2 read cutover to current_fbid()  ─► merge_fbid() ─► [merge Steph's 2 accounts = proof]
   │
   ├─► Passport A (stamps/score, email+wallet+heartsync) ─► Passport B (nullifiers/privacy) ─► C good-human ─► D external
   │
   ├─► Personas P1 (kind/root) ─► attachments+lifecycle ─► selective disclosure
   │
   └─► AG0 de-privilege agent (SECURITY FIX) ─► AG1 capabilities+knock ─► AG2 tool-use ─► AG3 act-on-behalf
                                                                                          │
   ZK + EAS (Passport-E / Personas-P4 / AG4) ◄──────────── all converge here (needs FlowGardian beyond symmetric)
```

**Critical path** = `P1 → P2 → merge_fbid` (unblocks the multi-email promise and the proof case).
**Highest urgency, off the critical path** = `AG0` — the agent's current service-role/no-consent behavior is a live
security issue; do it in parallel, early.
**Everything ZK** waits on FlowGardian gaining commitments/accumulators (Phase-E class) — sequence it LAST; don't block
earlier value on it, and don't market ZK before it ships.

---

## Ordered milestones

| # | Milestone | From doc | Breaking? | External gate |
|---|---|---|---|---|
| **1** | **Indirection foundation** — `fbid_logins`, `fbid_emails`, persona `kind`+`root_fbid_id`, `current_fbid()` (+fallback), backfill | v2 §2–3, Personas §2 | **No** (additive) | none |
| 2 | Read cutover — hub `getMyIdentity` + RLS read through `current_fbid()` behind the fallback | v2 §9 P2 | No (shimmed) | none |
| 3 | `merge_fbid()` + owned-table registry; **merge cryptocoatl101 ⊕ stepbystephbtm** | v2 §5 | Yes (data move) | none |
| 4 | Add-email/verify in hub settings | v2 §5 | No | none |
| AG0 | **De-privilege FlowMe** — kill service-role bypass; route via user-scoped token + `flowguard.authorize()` stub + `fbid_agent_actions` | Agent §0,§8 | No (fixes a hole) | none |
| AG1 | Capabilities + grants + knock protocol (generalize FlowEdit tokens) | Agent §2–5 | No | none |
| 5 | Persona UX — create/switch ("act as"); each persona = own profile + Passport | Personas §1, P1 | No | none |
| 6 | **Passport A** — `fbid_stamp_providers`/`fbid_stamps`/`passport_score()` + dashboard; wire email/wallet/HeartSync; auto `is_verified` | Passport §3,§8 | No | DANZ API for HeartSync |
| AG2 | FlowMe → Anthropic tool-use; gate-wrapped read-only organizing tools | Agent §7 | No | none |
| 7 | Attachments + lifecycle — unify into `fbid_attachments`; attach/detach/transfer/erase + `fbid_provenance` hash-chain | Personas §2–3 | Yes (data model) | none |
| 8 | **Passport B** — FlowGardian `hmac()`+pepper; nullifier dedup; encrypt payloads; `passport_view()` selective disclosure; phone stamp | Passport §2.2,§4 | No | OTP provider |
| AG3 | Act-on-behalf tools (write/transfer/route/spend), all knock+capped; duplicate-merge proposer | Agent §6,§8 | No | none |
| 9 | Good-human — `fbid_vouches` (quadratic, decaying) + contribution stamp from ledgers | Passport §5 | No | none |
| 10 | External stamps — Gitcoin Passport / BrightID / POAP import; webhook sig verify | Passport §8 D | No | partner APIs |
| 11 | Orgs — `kind='org'` + `fbid_org_members` + "act as" + `owner_fbid` on app tables | v2 §7 | No | none |
| HIBP | Leaked-password protection | hub backlog | No | **Supabase Pro** |
| **ZK** | EAS attestations (write) + real ZK selective disclosure + ICP (Passport-E / Personas-P4 / AG4) | all | No | **FlowGardian beyond symmetric** |

---

## Cross-cutting invariants (must hold at every phase)

- **One human = one root.** Uniqueness nullifiers live only on roots; never duplicated across roots.
- **Sybil dedupe to root.** Personas/emails/wallets never count as separate humans in any gated reward.
- **Provenance is append-only.** Every link/unlink/transfer/erase/agent-action commits to `fbid_provenance`; commitments
  survive erasure (no PII in them) → right-to-forget and auditability coexist.
- **The gate is the boundary, not the prompt.** No agent path to data except through `flowguard.authorize()`.
- **Non-breaking until proven.** `current_fbid()` keeps a fallback to `auth_user_id` until every reader is cut over.

---

## Where we start (Milestone 1, this iteration)

Artifact: `flowbond-life/supabase/migrations/20260608120000_fbid_v2_foundation.sql` — **additive, idempotent, reversible.**
Adds `fbid_logins`, `fbid_emails`, persona columns, `current_fbid()`, self-scoped RLS, and backfills one login + one primary
email per existing identity. Changes **zero** existing behavior (nothing reads the new objects yet; new signups still resolve
via the fallback). Trigger changes are deliberately deferred to Milestone 2.

After it applies + verifies: Milestone 2 cuts the hub read over to `current_fbid()`, then Milestone 3 merges Steph's two
accounts as the first real proof of the whole system.
