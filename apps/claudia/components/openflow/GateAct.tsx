'use client';

import { useCallback, useRef, useState } from 'react';
import Particles from './Particles';
import { checkKey } from '@/lib/openflow/gatekey';
import { logOpenflow } from '@/lib/openflow/analytics';

const SEQUENCE_MS = 4300; // full key-turn → iris → pass-through

/** Octagon path centered at (c,c) with circumradius r, flat-top orientation. */
function octagon(c: number, r: number): string {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

function GoldenKey({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g stroke="#C9A227" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <circle cx="15" cy="15" r="8" fill="rgba(201,162,39,0.18)" />
        <circle cx="15" cy="15" r="3.2" fill="#C9A227" stroke="none" />
        <path d="M21 21 L38 38" />
        <path d="M32 32 L36 28" />
        <path d="M37 37 L41 33" />
      </g>
    </svg>
  );
}

export default function GateAct({ onUnlocked }: { onUnlocked: () => void }) {
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState<'idle' | 'error' | 'opening'>('idle');
  const [fails, setFails] = useState(0);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipArmed = useRef(false);

  const finish = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onUnlocked();
  }, [onUnlocked]);

  const submit = useCallback(async () => {
    if (busy || phase === 'opening') return;
    setBusy(true);
    const ok = await checkKey(value);
    setBusy(false);
    if (ok) {
      setPhase('opening');
      logOpenflow('gate_unlocked', { fails });
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      timerRef.current = setTimeout(finish, reduced ? 700 : SEQUENCE_MS);
    } else {
      const n = fails + 1;
      setFails(n);
      logOpenflow('gate_failed', { attempt: n }, false);
      setPhase('error');
      setTimeout(() => setPhase((p) => (p === 'error' ? 'idle' : p)), 650);
    }
  }, [busy, phase, value, fails, finish]);

  // during the opening sequence a tap skips to the end (prompt: skippable on second tap)
  const onStageClick = () => {
    if (phase !== 'opening') return;
    if (skipArmed.current) finish();
    else skipArmed.current = true;
  };

  return (
    <div
      className={`of-act of-gate--${phase === 'opening' ? 'opening' : phase === 'error' ? 'error' : 'idle'} ${phase === 'opening' ? 'of-gate--opening' : ''} ${phase === 'error' ? 'of-gate--error' : ''}`}
      onClick={onStageClick}
    >
      <Particles mode={phase === 'opening' ? 'rush' : 'drift'} />
      {/* ceiba-root filigree → circuit traces, growing from the bottom edge */}
      <svg className="of-roots" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g stroke="#2E8B6E" strokeWidth="1.1" fill="none" opacity="0.55">
          <path d="M80 260 C120 200 100 160 170 130 M170 130 h40 v-18 h30" />
          <path d="M240 260 C250 210 300 200 310 150 M310 150 h52 v-20" />
          <path d="M400 260 C400 210 380 190 400 140 M400 140 h-36 v-22 h-28" />
          <path d="M560 260 C540 205 590 190 580 145 M580 145 h44 v-16 h26" />
          <path d="M700 260 C690 215 730 195 715 155 M715 155 h-40 v-24" />
          <circle cx="240" cy="112" r="3" fill="#2E8B6E" stroke="none" />
          <circle cx="362" cy="130" r="3" fill="#C9A227" stroke="none" />
          <circle cx="650" cy="129" r="3" fill="#2E8B6E" stroke="none" />
          <circle cx="336" cy="118" r="2.4" fill="#2E8B6E" stroke="none" />
        </g>
      </svg>

      <div className="of-center of-passthrough" style={{ position: 'relative', zIndex: 1 }}>
        <div className="of-gate-stage">
          <svg className="of-gate-svg" viewBox="0 0 400 400" role="img" aria-label="The sealed FlowBond gate">
            <g className="of-iris">
              <path className="of-ring of-ring--breathe of-ring-outer" d={octagon(200, 178)} fill="none" stroke="#0E4B4D" strokeWidth="7" style={{ transition: 'stroke 0.4s' }} />
              <path className="of-ring of-ring--breathe2" d={octagon(200, 148)} fill="none" stroke="#2E8B6E" strokeWidth="4.5" opacity="0.9" />
              <path className="of-ring of-ring--breathe" d={octagon(200, 118)} fill="none" stroke="#C9A227" strokeWidth="3" opacity="0.95" />
              <path className="of-ring of-ring--breathe2" d={octagon(200, 90)} fill="none" stroke="#E86A5E" strokeWidth="2" opacity="0.8" />
              <path className="of-ring of-ring--breathe" d={octagon(200, 64)} fill="none" stroke="#C9A227" strokeWidth="1.4" opacity="0.7" />
              {/* center lock */}
              <circle cx="200" cy="200" r="26" fill="rgba(2,12,12,0.85)" stroke="#C9A227" strokeWidth="2" />
              <circle cx="200" cy="193" r="6" fill="none" stroke="#C9A227" strokeWidth="2.2" />
              <path d="M200 198 v14" stroke="#C9A227" strokeWidth="2.2" strokeLinecap="round" />
              {/* the key, revealed + turned during the opening sequence */}
              <g className="of-lockkey">
                <g transform="translate(178,178) scale(0.92)">
                  <circle cx="15" cy="15" r="8" fill="rgba(201,162,39,0.3)" stroke="#C9A227" strokeWidth="2.4" />
                  <path d="M21 21 L38 38 M32 32 L36 28 M37 37 L41 33" stroke="#C9A227" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </svg>
          <div className="of-goldflood" />

          <p className="of-gate-prompt">“This gate opens for one guardian. Enter the key.”</p>
          <div className="of-keyrow">
            <input
              className="of-keyinput"
              type="password"
              value={value}
              placeholder="the magic key"
              aria-label="Enter the key"
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              disabled={phase === 'opening'}
            />
            <button className="of-keybtn" onClick={submit} aria-label="Turn the key" disabled={phase === 'opening'}>
              <GoldenKey />
            </button>
          </div>
          {fails >= 3 && phase !== 'opening' && (
            <p className="of-patient">The gate is patient. Ask Love for the key.</p>
          )}
        </div>
      </div>
    </div>
  );
}
