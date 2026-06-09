'use client';

import { SEALED_AVAILABLE } from '../../lib/claudia/local-model';

// The active confidentiality boundary, stated honestly (master spec §5).
//  • Sealed (on-device)      → "literally no one". DEFERRED in M1 (disabled).
//  • Private cloud (Anthropic ZDR) → FlowBond is blind; Anthropic processes
//    plaintext transiently under Commercial Terms + Zero Data Retention.
export function ModeBadge() {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
      <span
        title="FlowBond stores only ciphertext. Anthropic processes plaintext transiently under Commercial Terms (no training) + Zero Data Retention. Not a TEE/attested enclave yet."
        style={badge('rgba(47,182,168,.14)', 'rgba(47,182,168,.4)', '#9fe7df')}
      >
        ☁️ Private cloud · Anthropic ZDR
      </span>
      <span
        title={SEALED_AVAILABLE ? 'On-device — no one but you.' : 'On-device tier — coming. The only “literally no one” mode.'}
        style={{ ...badge('rgba(244,241,234,.05)', 'rgba(244,241,234,.12)', 'rgba(244,241,234,.4)'), cursor: 'not-allowed' }}
      >
        🔒 Sealed · on device {SEALED_AVAILABLE ? '' : '(coming)'}
      </span>
    </div>
  );
}

function badge(bg: string, border: string, color: string): React.CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: '0.04em',
    padding: '4px 10px',
    borderRadius: 999,
    background: bg,
    border: `1px solid ${border}`,
    color,
    fontFamily: 'system-ui, sans-serif',
  };
}
