'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '../../lib/supabase';
import QrPanel from './QrPanel';

// Invite a friend to bond — as a link OR a QR code, their choice. Whoever opens
// it goes FBID-first (login → chart) and lands bonded: mutual visibility, ready
// to be woven into constellations together.
//
// Sending is guaranteed to work everywhere: native share sheet on mobile,
// clipboard fallback, and — if a locked-down in-app/insecure browser blocks
// both — the link is revealed for manual copy. The QR is minted up front so a
// friend across the table can just scan it. "Create your chart first" appears
// ONLY when the bond link genuinely can't be minted.
type State = 'idle' | 'busy' | 'shared' | 'copied' | 'reveal' | 'nochart';

export default function BondInvite({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [link, setLink] = useState('');

  // Mint the personal bond link once on mount so both Share and QR are ready.
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await browserClient().rpc('my_bond_code');
        if (error || !data) return; // not signed in / no chart yet — handled on tap
        setLink(`${window.location.origin}/bond/${data}`);
      } catch {
        /* ignore — share() re-checks and shows the right message */
      }
    })();
  }, []);

  async function ensureLink(): Promise<string | null> {
    if (link) return link;
    try {
      const { data, error } = await browserClient().rpc('my_bond_code');
      if (error || !data) throw error ?? new Error('no code');
      const url = `${window.location.origin}/bond/${data}`;
      setLink(url);
      return url;
    } catch {
      return null;
    }
  }

  async function share() {
    setState('busy');
    const url = await ensureLink();
    if (!url) {
      setState('nochart');
      setTimeout(() => setState('idle'), 3500);
      return;
    }

    const text = 'Bond our skies on AstroFlow ✦ — open this and tap “Bond our skies”:';

    // Native share sheet (best on mobile).
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'AstroFlow', text, url });
        setState('shared');
        setTimeout(() => setState('idle'), 2000);
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') { setState('idle'); return; }
      }
    }
    // Clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 3000);
      return;
    } catch {
      setState('reveal'); // last resort — never a dead end
    }
  }

  const label =
    state === 'shared' ? 'Invite sent ✓'
    : state === 'copied' ? 'Bond link copied ✓'
    : state === 'nochart' ? 'Create your chart first'
    : state === 'busy' ? '…'
    : '✦ Invite a friend — share your bond link';

  return (
    <div className={compact ? 'inline-block' : 'w-full'}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={share}
          disabled={state === 'busy'}
          className={compact ? 'af-btn af-btn-ghost af-btn-sm' : 'af-btn af-btn-gold'}
        >
          {label}
        </button>
        {link && (
          <QrPanel
            url={link}
            label="Show my QR"
            caption="Have your friend scan this — they’ll open your bond invite, sign in, and your skies bond."
          />
        )}
      </div>

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
