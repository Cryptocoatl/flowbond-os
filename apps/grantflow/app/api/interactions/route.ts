import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-server';
import { INTERACTION_KINDS } from '@/lib/types';

import { requireAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const deny = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });

const FIELDS = [
  'kind', 'actor', 'model', 'direction', 'channel', 'summary', 'body',
  'contact_id', 'grant_id', 'application_id', 'project_slug', 'occurred_at',
];

// Log a touchpoint — human, ClaudIA, or model-driven.
export async function POST(req: NextRequest) {
  if (!(await requireAccess())) return deny();
  const body = await req.json().catch(() => null);
  if (!body?.summary) return NextResponse.json({ error: 'summary required' }, { status: 400 });
  const kind = INTERACTION_KINDS.includes(body.kind) ? body.kind : 'note';
  const row: Record<string, unknown> = { kind };
  for (const f of FIELDS) if (f in body && f !== 'kind') row[f] = body[f];

  const admin = dbAdmin();
  const { data, error } = await admin.from('interactions').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the contact's last_contacted_at fresh for outward touches.
  if (body.contact_id && kind !== 'note' && body.direction !== 'in') {
    await admin
      .from('contacts')
      .update({ last_contacted_at: row.occurred_at ?? new Date().toISOString() })
      .eq('id', body.contact_id);
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAccess())) return deny();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await dbAdmin().from('interactions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
