// GuardianCard — a guide portrait (image slot) + role. Reused in the rail and,
// larger, in the primary widget. Accent glow from the guardian's economy focus.
import type { Guardian } from '@/lib/kai/types';
import { POINT_COLOR } from '@/lib/kai/meta';
import { PortraitSlot } from './PortraitSlot';

export function GuardianCard({ guardian, size = 'sm' }: { guardian: Guardian; size?: 'sm' | 'lg' }) {
  const accent = guardian.accent === 'jade' ? '#6FCF97' : POINT_COLOR[guardian.accent];
  return (
    <div className={`group shrink-0 ${size === 'lg' ? 'w-full' : 'w-[124px]'}`}>
      <PortraitSlot
        src={guardian.portrait}
        seed={guardian.slug}
        label={guardian.name}
        className={`w-full ${size === 'lg' ? 'aspect-[4/3]' : 'aspect-[3/4]'} transition-transform duration-300 group-hover:-translate-y-0.5`}
      />
      <div className="mt-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          <span className="text-[13px] font-medium text-kai-text">{guardian.name}</span>
        </div>
        <div className="truncate text-[11px] text-kai-muted">{guardian.role}</div>
      </div>
    </div>
  );
}
