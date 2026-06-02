import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase-server';

// Save a collective "flow map" (a named combination of FBIDs in a relationship
// context). RLS requires owner_fbid = current_fbid(), so we set it server-side.
export async function POST(req: NextRequest) {
  try {
    const { name, memberFbids, context } = (await req.json()) as {
      name: string;
      memberFbids: string[];
      context?: string;
    };
    if (!name?.trim() || !Array.isArray(memberFbids) || memberFbids.length < 2)
      return NextResponse.json({ error: 'Need a name and at least two people.' }, { status: 400 });

    const sb = await serverClient();
    await sb.rpc('activate');
    const { data: fbid } = await sb.rpc('current_fbid');
    if (!fbid) return NextResponse.json({ error: 'Not signed in to FlowBond.' }, { status: 401 });

    const { data, error } = await sb
      .from('flow_maps')
      .insert({
        owner_fbid: fbid,
        name: name.trim(),
        member_fbids: memberFbids,
        context: context ?? 'friendship',
      })
      .select('id')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}
