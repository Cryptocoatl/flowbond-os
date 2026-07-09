import type { NearbyToilet } from '@/lib/types';
import { statusVisual, STATUS_COLOR, STATUS_LABEL } from '@/lib/status';
import { PowerRing } from './PowerRing';

export function NodeCard({
  toilet,
  selected,
  onSelect,
  onDonate,
}: {
  toilet: NearbyToilet;
  selected: boolean;
  onSelect: () => void;
  onDonate: () => void;
}) {
  const vis = statusVisual(toilet.status);
  const { cls, text } = STATUS_LABEL[vis];
  const isFull = vis === 'full';

  return (
    <div
      className={`ncard${selected ? ' sel' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="top">
        <PowerRing pct={toilet.fill_pct} color={STATUS_COLOR[vis]} />
        <div>
          <div className="code">{toilet.code}</div>
          <div className="name">
            {toilet.name}
            {toilet.neighborhood ? ` · ${toilet.neighborhood}` : ''}
          </div>
        </div>
        <div className="dist">
          <b>{toilet.distance_km != null ? toilet.distance_km.toFixed(1) : '—'}</b>km
        </div>
      </div>
      <div className="tags">
        <span className={`st ${cls}`}>{text}</span>
        <span className={`tag ${toilet.has_solar_charge ? 'on' : ''}`}>
          ☀ {toilet.has_solar_charge ? 'Carga solar' : '—'}
        </span>
        <span className={`tag ${toilet.has_recycling ? 'on' : ''}`}>
          ♺ {toilet.has_recycling ? 'Reciclaje' : '—'}
        </span>
      </div>
      {isFull ? (
        <button className="act alert" disabled>
          ⚑ Misión en curso
        </button>
      ) : (
        <button
          className="act gold"
          onClick={(e) => {
            e.stopPropagation();
            onDonate();
          }}
        >
          Activar · donar $5
        </button>
      )}
    </div>
  );
}
