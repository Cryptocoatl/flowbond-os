import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eventBySlug } from '../../../lib/flowdrop';
import { myFbid } from '../../../lib/auth';
import DropUploader from './DropUploader';
import { Sparkles, Shield } from '../../components/icons';

export const dynamic = 'force-dynamic';

export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await eventBySlug(slug);
  if (!ev) notFound();

  const fbid = await myFbid();
  const closed = ev.status !== 'open';

  return (
    <main className="max-w-2xl">
      <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> Event drop
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {ev.title}
      </h1>
      {ev.description && <p className="mt-2 text-[15px] leading-relaxed text-white/55">{ev.description}</p>}

      <div className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-[13px] text-white/55" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <Shield className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--emerald)' }} />
        <span>
          Anything you drop here is meant to be shared publicly. You&apos;ll be credited as the shooter on
          every published piece your footage appears in — and rewarded for it.
        </span>
      </div>

      {closed ? (
        <div className="mt-10 rounded-2xl border p-8 text-center text-white/55" style={{ borderColor: 'var(--border)' }}>
          Drops for this event are closed.
        </div>
      ) : fbid ? (
        <DropUploader slug={slug} eventId={ev.id} />
      ) : (
        <div className="mt-10 grid place-items-center rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
          <p className="text-white/65">Sign in with your FlowBond identity to drop your photos and videos.</p>
          <Link href={`/auth/login?next=/drop/${slug}`} className="mt-4 rounded-xl px-5 py-3 font-medium text-white" style={{ background: 'var(--cta)' }}>
            Sign in to contribute
          </Link>
        </div>
      )}
    </main>
  );
}
