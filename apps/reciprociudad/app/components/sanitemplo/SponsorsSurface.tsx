'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  quote,
  SPACES,
  assertReadyForProduction,
  type Riel,
  type Profile,
} from '@flowbond/sanitemplo-core';
import Hero from './Hero';

// El templo 3D es la única isla pesada; se carga solo en el cliente.
const TempleCanvas = dynamic(() => import('./TempleCanvas'), {
  ssr: false,
  loading: () => <div className="st-card">Encendiendo el templo…</div>,
});
import ProfileDoors from './ProfileDoors';
import RielSwitch from './RielSwitch';
import Tabulador from './Tabulador';
import SpaceRail from './SpaceRail';
import LogoDrop from './LogoDrop';
import Desglose from './Desglose';
import NodeLattice from './NodeLattice';
import CarbonLayer from './CarbonLayer';
import ComparativaOOH from './ComparativaOOH';
import Checkout from './Checkout';

const railSpaces = (riel: Riel) => SPACES.filter((s) => s.riel === riel && !s.sacred).map((s) => s.id);

export default function SponsorsSurface() {
  const [visits, setVisits] = useState(2400);
  const [templos, setTemplos] = useState(1);
  const [periodId, setPeriodId] = useState('m1');
  const [riel, setRiel] = useState<Riel>('A');
  const [spaceIds, setSpaceIds] = useState<string[]>(['loto']);
  const [logo, setLogo] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [perPersona, setPerPersona] = useState(false);
  const [altarNote, setAltarNote] = useState(false);

  const q = useMemo(
    () => quote({ visits, templos, periodId, riel, spaceIds, withIva: riel === 'A' }),
    [visits, templos, periodId, riel, spaceIds],
  );

  function pickProfile(p: Profile) {
    setActiveProfile(p.id);
    setRiel(p.riel);
    setVisits(p.visits);
    setTemplos(p.nodes);
    setPeriodId(p.periodId);
    setSpaceIds(p.spaces.filter((id) => SPACES.find((s) => s.id === id)?.riel === p.riel));
    setPerPersona(p.perVisitBasis === 'persona');
    setAltarNote(false);
  }

  function changeRiel(r: Riel) {
    setRiel(r);
    // Riel A y B jamás se mezclan: al cambiar, se filtran los espacios al riel nuevo.
    setSpaceIds((prev) => {
      const kept = prev.filter((id) => SPACES.find((s) => s.id === id)?.riel === r);
      if (kept.length) return kept;
      return r === 'B' ? ['placa'] : ['loto'];
    });
    setActiveProfile(null);
  }

  function toggleSpace(id: string) {
    setActiveProfile(null);
    setSpaceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Clic en un espacio DENTRO del templo → lo selecciona en el rail.
  function selectFromTemple(id: string) {
    const sp = SPACES.find((s) => s.id === id);
    if (!sp) return;
    if (sp.sacred) {
      setAltarNote(true);
      return;
    }
    setActiveProfile(null);
    if (sp.riel !== riel) {
      setRiel(sp.riel);
      setSpaceIds([id]);
    } else {
      setSpaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }

  const missing = process.env.NODE_ENV === 'production' ? [] : assertReadyForProduction();

  return (
    <>
      {/* Banner ámbar en dev: los bloqueos de go-live. En prod el build falla antes. */}
      {missing.length ? (
        <div
          role="note"
          style={{
            background: 'var(--st-oro-dim)',
            color: 'var(--st-tinta)',
            fontFamily: 'var(--st-font-mono)',
            fontSize: 12,
            padding: '10px 16px',
          }}
        >
          Falta antes de producción: {missing.join(' · ')}
        </div>
      ) : null}

      <Hero
        canvasSlot={
          <TempleCanvas logoUrl={logo} onAltar={() => setAltarNote(true)} onSelectSpace={selectFromTemple} />
        }
      />

      <ProfileDoors activeId={activeProfile} onPick={pickProfile} />

      <section className="st-section" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <div className="st-grid">
            {/* controles */}
            <div>
              <div className="st-card">
                <div style={{ marginBottom: 18 }}>
                  <RielSwitch riel={riel} onChange={changeRiel} />
                </div>
                <Tabulador
                  visits={visits}
                  templos={templos}
                  periodId={periodId}
                  perPersona={perPersona}
                  onVisits={(v) => {
                    setVisits(v);
                    setActiveProfile(null);
                  }}
                  onTemplos={(n) => {
                    setTemplos(n);
                    setActiveProfile(null);
                  }}
                  onPeriod={(id) => {
                    setPeriodId(id);
                    setActiveProfile(null);
                  }}
                />
              </div>

              <div className="st-card" style={{ marginTop: 16 }}>
                <SpaceRail
                  riel={riel}
                  spaceIds={spaceIds}
                  onToggle={toggleSpace}
                  onAltar={() => setAltarNote(true)}
                />
                {altarNote ? (
                  <p className="st-err" style={{ marginTop: 12 }}>
                    El altar no se vende. Si el altar se vende, no queda templo que patrocinar.
                  </p>
                ) : null}
              </div>

              {riel === 'A' ? (
                <div className="st-card" style={{ marginTop: 16 }}>
                  <p className="st-eyebrow" style={{ letterSpacing: '0.16em', marginBottom: 10 }}>
                    Tu marca
                  </p>
                  <LogoDrop riel={riel} dataUrl={logo} onChange={setLogo} />
                </div>
              ) : null}
            </div>

            {/* desglose vivo */}
            <Desglose q={q} riel={riel} />
          </div>
        </div>
      </section>

      <ComparativaOOH q={q} />
      <NodeLattice />
      <CarbonLayer />

      <section className="st-section" style={{ paddingTop: 0 }}>
        <div className="st-wrap" style={{ maxWidth: 620 }}>
          <Checkout draft={{ visits, templos, periodId, riel, spaceIds }} q={q} />
        </div>
      </section>

      <footer className="st-section" style={{ paddingTop: 0 }}>
        <div className="st-wrap">
          <hr className="st-hair" />
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 20 }}>
            <a className="st-eyebrow" href="/sanitemplo/sponsors/fondo" style={{ textDecoration: 'none' }}>
              Fondo Reciprociudad · auditable →
            </a>
            <a className="st-eyebrow" href="/sanitemplo" style={{ textDecoration: 'none', color: 'var(--st-cal-dim)' }}>
              El templo (film)
            </a>
          </nav>
          <p className="st-lead" style={{ fontSize: 12, marginTop: 16 }}>
            Sani Templo · baños que honran la Tierra. Afuera se anuncia, adentro se agradece.
          </p>
        </div>
      </footer>
    </>
  );
}
