'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

// In-app notification for incoming AstralBond requests. Bonds are two-sided:
// when someone sends you a bond (or opens your link), it waits until you accept.
// This surfaces that wait everywhere — a top banner with one-tap Accept/Decline
// so a pending bond never goes unnoticed again. Driven by the existing
// my_incoming_bond_requests() RPC (RLS-safe). Hidden on the auth/invite flows.
interface Req {
  handle: string;
  display_name: string;
  avatar_color: string;
}

export default function BondAlerts() {
  const path = usePathname() || '/';
  const router = useRouter();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState('');
  const [loaded, setLoaded] = useState(false);

  const hidden =
    path.startsWith('/auth') ||
    path.startsWith('/bond') ||
    path.startsWith('/claim') ||
    path.startsWith('/join');

  useEffect(() => {
    if (hidden) return;
    let alive = true;
    (async () => {
      const { data } = await browserClient().rpc('my_incoming_bond_requests');
      if (alive) {
        setReqs((data as Req[]) ?? []);
        setLoaded(true);
      }
    })();
    return () => { alive = false; };
    // re-check on navigation so an accept elsewhere clears it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (hidden || !loaded || reqs.length === 0) return null;

  const first = reqs[0];
  const extra = reqs.length - 1;

  async function accept(h: string) {
    setBusy(h);
    try {
      await browserClient().rpc('accept_bond_request', { requester_handle: h });
      setReqs((x) => x.filter((r) => r.handle !== h));
      router.refresh();
    } finally {
      setBusy('');
    }
  }
  async function decline(h: string) {
    setBusy(h);
    try {
      await browserClient().rpc('decline_bond_request', { requester_handle: h });
      setReqs((x) => x.filter((r) => r.handle !== h));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="px-3 pt-2 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#e3c07a]/35 bg-gradient-to-r from-[#e3c07a]/[0.12] to-[#9a8fe0]/[0.10] backdrop-blur px-3.5 py-3">
        <div className="flex items-center gap-3">
          <span
            className="grid place-items-center w-9 h-9 rounded-full text-[13px] font-semibold text-[#0a0b12] shrink-0"
            style={{ background: first.avatar_color || '#9a8fe0' }}
          >
            {(first.display_name || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#ece9e0] leading-tight">
              <span className="font-medium">{first.display_name}</span>
              <span className="text-[#cfc8e8]"> wants to bond with you ✦</span>
            </p>
            {extra > 0 ? (
              <Link href="/dashboard" className="text-xs text-[#b6abec] hover:underline">
                +{extra} more {extra === 1 ? 'request' : 'requests'} — view all
              </Link>
            ) : (
              <p className="text-[11px] text-[#9698a8] truncate">@{first.handle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => accept(first.handle)}
              disabled={busy === first.handle}
              className="af-btn af-btn-primary af-btn-sm"
            >
              ✦ Accept
            </button>
            <button
              onClick={() => decline(first.handle)}
              disabled={busy === first.handle}
              className="af-btn af-btn-ghost af-btn-sm"
              aria-label="Decline"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
