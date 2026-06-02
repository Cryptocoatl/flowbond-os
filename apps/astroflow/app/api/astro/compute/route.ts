import { NextRequest, NextResponse } from 'next/server';
import { computeChart } from '../../../../lib/astro/chart';
import { serverClient } from '../../../../lib/supabase-server';
import type { BirthData, Visibility } from '../../../../lib/astro/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      displayName: string;
      handle?: string;
      avatarColor?: string;
      birth: BirthData;
      visibility?: Visibility;
    };
    const sb = await serverClient();

    // Bootstrap the caller's canonical FlowBondIdentity (idempotent) and resolve
    // their FBID. One identity logs into every FlowBond app.
    await sb.rpc('activate'); // → public.link_auth_or_create_identity()
    const { data: fbid } = await sb.rpc('current_fbid');
    if (!fbid) return NextResponse.json({ error: 'Not signed in to FlowBond.' }, { status: 401 });

    // AstroFlow owns its own @handle namespace (flowbond_users has none).
    // Use the chosen handle, else derive a default automatically from the
    // email local-part (e.g. cryptocoatl101@… → "cryptocoatl101"), falling back
    // to the public FBID.
    const { data: me } = await sb
      .schema('public')
      .from('flowbond_users')
      .select('flowbond_id, email')
      .eq('id', fbid)
      .single();
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 30);
    const emailLocal = me?.email ? me.email.split('@')[0] : '';
    let handle =
      (body.handle && slug(body.handle)) ||
      slug(emailLocal) ||
      slug(me?.flowbond_id ?? `fb${String(fbid).slice(0, 8)}`);
    if (!handle) return NextResponse.json({ error: 'Invalid handle.' }, { status: 400 });

    // If someone else already holds that auto-derived handle, suffix with the
    // FBID tail so the unique constraint can't block the save.
    if (!body.handle) {
      const { data: taken } = await sb
        .from('profiles')
        .select('fbid')
        .eq('handle', handle)
        .neq('fbid', fbid)
        .maybeSingle();
      if (taken) handle = slug(`${handle}_${String(fbid).slice(0, 4)}`);
    }

    // deterministic chart (degree-accurate, validated engine)
    const chart = computeChart(body.birth);

    const { error } = await sb.from('profiles').upsert({
      fbid,
      handle,
      display_name: body.displayName,
      avatar_color: body.avatarColor ?? '#9a8fe0',
      birth_date: body.birth.date,
      birth_time: body.birth.time,
      birth_tz: body.birth.tz,
      birth_lat: body.birth.lat,
      birth_lng: body.birth.lng,
      birth_place: body.birth.place,
      chart,
      visibility: body.visibility ?? 'private',
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, chart });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'compute failed' }, { status: 500 });
  }
}
