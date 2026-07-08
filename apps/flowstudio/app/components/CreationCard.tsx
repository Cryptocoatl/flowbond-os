import Link from 'next/link';
import type { Creation } from '../../lib/library';
import { Branch as BranchIcon, Film, Shield } from './icons';

export default function CreationCard({ c }: { c: Creation }) {
  const poster = c.posterBranch ? `/api/poster?path=${encodeURIComponent(c.posterBranch)}&t=1` : null;
  const certed = c.branches.some((b) => b.cert);
  return (
    <Link
      href={`/creation/${c.slug}`}
      className="group relative block overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={`${c.title} poster`} loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/20"><Film className="h-10 w-10" /></div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(8,7,15,0.92))' }} />
        {certed && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-white backdrop-blur"
            style={{ background: 'rgba(16,185,129,0.22)', border: '1px solid rgba(16,185,129,0.5)' }}>
            <Shield className="h-3.5 w-3.5" /> Origo
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="font-display text-[15px] font-semibold leading-snug text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {c.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-white/55">
            <span className="flex items-center gap-1"><BranchIcon className="h-3.5 w-3.5" />{c.branchCount} cut{c.branchCount === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1"><Film className="h-3.5 w-3.5" />{c.shotCount} shots</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
