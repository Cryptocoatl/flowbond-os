// WorldPreview3D — the entry into the immersive world. Cinematic looping video
// backdrop with a play affordance; the real .spz scene lives at /r/[slug]. Seam
// for an inline R3F preview later.
import Link from 'next/link';
import type { RegionSummary } from '@/lib/kai/types';
import { VideoSlot } from './VideoSlot';
import { Icon } from './Icon';

export function WorldPreview3D({ region }: { region: RegionSummary }) {
  return (
    <Link
      href="/play"
      className="group relative block aspect-[21/9] overflow-hidden rounded-xl3 border border-white/[0.06] shadow-panel"
    >
      <VideoSlot
        src="/videos/living-world.mp4"
        poster="/videos/living-world.jpg"
        seed={`${region.slug}-3d`}
        overlay="linear-gradient(90deg, rgba(8,11,10,0.82) 0%, rgba(8,11,10,0.35) 45%, rgba(8,11,10,0.15) 100%)"
      />
      <div className="absolute inset-0 flex items-center justify-between p-5">
        <div>
          <div className="eyebrow mb-1 text-kai-gold/90">Immersive</div>
          <div className="font-display text-xl font-semibold text-kai-text">Enter the living world</div>
          <div className="text-[12px] text-kai-muted">Walk {region.name} in 3D</div>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/40 text-kai-text backdrop-blur-md transition-transform group-hover:scale-105">
          <Icon name="cube" size={20} />
        </span>
      </div>
    </Link>
  );
}
