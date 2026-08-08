// ImpactOverview — planetary impact tracker. Values read from the impact ledger
// once aggregated; until then they show "—" (honest). The community pulse tile
// is live now, derived from the region's verified-action channel.
import type { RegionState } from '@/lib/kai/types';
import { Panel } from './Panel';
import { StatTile } from './StatTile';

export function ImpactOverview({ state }: { state: RegionState }) {
  const pulse = Math.round(state.communityPulse * 100);
  return (
    <Panel eyebrow="Our actions, our planet" title="Real-world impact">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile icon="tree" label="Trees planted" value={null} accent="#6FCF97" />
        <StatTile icon="water" label="Water restored" value={null} unit="L" accent="#7CC7FF" />
        <StatTile icon="co2" label="CO₂ removed" value={null} unit="t" accent="#B69CFF" />
        <StatTile icon="people" label="People involved" value={null} accent="#F4A65A" />
        <StatTile icon="spark" label="Community pulse" value={pulse} unit="%" accent="#F4C25A" />
        <StatTile icon="compass" label="Missions live" value={null} accent="#6FE0C6" />
      </div>
      <p className="mt-3 text-[11px] text-kai-faint">
        Metrics populate as verified proofs are validated by node leaders.
      </p>
    </Panel>
  );
}
