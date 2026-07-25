// GuardianRail — the roster of guides, horizontally scrollable.
import { GUARDIANS } from '@/lib/kai/world';
import { Panel } from './Panel';
import { GuardianCard } from './GuardianCard';

export function GuardianRail() {
  return (
    <Panel eyebrow="They walk with you" title="Your Guardians">
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {GUARDIANS.map((g) => (
          <GuardianCard key={g.slug} guardian={g} />
        ))}
      </div>
    </Panel>
  );
}
