'use client';
import { useState } from 'react';
import { browserClient } from '../../lib/supabase';

// One tap → send your personal astrobond link. Whoever opens it goes FBID-first
// (login → chart) and lands bonded: mutual visibility, ready to be woven into
// constellations together.
//
// Sending is guaranteed to work everywhere: we use the native share sheet on
// mobile, fall back to the clipboard, and — if a locked-down in-app/insecure
// browser blocks both — reveal the link so it can always be copied by hand.
// "Create your chart first" is shown ONLY when the link can't be minted at all.
type State = 'idle' | 'busy' | 'shared' | 'copied' | 'reveal' | 'nochart';

export default function BondInvite({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [link, setLink] = useState('');

  async function invite() {
    setState('busy');

    // 1) Mint the link. Only a genuine failure here means "no chart yet".
    let url: string;
    try {
      const { data, error } = await browserClient().rpc('my_bond_code');
      if (error || !data) throw error ?? new Error('no code');
      url = `${window.location.origin}/bond/${data}`;
      setLink(url);
    } catch {
      setState('nochart');
      setTimeout(() => setState('idle'), 3500);
      return;
    }

    // We now have a valid link — from here on the user MUST be able to send it.
    const text = 'Bond our skies on AstroFlow ✦ — open this and tap “Bond our skies”:';

    // 2) Native share sheet (best on mobile).
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'AstroFlow', text, url });
        setState('shared');
        setTimeout(() => setState('idle'), 2000);
        return;
      } catch (e) {
        // User dismissed the share sheet — not an error, just stop quietly.
        if ((e as Error)?.name === 'AbortError') { setState('idle'); return; }
        // Otherwise fall through to clipboard.
      }
    }

    // 3) Clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 3000);
      return;
    } catch {
      // 4) Last resort — reveal the link for manual copy (never a dead end).
      setState('reveal');
    }
  }

  const label =
    state === 'shared' ? 'Invite sent ✓'
    : state === 'copied' ? 'Bond link copied ✓ — send it to your friend'
    : state === 'nochart' ? 'Create your chart first'
    : state === 'busy' ? '…'
    : '✦ Invite a friend — share your bond link';

  return (
    <div className={compact ? 'inline-block' : 'w-full'}>
      <button
        onClick={invite}
        disabled={state === 'busy'}
        className={compact ? 'af-btn af-btn-ghost af-btn-sm' : 'af-btn af-btn-gold'}
      >
        {label}
      </button>

      {state === 'reveal' && link && (
        <div className="mt-2.5 text-left">
          <p className="text-[11px] text-[#b6abec] mb-1.5">
            Copy this link and send it to your friend — when they open it and tap “Bond our skies,” you’re bonded:
          </p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="af-input text-xs font-mono w-full select-all"
          />
        </div>
      )}
    </div>
  );
}
