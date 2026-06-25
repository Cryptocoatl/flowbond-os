# SafeFlow — plug-and-play runbook

ClaudIA's embeddable, tier-gated, zero-knowledge chat + AI assist for any
FlowBond site. This is the turnkey checklist to take it live.

> §0 invariant is preserved end-to-end: meeting transcription is on-device;
> chat/recaps/rooms are encrypted under per-room keys; the server only ever
> holds ciphertext + per-member wrapped keys. Entitlements and billing are
> **authz metadata**, never content — they do not weaken §0.

---

## 1. Apply the migrations (DRY-RUN first)

Apply to a Supabase **dev branch** off the canonical project
`fgsrcxxccdjqyrpkitmk`, validate, then merge. **Order matters:**

| # | File | Adds |
|---|------|------|
| 0002 | `0002_flowbond_grants.sql` | admin grant spine (`is_superadmin`, grants) |
| 0003 | `0003_claudia_meetings.sql` | meetings + transcript segments + notes |
| 0004 | `0004_claudia_group.sql` | identity keypairs + rooms + per-member keys |
| 0005 | `0005_claudia_room_content.sql` | shared recap (encrypted under room key) |
| 0006 | `0006_claudia_room_chat.sql` | room chat + invite links |
| 0007 | `0007_flowbond_entitlements.sql` | tiers (free/plus/pro) + entitlement RPCs |
| 0008 | `0008_flowbond_billing.sql` | billing accounts (customer → FBID → tier) |

0007 depends on 0002 (`is_superadmin`). 0008 depends on 0007.

## 2. Environment variables (Vercel project `claudia`)

```
NEXT_PUBLIC_SUPABASE_URL=...           # already set
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # already set
ANTHROPIC_API_KEY=...                  # already set (Commercial Terms + ZDR)
CLAUDIA_MODEL=claude-sonnet-4-6
CLAUDIA_MODEL_PRO=claude-opus-4-8      # optional: Pro tier model

# SafeFlow billing (optional — leave blank to set tiers manually)
SUPABASE_SERVICE_ROLE_KEY=...          # webhook writes tier metadata (never ciphertext)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from the webhook endpoint in step 4
STRIPE_PRICE_PLUS=price_...            # Stripe price that grants Plus
STRIPE_PRICE_PRO=price_...             # Stripe price that grants Pro
```

## 3. Become superadmin + set your own tier

After 0007 is live, the relays tier-gate. Set yourself up so your own
meetings synthesis isn't blocked:

1. In ClaudIA chat (claudiaflow.life), run `/admin init` → claims root
   superadmin (locked to `cryptocoatl101@gmail.com`).
2. Set your tier to Pro:
   ```sql
   select claudia_set_entitlement('<your-fbid>', '*', 'pro');
   ```
   (Or for any user / any app slug. `'*'` = account-wide.)

> Enforcement **fails open on tier** until 0007 is applied — so deploying the
> code before applying the migration never breaks live features. Auth is always
> required (closes the open-relay abuse vector).

## 4. Wire Stripe billing (optional, plug-and-play)

1. Create two recurring **Prices** in Stripe (Plus, Pro). Put their ids in
   `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_PRO`.
2. Add a webhook endpoint → `https://claudiaflow.life/api/safeflow/stripe`,
   subscribed to: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Done. `/safeflow` "Mejorar a Plus/Pro" buttons start checkout
   (`/api/safeflow/checkout`); on payment the webhook writes the tier. The
   signature is verified with Node crypto — **no Stripe SDK** (no new deps).

> Mexico / Mercado Pago: same shape (a second handler) — not yet wired. The
> entitlement write path (`flowbond_entitlements` via service role) is provider-
> agnostic, so MP only needs its own verified webhook route.

## 5. Embed on any site

```html
<script src="https://claudiaflow.life/safeflow.js" defer></script>
<safeflow-chat app="your-app" height="560"></safeflow-chat>
```

The widget is an **iframe** to `claudiaflow.life/embed` — keys, crypto, and the
FBID session stay in ClaudIA's origin, isolated from the host page. See a live
demo + the tier ladder at **`/safeflow`**.

> Safari/ITP: a third-party iframe may need the Storage Access API for its
> session cookie. Follow-up; the first-party app is unaffected.

## 6. Deploy

From the worktree root (per the confirmed recipe):

```
cd ~/Projects/flowbond-claudia
VERCEL_ORG_ID=team_qyOCVOtlgqRZGGgmo5D1fl2j \
VERCEL_PROJECT_ID=prj_puEWXcbX3itCjoXoxsByHLLSzGYc \
vercel --prod --yes
```

## Surfaces added

| Route | What |
|-------|------|
| `/embed` | the iframe chat surface (tier badge, blind relay) |
| `/safeflow` | plug-and-play landing: snippet, live demo, tiers, upgrade |
| `/invite/[token]` | redeem a room invite link |
| `/api/claudia/relay` | chat relay — **auth-gated**, Pro-tier model |
| `/api/claudia/notes` | notes synthesis — **Plus+ gated** |
| `/api/safeflow/checkout` | start Stripe checkout (authed) |
| `/api/safeflow/stripe` | Stripe webhook → entitlements |
| `/safeflow.js` | the `<safeflow-chat>` web component |
