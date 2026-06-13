'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

// Find people by their handle and weave AstralBonds. Until someone accepts your
// bond you see only their minimum public info (name, @handle, avatar) — never
// their chart. Self-contained: drop it anywhere; it loads its own incoming
// requests and refreshes the app on any change.

interface Result {
  handle: string;
  display_name: string;
  avatar_color: string;
  is_self: boolean;
  is_friend: boolean;
  request_pending: boolean;
}
interface Incoming { handle: string; display_name: string; avatar_color: string }

function Avatar({ color, name }: { color: string; name: string }) {
  return (
    <span
      className="grid place-items-center w-9 h-9 rounded-full text-[13px] font-semibold text-[#0a0b12] shrink-0"
      style={{ background: color || '#9a8fe0' }}
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function FindFriends() {
  const router = useRouter();
  const sb = browserClient();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [busy, setBusy] = useState<string>(''); // handle currently acting on
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function loadIncoming() {
    const { data } = await sb.rpc('my_incoming_bond_requests');
    setIncoming((data as Incoming[]) ?? []);
  }
  useEffect(() => {
    loadIncoming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced + sequence-guarded search (no out-of-order results)
  function onSearch(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    const term = v.trim();
    if (term.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const my = ++seq.current;
    timer.current = setTimeout(async () => {
      const { data } = await sb.rpc('search_profiles', { q: term });
      if (my === seq.current) { setResults((data as Result[]) ?? []); setSearching(false); }
    }, 280);
  }

  async function requestBond(handle: string) {
    setBusy(handle);
    try {
      const { data } = await sb.rpc('request_bond', { target_handle: handle });
      const status = (data as { status?: string })?.status;
      setResults((rs) => rs.map((r) => (r.handle === handle
        ? { ...r, request_pending: status === 'requested', is_friend: status === 'bonded' || status === 'already_bonded' }
        : r)));
      if (status === 'bonded') router.refresh();
    } finally { setBusy(''); }
  }

  async function accept(handle: string) {
    setBusy(handle);
    try {
      await sb.rpc('accept_bond_request', { requester_handle: handle });
      setIncoming((xs) => xs.filter((x) => x.handle !== handle));
      router.refresh();
    } finally { setBusy(''); }
  }
  async function decline(handle: string) {
    setBusy(handle);
    try {
      await sb.rpc('decline_bond_request', { requester_handle: handle });
      setIncoming((xs) => xs.filter((x) => x.handle !== handle));
    } finally { setBusy(''); }
  }

  return (
    <div className="space-y-4">
      {/* Incoming bond requests */}
      {incoming.length > 0 && (
        <div className="af-card p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec] mb-3">
            Bond requests · {incoming.length}
          </p>
          <div className="space-y-2.5">
            {incoming.map((r) => (
              <div key={r.handle} className="flex items-center gap-3">
                <Avatar color={r.avatar_color} name={r.display_name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#ece9e0] truncate">{r.display_name}</p>
                  <p className="text-xs font-mono text-[#5b5e72] truncate">@{r.handle}</p>
                </div>
                <button onClick={() => accept(r.handle)} disabled={busy === r.handle} className="af-btn af-btn-primary af-btn-sm">
                  ✦ Accept
                </button>
                <button onClick={() => decline(r.handle)} disabled={busy === r.handle} className="af-btn af-btn-ghost af-btn-sm">
                  Decline
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search by handle */}
      <div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5b5e72]">⌕</span>
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Find people by their @handle…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="af-input pl-9"
          />
        </div>

        {q.trim().length >= 2 && (
          <div className="mt-2 af-card divide-y divide-white/5 overflow-hidden">
            {searching && results.length === 0 ? (
              <p className="text-sm text-[#9698a8] p-4">Searching the flow…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-[#9698a8] p-4">No one found for “{q.trim()}”. Invite them with your bond link below.</p>
            ) : (
              results.map((r) => (
                <div key={r.handle} className="flex items-center gap-3 p-3">
                  <Avatar color={r.avatar_color} name={r.display_name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#ece9e0] truncate">{r.display_name}</p>
                    <p className="text-xs font-mono text-[#5b5e72] truncate">@{r.handle}</p>
                  </div>
                  {r.is_friend ? (
                    <span className="text-xs text-[#7fd1a8] font-medium px-2">Bonded ✓</span>
                  ) : r.request_pending ? (
                    <span className="text-xs text-[#b6abec] px-2">Requested</span>
                  ) : (
                    <button onClick={() => requestBond(r.handle)} disabled={busy === r.handle} className="af-btn af-btn-primary af-btn-sm">
                      ✦ Bond
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        <p className="text-[10px] text-[#5b5e72] mt-2 px-1">
          They only see your name &amp; @handle until you&apos;re bonded — then your skies appear in each other&apos;s constellation.
        </p>
      </div>
    </div>
  );
}
