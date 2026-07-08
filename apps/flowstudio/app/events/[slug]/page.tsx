import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverClient } from '../../../lib/supabase-server';
import { myFbid, displayNameFor } from '../../../lib/auth';
import { eventBySlug, DROP_BUCKET, PUB_BUCKET, type Contribution, type Publication } from '../../../lib/flowdrop';
import EditorPool, { type PoolItem, type PubItem } from './EditorPool';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await eventBySlug(slug);
  if (!ev) notFound();

  const fbid = await myFbid();
  if (!fbid) {
    return (
      <main className="max-w-xl">
        <h1 className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{ev.title}</h1>
        <div className="mt-8 grid place-items-center rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-white/60">Sign in to access this event&apos;s footage pool.</p>
          <Link href={`/auth/login?next=/events/${slug}`} className="mt-4 rounded-xl px-4 py-3 font-medium text-white" style={{ background: 'var(--cta)' }}>
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const sb = await serverClient();
  const isOwner = ev.owner_fbid === fbid;
  let canEdit = isOwner;
  if (!canEdit) {
    const { data: ed } = await sb
      .from('flowdrop_editors')
      .select('accepted_at')
      .eq('event_id', ev.id)
      .eq('editor_fbid', fbid)
      .not('accepted_at', 'is', null)
      .maybeSingle();
    canEdit = !!ed;
  }

  if (!canEdit) {
    return (
      <main className="max-w-xl">
        <h1 className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{ev.title}</h1>
        <div className="mt-8 rounded-2xl border p-8 text-center text-white/60" style={{ borderColor: 'var(--border)' }}>
          You need an editor invite from the event owner to open this pool. You can still{' '}
          <Link href={`/drop/${slug}`} className="underline" style={{ color: 'var(--cta)' }}>drop your footage</Link>.
        </div>
      </main>
    );
  }

  // The pool — every contribution, with a short-lived signed read URL + shooter
  // name. RLS (flowdrop_contrib_read + the event-drops storage SELECT policy) lets
  // owners/editors read the whole pool under their own session — no service-role.
  const { data: contribs } = await sb
    .from('flowdrop_contributions')
    .select('*')
    .eq('event_id', ev.id)
    .order('created_at', { ascending: false });
  const list = (contribs as Contribution[]) ?? [];

  const paths = list.map((c) => c.storage_path);
  const signed = paths.length
    ? (await sb.storage.from(DROP_BUCKET).createSignedUrls(paths, 60 * 60 * 2)).data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl] as const));

  const shooterIds = [...new Set(list.map((c) => c.contributor_fbid))];
  const nameById = new Map(await Promise.all(shooterIds.map(async (id) => [id, await displayNameFor(id)] as const)));

  const items: PoolItem[] = list.map((c) => ({
    id: c.id,
    kind: c.kind,
    url: (c.storage_path && urlByPath.get(c.storage_path)) || '',
    shooter: nameById.get(c.contributor_fbid) ?? c.contributor_fbid.slice(0, 8),
    shooterFbid: c.contributor_fbid,
    status: c.status,
  }));

  const editorName = await displayNameFor(fbid);

  // Already-published pieces (public read).
  const { data: pubs } = await sb
    .from('flowdrop_publications')
    .select('*')
    .eq('event_id', ev.id)
    .order('created_at', { ascending: false });
  const publications: PubItem[] = ((pubs as Publication[]) ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    certId: p.origo_cert_id,
    url: sb.storage.from(PUB_BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
  }));

  return (
    <EditorPool
      slug={slug}
      title={ev.title}
      status={ev.status}
      isOwner={isOwner}
      items={items}
      publications={publications}
      editorFbid={fbid}
      editorName={editorName}
    />
  );
}
