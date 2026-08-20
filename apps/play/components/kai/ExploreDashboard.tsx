// =============================================================================
// ExploreDashboard — the Explore vertical slice. Pure composition of reusable
// systems; all data arrives as props from the server (app/page.tsx). Responsive
// 3-column shell → single column on mobile, with a bottom nav.
// =============================================================================
import type { Mission, RegionSummary } from '@/lib/kai/types';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PlanetHeader } from './PlanetHeader';
import { QuickActions } from './QuickActions';
import { WorldPreview3D } from './WorldPreview3D';
import { MissionFeed } from './MissionFeed';
import { GuardianRail } from './GuardianRail';
import { ImpactOverview } from './ImpactOverview';
import { NearbyPlaces } from './NearbyPlaces';
import { PlayerCard } from './PlayerCard';
import { GuardianWidget } from './GuardianWidget';
import { LiveWorldStatus } from './LiveWorldStatus';
import { LiveFeed } from './LiveFeed';
import { DreamRequests } from './DreamRequests';

export function ExploreDashboard({ region, missions }: { region: RegionSummary; missions: Mission[] }) {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-4 px-3 pb-24 pt-4 sm:px-4 lg:pb-6">
      <Sidebar />

      <main className="min-w-0 flex-1 space-y-4">
        <PlanetHeader region={region} />
        <QuickActions />
        <WorldPreview3D region={region} />

        {/* `grid-cols-1` / `minmax(0,…)` are load-bearing, not decoration: an
            auto-sized grid track grows to its content's max-content width, and
            the Guardians rail is eight fixed-width cards. Without the explicit
            minmax the track grew to ~1110px and the ENTIRE dashboard scrolled
            sideways on a phone — the hero at 390px, every panel below at 1110. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <MissionFeed missions={missions} region={region} />
            <GuardianRail />
            <ImpactOverview state={region.state} />
          </div>
          <div className="min-w-0 space-y-4">
            <GuardianWidget />
            <LiveFeed regionName={region.name} />
            <DreamRequests />
            <NearbyPlaces region={region} />
          </div>
        </div>
      </main>

      {/* Right rail — identity + heartbeat (desktop only). */}
      <aside className="hidden w-[300px] shrink-0 space-y-4 xl:block">
        <div className="sticky top-4 space-y-4">
          <PlayerCard />
          <LiveWorldStatus slug={region.slug} initial={region.state} regionName={region.name} />
        </div>
      </aside>

      <BottomNav />
    </div>
  );
}
