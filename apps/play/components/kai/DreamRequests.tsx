// DreamRequests — community dreams to co-create (fund → build → real). Seam for
// a kai_dreams table; empty state invites the first dream today.
import type { DreamRequest } from '@/lib/kai/types';
import { Panel } from './Panel';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';

export function DreamRequests({ dreams = [] as DreamRequest[] }: { dreams?: DreamRequest[] }) {
  return (
    <Panel
      eyebrow="Co-create the world"
      title="Dream requests"
      action={
        <button className="chip text-kai-gold">
          <Icon name="plus" size={12} /> Dream
        </button>
      }
    >
      {dreams.length === 0 ? (
        <EmptyState icon="spark" title="No dreams yet" hint="Propose a place to heal, build, or protect — the community makes it real." />
      ) : (
        <ul className="space-y-2">
          {dreams.map((d) => (
            <li key={d.id} className="glass-hover rounded-xl2 border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-kai-text">{d.title}</span>
                <span className="text-[11px] text-kai-faint">{Math.round(d.progress * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-kai-gold" style={{ width: `${d.progress * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
