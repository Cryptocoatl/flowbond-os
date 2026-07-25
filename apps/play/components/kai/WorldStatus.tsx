// WorldStatus — the region's regeneration index (vitality) + the four channels
// that compose it. 100% live data from kai_get_region. This is the heartbeat.
import type { RegionState } from '@/lib/kai/types';
import { CHANNEL_META } from '@/lib/kai/meta';
import { Panel } from './Panel';
import { Ring } from './Ring';

export function WorldStatus({ state, regionName }: { state: RegionState; regionName: string }) {
  const pct = Math.round(state.vitality * 100);
  return (
    <Panel eyebrow="Regeneration index" title={`${regionName} · health`}>
      <div className="flex items-center gap-4">
        <Ring value={state.vitality} label={`${pct}%`} sublabel="Vitality" color="#6FCF97" size={96} />
        <div className="min-w-0 flex-1 space-y-2.5">
          {CHANNEL_META.map((ch) => {
            const v = Math.round((state[ch.key] as number) * 100);
            return (
              <div key={ch.key}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-kai-muted">{ch.label}</span>
                  <span className="font-mono text-kai-faint">{v}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v}%`, background: ch.color, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
