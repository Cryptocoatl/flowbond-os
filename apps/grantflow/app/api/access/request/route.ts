import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { dbAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await dbAdmin().from('access_requests').insert({
    email: user.email,
    fbid: user.id,
    note: body?.note ?? null,
  });
  return NextResponse.json({ ok: true });
}
