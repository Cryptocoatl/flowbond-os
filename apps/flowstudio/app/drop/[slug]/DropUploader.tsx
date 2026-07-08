'use client';
import { useState } from 'react';
import { browserClient } from '../../../lib/supabase-browser';
import { DROP_BUCKET } from '../../../lib/flowdrop';
import { Plus, Film } from '../../components/icons';

type Item = {
  key: string;
  name: string;
  kind: 'photo' | 'video';
  status: 'hashing' | 'uploading' | 'done' | 'error';
  error?: string;
};

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const safeName = (s: string) => (s || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);

export default function DropUploader({ slug, eventId }: { slug: string; eventId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const sb = browserClient();

  function patch(key: string, p: Partial<Item>) {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));
  }

  async function handleOne(file: File) {
    const key = `${file.name}-${file.size}-${Math.round(file.lastModified)}`;
    const kind: Item['kind'] = file.type.startsWith('video') ? 'video' : 'photo';
    setItems((xs) => [{ key, name: file.name, kind, status: 'hashing' }, ...xs.filter((x) => x.key !== key)]);
    try {
      const contentHash = await sha256Hex(file);

      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('not signed in');

      // Direct upload into the contributor's own folder. The event-drops storage
      // RLS policy enforces "own folder + open event" — no signed-by-admin step.
      const path = `${eventId}/${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;

      patch(key, { status: 'uploading' });
      const up = await sb.storage.from(DROP_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (up.error) throw new Error(up.error.message);

      const confirmRes = await fetch(`/api/drop/${slug}/confirm`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path,
          kind,
          filename: file.name,
          size: file.size,
          contentHash,
          capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
        }),
      });
      const confirm = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirm.error || 'confirm failed');

      patch(key, { status: 'done' });
    } catch (e) {
      patch(key, { status: 'error', error: e instanceof Error ? e.message : 'upload failed' });
    }
  }

  function onPick(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => void handleOne(f));
  }

  const done = items.filter((i) => i.status === 'done').length;

  return (
    <div className="mt-8">
      <label className="grid cursor-pointer place-items-center rounded-2xl border border-dashed p-10 text-center transition-colors hover:bg-white/5"
        style={{ borderColor: 'var(--border-strong)' }}>
        <Plus className="h-8 w-8 text-white/40" />
        <span className="mt-3 font-medium text-white">Add photos &amp; videos</span>
        <span className="mt-1 text-[13px] text-white/45">Tap to choose from your camera roll — drop as many as you like.</span>
        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
      </label>

      {items.length > 0 && (
        <>
          <p className="mt-5 text-[13px] text-white/45">{done} of {items.length} uploaded</p>
          <ul className="mt-2 space-y-2">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                <Film className="h-4 w-4 shrink-0 text-white/40" />
                <span className="min-w-0 flex-1 truncate text-white/80">{i.name}</span>
                <Status item={i} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Status({ item }: { item: Item }) {
  if (item.status === 'done') return <span className="text-[12px] font-medium" style={{ color: 'var(--emerald)' }}>uploaded</span>;
  if (item.status === 'error') return <span className="text-[12px] text-rose-400" title={item.error}>failed</span>;
  if (item.status === 'uploading') return <span className="text-[12px] text-white/50">uploading…</span>;
  return <span className="text-[12px] text-white/50">preparing…</span>;
}
