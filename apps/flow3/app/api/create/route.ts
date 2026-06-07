import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { creationCost, MODES, type CreationMode, type CreationOptions } from '@/lib/credits';

export const dynamic = 'force-dynamic';

// POST /api/create — spend FlowCredits, register a creation.
// Cost is computed server-side from the mode/options (never trusted from the
// client). Generation backends (Runway etc.) pick up 'dreaming' rows later.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  let body: { mode?: string; prompt?: string; title?: string; options?: CreationOptions };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const mode = body.mode as CreationMode;
  const prompt = body.prompt?.trim();

  if (!mode || !(mode in MODES)) {
    return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
  }
  if (!prompt || prompt.length < 3) {
    return NextResponse.json({ error: 'prompt_required' }, { status: 400 });
  }

  const cost = creationCost(mode, body.options ?? {});

  // Register the creation first so the spend can reference it.
  const { data: creation, error: insertError } = await supabase
    .from('flow3_creations')
    .insert({
      user_id: user.id,
      mode,
      prompt,
      title: body.title?.trim() || null,
      cost,
      meta: body.options ?? {},
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Atomic spend — raises insufficient_credits inside the DB if short.
  const { data: balance, error: spendError } = await supabase.rpc('fc_spend', {
    p_amount: cost,
    p_reason: `${mode}:create`,
    p_app_slug: 'flow3',
    p_ref_id: creation.id,
  });

  if (spendError) {
    // roll the creation back; the dream stays unpaid-for
    await supabase.from('flow3_creations').delete().eq('id', creation.id);
    const short = spendError.message.includes('insufficient_credits');
    return NextResponse.json(
      { error: short ? 'insufficient_credits' : spendError.message, cost },
      { status: short ? 402 : 500 },
    );
  }

  return NextResponse.json({ creation, balance, cost });
}

// GET /api/create — list the steward's creations.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: creations, error } = await supabase
    .from('flow3_creations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creations });
}
