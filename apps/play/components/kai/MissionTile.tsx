'use client';
// MissionTile — one actionable mission (Mission Engine's atomic unit). Click →
// LogActionModal → kai_submit_proof. Category-colored, shows XP.
import { useState } from 'react';
import type { Mission } from '@/lib/kai/types';
import { CATEGORY_META } from '@/lib/kai/meta';
import { Icon } from './Icon';
import { LogActionModal } from './LogActionModal';

export interface MissionRegion {
  slug: string;
  name: string;
  center: { lat: number; lng: number };
}

export function MissionTile({ mission, region }: { mission: Mission; region: MissionRegion }) {
  const m = CATEGORY_META[mission.category];
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-hover group flex w-full items-center gap-3 rounded-xl2 border border-white/[0.05] bg-white/[0.02] p-3 text-left"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ color: m.color, background: `${m.color}14`, boxShadow: `inset 0 0 0 1px ${m.color}22` }}
        >
          <Icon name={m.icon} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-kai-text">{mission.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-kai-muted">
            <span style={{ color: m.color }}>{m.label}</span>
            <span className="text-kai-faint">·</span>
            <span>+{mission.xpReward} XP</span>
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-kai-muted transition-colors group-hover:border-white/20 group-hover:text-kai-text">
          Log action
        </span>
      </button>
      {open && (
        <LogActionModal
          mission={mission}
          regionSlug={region.slug}
          regionName={region.name}
          center={region.center}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
