'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles } from '../../components/icons';

const input = 'w-full rounded-lg border bg-black/20 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2';

export default function NewEvent() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.assign('/auth/login?next=/events/new');
        return;
      }
      if (!res.ok) {
        setErr(data.error || 'Could not create event');
        return;
      }
      router.push(`/events/${data.slug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-xl">
      <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> New event
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        Open a drop link
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-white/55">
        Everyone at the event signs in and drops their photos and videos into one shared pool. Invited
        editors take it from there.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/40">Event title</span>
          <input className={input} style={{ borderColor: 'var(--border)' }} value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solstice Festival 2026" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/40">Description (optional)</span>
          <textarea className={input} style={{ borderColor: 'var(--border)' }} rows={3} value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="What's this drop for?" />
        </label>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button onClick={create} disabled={busy || !title.trim()}
          className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--cta)' }}>
          <Plus className="h-5 w-5" /> {busy ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </main>
  );
}
