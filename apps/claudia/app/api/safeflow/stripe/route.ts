import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { tierForPrice, isActiveStatus } from '../../../../lib/safeflow/plans';
import type { Tier } from '../../../../lib/claudia/tiers';

// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · Stripe webhook  (/api/safeflow/stripe)
//
//  Keeps flowbond_entitlements in sync with subscriptions — the plug-and-play
//  billing loop. The signature is verified with Node crypto (no Stripe SDK).
//  Entitlements are authz metadata (NOT ZK content), written with the service
//  role AFTER signature verification. §0 is unaffected — no ciphertext here.
//
//  Configure in Stripe: endpoint → this URL; events: checkout.session.completed,
//  customer.subscription.updated, customer.subscription.deleted.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function verifyStripe(payload: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const p of sigHeader.split(',')) {
    const i = p.indexOf('=');
    if (i > 0) { const k = p.slice(0, i); if (!(k in parts)) parts[k] = p.slice(i + 1); }
  }
  const t = parts['t']; const v1 = parts['v1'];
  if (!t || !v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  return Math.abs(Math.floor(Date.now() / 1000) - Number(t)) <= 300; // 5-min tolerance
}

// Loose schema type: these billing tables aren't in the generated DB types yet,
// so the default client narrows their rows to `never`. `any` schema keeps the
// service-role writes compiling until types are regenerated. (No ESLint gate.)
type AdminClient = SupabaseClient<any, 'public', any>;

async function applyTier(sb: AdminClient, p: {
  userId: string; tier: Tier; customerId: string | null; subscriptionId: string | null;
  plan: string | null; status: string | null; periodEnd: string | null;
}) {
  await sb.from('flowbond_billing_accounts').upsert({
    user_id: p.userId, provider: 'stripe', customer_id: p.customerId, subscription_id: p.subscriptionId,
    plan: p.plan, tier: p.tier, status: p.status, current_period_end: p.periodEnd, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' });

  await sb.from('flowbond_entitlements').upsert({
    user_id: p.userId, app_slug: '*', tier: p.tier, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,app_slug' });
}

async function userForCustomer(sb: AdminClient, customerId: string): Promise<string | null> {
  const { data } = await sb.from('flowbond_billing_accounts')
    .select('user_id').eq('provider', 'stripe').eq('customer_id', customerId).maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !SERVICE_KEY) return NextResponse.json({ error: 'billing-unconfigured' }, { status: 503 });

  const payload = await req.text(); // raw body required for signature
  if (!verifyStripe(payload, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'bad-signature' }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: 'bad-request' }, { status: 400 }); }

  const sb = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
  const obj = event.data.object as Record<string, unknown>;

  try {
    if (event.type === 'checkout.session.completed') {
      const userId = (obj.client_reference_id as string) || ((obj.metadata as Record<string, string>)?.fbid ?? '');
      const tier = ((obj.metadata as Record<string, string>)?.tier as Tier) || 'plus';
      if (userId) {
        await applyTier(sb, {
          userId, tier, customerId: (obj.customer as string) ?? null,
          subscriptionId: (obj.subscription as string) ?? null, plan: null, status: 'active', periodEnd: null,
        });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const customerId = obj.customer as string;
      const userId = customerId ? await userForCustomer(sb, customerId) : null;
      if (userId) {
        const status = obj.status as string;
        const items = (obj.items as { data?: { price?: { id?: string } }[] })?.data ?? [];
        const priceId = items[0]?.price?.id ?? null;
        const deleted = event.type === 'customer.subscription.deleted';
        const tier: Tier = deleted || !isActiveStatus(status) ? 'free' : (tierForPrice(priceId) ?? 'free');
        const periodEnd = obj.current_period_end ? new Date((obj.current_period_end as number) * 1000).toISOString() : null;
        await applyTier(sb, {
          userId, tier, customerId, subscriptionId: (obj.id as string) ?? null,
          plan: priceId, status: deleted ? 'canceled' : status, periodEnd,
        });
      }
    }
    // Other events are acknowledged and ignored.
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'handler-failed' }, { status: 500 });
  }
}
