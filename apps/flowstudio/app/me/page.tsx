import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '../../lib/supabase-server';
import { myFbid, myIdentity } from '../../lib/auth';
import { MEDIA_BUCKET, type MediaItem } from '../../lib/media';
import type { FlowdropEvent } from '../../lib/flowdrop';
import MediaLibrary from './MediaLibrary';
import { Shield, Sparkles, Film, Plus } from '../components/icons';
import { Mark } from '../components/Wordmark';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const fbid = await myFbid();
  if (!fbid) redirect('/auth/login?next=/me');

  const sb = await serverClient();
  const identity = await myIdentity();

  // FlowCredits — ensure the welcome grant, then read the balance (both no-arg RPCs).
  try { await sb.rpc('fc_claim_welcome'); } catch { /* already claimed / non-fatal */ }
  const { data: balance } = await sb.rpc('fc_balance');

  // Personal library (owner RLS) + public URLs (bucket is public).
  const { data: media } = await sb
    .from('studio_media')
    .select('*')
    .order('created_at', { ascending: false });
  const items = ((media as MediaItem[]) ?? []).map((m) => ({
    ...m,
    url: sb.storage.from(MEDIA_BUCKET).getPublicUrl(m.storage_path).data.publicUrl,
  }));

  // Events I own or edit.
  const { data: owned } = await sb.from('flowdrop_events').select('*').eq('owner_fbid', fbid).order('created_at', { ascending: false });
  const { data: editRows } = await sb.from('flowdrop_editors').select('event_id').eq('editor_fbid', fbid).not('accepted_at', 'is', null);
  const editIds = (editRows ?? []).map((r) => r.event_id).filter((id) => !(owned ?? []).some((e) => e.id === id));
  const { data: edited } = editIds.length ? await sb.from('flowdrop_events').select('*').in('id', editIds) : { data: [] as FlowdropEvent[] };
  const events = [...((owned as FlowdropEvent[]) ?? []), ...((edited as FlowdropEvent[]) ?? [])];

  const name = identity?.handle ? `@${identity.handle}` : identity?.display_name || fbid.slice(0, 8);
  const verified = !!identity?.is_verified;
  const credits = typeof balance === 'number' ? balance : 0;

  return (
    <main>
      {/* identity header */}
      <section className="glass overflow-hidden rounded-3xl">
        <div className="relative h-28" style={{ background: 'var(--flow-grad)' }}>
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(60% 100% at 30% 0%, #fff6, transparent)' }} />
        </div>
        <div className="flex flex-wrap items-end gap-4 px-6 pb-6">
          <div className="-mt-10 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-[#0a0810]" style={{ background: 'var(--panel-2)' }}>
            {identity?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={identity.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Mark className="h-9 w-9" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {name}
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(16,185,129,.18)', color: '#34d399' }}>
                  <Shield className="h-3 w-3" /> Verified human
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-white/50">Your studio · personal library + collectives</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border px-4 py-2 text-center" style={{ borderColor: 'var(--border)' }}>
              <div className="font-display text-xl font-semibold text-grad" style={{ fontFamily: 'var(--font-display)' }}>{credits}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">FlowPoints</div>
            </div>
          </div>
        </div>
      </section>

      {/* events strip */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> Your collectives
          </h2>
          <Link href="/events/new" className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white">
            <Plus className="h-4 w-4" /> New event
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">No events yet. <Link href="/events/new" className="underline" style={{ color: 'var(--cta)' }}>Open a drop link</Link> to gather footage with your crew.</p>
        ) : (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {events.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}`} className="shrink-0 rounded-2xl border p-4 transition-colors hover:bg-white/5" style={{ borderColor: 'var(--border)', background: 'var(--panel)', minWidth: 220 }}>
                <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ background: e.status === 'open' ? 'rgba(16,185,129,.18)' : 'var(--panel-2)', color: e.status === 'open' ? '#34d399' : 'var(--muted)' }}>{e.status}</span>
                <p className="mt-2 truncate font-medium text-white">{e.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40"><Film className="h-3 w-3" /> /drop/{e.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* personal media library */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
          <Film className="h-4 w-4" /> Your media
        </h2>
        <MediaLibrary initial={items} />
      </section>
    </main>
  );
}
