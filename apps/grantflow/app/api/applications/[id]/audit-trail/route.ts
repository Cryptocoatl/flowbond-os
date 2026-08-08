import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-server';
import { requireAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/applications/[id]/audit-trail — the full append-only history, oldest first.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAccess())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const admin = dbAdmin();
  const [{ data: results }, { data: rounds }, { data: sections }] = await Promise.all([
    admin
      .from('audit_results')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: true }),
    admin.from('audit_rounds').select('*').order('round_no'),
    admin.from('draft_sections').select('key,label,updated_at,updated_by').eq('application_id', id),
  ]);

  return NextResponse.json({
    results: results ?? [],
    rounds: rounds ?? [],
    sections: sections ?? [],
  });
}
