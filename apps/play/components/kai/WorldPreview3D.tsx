// WorldPreview3D — the entry into the immersive world.
//
// The backdrop is a REAL frame of the running game, not a cinematic. It used to
// be `living-world.mp4`, which is a slow pan across a rendered mock-up of a
// product UI — so the card promised a game that does not exist and then opened
// the one that does. A door should show what is behind it.
import Link from 'next/link';
import type { RegionSummary } from '@/lib/kai/types';
import { Icon } from './Icon';

export function WorldPreview3D({ region }: { region: RegionSummary }) {
  return (
    <Link
      href="/play"
      className="group relative block aspect-[21/9] overflow-hidden rounded-xl3 border border-white/[0.06] shadow-panel"
    >
      <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(160deg, #121a17, #0a0f0d)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/play-preview.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(8,11,10,0.86) 0%, rgba(8,11,10,0.45) 48%, rgba(8,11,10,0.18) 100%)' }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="eyebrow mb-1 text-kai-gold/90">Immersive</div>
          <div className="font-display text-lg font-semibold text-kai-text sm:text-xl">Enter the living world</div>
          <div className="truncate text-[12px] text-kai-muted">Walk {region.name} in 3D · 7 worlds, 92 missions</div>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-black/40 text-kai-text backdrop-blur-md transition-transform group-hover:scale-105 sm:h-12 sm:w-12">
          <Icon name="cube" size={20} />
        </span>
      </div>
    </Link>
  );
}
