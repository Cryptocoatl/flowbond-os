'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  quote, SPACES, PERIODS, PROFILES, OOH_BENCHMARK, ECONOMICS, LEGAL,
  fmtMxn, tierFor, type Riel, type Profile,
} from '@flowbond/sanitemplo-core';
import RielSwitch from './RielSwitch';
import LogoDrop from './LogoDrop';
import NodeLattice from './NodeLattice';
import Reservar from './Reservar';

const TempleCanvas = dynamic(() => import('./TempleCanvas'), {
  ssr: false, loading: () => <div className="st-card">Encendiendo el baño…</div>,
});

// escala log para nº de baños
const STEPS = 1000, TMAX = 2000;
const toTemplos = (t: number) => Math.max(1, Math.round(10 ** ((t / STEPS) * Math.log10(TMAX))));
const toSlider = (n: number) => Math.round((Math.log10(Math.min(TMAX, Math.max(1, n))) / Math.log10(TMAX)) * STEPS);

const m2 = (s: { cm?: [number, number] }) => (s.cm ? (s.cm[0] / 100) * (s.cm[1] / 100) : null);
const SELLABLE = SPACES.filter((s) => !s.sacred).length; // 11 por templo

export default function SponsorsSurface() {
  const [templos, setTemplos] = useState(25);
  const [periodId, setPeriodId] = useState('d5');
  const [riel, setRiel] = useState<Riel>('A');
  const [spaceIds, setSpaceIds] = useState<string[]>(['sol', 'loto', 'luna']);
  const [brand, setBrand] = useState<string | null>(null);

  const q = useMemo(
    () => quote({ visits: 0, templos, periodId, riel, spaceIds, withIva: riel === 'A' }),
    [templos, periodId, riel, spaceIds],
  );

  const period = PERIODS.find((p) => p.id === periodId)!;
  const railSpaces = SPACES.filter((s) => s.riel === riel && !s.sacred);
  const brandSpots = templos * spaceIds.length;

  function toggle(id: string) {
    setSpaceIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function selectFromBano(id: string) {
    const sp = SPACES.find((s) => s.id === id);
    if (!sp || sp.sacred) return;
    if (sp.riel !== riel) { setRiel(sp.riel); setSpaceIds([id]); }
    else setSpaceIds((p) => (p.includes(id) ? p : [...p, id]));
  }
  function changeRiel(r: Riel) {
    setRiel(r);
    setSpaceIds((p) => { const k = p.filter((id) => SPACES.find((s) => s.id === id)?.riel === r); return k.length ? k : r === 'B' ? ['placa'] : ['sol']; });
  }
  function applyProfile(p: Profile) {
    setRiel(p.riel); setTemplos(p.nodes); setPeriodId(p.periodId);
    setSpaceIds(p.spaces.filter((id) => SPACES.find((s) => s.id === id)?.riel === p.riel && !SPACES.find((s) => s.id === id)?.sacred));
  }

  return (
    <>
      {/* ── header ── */}
      <header className="st-section" style={{ paddingBottom: 0 }}>
        <div className="st-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', letterSpacing: '0.14em' }}>SANI TEMPLO</h1>
          <nav className="st-nav">
            <a href="#config">Patrocinio</a><a href="#impacto">Sustentabilidad</a>
            <a href="#nodos">Red</a><a href="/fondo">Fondo</a>
          </nav>
        </div>
        <div className="st-wrap"><hr className="st-hair" style={{ marginTop: 18 }} /></div>
      </header>

      {/* ── tesis ── */}
      <section className="st-section" style={{ paddingTop: 'clamp(28px,5vw,56px)', paddingBottom: 'clamp(20px,3vw,32px)' }}>
        <div className="st-wrap">
          <p className="st-eyebrow">Baños que honran la Tierra · patrocinio en lonas</p>
          <h2 style={{ fontSize: 'clamp(28px,5vw,52px)', marginTop: 14, maxWidth: '20ch' }}>
            No patrocinas un panel. <span className="st-gold">Patrocinas un baño.</span>
          </h2>
          <p className="st-lead" style={{ marginTop: 16, fontSize: 17 }}>
            Tu marca vive en las lonas de baños secos que ahorran agua real. Se cobra por baño, se
            mide en litros, y cada lona que ves es el archivo de impresión.
          </p>
          <div className="st-doors" style={{ marginTop: 22 }}>
            {PROFILES.filter((p) => p.riel === 'A' || LEGAL.acDonataria.verified).slice(0, 4).map((p) => (
              <button key={p.id} className="st-door" onClick={() => applyProfile(p)}>
                <div className="st-door-name">{p.name}</div>
                <div className="st-door-blurb">{p.blurb}</div>
                <div className="st-num" style={{ fontSize: 12, marginTop: 8, color: 'var(--st-oro)' }}>{p.nodes} baños · Riel {p.riel}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── configurador: baño 3D + espacios ── */}
      <section className="st-section" id="config" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <div className="st-grid">
            <TempleCanvas brandUrl={brand} selected={spaceIds} onSelectSpace={selectFromBano} onAltar={() => { }} />

            <div className="st-card">
              <p className="st-eyebrow" style={{ letterSpacing: '0.14em' }}>Espacios · {SELLABLE} por templo</p>
              <div style={{ marginTop: 8 }}>
                {railSpaces.map((s) => {
                  const on = spaceIds.includes(s.id);
                  const area = m2(s);
                  return (
                    <div key={s.id} className="st-esp" data-on={on} role="button" tabIndex={0}
                      onClick={() => toggle(s.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s.id); } }}>
                      <span className="st-check" aria-hidden style={{ marginTop: 4 }} />
                      <span>
                        <span className="st-esp-name">{s.name}</span>
                        <span className="st-esp-dim">{s.cm ? `${s.cm[0]}×${s.cm[1]} cm · ×${s.qty}` : `${s.why.slice(0, 34)}…`}</span>
                        {area ? <span className="st-esp-m2">{fmtMxn(s.price / area)} / m² / mes</span> : null}
                      </span>
                      <span className="st-esp-price"><b>{s.price === 0 ? 'sin costo' : fmtMxn(s.price)}</b><span>/ mes</span></span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 16 }}>
                <p className="st-eyebrow" style={{ letterSpacing: '0.14em' }}>Tu marca en las lonas</p>
                <div style={{ marginTop: 8 }}><LogoDrop riel={riel} dataUrl={brand} onChange={setBrand} /></div>
              </div>
            </div>
          </div>

          {/* controles: baños + plazo + riel */}
          <div className="st-card" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 18 }}><RielSwitch riel={riel} onChange={changeRiel} /></div>
            <div className="st-field">
              <label className="st-label" htmlFor="tpl"><span>¿Cuántos baños llevan tu marca?</span>
                <span className="st-value">{templos.toLocaleString('es-MX')} baños · vol {tierFor(templos).label}</span></label>
              <input id="tpl" className="st-slider" type="range" min={0} max={STEPS} value={toSlider(templos)}
                onChange={(e) => setTemplos(toTemplos(Number(e.target.value)))} />
            </div>
            <div className="st-field" style={{ marginBottom: 0 }}>
              <div className="st-label"><span>Plazo</span></div>
              <div className="st-seg">
                {PERIODS.map((p) => (
                  <button key={p.id} data-on={p.id === periodId} onClick={() => setPeriodId(p.id)}>
                    {p.label}{'tag' in p && p.tag ? <span style={{ opacity: 0.6 }}> · {p.tag}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── cómo se arma tu precio + stat tiles ── */}
      <section className="st-section" id="impacto" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <div className="st-card">
            <p className="st-eyebrow" style={{ letterSpacing: '0.14em' }}>Cómo se arma tu precio</p>
            <div style={{ marginTop: 12 }}>
              <div className="st-line"><span className="st-line-label">Tarifa lista · espacios elegidos</span><span className="st-num">{fmtMxn(q.presenceList)} / mes</span></div>
              {q.discounts.map((d, i) => (
                <div className="st-line" key={i}>
                  <span><span className="st-line-label">{d.label}</span>{d.pct > 0 ? <span className="st-line-pct" style={{ marginLeft: 8 }}>−{d.pct}%</span> : null}</span>
                  <span className="st-num">{fmtMxn(d.result)}{d.label.includes('Plazo') || d.label.includes('Piso') ? '' : ' / mes'}</span>
                </div>
              ))}
              <div className="st-total">
                <span style={{ fontFamily: 'var(--st-font-display)', letterSpacing: '0.05em' }}>Por templo · {period.label}</span>
                <span className="st-num st-gold">{fmtMxn(q.presencePerTemplo)}</span>
              </div>
              {q.presenceSaved > 0 ? (
                <p className="st-line-pct" style={{ marginTop: 10 }}>Ahorras {fmtMxn(q.presenceSaved)} contra tarifa lista — {Math.round(q.presenceSavedPct * 100)}% menos por {templos} baños a {period.label}.</p>
              ) : null}
            </div>

            <div className="st-tiles" style={{ marginTop: 18 }}>
              <div className="st-tile"><div className="st-tile-fig st-money">{fmtMxn(q.total)}</div><div className="st-tile-lbl">Inversión total</div></div>
              <div className="st-tile"><div className="st-tile-fig">{fmtMxn(q.presenceMonthly)}</div><div className="st-tile-lbl">Por templo / mes</div></div>
              <div className="st-tile"><div className="st-tile-fig st-agua">{Math.round(q.impact.litros).toLocaleString('es-MX')} L</div><div className="st-tile-lbl">Agua no usada</div></div>
              <div className="st-tile"><div className="st-tile-fig st-agua">{Math.round(q.impact.compostaKg).toLocaleString('es-MX')} kg</div><div className="st-tile-lbl">Residuo a compostaje</div></div>
            </div>

            <p className="st-lead" style={{ fontSize: 13, marginTop: 14 }}>
              El ticket mínimo de mobiliario urbano en México es {fmtMxn(OOH_BENCHMARK.mensualMxn)}/mes por {OOH_BENCHMARK.caras} caras — {OOH_BENCHMARK.m2} m², sin medición de ningún tipo. Aquí, cada baño mide sus litros y su alcance.
            </p>
          </div>
        </div>
      </section>

      {/* ── qué te llevas hoy · qué queda reservado ── */}
      <section className="st-section" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <p className="st-eyebrow">Qué te llevas hoy · qué queda reservado</p>
          <div className="st-cols" style={{ marginTop: 16 }}>
            <div className="st-card">
              <span className="st-chip st-chip-now">Inmediato · contractual</span>
              <div style={{ marginTop: 12 }}>
                <div className="st-kv"><b>{Math.round(q.impact.litros).toLocaleString('es-MX')} L</b><span className="st-lead">de agua que estos baños no usaron</span></div>
                <div className="st-kv"><b>{Math.round(q.impact.compostaKg).toLocaleString('es-MX')} kg</b><span className="st-lead">de residuo desviado a compostaje</span></div>
                <div className="st-kv"><b>{brandSpots.toLocaleString('es-MX')}</b><span className="st-lead">lonas con tu marca ({templos} baños × {spaceIds.length} espacios), con QR y escaneo atribuido</span></div>
              </div>
            </div>
            <div className="st-card">
              <span className="st-chip st-chip-later">Después · opción sin costo</span>
              <div style={{ marginTop: 12 }}>
                <div className="st-kv"><b>0 MXN</b><span className="st-lead">costo de reservar tu claim de origen</span></div>
                <div className="st-kv"><b>Sin fecha</b><span className="st-lead">el registro de trazabilidad está en construcción</span></div>
              </div>
              <p className="st-lead" style={{ fontSize: 12, marginTop: 10, borderLeft: '2px solid var(--st-loto)', paddingLeft: 10 }}>{LEGAL.disclaimer}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── nodos ── */}
      <div id="nodos"><NodeLattice /></div>

      {/* ── reservar ── */}
      <section className="st-section" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <Reservar draft={{ templos, periodId, riel, spaceIds, cadence: 'unica' }} q={q} />
        </div>
      </section>

      <footer className="st-section" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <hr className="st-hair" />
          <p className="st-lead" style={{ fontSize: 12, marginTop: 20 }}>
            Sani Templo · baños que honran la Tierra. Las lonas se dibujan a escala en centímetros:
            lo que gira en pantalla es el arte de impresión. Precios sobre tarifa de espacios por templo/mes.
          </p>
        </div>
      </footer>
    </>
  );
}
