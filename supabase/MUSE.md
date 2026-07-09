# MUSE — soulbound access-pass NFTs (FlowBond Layer-0)

A **MUSE** is a non-transferable (soulbound) access credential minted to one
specific FBID. It lives entirely in the canonical Supabase project
`fgsrcxxccdjqyrpkitmk`, schema `muse`, RPC-only + RLS deny-by-default.

Migration: `supabase/migrations/007_muse_soulbound_access.sql` (applied 2026-06-27).

## The dual contract

Each MUSE carries two contracts at once:

| | Storage | Who can change it |
|---|---|---|
| **Immutable** | `immutable_terms` (jsonb, SHA-256 anchored in `immutable_hash`) **+** every grant with `locked = true` | **No one, ever.** A storage-layer trigger rejects any change. |
| **Mutable** | `mutable_terms` (jsonb) **+** every grant with `locked = false` | Governance, via `muse.amend()` / `muse.add_grant()` / `muse.revoke_grant()`. Every change is versioned (`mutable_version`), snapshotted into `muse.amendments`, and logged in the tamper-evident `muse.events` hash chain. |

**Soulbound:** `owner_fbid` is fixed at mint. There is no transfer path —
`muse.transfer()` exists only to log and reject attempts.

## Rules a MUSE can encode

- **Access grants** — `kind='access'`, `scope='app:claudia'` (or `'*'` = all). Checked by `muse.has_access(scope)`.
- **Powers** — `kind='power'`, `scope='mission:create'` (or `'*'`). Checked by `muse.has_power(power)`.
- **Locked vs unlocked** — `locked=true` puts a grant in the immutable contract (can never be revoked); `locked=false` is governance-revocable.
- **Expiry** — set `mutable_terms.expiry` to an ISO timestamp; `has_access` treats an expired MUSE as having no access.
- **Revocability** — set `immutable_terms.governance.revocable = false` to permanently forbid suspend/burn.

## Governance

Mint / amend / suspend require **governor** rights: `public.is_superadmin(fbid)`
OR membership in `muse.governors`. Genesis governor seeded =
`cryptocoatl101@gmail.com`. Add more with `select muse.add_governor('<fbid>', 'note');`.

## Minting (the cookbook)

Run as an authenticated governor (or service_role). By email:

```sql
select muse.mint_by_email(
  'someone@example.com',
  'muse-of-the-builder',                 -- unique slug
  'MUSE · The Builder',                  -- display name
  -- IMMUTABLE contract (locked forever, hashed):
  jsonb_build_object(
    'covenant', 'Founding builder of the FlowBond commons.',
    'governance', jsonb_build_object('revocable', false)
  ),
  -- MUTABLE contract (governance-amendable):
  jsonb_build_object('tier', 'founder', 'expiry', null),
  -- GRANTS:
  jsonb_build_array(
    jsonb_build_object('kind','access','scope','app:claudia',  'locked', true),  -- immutable access
    jsonb_build_object('kind','access','scope','app:flowme',   'locked', false), -- revocable access
    jsonb_build_object('kind','power', 'scope','mission:create','locked', true)
  )
);
```

Amend the mutable side later:

```sql
select muse.amend('<muse_id>', jsonb_build_object('tier','elder','expiry','2027-01-01T00:00:00Z'));
select muse.add_grant('<muse_id>','access','app:grantflow','{}'::jsonb, false);
select muse.revoke_grant('<grant_id>');   -- only works on unlocked grants
```

## Consuming the gate in an app

Server-side (service role), or client-side as the signed-in user:

```ts
// lib/muse.ts — drop into any FlowBond app
import { createClient } from '@supabase/supabase-js'

export function museClient(url: string, key: string) {
  const sb = createClient(url, key)
  return {
    /** Does the signed-in FBID hold a MUSE granting this access scope? */
    hasAccess: (scope: string, fbid?: string) =>
      sb.rpc('has_access', { p_scope: scope, ...(fbid ? { p_fbid: fbid } : {}) }, { schema: 'muse' as any })
        .then(r => r.data === true),
    hasPower: (power: string, fbid?: string) =>
      sb.rpc('has_power', { p_power: power, ...(fbid ? { p_fbid: fbid } : {}) }, { schema: 'muse' as any })
        .then(r => r.data === true),
    /** The signed-in user's own MUSEs + contracts + grants. */
    mine: () => sb.rpc('me', {}, { schema: 'muse' as any }).then(r => r.data),
    /** Public provenance/integrity check by slug. */
    verify: (slug: string) => sb.rpc('verify', { p_slug: slug }, { schema: 'muse' as any }).then(r => r.data),
  }
}
```

> Supabase JS calls schema RPCs via `.schema('muse').rpc('has_access', {...})`
> (v2): `await sb.schema('muse').rpc('has_access', { p_scope: 'app:claudia' })`.

## RPC surface

| Function | Who | Purpose |
|---|---|---|
| `muse.mint(owner_fbid, slug, name, immutable, mutable, grants)` | governor | issue a MUSE |
| `muse.mint_by_email(email, …)` | governor | same, owner looked up by email |
| `muse.amend(muse_id, patch)` | governor | merge into mutable_terms (+version) |
| `muse.add_grant / revoke_grant` | governor | mutable grants (locked ones are immutable) |
| `muse.set_status(muse_id, 'active'|'suspended'|'burned')` | governor | lifecycle (honors `revocable=false`) |
| `muse.add_governor(fbid, note)` | governor | extend the roster |
| `muse.transfer(…)` | — | always rejects (soulbound) |
| `muse.has_access(scope, fbid?)` / `muse.has_power(power, fbid?)` | authed | the gate |
| `muse.me()` | authed | caller's MUSEs |
| `muse.get(muse_id)` | owner/governor | full detail + event log |
| `muse.verify(slug)` | public | provenance + hash integrity |
