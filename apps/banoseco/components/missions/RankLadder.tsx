import { RANKS, currentRank } from '@/lib/game';
import { fmt } from '@/lib/format';

export function RankLadder({ xp }: { xp: number }) {
  const now = currentRank(xp);
  return (
    <div className="ladder">
      {RANKS.map((x) => {
        const has = xp >= x.xp;
        const isNow = x.nm === now.nm;
        return (
          <div key={x.nm} className={`lvl${has ? ' has' : ''}${isNow ? ' now' : ''}`}>
            <div className="ic">{x.ic}</div>
            <div className="nm">{x.nm}</div>
            <div className="xp">{x.xp ? `${fmt(x.xp)} XP` : 'inicio'}</div>
          </div>
        );
      })}
    </div>
  );
}
