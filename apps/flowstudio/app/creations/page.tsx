import Link from 'next/link';
import { listCreations } from '../../lib/library';
import CreationCard from '../components/CreationCard';
import { Plus, Sparkles } from '../components/icons';

export const dynamic = 'force-dynamic';

export default async function CreationsPage() {
  const creations = await listCreations();
  const certs = creations.reduce((n, c) => n + c.branches.filter((b) => b.cert).length, 0);

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> FlowStudio
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Creations
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/55">
            Every video composed on the stack — song → AI shots → beat/lyric-locked cut → Origo provenance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border px-3.5 py-2 text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="font-display text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{creations.length}</div>
            <div className="text-[11px] uppercase tracking-wider text-white/40">creations</div>
          </div>
          <div className="rounded-xl border px-3.5 py-2 text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="font-display text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--emerald)' }}>{certs}</div>
            <div className="text-[11px] uppercase tracking-wider text-white/40">on Origo</div>
          </div>
          <Link href="/new" className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,var(--cta),#f43f5e)' }}>
            <Plus className="h-5 w-5" /> New creation
          </Link>
        </div>
      </div>

      {creations.length === 0 ? (
        <div className="mt-16 grid place-items-center rounded-3xl border py-24 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-white/50">No creations yet.</p>
          <Link href="/new" className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-white" style={{ background: 'var(--cta)' }}>
            <Plus className="h-5 w-5" /> Start your first video
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {creations.map((c) => <CreationCard key={c.slug} c={c} />)}
        </div>
      )}
    </main>
  );
}
