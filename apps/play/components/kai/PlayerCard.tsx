// PlayerCard — the visitor's identity + reputation + economy balances. Identity
// is a placeholder until FBID auth is wired; balances read "—" (no fake points).
import { POINTS } from '@/lib/kai/world';
import { POINT_COLOR } from '@/lib/kai/meta';
import { Panel } from './Panel';
import { AvatarPanel } from '../game/AvatarPanel';

export function PlayerCard() {
  const xp = 0;
  const xpMax = 1000;
  return (
    <Panel>
      <AvatarPanel />

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-kai-gold to-kai-jade" style={{ width: `${(xp / xpMax) * 100}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-kai-faint">
        {xp.toLocaleString()} / {xpMax.toLocaleString()} XP
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {POINTS.map((p) => (
          <div key={p.key} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-center">
            <div className="mx-auto mb-1 h-1.5 w-1.5 rounded-full" style={{ background: POINT_COLOR[p.key] }} />
            <div className="font-mono text-[13px] text-kai-text">{p.value === null ? '—' : p.value}</div>
            <div className="truncate text-[9px] text-kai-faint">{p.label}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
