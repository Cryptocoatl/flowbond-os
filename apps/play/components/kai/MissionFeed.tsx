// MissionFeed — live active missions. Empty state is honest (no fabricated rows).
import type { Mission, RegionSummary } from '@/lib/kai/types';
import { Panel } from './Panel';
import { MissionTile } from './MissionTile';
import { EmptyState } from './EmptyState';

export function MissionFeed({ missions, region }: { missions: Mission[]; region: RegionSummary }) {
  const missionRegion = { slug: region.slug, name: region.name, center: { lat: region.bounds.lat, lng: region.bounds.lng } };
  return (
    <Panel
      id="missions"
      eyebrow="Real actions, real impact"
      title="Missions near you"
      action={<span className="text-[12px] text-kai-muted">{missions.length} active</span>}
    >
      {missions.length === 0 ? (
        <EmptyState icon="missions" title="No active missions yet" hint="Mission types load from the live engine." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {missions.map((m) => (
            <MissionTile key={m.slug} mission={m} region={missionRegion} />
          ))}
        </div>
      )}
    </Panel>
  );
}
