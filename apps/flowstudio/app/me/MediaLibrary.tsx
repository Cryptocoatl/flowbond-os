'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { browserClient } from '../../lib/supabase-browser';
import { MEDIA_BUCKET, type MediaItem } from '../../lib/media';
import { Plus, Film, Trash, Play } from '../components/icons';

type Item = MediaItem & { url: string };
type Up = { key: string; name: string; pct: number; status: 'up' | 'done' | 'error' };

const safe = (s: string) => (s || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);

export default function MediaLibrary({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const sb = browserClient();
  const [ups, setUps] = useState<Up[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function setUp(key: string, p: Partial<Up>) {
    setUps((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));
  }

  async function uploadOne(file: File) {
    const key = `${file.name}-${file.size}-${Math.round(file.lastModified)}`;
    const kind = file.type.startsWith('video') ? 'video' : 'photo';
    setUps((xs) => [{ key, name: file.name, pct: 10, status: 'up' }, ...xs.filter((x) => x.key !== key)]);
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('not signed in');
      const path = `${user.id}/${crypto.randomUUID()}-${safe(file.name)}`;
      const up = await sb.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (up.error) throw new Error(up.error.message);
      setUp(key, { pct: 80 });
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, kind, title: file.name.replace(/\.[^.]+$/, ''), size: file.size }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'save failed');
      setUp(key, { pct: 100, status: 'done' });
    } catch (e) {
      setUp(key, { status: 'error' });
      void e;
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    await Promise.all(Array.from(files).map(uploadOne));
    setTimeout(() => setUps([]), 1200);
    router.refresh();
  }

  async function setVisibility(m: Item, visibility: 'private' | 'unlisted') {
    setBusy(m.id);
    try {
      const res = await fetch(`/api/library/${m.id}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (res.ok && visibility === 'unlisted') {
        await navigator.clipboard?.writeText(`${window.location.origin}/m/${m.id}`).catch(() => {});
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function copyLink(m: Item) {
    navigator.clipboard?.writeText(`${window.location.origin}/m/${m.id}`).catch(() => {});
  }

  async function del(m: Item) {
    if (!confirm('Delete this from your library?')) return;
    setBusy(m.id);
    try {
      await fetch(`/api/library/${m.id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* upload dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="grid cursor-pointer place-items-center rounded-2xl border border-dashed p-8 text-center transition-colors"
        style={{ borderColor: drag ? 'var(--cta)' : 'var(--border-strong)', background: drag ? 'rgba(244,63,94,.06)' : 'transparent' }}
      >
        <Plus className="h-7 w-7 text-white/40" />
        <span className="mt-2 font-medium text-white">Drop videos & photos to upload</span>
        <span className="mt-0.5 text-[13px] text-white/45">or click to choose — they go straight to your cloud library</span>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {ups.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {ups.map((u) => (
            <li key={u.key} className="flex items-center gap-3 text-sm">
              <Film className="h-4 w-4 shrink-0 text-white/40" />
              <span className="min-w-0 flex-1 truncate text-white/70">{u.name}</span>
              {u.status === 'error' ? <span className="text-[12px] text-rose-400">failed</span> : (
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full transition-all" style={{ width: `${u.pct}%`, background: 'var(--flow-grad)' }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* grid */}
      {initial.length === 0 ? (
        <p className="mt-6 text-sm text-white/45">Nothing here yet — your uploads will appear in this library.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {initial.map((m) => {
            const shared = m.visibility !== 'private';
            return (
              <div key={m.id} className="group overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
                <div className="relative aspect-square bg-black">
                  {m.kind === 'video' ? (
                    <video src={m.url} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.title ?? ''} loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {m.kind === 'video' && <Play className="absolute right-2 top-2 h-4 w-4 text-white/80" />}
                  {shared && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide" style={{ color: '#34d399' }}>shared</span>}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[13px] font-medium text-white">{m.title || 'Untitled'}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button onClick={() => (shared ? copyLink(m) : setVisibility(m, 'unlisted'))} disabled={busy === m.id}
                      className="flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                      style={{ background: shared ? 'var(--panel-2)' : 'var(--cta)' }}>
                      {shared ? 'Copy link' : 'Share'}
                    </button>
                    <a href={m.url} download title="Download"
                      className="grid h-7 w-7 place-items-center rounded-lg text-white/70" style={{ background: 'var(--panel-2)' }}>↓</a>
                    <button onClick={() => del(m)} disabled={busy === m.id} title="Delete"
                      className="grid h-7 w-7 place-items-center rounded-lg text-white/60 hover:text-rose-400" style={{ background: 'var(--panel-2)' }}>
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {shared && (
                    <button onClick={() => setVisibility(m, 'private')} className="mt-1.5 block text-[11px] text-white/40 hover:text-white/70">
                      shared · make private
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
