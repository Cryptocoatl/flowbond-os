// NearbyPlaces — discoverable places around you. Seeded from the active region
// today; expands to a places index (kai_places) with distance sorting later.
import Link from 'next/link';
import type { RegionSummary } from '@/lib/kai/types';
import { Panel } from './Panel';
import { PortraitSlot } from './PortraitSlot';
import { Icon } from './Icon';
import { regionFilm } from '@/lib/kai/media';

export function NearbyPlaces({ region }: { region: RegionSummary }) {
  return (
    <Panel eyebrow="Around you" title="Places to discover">
      <Link href={`/r/${region.slug}`} className="glass-hover group block overflow-hidden rounded-xl2 border border-white/[0.05]">
        <PortraitSlot src={regionFilm(region.slug).poster} seed={region.slug} label={region.name} className="aspect-[16/9] w-full" rounded="rounded-none" />
        <div className="flex items-center justify-between p-3">
          <div>
            <div className="text-sm font-medium text-kai-text">{region.name}</div>
            <div className="text-[11px] text-kai-muted">Sacred · Natural · Living community</div>
          </div>
          <Icon name="arrow-right" size={16} className="text-kai-faint transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </Panel>
  );
}
