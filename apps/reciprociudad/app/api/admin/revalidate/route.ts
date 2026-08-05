import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

/**
 * Push a just-saved edit to the live page immediately.
 *
 * The caller sends their own Supabase access token; we verify it and confirm
 * the DB still considers them an editor (`reciprociudad_me` returns a row only
 * for an active admin). No service-role key is used, so a leaked route can at
 * most re-render a public page — and only for a real editor.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: 'supabase no configurado' }, { status: 500 });
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ ok: false, error: 'sin sesión' }, { status: 401 });

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: user } = await sb.auth.getUser(token);
  if (!user?.user) return NextResponse.json({ ok: false, error: 'sesión inválida' }, { status: 401 });

  const { data: me, error } = await sb.rpc('reciprociudad_me');
  if (error || !Array.isArray(me) || me.length === 0) {
    return NextResponse.json({ ok: false, error: 'no eres editor' }, { status: 403 });
  }

  revalidatePath('/', 'page');
  return NextResponse.json({ ok: true });
}
