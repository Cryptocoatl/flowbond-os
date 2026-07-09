import { NextRequest, NextResponse } from 'next/server';
import { authClient, dbAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// FlowBond XP bridge. A completed (or org-verified) banoseco mission mints a
// cross-app contribution into the shared FlowCredits ledger via fc_earn, so the
// guardian's real-world work counts in their FlowBond passport — while oro/xp
// stay local to the game.
//
// Idempotency is enforced two ways: the missions.bridged_at marker AND a lookup
// in flowcredits_ledger by ref_id (fc_earn itself does not dedupe). The mint is
// gated server-side: the mission must belong to THIS user and be done/verified.
const BRIDGE_RATIO = Number(process.env.BANOSECO_BRIDGE_RATIO ?? '1'); // oro → credits

export async function POST(req: NextRequest) {
  const sb = await authClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { missionId } = (await req.json().catch(() => ({}))) as { missionId?: string };
  if (!missionId) return NextResponse.json({ error: 'missionId required' }, { status: 400 });

  // Read the mission under the user's own session (RLS): confirm ownership/state.
  const { data: m } = await sb
    .from('banoseco_missions')
    .select('id,guardian_id,status,reward_oro,bridged_at')
    .eq('id', missionId)
    .maybeSingle();

  if (!m) return NextResponse.json({ error: 'mission_not_found' }, { status: 404 });
  if (m.guardian_id !== user.id)
    return NextResponse.json({ error: 'not_your_mission' }, { status: 403 });
  if (!['done', 'verified'].includes(m.status))
    return NextResponse.json({ error: 'mission_not_complete' }, { status: 409 });
  if (m.bridged_at) return NextResponse.json({ bridged: true, alreadyBridged: true });

  const amount = Math.max(1, Math.round((m.reward_oro ?? 0) * BRIDGE_RATIO));

  const admin = dbAdmin();

  // Second idempotency guard: did we already mint for this mission?
  const { data: existing } = await admin
    .from('flowcredits_ledger')
    .select('id')
    .eq('app_slug', 'banoseco')
    .eq('ref_id', missionId)
    .limit(1);
  if (existing && existing.length > 0) {
    await admin.from('banoseco_missions').update({ bridged_at: new Date().toISOString() }).eq('id', missionId);
    return NextResponse.json({ bridged: true, alreadyBridged: true });
  }

  const { data: balance, error } = await admin.rpc('fc_earn', {
    p_user_id: user.id,
    p_amount: amount,
    p_reason: 'banoseco:mission',
    p_app_slug: 'banoseco',
    p_kind: 'earn',
    p_ref_id: missionId,
  });
  if (error) return NextResponse.json({ error: 'mint_failed', detail: error.message }, { status: 500 });

  await admin.from('banoseco_missions').update({ bridged_at: new Date().toISOString() }).eq('id', missionId);

  return NextResponse.json({ bridged: true, amount, flowcredits_balance: balance });
}
