// PlanetHeader — the Explore hero. Region art slot (/images/regions/<slug>.webp,
// gradient fallback), live/seed badge, region tabs, search, env strip, 3D entry.
import Link from 'next/link';
import type { RegionSummary } from '@/lib/kai/types';
import { Icon } from './Icon';
import { SearchBar } from './SearchBar';
import { EnvStrip } from './EnvStrip';
import { VideoSlot } from './VideoSlot';

const TABS = ['Explore', 'Culture', 'Nature', 'People', 'Projects', 'History'];

export function PlanetHeader({ region }: { region: RegionSummary }) {
  const coords = `${region.bounds.lat.toFixed(4)}°, ${region.bounds.lng.toFixed(4)}°`;
  return (
    <section className="relative overflow-hidden rounded-xl3 border border-white/[0.06] shadow-panel">
      {/* Living region backdrop — cinematic video (falls back to gradient). */}
      <VideoSlot src={`/videos/${region.slug}.mp4`} poster={`/videos/${region.slug}.jpg`} seed={region.slug} />
      <div className="relative flex min-h-[300px] flex-col justify-between gap-6 p-5 sm:min-h-[360px] sm:p-7">
        {/* top row: search + 3D */}
        <div className="flex items-center gap-3">
          <div className="max-w-md flex-1">
            <SearchBar />
          </div>
          <Link
            href="/play"
            className="inline-flex items-center gap-2 rounded-full border border-kai-gold/30 bg-kai-gold/10 px-4 py-2 text-sm font-medium text-kai-gold transition-colors hover:bg-kai-gold/15"
          >
            <Icon name="cube" size={16} /> Play in 3D
          </Link>
        </div>

        {/* bottom: identity + tabs + env */}
        <div className="animate-fade-up">
          <div className="mb-2 flex items-center gap-2">
            <span className={`chip ${region.live ? 'text-kai-jade' : 'text-kai-muted'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${region.live ? 'animate-breathe bg-kai-jade' : 'bg-kai-faint'}`} />
              {region.live ? 'Live' : 'Seed'}
            </span>
            <span className="text-[12px] text-kai-muted">{coords}</span>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-kai-text sm:text-5xl">
            {region.name}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-kai-muted">
            A living region. Every real action here heals its mirror.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                    i === 0
                      ? 'bg-white/10 text-kai-text'
                      : 'text-kai-muted hover:bg-white/[0.05] hover:text-kai-text'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="grow" />
            <EnvStrip />
          </div>
        </div>
      </div>
    </section>
  );
}
