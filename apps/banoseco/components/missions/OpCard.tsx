'use client';

import type { Mission } from '@/lib/types';
import { KIND_LABEL, KIND_DIFFICULTY, KIND_ARTIFACT, minutesSince } from '@/lib/game';

function DiffDots({ n }: { n: number }) {
  return (
    <span className="diff" aria-label={`Dificultad ${n} de 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="d" style={i < n ? { opacity: 1 } : undefined}>
          ◆
        </span>
      ))}
    </span>
  );
}

export function OpCard({
  mission,
  canClaim,
  canComplete,
  busy,
  flash,
  onClaim,
  onComplete,
}: {
  mission: Mission;
  canClaim: boolean;
  canComplete: boolean;
  busy: boolean;
  flash: boolean;
  onClaim: () => void;
  onComplete: () => void;
}) {
  const m = mission;
  const where = m.toilet ? `${m.toilet.code} · ${m.toilet.name}` : 'Nodo';
  const hood = m.toilet?.neighborhood ? `, ${m.toilet.neighborhood}` : '';
  const diff = KIND_DIFFICULTY[m.kind];
  const artifact = KIND_ARTIFACT[m.kind];
  const openMins = minutesSince(m.opened_at);
  const urgent = m.status === 'open' && openMins >= 60;

  const button =
    m.status === 'done' || m.status === 'verified' ? (
      <button className="opbtn done" disabled>
        Completada ✓
      </button>
    ) : m.status === 'claimed' ? (
      <button className="opbtn fin" onClick={onComplete} disabled={!canComplete || busy}>
        {busy ? '…' : 'Completar'}
      </button>
    ) : (
      <button className="opbtn go" onClick={onClaim} disabled={!canClaim || busy}>
        {busy ? '…' : 'Aceptar'}
      </button>
    );

  const timer =
    m.status === 'claimed' ? (
      <span className="timer">aceptada · en curso</span>
    ) : m.status === 'open' ? (
      <span className="timer">
        ⏱ <b>{openMins}</b> min abierta
      </span>
    ) : null;

  return (
    <div className={`op ${m.status}${flash ? ' flash' : ''}`}>
      <div className="ophead">
        <span className="optype">{KIND_LABEL[m.kind]}</span>
        {urgent && <span className="urg">URGENTE</span>}
        <DiffDots n={diff} />
        {timer}
      </div>
      <div className="opwhere">
        📍 {where}
        {hood}
      </div>
      <div className="oploot">
        <span className="loot xp">✦ {m.reward_xp} XP</span>
        <span className="loot oro">◈ {m.reward_oro}</span>
        {artifact && <span className="loot item">🎁 {artifact}</span>}
        {button}
      </div>
    </div>
  );
}
