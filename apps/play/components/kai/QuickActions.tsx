// QuickActions — the five mission categories as one-tap entries into acting.
import Link from 'next/link';
import { CATEGORY_META } from '@/lib/kai/meta';
import type { MissionCategory } from '@/lib/kai/types';
import { Icon } from './Icon';

const ORDER: MissionCategory[] = ['restore', 'learn', 'build', 'connect', 'celebrate'];

export function QuickActions() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {ORDER.map((key) => {
        const m = CATEGORY_META[key];
        return (
          <Link
            key={key}
            href="/#missions"
            className="glass glass-hover flex flex-col items-center gap-1.5 py-3"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ color: m.color, background: `${m.color}14`, boxShadow: `inset 0 0 0 1px ${m.color}22` }}
            >
              <Icon name={m.icon} size={18} />
            </span>
            <span className="text-[11px] text-kai-muted">{m.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
