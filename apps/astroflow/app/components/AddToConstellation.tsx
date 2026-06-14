'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

// Host-only: grow a constellation by searching a friend's @handle and weaving
// them in. You can only add people you're connected to (a bond, or they granted
// you) — the RPC enforces it; here we just surface a friendly nudge to bond first.
interface Result {
  handle: string; display_name: string; avatar_color: string;
  is_self: boolean; is_friend: boolean; request_pending: boolean;
}

export default function AddToConstellation({ mapId, existingHandles }: { mapId: string; existingHandles: string[] }) {
  const router = useRouter();
  const sb = browserClient();
  const have = new Set(existingHandles);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function onSearch(v: string) {
    setQ(v); setNote('');
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

  async function add(handle: string) {
    setBusy(handle); setNote('');
    try {
      const { error } = await sb.rpc('add_member_to_map', { p_map_id: mapId, p_member_handle: handle });
      if (error) {
        setNote(/not_connected/.test(error.message) ? `Bond with @${handle} first, then add them.` : error.message);
        return;
      }
      setQ(''); setResults([]); setOpen(false);
      router.refresh();
    } finally { setBusy(''); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="af-btn af-btn-primary af-btn-sm mt-3">
        + Add someone
      </button>
    );
  }

  return (
    <div className="af-card p-4 mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec]">Add someone to this constellation</p>
        <button onClick={() => { setOpen(false); setQ(''); setResults([]); }} className="text-[#9698a8] text-sm">✕</button>
      </div>
      <input
        value={q}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search a friend by @handle…"
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        className="af-input"
      />
      {q.trim().length >= 2 && (
        <div className="divide-y divide-white/5">
          {searching && results.length === 0 ? (
            <p className="text-sm text-[#9698a8] py-2">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-[#9698a8] py-2">No one found for “{q.trim()}”.</p>
          ) : (
            results.map((r) => (
              <div key={r.handle} className="flex items-center gap-3 py-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-full text-[12px] font-semibold text-[#0a0b12] shrink-0" style={{ background: r.avatar_color || '#9a8fe0' }}>
                  {(r.display_name || '?').trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#ece9e0] truncate">{r.display_name}</p>
                  <p className="text-xs font-mono text-[#5b5e72] truncate">@{r.handle}</p>
                </div>
                {have.has(r.handle) ? (
                  <span className="text-xs text-[#7fd1a8] px-2">In ✓</span>
                ) : (
                  <button onClick={() => add(r.handle)} disabled={busy === r.handle} className="af-btn af-btn-primary af-btn-sm">
                    Add
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
      {note && <p className="text-xs text-[#d9883c]">{note}</p>}
    </div>
  );
}
