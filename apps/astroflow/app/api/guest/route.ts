import { NextRequest, NextResponse } from 'next/server';
import { computeChart } from '../../../lib/astro/chart';
import { serverClient } from '../../../lib/supabase-server';
import type { BirthData } from '../../../lib/astro/types';

// Guests: people in a collective chart without a FlowBond profile. The map
// owner supplies their birth data; we compute the chart server-side (same
// validated engine as profiles) and hand back a personalized claim link.
export async function POST(req: NextRequest) {
  try {
    const { mapId, displayName, birth, avatarColor } = (await req.json()) as {
      mapId: string;
      displayName: string;
      birth: BirthData;
      avatarColor?: string;
    };
    if (!mapId || !displayName?.trim() || !birth?.date || !birth?.tz)
      return NextResponse.json({ error: 'Need a map, a name and birth data.' }, { status: 400 });

    const chart = computeChart(birth);

    const sb = await serverClient();
    const { data, error } = await sb.rpc('add_guest', {
      map_id: mapId,
      guest_name: displayName.trim(),
      bdate: birth.date,
      btime: birth.time ?? null,
      btz: birth.tz,
      blat: birth.lat,
      blng: birth.lng,
      bplace: birth.place,
      chart_json: chart,
      color: avatarColor ?? '#8fb8e0',
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, guestId: row.guest_id, claimCode: row.claim_code });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}

// Personalized-invite lookup (claim_code is the bearer secret): used by the
// /claim landing and to prefill the signup form with the guest's birth data.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
  const sb = await serverClient();
  const { data, error } = await sb.rpc('guest_invite', { code });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  return NextResponse.json(data);
}
