'use client';

import { PERIODS, tierFor } from '@flowbond/sanitemplo-core';

/** Escala logarítmica: de 1 a 100 necesita resolución real. */
const STEPS = 1000;
const MAX_VISITS = 1_000_000;
const LOG_MAX = Math.log10(MAX_VISITS);
export const sliderToVisits = (t: number) => Math.max(1, Math.round(10 ** ((t / STEPS) * LOG_MAX)));
export const visitsToSlider = (v: number) =>
  Math.round((Math.log10(Math.min(MAX_VISITS, Math.max(1, v))) / LOG_MAX) * STEPS);

const TMAX = 1000;
const tSliderToTemplos = (t: number) => Math.max(1, Math.round(10 ** ((t / STEPS) * Math.log10(TMAX))));
const templosToTSlider = (n: number) =>
  Math.round((Math.log10(Math.min(TMAX, Math.max(1, n))) / Math.log10(TMAX)) * STEPS);

export default function Tabulador({
  visits,
  templos,
  periodId,
  perPersona,
  onVisits,
  onTemplos,
  onPeriod,
}: {
  visits: number;
  templos: number;
  periodId: string;
  perPersona?: boolean;
  onVisits: (v: number) => void;
  onTemplos: (n: number) => void;
  onPeriod: (id: string) => void;
}) {
  const tier = tierFor(templos);
  return (
    <div>
      {/* visitas */}
      <div className="st-field">
        <label className="st-label" htmlFor="st-visits">
          <span>Visitas patrocinadas{perPersona ? ' · por persona/mes' : ''}</span>
          <span className="st-value">{visits.toLocaleString('es-MX')}</span>
        </label>
        <input
          id="st-visits"
          className="st-slider"
          type="range"
          min={0}
          max={STEPS}
          value={visitsToSlider(visits)}
          onChange={(e) => onVisits(sliderToVisits(Number(e.target.value)))}
          aria-valuetext={`${visits} visitas`}
        />
      </div>

      {/* templos con presencia */}
      <div className="st-field">
        <label className="st-label" htmlFor="st-templos">
          <span>Templos con presencia</span>
          <span className="st-value">
            {templos.toLocaleString('es-MX')} · vol {tier.label}
          </span>
        </label>
        <input
          id="st-templos"
          className="st-slider"
          type="range"
          min={0}
          max={STEPS}
          value={templosToTSlider(templos)}
          onChange={(e) => onTemplos(tSliderToTemplos(Number(e.target.value)))}
          aria-valuetext={`${templos} templos`}
        />
      </div>

      {/* plazo */}
      <div className="st-field">
        <div className="st-label">
          <span>Plazo</span>
        </div>
        <div className="st-seg">
          {PERIODS.map((p) => (
            <button key={p.id} data-on={p.id === periodId} onClick={() => onPeriod(p.id)}>
              {p.label}
              {'tag' in p && p.tag ? <span style={{ opacity: 0.6 }}> · {p.tag}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
