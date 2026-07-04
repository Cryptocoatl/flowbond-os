# FBID — Identity Linking & Dedup Contract

**Goal:** one human = one `flowbond_users` row (FBID), no matter how many methods
they use. FBID = `flowbond_users.id` = `auth.users.id` = `flowbond_app_connections.user_id`.

Root project: `fgsrcxxccdjqyrpkitmk` (only).

## Method → identity resolution

| Method | Identifier | Links to existing FBID? |
|---|---|---|
| Email/password | verified email | Yes — same verified email = same `auth.users` |
| Magic link | verified email | Yes — same verified email |
| Google OAuth | `email_verified` email | **Auto-link** to the matching verified email |
| Apple OAuth | email (may be private relay) | Auto-link **only if** the email is present & verified; relay/no-email → new identity or explicit link |
| Wallet (EVM/Solana) | chain-namespaced address | **Never auto-links** by email. Binds to its own identity, or to a logged-in human via explicit "link while logged in" |

## Rules (enforced)

1. **Auto-link only on a verified, matching email.** Provided by Supabase's
   same-email identity linking (verified email collapses Google/Apple/email into
   one `auth.users`). Requires "link accounts with same email" enabled (see
   `apps/fbid/CONFIG.md` / `configure-fbid-auth.ts`). Asserted in tests.
2. **Never auto-link an unverified email.** An unverified email must not attach to
   an existing account — that's an account-takeover vector.
3. **Never auto-link a wallet by email.** Wallets create/own their own FBID unless
   the user is already logged in and explicitly links (`bind_wallet` called in an
   authenticated session).
4. **One wallet → one FBID.** Enforced at the DB by the unique index
   `flowbond_users_wallet_unique` on `lower(wallet_address)`. A wallet already
   bound to a different identity is **rejected** by `bind_wallet`
   (`wallet_already_bound_to_other_identity`) — never silently rebound.
5. **Apple private relay / no-email:** treated as no verified email → new identity
   (or explicit link). Store the relay address; never guess a match.

## Sanctioned writes (the only ones)

- `link_auth_or_create_identity()` — ensure the FBID row for the current session.
- `activate_app(slug)` — register an app connection (calls the above).
- `bind_wallet(identifier)` — bind a chain-namespaced wallet to the current FBID,
  rejecting cross-account rebind.

Apps never write `flowbond_users` / `flowbond_app_connections` directly — only via
these RPCs, only through `@flowbond/auth`.

## Conflict outcomes

- Wallet already bound elsewhere → reject with a clear error; surface "this wallet
  is linked to another FlowBond identity."
- Second provider with the same verified email → linked to the existing FBID
  (Supabase), one row preserved.
- Second provider with a different/unverified email → separate identity; user may
  later merge via explicit link (future "link while logged in" flow).
