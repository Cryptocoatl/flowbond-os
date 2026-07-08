import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { serverClient } from '../../../../../lib/supabase-server';
import { displayNameFor } from '../../../../../lib/auth';
import { registerContent } from '../../../../../lib/origo-register';
import { eventBySlug, PUB_BUCKET, REWARD_SHOOTER, REWARD_EDITOR } from '../../../../../lib/flowdrop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safeName = (s: string) => (s || 'piece.mp4').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);

// POST /api/events/[slug]/publish — multipart { file, title, contributionIds }.
// No service-role: the editor uploads under their own session (storage RLS gates
// it), Origo registration is the anon-callable RPC, and the publication + reward
// writes happen inside the SECURITY DEFINER RPC flowdrop_publish.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ev = await eventBySlug(slug);
  if (!ev) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  const title = String(form.get('title') ?? '').trim() || ev.title;
  let contributionIds: string[] = [];
  let splits: { fbid?: string; label: string; role: string; weight_bps: number }[] = [];
  try { contributionIds = JSON.parse(String(form.get('contributionIds') ?? '[]')); } catch { /* leave empty */ }
  try { splits = JSON.parse(String(form.get('splits') ?? '[]')); } catch { /* leave empty */ }
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });

  // Hash the exact bytes we store, then upload to the public bucket under the
  // event folder. The storage INSERT policy requires the caller to be an editor.
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const path = `${ev.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const up = await sb.storage.from(PUB_BUCKET).upload(path, bytes, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  });
  if (up.error) {
    const status = /row-level security|not authorized|denied/i.test(up.error.message) ? 403 : 500;
    return NextResponse.json({ error: up.error.message }, { status });
  }

  // Resolve the chain. RLS lets an editor read this event's contributions.
  const { data: contribs } = await sb
    .from('flowdrop_contributions')
    .select('id, contributor_fbid')
    .in('id', contributionIds.length ? contributionIds : ['00000000-0000-0000-0000-000000000000']);
  const shooters = [...new Set((contribs ?? []).map((c) => c.contributor_fbid as string))];

  const editorName = await displayNameFor(user.id);
  const shooterNames = await Promise.all(shooters.map(displayNameFor));
  const creator = shooterNames.length ? `${shooterNames.join(', ')} · edited by ${editorName}` : editorName;
  const credits = { shooters: shooterNames, editor: editorName };

  const origo = await registerContent({
    contentHash,
    title,
    creator,
    description: `Event "${ev.title}" — shot by ${shooterNames.join(', ') || 'attendees'}, edited by ${editorName}.`,
    fbid: user.id,
    owners: [...shooters, user.id],
    visibility: 'public',
    medium: 'video',
  });

  // Create the publication + provenance edges + rewards in one atomic, gated call.
  const { data: pubId, error } = await sb.rpc('flowdrop_publish', {
    p_event: ev.id,
    p_storage_path: path,
    p_title: title,
    p_content_hash: contentHash,
    p_origo_cert_id: origo.certId ?? null,
    p_contribution_ids: contributionIds,
    p_credits: credits,
    p_reward_shooter: REWARD_SHOOTER,
    p_reward_editor: REWARD_EDITOR,
  });
  if (error) {
    const status = error.message.includes('not_an_editor') ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // Register the FlowSplit. Use the editor-set sheet if it totals 100%; otherwise
  // fall back to an equal split across shooters (videographer) + the editor.
  let lines = splits.filter((l) => l.weight_bps > 0);
  const sum = lines.reduce((s, l) => s + l.weight_bps, 0);
  if (lines.length === 0 || sum !== 10000) {
    const beneficiaries = [
      ...shooters.map((fb, i) => ({ fbid: fb, label: shooterNames[i] ?? fb.slice(0, 8), role: 'videographer' })),
      { fbid: user.id, label: editorName, role: 'editor' },
    ];
    const each = Math.floor(10000 / beneficiaries.length);
    lines = beneficiaries.map((b, i) => ({ ...b, weight_bps: each + (i === 0 ? 10000 - each * beneficiaries.length : 0) }));
  }
  const { error: splitErr } = await sb.rpc('flowstudio_set_split', { p_publication: pubId, p_lines: lines });

  return NextResponse.json({
    id: pubId,
    certId: origo.certId ?? null,
    origoReason: origo.registered ? undefined : origo.reason,
    splitError: splitErr?.message,
  });
}
