'use client';
import { useEffect, useRef, useState } from 'react';

type Counts = { views: number; likes: number; interactions: number; points_minted: number };

export default function EngageBar({ id, initial }: { id: string; initial: Counts }) {
  const [c, setC] = useState<Counts>(initial);
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const viewed = useRef(false);

  async function engage(kind: 'view' | 'like') {
    const res = await fetch(`/api/p/${id}/engage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }),
    });
    if (res.status === 401) { window.location.assign(`/auth/login?next=/p/${id}`); return null; }
    return res.ok ? ((await res.json()) as Counts) : null;
  }

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    engage('view').then((d) => d && setC(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function like() {
    setLiking(true);
    const d = await engage('like');
    if (d) { setC(d); setLiked(true); }
    setLiking(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={like} disabled={liking || liked}
        className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: liked ? 'var(--panel-2)' : 'var(--flow-grad)', color: liked ? 'var(--ink)' : '#0a0810' }}>
        ♥ {liked ? 'Liked' : 'Like'} · {c.likes}
      </button>
      <span className="rounded-xl border px-3 py-2.5 text-[13px] text-white/55" style={{ borderColor: 'var(--border)' }}>{c.views} views</span>
      <span className="rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>{c.points_minted} pts paid</span>
    </div>
  );
}
