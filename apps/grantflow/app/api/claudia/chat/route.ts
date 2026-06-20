import { NextRequest, NextResponse } from 'next/server';
import { chatWithClaudia, ChatTurn } from '@/lib/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const history = body?.messages as ChatTurn[] | undefined;
  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }
  // keep it bounded
  const trimmed = history.slice(-16).filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  try {
    const { reply, actions } = await chatWithClaudia(trimmed);
    return NextResponse.json({ reply, actions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ClaudIA is resting';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
