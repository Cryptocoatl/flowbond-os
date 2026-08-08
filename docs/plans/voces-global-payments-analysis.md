# Voces — borderless payments & payouts: analysis

**Date:** 2026-08-04 · **Author:** ClaudIA · **Status:** analysis, no code changes
**Goal (Steph):** let a voice in any country price in USD, get paid on a rail they
already use, and have commissions settle without friction.

---

## 1. The finding that outranks everything else

**8 of 10 published voices cannot be paid at all today.**

| country | voice | MP connected | payout methods | earnings |
|---|---|---|---|---|
| AR | Bernardo Bárcena | ✗ | **0** | 0 |
| AR | Silvio Vernier | ✗ | **0** | 0 |
| AR | Uriel Rojas | ✗ | **0** | 0 |
| CO | ALVERA (Alejandro Velásquez) | ✗ | **0** | 0 |
| CO | Diana Arias | ✗ | **0** | 0 |
| MX | Arturo Valenzuela | ✗ | **0** | 0 |
| MX | Mario Monroy | ✗ | **0** | 0 |
| PE | Laura Berríos | ✗ | **0** | 0 |
| MX | Jorge Bugallo | ✓ | 1 (paypal/MXN) | 0 |
| MX | **Mónica Salgado** | ✓ | 3 (dolarapp, usdc, bank_intl) | $158.40 |

Every one of these profiles is `published` — publicly listed and sellable. If a
buyer purchases from any of the eight tonight, **the money has nowhere to go.**
The ledger reconciliation came back clean partly because this hasn't been tested
by real volume yet ([incident report](../incidents/2026-08-vpa-quota-outage.md)).

This is not an FX problem. `app_vpa_fx_rates` already carries **166 currencies**
refreshed daily — ARS, COP, CLP, PEN, UYU, BOB, PYG, BRL and the rest are all
present. Conversion is solved. **Onboarding and rails are not.**

## 2. The structural constraint nobody can code around

**Mercado Pago Marketplace is country-siloed.** An MP application registered in
Mexico can only onboard Mexican sellers. Both currently-connected sellers
(`2043708480`, `199897979`) are Mexican, and that is not a coincidence.

So for the six non-Mexican voices (3 AR, 2 CO, 1 PE), split-at-capture through the
existing Mexican MP marketplace is **structurally impossible** — not misconfigured.
Options are: register a separate MP application per country (MP operates in AR, BR,
CL, CO, MX, PE, UY), or stop relying on MP split for them.

That single fact forces the architectural decision in §4.

## 3. What each rail can actually do today

Nine rail kinds exist in `PO_FIELDS`. Their real status:

| rail | automatable now? | reality |
|---|---|---|
| `mercadopago` | ✅ yes | split at capture, **MX sellers only** (§2) |
| `clabe` (SPEI) | manual | MX only. Instant, free, no FX — best MX rail |
| `dolarapp` | manual | Mónica's account live; MX-centric, USD/USDC bridge |
| `usdc` | ✅ verifiable on-chain | **works in every country**; Base/Polygon/ETH/Arbitrum/Optimism. ⚠️ USDC only — a USDT-Tron transfer to an EVM address loses the money |
| `payoneer` | ❌ no | Mass Payout API requires an **approved partnership**. Receiving accounts (USD/EUR/GBP) work manually |
| `paypal` | ❌ no credentials | API exists, we have no keys. Poor/absent in AR |
| `wise` | ❌ no credentials | strong for EUR/GBP/USD; limited LatAm payout |
| `bank_intl` | manual | works anywhere via SWIFT; ~$3 USD/transfer + FX spread |
| `credit` | n/a | internal platform credit, not money out |

**Net: zero rails are automated for anyone except MP split to Mexican sellers.**
Every other payout today is Mónica performing a manual transfer and marking it paid.

## 4. The decision that defines the architecture

There are two ways money can flow, and they are not equivalent:

**A — Split at capture (today, MX only).** Buyer pays; the processor splits at
capture; the voice's share never touches a FlowBond account. **Voces has no
custody.** This is a legal/tax boundary in Mexico, not a preference — it keeps
Voces out of being a payment intermediary.

**B — Collect centrally, then pay out (required for borderless).** Buyer pays into
a platform account; Voces holds the money; Voces pays the voice later. This works
in every country **and it means Voces takes custody of other people's money.**

That is the real cost of going borderless, and it should be a conscious decision,
not a side effect:

- Mexico: holding and forwarding third-party funds pushes toward payment-aggregator
  territory; CFDI/IVA obligations attach to what flows through the account.
- The float becomes a liability on the books, not revenue.
- Chargebacks and refunds land on the platform, not the voice.

**Recommendation: don't pick one. Keep A wherever it works and add B only where A
cannot reach** — and put B under the US entity (§6) rather than the Mexican one.

## 5. Country strategy, in order of effort

**Tier 1 — works today, zero new partners**
- **MX**: MP split (A) + SPEI/CLABE for anything manual. Already proven.
- **Anywhere, USD-denominated**: **USDC**. Already implemented and on-chain
  verifiable. This is the honest answer to "borderless today" — one rail, every
  country, no partner needed. Cost: the voice needs a wallet and an off-ramp, and
  it is the least familiar option for a coach who just wants pesos.

**Tier 2 — one integration each, meaningful coverage**
- **Separate MP applications for AR, CO, PE** (and CL/UY/BR later). Keeps model A
  and its no-custody property, in the three countries where our voices actually
  are. Cost: per-country registration, one OAuth app each, per-country tax
  registration questions. **Highest value per unit of work given the current roster
  is 3 AR + 2 CO + 1 PE.**
- **dLocal or EBANX** — built exactly for this: one integration, payouts across
  LatAm in local currency. Both require a commercial agreement and KYB; both prefer
  a US or EU entity as counterparty. This is the "one partner solves LatAm" path.

**Tier 3 — needs the US entity first**
- **Wise Platform** / **Payoneer Mass Payout** / **Stripe Connect**: all far easier
  to obtain as a US company, and all give real multi-currency payout APIs.
- **Stripe Connect** deserves particular attention: it would unify subscriptions
  (already Stripe) *and* marketplace split, replacing MP for non-MX countries — but
  Stripe Connect cross-border payouts are restricted by country and **AR/CO/PE
  recipients are largely not supported**, which is precisely our roster. Verify
  before betting on it.

**Country-specific frictions that will not go away**
- **Argentina**: FX controls. Paying ARS to an Argentine at a usable rate is hard;
  this is exactly why USDC is popular there. Our 3 AR voices are the hardest case.
- **Colombia**: inbound FX requires registration for larger flows; COP payouts via
  dLocal/EBANX are routine.
- **Peru**: relatively open; PEN payouts straightforward via aggregators.

## 6. What the US entity actually unlocks

Not "global payments" by itself — but it changes who will do business with us:

1. **Counterparty eligibility.** dLocal, EBANX, Wise Platform, Payoneer partnerships
   and Stripe Connect platform accounts are dramatically more accessible to a US
   (usually Delaware) entity than a Mexican one.
2. **USD as the settlement currency**, matching the USD-canonical pricing decision.
3. **A clean place to put model B.** Custody and float sit in the US entity; the
   Mexican entity keeps the no-custody MP split and its simpler tax position.
4. **Banking**: a US business account (Mercury/Brex-class) plus USD rails.

It does **not** solve: Mexican CFDI for Mexican buyers, Argentine FX controls, or
per-country KYB on the voice side.

## 7. Recommended sequence

1. **Stop the bleeding — this week, no new infrastructure.** Eight published voices
   have no payout method. Require a payout method before a profile can be published,
   or at minimum surface a loud admin warning. Selling with no way to pay the seller
   is the actual live risk.
2. **Make USDC the universal fallback.** Already built and verifiable. Offer it to
   the AR/CO/PE voices now, with the USDC-not-USDT warning made unmissable.
3. **Register MP applications for AR, CO, PE.** Preserves no-custody, covers the
   whole current roster, no partner negotiation.
4. **Open the dLocal/EBANX conversation in parallel** — long lead time, so start it
   before it is blocking.
5. **Then** the US entity, and revisit Wise/Payoneer/Stripe Connect with real quotes.
6. **Automate last.** Manual payouts at this volume (one voice with $158.40) are
   correct. Do not write money-moving code against an API we cannot test — the
   Payoneer and PayPal integrations are already parked for exactly that reason.

## 8. Honest gaps in this analysis

- Provider availability, pricing and country matrices change; every §5 Tier 2/3 claim
  needs current confirmation from the provider before commitment.
- No tax opinion here. CFDI, IVA on subscriptions, and whether model B triggers
  Mexican payment-aggregator obligations need a real accountant — flagged, not answered.
- Voice-side KYC/KYB burden per country is not estimated.
- Refund and chargeback flows under model B are undesigned.

## 9. The one thing to decide first

**Does Voces accept custody of voices' money (model B), or stay no-custody (model A)
and pay the cost of per-country MP registrations?**

Everything else follows from that. My recommendation: stay model A in Mexico
permanently, add per-country MP for AR/CO/PE next, and reserve model B for the US
entity once it exists — so custody never lands on the Mexican entity.
