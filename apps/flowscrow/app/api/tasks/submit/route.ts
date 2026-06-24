import { NextResponse, type NextRequest } from 'next/server';
import { authClient } from '@/lib/supabase/server';

// Responsible party marks a task delivered. Role + state enforced in the RPC.
export async function POST(req: NextRequest) {
  const { taskId } = await req.json().catch(() => ({}));
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  const sb = await authClient();
  const { data, error } = await sb.rpc('flowscrow_submit_task', { p_task: taskId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, task: data });
}
