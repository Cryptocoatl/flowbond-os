import type { LeaderRow } from '@/lib/types';
import { currentRank } from '@/lib/game';
import { fmt } from '@/lib/format';

export function Leaderboard({ rows, meId }: { rows: LeaderRow[]; meId: string | null }) {
  if (rows.length === 0) {
    return <div className="empty">El gremio aún no tiene oro. Sé el primero en completar una misión.</div>;
  }
  return (
    <div className="lead">
      {rows.map((l, i) => {
        const me = meId != null && l.user_id === meId;
        // rank glyph derived from oro≈xp proxy is unknown; use oro tier as a cue
        const glyph = currentRank(l.oro).ic;
        return (
          <div key={l.user_id} className={`lr${me ? ' me' : ''}`}>
            <span className="rk">{i + 1}</span>
            <span className="rglyph">{glyph}</span>
            <span className="nm">{me ? 'Tú' : l.display_name}</span>
            <span className="lp">{fmt(l.oro)} ◈</span>
          </div>
        );
      })}
    </div>
  );
}
