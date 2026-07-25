'use client';

import type { RegionVisualState } from '@flowbond/state-engine';

const CHANNELS: Array<keyof RegionVisualState> = [
  'vitality',
  'canopy',
  'water',
  'biodiversity',
  'communityPulse',
];

// Hidden dev panel (?debug=1). Phase 1 acceptance: dragging vitality 0→1
// visibly transforms the region and audio.
export function DebugPanel({
  state,
  onChange,
}: {
  state: RegionVisualState;
  onChange: (s: RegionVisualState) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 240,
        padding: 14,
        borderRadius: 12,
        background: 'rgba(6,12,10,0.82)',
        color: '#cfe3d8',
        font: '12px system-ui, sans-serif',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, letterSpacing: 0.4 }}>state · debug</div>
      {CHANNELS.map((c) => (
        <label key={c} style={{ display: 'block', marginBottom: 10 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{c}</span>
            <span style={{ opacity: 0.7 }}>{state[c].toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state[c]}
            onChange={(e) => onChange({ ...state, [c]: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </label>
      ))}
    </div>
  );
}
