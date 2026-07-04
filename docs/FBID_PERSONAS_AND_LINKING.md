# FBID — Personas, Safe Link Lifecycle & ZK Provenance Shield

Status: **Design / deep-plan** (not built). Authored 2026-06-08.
Third doc in the FBID set — read with [identity v2](./FBID_MULTI_EMAIL_ORG_DESIGN.md) and [Passport](./FBID_PASSPORT_DESIGN.md).

This doc answers Steph's refinement: *one human-proof root, but many personas (work / artist name / family / pseudonym),
with attachments (emails, wallets, works) you can **safely connect, disconnect, and move between them** — ownership always
clear and provable — and a ZK layer so everything that ever flowed through an identity stays inside one privacy shield.*

---

## 0. The three-way tension this resolves

| Requirement | Pulls toward | Conflicts with |
|---|---|---|
| **Human-proof** (sybil resistance) | one unique, correlatable root | persona privacy |
| **Persona unlinkability** | uncorrelated public faces | a single correlatable root |
| **Clear, portable ownership** | a provable audit trail | the right to erase / not be tracked |

The reconciliation: **uniqueness lives privately at the root; personas inherit a *proof* of "backed by a verified
unique human" without revealing which root.** Ownership is provable via commitments; erasure removes the *data* while the
*provenance commitment* (no PII) survives. ZK is what lets all three hold at once.

---

## 1. Three layers of identity

```
        ┌─────────────────────────────────────────────┐
        │  ROOT PERSONHOOD  (private core, never public) │   ← the unique human anchor
        │  holds humanity nullifiers (phone/ID/biometric)│      [[FBID_PASSPORT_DESIGN]] §2.2
        └───────────────┬─────────────────────────────┘
                        │  ZK "backed by a verified human" (which root undisclosed)
        ┌───────────────┴───────────────┬───────────────┐
        ▼                               ▼               ▼
   PERSONA: @cryptocoatl          PERSONA: artist   PERSONA: family
   (work / public)               name (pseudonym)  (close_friends only)
        │  owns ↓                       │               │
   ATTACHMENTS: emails · wallets · works · credentials · app data
   (each owned by exactly one persona-or-root at a time; portable)
```

- **Root** = the human. One per verified person. Carries the uniqueness nullifiers. **Not publicly linkable** to its personas.
- **Persona** = a public face. Reuses the *entire* existing identity machinery — it's a `flowbond_identities` row with
  `kind='persona'` + `root_fbid_id`, so it gets its own handle, profile, 5-tier visibility, and **its own Passport score**
  (proofs scoped to that persona) for free. A persona proves personhood via ZK, not by exposing the root.
- **Attachment** = anything ownable & portable: an email, a wallet, a work, an external credential, app data.

---

## 2. Data model (extends v2)

```sql
-- 2.1 Persona = an identity backed by a root (root itself is also a flowbond_identities row, kind='root')
alter table flowbond_identities
  add column kind text not null default 'person'      -- 'root' | 'persona' | 'org' | 'person'(legacy)
    check (kind in ('root','persona','org','person')),
  add column root_fbid_id uuid references flowbond_identities(id) on delete restrict;
-- a persona MUST have a root; a root/org MUST NOT
alter table flowbond_identities add constraint persona_has_root
  check ((kind='persona') = (root_fbid_id is not null));

-- 2.2 Everything ownable & portable, unified (supersedes per-type tables for lifecycle purposes)
create table fbid_attachments (
  id             uuid primary key default gen_random_uuid(),
  owner_fbid_id  uuid not null references flowbond_identities(id) on delete restrict,
  kind           text not null,           -- 'email' | 'wallet' | 'login' | 'work' | 'credential' | 'app_data'
  external_ref   text,                    -- email addr / 0x… / work id (may be null once erased)
  nullifier_hash text,                    -- HMAC; carries uniqueness across transfers
  payload_enc    text,                    -- FlowGardian fg1:… (owner-only); null after erasure
  commitment     text not null,           -- hash bound into the provenance shield (survives erasure)
  status         text not null default 'attached'
                   check (status in ('attached','detached','transferring','erased')),
  attached_at    timestamptz not null default now(),
  detached_at    timestamptz,
  visibility     fbid_visibility not null default 'private'
);
create unique index attachment_nullifier_active
  on fbid_attachments(kind, nullifier_hash) where status='attached' and nullifier_hash is not null;

-- 2.3 Append-only, hash-chained provenance — the "shield keeps track of everything in the flow"
create table fbid_provenance (
  seq          bigserial primary key,
  subject_fbid uuid not null references flowbond_identities(id),
  event_kind   text not null,            -- 'attach'|'detach'|'transfer'|'erase'|'create_persona'|'merge'|'rebind_root'
  attachment_id uuid references fbid_attachments(id),
  commitment   text not null,            -- commitment of the event (NO plaintext PII)
  nullifier    text,                     -- spent-marker for transfers/uniqueness moves
  prev_hash    text not null,            -- chain: prev_hash = hash(prev row) → tamper-evident
  this_hash    text not null,
  created_at   timestamptz not null default now()
);

-- 2.4 Consent for any cross-identity move (transfer needs proof of control of BOTH sides)
create table fbid_link_intents (
  id            uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references fbid_attachments(id),
  from_fbid     uuid not null references flowbond_identities(id),
  to_fbid       uuid not null references flowbond_identities(id),
  challenge     text not null,           -- must be satisfied on the destination (OTP / signature)
  status        text not null default 'pending' check (status in ('pending','confirmed','expired','cancelled')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);
```

---

## 3. The link lifecycle (safe, ownership-clear, reversible)

Every state change goes through a `security definer` RPC that (a) checks control, (b) updates `fbid_attachments`,
(c) appends an `fbid_provenance` row. **Ownership is always exactly one FBID and always provable.**

- **Connect** `attach(attachment, persona)` — from an authed session that controls the destination; verify the thing
  (OTP for email, signature for wallet) → `status='attached'`, provenance `attach`.
- **Disconnect** `detach(attachment)` — owner releases it → `status='detached'`, `detached_at=now()`. The **nullifier is
  freed** (active partial index drops it) so it can re-bind elsewhere — but a `detach` provenance row + optional cooldown
  prevents using it to inflate two identities at once.
- **Transfer / port** `transfer(attachment, to_fbid)` — the "erase an email/wallet and it goes to another one" flow:
  1. `from` owner opens an intent; 2. destination proves control (the `challenge` — OTP/sig), so we trust **both** ends;
  3. atomic: owner flips to `to_fbid`, nullifier carries over, provenance `transfer` with a spent `nullifier`. No window
  where the thing is double-owned or unowned.
- **Erase** `erase(attachment)` — right-to-be-forgotten: null out `external_ref` + `payload_enc`, `status='erased'`. The
  **`commitment` and provenance survive** (they hold no PII), so "this FBID once controlled *something* that did X" stays
  provable without the erased data ever being recoverable. This is how erasure and auditability coexist.
- **Create / retire persona**, **merge roots**, **rebind root** (move a persona to a different verified human, e.g.
  inheritance of an artist name) — each a provenance event, each requiring control proofs.

**Clarity invariants (enforced + assertable in CI):** one current owner per attachment; no `attached` nullifier collision;
provenance hash-chain unbroken; a persona's `root_fbid_id` always points at a `kind='root'` row; humanity nullifiers live
only on roots, never duplicated across roots.

---

## 3.5 Connected Accounts — the user-facing link experience  *(v1 BUILT 2026-06-08)*

Linking is a **user choice**, never a silent backend merge. The experience:

- **At FBID creation:** the onboarding flow asks how you want to set up your identity and which accounts/emails
  to connect — you choose what to bring in and how, up front.
- **In settings → Connected Accounts:** you see every email/wallet/login attached to your FBID, add new ones (verified
  via the §3 attach/transfer flow), and unlink — always your choice, always explicit.
- **Permanence:** once linked, an account lives **forever in your FBID's record**. Unlinking flips its status but the
  row stays — your connected-accounts history is permanent and (eventually) inside the ZK shield (§4).

Built foundation (additive, no account touched): table `fbid_account_links` (append-only-ish: unlink keeps the row),
each entry carries a `commitment` + per-FBID hash chain (`prev_hash`/`this_hash`) so the record is tamper-evident now and
upgrades to real ZK later. Read via RPC `fbid_connected_accounts()` / SDK `getConnectedAccounts()` (self-scoped by
`current_fbid()` RLS). A unique index allows a value to be **actively** linked to only one FBID at a time. Still to build:
the hub "Connected Accounts" UI, the verified add/unlink RPCs, and the FBID-creation chooser.

> Note on the cross-account case (Steph's `stepbystephbtm` ⊕ `cryptocoatl101`): consolidating a second *existing* login's
> data is the irreversible `merge_fbid()` path (§5 / Identity-v2 doc) — it only ever runs when the user explicitly chooses
> it in this experience. The dry-run engine (`fbid_merge_preview()`) is built and shows the exact footprint first.

## 4. The ZK provenance shield

Goal: prove things about an identity's history **without** exposing the PII or correlating personas.

### v1 (real today — encryption + hash-chain + server-enforced unlinkability)
- All attachment PII encrypted (FlowGardian `fg1:`); provenance stores **commitments only**.
- The chain (`prev_hash`/`this_hash`) makes the log **tamper-evident** (can't silently rewrite ownership history).
- **Unlinkability is policy-enforced**: `root_fbid_id` is never exposed through any public RPC; persona→persona and
  persona→root correlation requires the owner's explicit disclosure. Honest framing: this hides the link from *viewers*,
  not from the *server* — the DB still knows. That's the v1 limit.

### v2 (the true ZK layer — Phase E dependency, FlowGardian is symmetric-only today)
- **Commitment accumulator**: every root, persona, and attachment commitment goes into a Merkle tree (or Semaphore group).
- **Nullifier set**: global spent-markers so a uniqueness credential can't back two roots, and a transfer can't be replayed.
- **Statements you can prove in zero knowledge** (which root / which credential stays hidden):
  - "Persona P is backed by a member of the *verified-unique-humans* set." → personhood without identity.
  - "The actor owns attachment C" / "owns *some* attachment that satisfies policy" → action authorization without doxxing.
  - "These N personas are each backed by a human" while revealing nothing about whether they share a root.
  - Selective disclosure: the owner *can* prove "personas A and B share my root" when they choose to (e.g. to consolidate).
- **The shield covers the whole flow**: every email/wallet/work/credential that ever interacted is committed into the
  accumulator, so they all inherit the same unlinkability + provenance guarantees — "anything that interacted is inside
  the proof shield," exactly as Steph put it.
- Mirror selected commitments as **EAS attestations** for portable, on-chain-verifiable proofs (per the `apps/web` vision).

---

## 5. Worked example (Steph)

- **Root R** (verified human: phone + HeartSync + wallet nullifiers — private).
- Persona **@cryptocoatl** (work/public), persona **<artist name>** (pseudonym, not publicly tied to @cryptocoatl),
  persona **family** (close_friends only).
- `cryptocoatl101@gmail.com` attached to @cryptocoatl; `stepbystephbtm@gmail.com` attached to family.
- Steph **transfers** the artist wallet from @cryptocoatl → the artist persona: one intent + a signature on the
  destination, atomic, logged — @cryptocoatl can no longer claim it, the artist persona now can, and nothing was ever
  unowned. Later **erases** an old email: data gone, the provenance commitment that it once received a grant remains.
- A grant program asks "are you a unique human?" → the **artist persona** answers with a ZK proof from R, **without**
  revealing it's the same human as @cryptocoatl.

---

## 6. Phasing (folds into the Passport phases)

- **P1 — persona model:** `kind`/`root_fbid_id`; create/switch personas in the hub ("act as", like orgs); each persona
  gets its own profile + Passport score. Root stays private. (No new crypto.)
- **P2 — unified attachments + lifecycle:** migrate emails/wallets/logins into `fbid_attachments`; ship
  attach/detach/transfer/erase RPCs + `fbid_provenance` hash-chain + consent intents. Ownership invariants in CI.
- **P3 — selective disclosure RPCs:** owner-controlled persona↔root reveal; encrypted payloads; per-attachment visibility.
- **P4 — ZK shield:** Semaphore-style accumulator + nullifier set; "backed by a verified human" proofs; EAS mirror.
  (Requires extending FlowGardian beyond symmetric — real dependency, sequenced last.)

## 7. Risks / open questions

- **Uniqueness on transfer/detach is the sharp edge.** Freeing a nullifier on detach must not let one human briefly back
  two roots — needs the spent-nullifier provenance + a cooldown, and humanity-recompute on both sides.
- **Server-side linkability in v1.** Be explicit with users: until P4, the platform *can* correlate your personas even
  though viewers can't. Don't over-promise ZK before it ships.
- **Erasure vs. legal/audit holds.** Commitments survive erasure by design; confirm that satisfies "right to be forgotten"
  (it should — no PII in the commitment — but document it).
- **Persona ≠ sybil loophole.** Personas must NOT each count as separate humans in sybil-gated rewards — humanity is scored
  at the **root**, and a reward must dedupe to the root even when claimed through a persona. Critical, easy to get wrong.
- **Key management.** FlowGardian pepper/master key rotation must not break existing nullifiers/commitments — version them.
