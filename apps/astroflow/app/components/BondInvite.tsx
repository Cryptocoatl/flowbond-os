'use client';
import { useState } from 'react';
import { browserClient } from '../../lib/supabase';

// One tap → your personal astrobond link on the clipboard. Whoever opens it
// goes FBID-first (login → chart) and lands bonded: mutual visibility, ready
// to be woven into constellations together.
export default function BondInvite({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');

  async function copy() {
    setState('busy');
    try {
      const { data, error } = await browserClient().rpc('my_bond_code');
      if (error || !data) throw error ?? new Error('no code');
      await navigator.clipboard.writeText(`${window.location.origin}/bond/${data}`);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  return (
    <button
      onClick={copy}
      disabled={state === 'busy'}
      className={compact ? 'af-btn af-btn-ghost af-btn-sm' : 'af-btn af-btn-gold'}
    >
      {state === 'copied' ? 'Bond link copied ✓' : state === 'error' ? 'Create your chart first' : state === 'busy' ? '…' : '✦ Invite a friend — copy your bond link'}
    </button>
  );
}
