# FlowScrow — `flowme.one/separationagreement`

Conditional-release escrow that closes a multi-task agreement only when every task
in **Exhibit 3 — Closing Tasks Schedule** is completed AND independently verified.
First deployment: the FlowBond Tech / Russell Herod separation.

## Architecture
- **Next.js App Router** in `flowbond-os`, port `3022`, own Vercel project.
- **Backend**: canonical Supabase `fgsrcxxccdjqyrpkitmk`. Pattern A — `flowscrow_*`
  tables in `public`, RLS on. **All writes go through SECURITY DEFINER RPCs** that
  enforce role rules (no self-confirm; verifier-only confirm; counsel-only gate).
- **Identity**: FBID via `@flowbond/auth` → `activate_app('flowscrow')`.
- **Chain**: Base via `viem`, non-custodial (the party signs with their own wallet).
- **E-signature**: DocuSign eSignature REST API, JWT grant, server-side only.

## Non-negotiables (enforced)
1. No secrets-of-control stored — Web3 keys delivered off-platform (B4), only a
   confirmation is recorded.
2. DocuSign is the binding signature; counsel confirms.
3. On-chain = proof-of-existence hash only (keccak256 package hash). No PII/keys.
4. Wallet signing optional & non-custodial — address only.
5. Counsel gate required before release.
6. No self-confirmation — enforced in `flowscrow_confirm_task`.
7. RLS everywhere — a deal is visible only to its parties + counsel; the courtesy
   letter is sealed from the counterparty until `cleared`/released.

## State machine
`draft` → (counsel opens transfers) `signed_pending_transfers`
→ (every Phase-B task confirmed AND counsel approved) `cleared`
→ (counsel release) `released` → (optional initiator anchor) `anchored`.

## Migration
`supabase/migrations/20260624_flowscrow_init.sql` — **applied** to
`fgsrcxxccdjqyrpkitmk`. Adds the 6 tables, RLS, RPCs, extends the
`flowbond_app_connections.app_slug` allow-list with `flowscrow`, and seeds the
Herod deal (3 parties, 2 docs, 18 tasks).

### ⚠️ Before go-live — set the real party emails
The seed uses placeholder emails for the counterparty and counsel so the right
person claims each slot on first login (matched by email in `flowscrow_claim_party`):

```sql
update public.flowscrow_parties set email = 'russell@<real>'  where role='counterparty';
update public.flowscrow_parties set email = 'counsel@<real>'  where role='counsel';
-- initiator is cryptocoatl101@gmail.com (Steph Ferrera).
```

## Env
Copy `.env.example` → `.env.local`. Supabase URL + anon + service-role are required.
DocuSign (`DOCUSIGN_*`) and Base anchoring (`NEXT_PUBLIC_EAS_*` /
`NEXT_PUBLIC_FLOWSCROW_ANCHOR_CONTRACT`) are optional — the app builds and runs
without them; those flows show a "not configured" state until set.

## Routes
`/login` · `/auth/callback` · `/dashboard` (vault + task tracker + gate + audit log)
· `/sign` (DocuSign + optional wallet attestation) · `/counsel` (gate controls) ·
`/release` · `/record` (export + optional Base anchor).

## Deploy
Own Vercel project (build command in `vercel.json`). `flowme.one/separationagreement`
is wired at the flowme.one routing layer via a rewrite to this project — same model
as the other path-mounted apps. DocuSign Connect webhook → `/api/docusign/webhook`.
