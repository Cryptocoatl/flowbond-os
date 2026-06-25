import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../../lib/supabase-server';
import { STRIPE_PRICE, type PaidTier } from '../../../../lib/safeflow/plans';

// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · checkout  (/api/safeflow/checkout)
//
//  Starts a Stripe Checkout subscription for the authed FBID and returns the
//  hosted-checkout URL. No Stripe SDK — a plain REST call (disk-free). The
//  FBID rides as client_reference_id so the webhook can set the right tier.
//
//  Body: { tier: 'plus' | 'pro', returnPath?: string }
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'billing-unconfigured' }, { status: 503 });

  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth-required' }, { status: 401 });

  let tier: PaidTier;
  let returnPath = '/';
  try {
    const body = await req.json();
    tier = body?.tier === 'pro' ? 'pro' : 'plus';
    if (typeof body?.returnPath === 'string') returnPath = body.returnPath;
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const price = STRIPE_PRICE[tier];
  if (!price) return NextResponse.json({ error: 'price-unconfigured' }, { status: 503 });

  const origin = req.nextUrl.origin;
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,            // = FBID; the webhook reads this
    'metadata[fbid]': user.id,
    'metadata[tier]': tier,
    success_url: `${origin}${returnPath}?safeflow=success`,
    cancel_url: `${origin}${returnPath}?safeflow=cancel`,
    allow_promotion_codes: 'true',
  });

  try {
    const res = await fetch(STRIPE_API, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      return NextResponse.json({ error: 'checkout-failed' }, { status: 502 });
    }
    return NextResponse.json({ url: data.url });
  } catch {
    return NextResponse.json({ error: 'checkout-failed' }, { status: 502 });
  }
}
