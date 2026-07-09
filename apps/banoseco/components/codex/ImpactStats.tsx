import type { ImpactSummary } from '@/lib/types';
import { fmt, fmtMxn } from '@/lib/format';

export function ImpactStats({ impact }: { impact: ImpactSummary | null }) {
  const v = (n: number | undefined, money = false) =>
    impact == null ? '—' : money ? fmtMxn(n ?? 0) : fmt(Math.round(n ?? 0));
  return (
    <div className="impact">
      <div className="ic">
        <div className="n">{v(impact?.active_toilets)}</div>
        <div className="l">nodos en la red</div>
        <div className="sub">y creciendo</div>
      </div>
      <div className="ic">
        <div className="n">{v(impact?.liters_water_saved)}</div>
        <div className="l">litros de agua salvados</div>
        <div className="sub">vs. inodoro de agua</div>
      </div>
      <div className="ic">
        <div className="n">{v(impact?.soil_kg)}</div>
        <div className="l">kg de tierra creada</div>
        <div className="sub">a huertos urbanos</div>
      </div>
      <div className="ic">
        <div className="n">{v(impact?.total_donated_mxn, true)}</div>
        <div className="l">MXN donados</div>
        <div className="sub">reinvertidos</div>
      </div>
    </div>
  );
}
