import Link from 'next/link';
import { serverClient } from '../../lib/supabase-server';
import { myFbid } from '../../lib/auth';
import type { FlowdropEvent } from '../../lib/flowdrop';
import { Plus, Sparkles, Film } from '../components/icons';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const fbid = await myFbid();
  if (!fbid) {
    return (
      <main>
        <SignedOut />
      </main>
    );
  }

  const sb = await serverClient();
  const { data: owned } = await sb
    .from('flowdrop_events')
    .select('*')
    .eq('owner_fbid', fbid)
    .order('created_at', { ascending: false });

  // Events I edit (accepted invite) but don't own.
  const { data: editRows } = await sb
    .from('flowdrop_editors')
    .select('event_id')
    .eq('editor_fbid', fbid)
    .not('accepted_at', 'is', null);
  const editIds = (editRows ?? []).map((r) => r.event_id).filter((id) => !(owned ?? []).some((e) => e.id === id));
  const { data: edited } = editIds.length
    ? await sb.from('flowdrop_events').select('*').in('id', editIds)
    : { data: [] as FlowdropEvent[] };

  const events = [...((owned as FlowdropEvent[]) ?? []), ...((edited as FlowdropEvent[]) ?? [])];

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> FlowStudio
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Events
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/55">
            Open a drop link for an event, gather everyone&apos;s footage in one pool, then let editors cut
            and publish — with every clip&apos;s shooter and editor credited on Origo.
          </p>
        </div>
        <Link href="/events/new" className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-white transition-transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,var(--cta),#f43f5e)' }}>
          <Plus className="h-5 w-5" /> New event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-16 grid place-items-center rounded-3xl border py-24 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-white/50">No events yet.</p>
          <Link href="/events/new" className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-white" style={{ background: 'var(--cta)' }}>
            <Plus className="h-5 w-5" /> Create your first event
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} href={`/events/${e.slug}`} className="rounded-2xl border p-5 transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
              <div className="flex items-center justify-between">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  style={{ background: e.status === 'open' ? 'rgba(16,185,129,0.18)' : 'var(--panel-2)', color: e.status === 'open' ? '#34d399' : 'var(--muted)' }}>
                  {e.status}
                </span>
                {e.owner_fbid === fbid && <span className="text-[11px] text-white/40">owner</span>}
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{e.title}</h2>
              {e.description && <p className="mt-1 line-clamp-2 text-sm text-white/50">{e.description}</p>}
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/40"><Film className="h-3.5 w-3.5" /> /drop/{e.slug}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function SignedOut() {
  return (
    <div className="mt-16 grid place-items-center rounded-3xl border py-24 text-center" style={{ borderColor: 'var(--border)' }}>
      <p className="text-white/60">Sign in with your FlowBond identity to create and manage events.</p>
      <Link href="/auth/login?next=/events" className="mt-4 rounded-xl px-4 py-3 font-medium text-white" style={{ background: 'var(--cta)' }}>
        Sign in
      </Link>
    </div>
  );
}
