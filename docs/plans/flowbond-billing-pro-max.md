# FlowBond Pro / Max — cross-app billing plan

**Status:** design approved (hybrid model), **not started** — blocked on two things (§7).
**Decision (Steph, 2026-08-02):** hybrid — per-app Pro/Max **plus** an All-Access bundle.
**Scope:** ops, astroflow, flowgarden, flowstudio, flowchords, + future apps.
**Out of scope:** Voces. It keeps Mónica's own Stripe account (`acct_1Sc6qXHueYQPvUdf`,
`rk_live_`) and its own `app_vpa_*` rails. Nothing here touches it.

---

## 1. What already exists

The spine is written but **never applied to the canonical DB** (`fgsrcxxccdjqyrpkitmk`):

| Object | File | Live? |
|---|---|---|
| `flowbond_entitlements` | `apps/claudia/supabase/migrations/0007_flowbond_entitlements.sql` | ❌ not applied |
| `flowbond_billing_accounts` | `apps/claudia/supabase/migrations/0008_flowbond_billing.sql` | ❌ not applied |
| `flowbond_users` | (earlier) | ✅ 143 rows |

Both are already Pattern A: FK to `flowbond_users`, RLS on, SECURITY DEFINER RPCs,
per-app `app_slug` with `'*'` meaning account-wide. The design is sound — it needs three
corrections before it is applied, not a rewrite.

## 2. Three corrections before applying

**2.1 — Entitlement resolution is wrong for hybrid (blocking).**
`claudia_my_entitlement()` returns the per-app row if one exists, and only falls back to
`'*'`. Under hybrid, a user holding **All-Access Max** *and* a legacy **Ops Pro** row gets
`pro` on ops — the narrower row shadows the better bundle. Silent downgrade of a paying
customer.

Replace with a **rank-max** resolution over both rows:

```
rank: free=0 < pro=1 < max=2
effective(app) = argmax(rank) over { row(app_slug = app), row(app_slug = '*') }
                 filtered by (expires_at is null or expires_at > now())
features       = union of the winning rows' features
```

Return the winning tier plus the `app_slug` it came from, so the UI can say
"via All Access" vs "Ops Pro".

**2.2 — Tier vocabulary.** Both tables `check (tier in ('free','plus','pro'))` and
`claudia_set_entitlement` rejects anything else. The product is **free / pro / max**.
Since neither table is applied yet, edit `0007`/`0008` in place — no `ALTER` needed, no
data to migrate.

**2.3 — The webhook needs a system path.** `claudia_set_entitlement` gates on
`is_superadmin()` and reads `auth.uid()`. A Stripe webhook has no user context, so it can
never call it. Add a `..._by_system` RPC in the same style Voces already uses
(`vpa__order_paid_by_system`), callable only with the service role, that takes the Stripe
customer/subscription ids and writes the entitlement. Keep the superadmin RPC for manual
comps.

## 3. Stripe catalog

One FlowBond Stripe account. **Product per (app, tier)**, plus the bundle:

```
Ops Pro · Ops Max · AstroFlow Pro · AstroFlow Max · … · All Access Pro · All Access Max
```

Each product carries a monthly and an annual Price. **Every Price carries metadata:**

```
app_slug = "ops" | "astroflow" | … | "*"
tier     = "pro" | "max"
interval = "month" | "year"
```

This metadata is the contract. The webhook reads `app_slug`/`tier` off the price and
writes the matching entitlement — so **no price IDs are hardcoded in app code**, and
adding an app is a dashboard action plus a row in the app registry, not a deploy.

## 4. Checkout — server-authoritative

The client sends only `(app_slug, tier, interval)`. The server resolves that to a Price ID
and creates the Checkout Session. **No amount ever crosses from the client.** Same rule
that governs the Voces rails; the failure mode it prevents is a client posting its own
price.

## 5. Webhook — apply the Voces lesson

The Voces quota outage took the webhook *endpoint* down with the database, because the
handler is a Supabase Edge Function. Do not repeat that here.

- **Ingest — Cloudflare Worker.** Verify the Stripe signature (`Stripe-Signature`,
  constant-time), persist the raw event, return 200. Must not depend on Supabase being
  reachable.
- **Buffer — Cloudflare Queues.** Durable, at-least-once, survives a Supabase outage.
- **Process — async consumer.** Validate → resolve price metadata → write entitlement →
  retry with backoff → dead-letter after exhausting retries, with an alert.
- **Idempotency — at the database.** `unique (stripe_event_id)` on the processed-events
  table, not an application-level check. At-least-once delivery *will* redeliver; replaying
  one event a hundred times must produce exactly one entitlement change.

Events to handle: `checkout.session.completed`,
`customer.subscription.created|updated|deleted`, `invoice.payment_failed`.
Downgrade on `deleted` and on terminal dunning — not on the first failed payment.

## 6. Per-app gate

Each app calls `claudia_my_entitlement('<app_slug>')` and gates on the returned tier.
One helper per stack (Next.js hook, static-page fetch) rather than each app rolling its
own. Server-side enforcement for anything that costs money to serve — an entitlement
checked only in the browser is decoration.

## 7. Blockers

1. **No working Stripe key.** The vaulted `flowbond/STRIPE_SECRET_KEY` is
   `sk_org_live_…V30c` — a Stripe **Organizations** key, and Stripe rejects it outright
   (`Invalid API Key`). Organization keys manage accounts; they cannot create prices or
   subscriptions. Needed: an account-level **restricted key** on the FlowBond account with
   write on Products, Prices, Customers, Subscriptions, Checkout Sessions and read on
   Webhook endpoints → overwrite the vault entry.
   *Also confirm a FlowBond account actually exists under that org — if the org only holds
   Mónica's account, there is nothing to issue a key against.*
2. **No DDL.** The Supabase MCP connector followed the old Vercel org through the project
   transfer and has no access to the paid org. Migrations `0007`/`0008` cannot be applied
   until it is reconnected.

## 8. Open — needs Steph

- **Prices per app and per tier**, monthly and annual. Nothing can be created in Stripe
  without these numbers.
- **All-Access price** — must be below the sum of individual plans or the bundle has no pull.
- **Currency.** MXN, USD, or both. Affects whether one Price serves everyone.
- **Mexican tax.** IVA and CFDI invoicing for subscription revenue — Stripe Tax handles
  IVA but **not** CFDI. If customers need facturas, that is a separate integration and it
  is easier to decide now than after the first billing cycle.
- **Trials and proration.** Free trial on Pro? Upgrade mid-cycle prorated or at renewal?

## 9. Order of work

1. Unblock: working Stripe key + MCP reconnect.
2. Fix and apply `0007`/`0008` (rank-max resolution, free/pro/max, system RPC) —
   dry-run under `BEGIN … ROLLBACK` first.
3. Build the CF Worker ingest + Queue + processor; test signature rejection and replay
   idempotency before any real key is wired.
4. Pilot on **one** app — `ops` is the candidate, it is furthest along and already has
   SaaS pricing pending. Prove the full loop: checkout → webhook → entitlement → gate.
5. Roll out per app, one at a time, reusing the gate helper.
6. Add All-Access last, once per-app works — it is the case that exercises the precedence
   rule from §2.1.
