# Incident — Supabase quota outage & VPA payment reconciliation

**Date of report:** 2026-08-02
**Project:** Voces para el Alma (`app_vpa_*` on `fgsrcxxccdjqyrpkitmk`)
**Reconciliation verdict:** ✅ **No money was lost. The ledger is correct.**

---

## 1. What happened

The Supabase organization `vercel_icfg_QXxwMFTp2JxN6i1MNufY8jYL` (Vercel Marketplace-managed,
free tier) exceeded its storage quota and requests to its projects were dropped. The canonical
project `fgsrcxxccdjqyrpkitmk` was still in that org.

Because **every VPA edge handler is a Supabase Edge Function** — there is no Cloudflare Worker
in front — the outage took down the **webhook endpoint itself**, not merely its database
writes. Mercado Pago retries a failing endpoint on a finite schedule and then abandons it, so
the concern was payments settled at MP that never reached our ledger.

**Resolved:** the project was transferred to the paid Supabase-managed org on 2026-08-02.
Ref, host and region unchanged. The four sibling projects remain `INACTIVE` in the old org
(separate cleanup; untouched).

## 2. Method

Rather than infer an outage window and check only inside it, the reconciliation covers
**every Mercado Pago payment from 2026-07-01 to 2026-08-03** — which fully brackets the entire
order history (first order `2026-07-13T02:18:50`, last `2026-07-31T19:10:24`). The window
question is therefore moot: nothing was sampled, everything was compared.

**Coverage was verified, not assumed.** `app_vpa_mp_connections` holds exactly **2** connected
seller accounts; the reconciliation queried the platform token **plus both** connected tokens —
3 of 3. There is no seller account whose payments we could not see. Both connection tokens are
valid (expiring 2027-01-17 and 2027-01-27), so no coach was silently dropping payments through
an expired token either.

Script: `reconcile.py` (see §7). Read-only; nothing was written.

## 3. Results

**Local ledger — `app_vpa_order_groups`, 26 rows**

| status | count |
|---|---|
| `canceled` | 14 |
| `awaiting_payment` | 10 |
| `paid` | 2 |

(9 of the 26 are `is_test = true`.)

**Mercado Pago — 7 payments in window**

| status | count |
|---|---|
| `cancelled` | 3 |
| `rejected` | 2 |
| `approved` | 2 |

**The four buckets**

| bucket | count | meaning |
|---|---|---|
| **MISSING** | **0** | nothing settled at MP is absent from our ledger |
| **STALE** | **0** | no status diverges from MP |
| **ORPHANED** | **0** | no local `paid` row lacks an MP counterpart |
| **MATCHED** | **2** | both approved payments correctly recorded as `paid` |

The two approved payments:

```
MP 169014282591  approved  88 MXN  2026-07-21T16:14:15  ours=paid  cryptocoatl101@gmail.com
MP 169678422907  approved  88 MXN  2026-07-25T19:05:34  ours=paid  estebanmsalgado@gmail.com
```

Five MP records did not match a local row — 2 `rejected` and 3 `cancelled`. **None involved
money moving.** Rejected and cancelled payments are correctly absent from the ledger.

## 4. Interpretation — read this before relaxing

The clean result is real, but it is partly clean **because there were almost no external
buyers in the window.** Both approved payments are internal: Steph's own account and Esteban
(Tevo) Salgado's. Total settled revenue across the entire history of the store is **176 MXN**,
all of it internal testing. This matches the standing note that the payable balance is $0
because everything sold went through MercadoPago `auto_split`.

So: **no buyer was charged without receiving their order, and no coach is owed money.** But
the outage was survived largely by having had no real traffic to lose. The structural fault
that made loss possible is still present (§6).

The 10 `awaiting_payment` rows are **abandoned checkouts**, not lost payments — none of them
appears at Mercado Pago in any state. No follow-up is owed on them.

## 5. Buyers/coaches needing human follow-up from Mónica

**None.** No missing payment, no divergent status, no orphaned record, no owed payout.

## 6. Root cause still open

The reconciliation is clean; the **architecture that allowed the risk is unchanged**:

1. **Webhook ingest is coupled to Supabase.** `vpa-mp-webhook` is a Supabase Edge Function, so
   any Supabase outage takes the endpoint down, not just the write. Buffering inside Supabase
   cannot fix this — ingest has to move to a Cloudflare Worker (verify → persist raw → 200)
   with Queues and an async processor.
2. **No signature verification.** `vpa-mp-webhook/index.ts` performs no HMAC check at all.
   It mitigates deliberately (`index.ts:1-3`) by ignoring the request body and re-querying the
   payment from MP with our own token before acting, so a forged POST cannot mark an order
   paid. Severity **medium**, not critical — but the endpoint is still unauthenticated and can
   be induced to burn MP API calls.
3. **No replay tooling.** This reconciliation was written from scratch. It should become a
   command so the next incident is a five-minute check.

## 7. Minor anomaly

Three `cancelled` MP payments of 88 MXN were created within the same second
(`2026-07-25T15:56:01/02/03`) with **no `external_reference`**. No money moved, but three
preferences generated in one second with no order reference suggests a duplicate
preference-creation path worth a look.

## 8. Artifacts

- Reconciliation script: `scratchpad/reconcile.py` — should be promoted to a repo command
  (`§6.3`). Read-only, prints no tokens, re-runnable over any date range.
- Cross-project key audit: `~/.claudia/tools/supabase-ref-audit.py`.
