'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGame } from '@/components/providers/GameProvider';
import { Totem } from './Totem';
import { currentRank, rankProgress, ENERGY_GATE } from '@/lib/game';
import { fmt } from '@/lib/format';

const TABS = [
  { href: '/', label: '🗺 El Mapa' },
  { href: '/misiones', label: '⚑ Misiones' },
  { href: '/org', label: '🏛 Mi organización' },
  { href: '/codice', label: '📜 El Códice' },
];

export function PlayerHUD() {
  const { profile, user } = useGame();
  const pathname = usePathname();

  const xp = profile?.xp ?? 0;
  const oro = profile?.oro ?? 0;
  const energy = profile?.energy ?? 0;
  const rank = currentRank(xp);
  const prog = rankProgress(xp);

  return (
    <header className="bs-header">
      <div className="wrap">
        <div className="hudbar">
          <Link href="/" className="brand" aria-label="BAÑOSECO — inicio">
            <Totem />
            <div className="wm">
              BAÑO<span className="s">S</span>
              <span className="eco">ECO</span>
              <small>RED REGENERATIVA</small>
            </div>
          </Link>

          <div className="player">
            <div className="rank">
              <div className="rankbadge" aria-hidden="true">
                {rank.ic}
              </div>
              <div className="rankmeta">
                <div className="n">{rank.nm}</div>
                <div className="xpwrap">
                  <div className="lab">
                    {prog.max ? 'MAX' : fmt(prog.have)} / {prog.max ? '—' : fmt(prog.span)} XP
                  </div>
                  <div className="xpbar">
                    <div className="xpfill" style={{ width: `${prog.pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="res">
              <div className="chip oro" title="Oro · puntos canjeables">
                <i>◈</i>
                <span>{user ? fmt(oro) : '—'}</span>
              </div>
              {ENERGY_GATE && (
                <div className="chip en" title="Energía · recarga solar diaria">
                  <i>⚡</i>
                  <span>{user ? energy : '—'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="bs-nav" aria-label="Mundo">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={pathname === t.href ? 'page' : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
