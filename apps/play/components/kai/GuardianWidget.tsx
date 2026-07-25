// GuardianWidget — the active guide (Kai's consciousness). Prompt chips are the
// seam for the AI layer (memory/context/personality). Static entry today.
import { PRIMARY_GUARDIAN } from '@/lib/kai/world';
import { POINT_COLOR } from '@/lib/kai/meta';
import { Panel } from './Panel';
import { PortraitSlot } from './PortraitSlot';
import { Icon } from './Icon';

const PROMPTS = [
  { icon: 'compass', label: 'What can I do here?' },
  { icon: 'missions', label: 'Missions for today' },
  { icon: 'spark', label: 'Show me hidden places' },
] as const;

export function GuardianWidget() {
  const g = PRIMARY_GUARDIAN;
  const accent = g.accent === 'jade' ? '#6FCF97' : POINT_COLOR[g.accent];
  return (
    <Panel eyebrow="Your guide" title={`${g.name} · ${g.role}`}>
      <div className="flex gap-4">
        <PortraitSlot src={g.portrait} seed={g.slug} label={g.name} className="h-24 w-20 shrink-0" rounded="rounded-xl2" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-kai-muted">
            The world is alive. What would you like to do today?
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {PROMPTS.map((p) => (
              <button
                key={p.label}
                className="glass-hover flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 text-left text-[12px] text-kai-muted"
              >
                <Icon name={p.icon} size={14} style={{ color: accent }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-medium text-black"
        style={{ background: accent }}
      >
        <Icon name="spark" size={15} /> Speak with {g.name}
      </button>
    </Panel>
  );
}
