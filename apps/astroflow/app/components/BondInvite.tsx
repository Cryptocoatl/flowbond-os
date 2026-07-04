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
      className={
        compact
          ? 'text-xs bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-3 py-1.5 hover:bg-[#9a8fe0]/30 transition'
          : 'text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 py-2 hover:brightness-110 transition'
      }
    >
      {state === 'copied' ? 'Bond link copied ✓' : state === 'error' ? 'Create your chart first' : state === 'busy' ? '…' : '✦ Invite a friend — copy your bond link'}
    </button>
  );
}
