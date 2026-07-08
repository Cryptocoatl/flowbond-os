'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Film, Shield, Plus, Sparkles, Wand, Trash } from '../../components/icons';

export type PoolItem = {
  id: string;
  kind: 'photo' | 'video';
  url: string;
  shooter: string;
  shooterFbid: string;
  status: 'submitted' | 'used' | 'rejected';
};
export type PubItem = { id: string; title: string; certId: string | null; url: string };

const ROLES = ['videographer', 'animator', 'creator', 'editor', 'music', 'sound', 'color', 'owner'];
type Line = { key: string; fbid: string | null; label: string; role: string };
type Music = { id: string; label: string };

export default function EditorPool({
  slug, title, status, isOwner, items, publications, editorFbid, editorName,
}: {
  slug: string; title: string; status: string; isOwner: boolean;
  items: PoolItem[]; publications: PubItem[]; editorFbid: string; editorName: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pubTitle, setPubTitle] = useState(title);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);

  const [roleByFbid, setRoleByFbid] = useState<Record<string, string>>({});
  const [music, setMusic] = useState<Music[]>([]);
  const [weight, setWeight] = useState<Record<string, number>>({}); // key -> percent

  const dropUrl = typeof window !== 'undefined' ? `${window.location.origin}/drop/${slug}` : `/drop/${slug}`;

  // distinct shooters among selected clips → split lines (+ editor + music)
  const lines: Line[] = useMemo(() => {
    const fbids = [...new Set(items.filter((i) => selected.has(i.id)).map((i) => i.shooterFbid))];
    const nameOf = (fb: string) => items.find((i) => i.shooterFbid === fb)?.shooter ?? fb.slice(0, 8);
    const creatorLines = fbids.map<Line>((fb) => ({ key: fb, fbid: fb, label: nameOf(fb), role: roleByFbid[fb] ?? 'videographer' }));
    const editorLine: Line = { key: 'editor', fbid: editorFbid, label: editorName, role: 'editor' };
    const musicLines = music.map<Line>((m) => ({ key: `music:${m.id}`, fbid: null, label: m.label || 'Music', role: 'music' }));
    return [...creatorLines, editorLine, ...musicLines];
  }, [items, selected, roleByFbid, music, editorFbid, editorName]);

  const total = lines.reduce((s, l) => s + (weight[l.key] || 0), 0);

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function evenSplit() {
    const n = lines.length;
    if (!n) return;
    const base = Math.floor(100 / n);
    const next: Record<string, number> = {};
    lines.forEach((l, i) => (next[l.key] = base + (i === 0 ? 100 - base * n : 0)));
    setWeight(next);
  }

  async function mintInvite() {
    const res = await fetch(`/api/events/${slug}/invite`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) { setInvite(data.url); navigator.clipboard?.writeText(data.url).catch(() => {}); }
    else setMsg(data.error || 'Could not create invite');
  }

  async function publish() {
    if (!file) { setMsg('Choose your finished cut to publish.'); return; }
    if (lines.length && total !== 100) { setMsg(`Split must total 100% (now ${total}%). Tap "Even split" or adjust.`); return; }
    setBusy(true); setMsg(null);
    try {
      // build split lines as basis points, fixing rounding on the last line
      const splits = lines.map((l) => ({ fbid: l.fbid ?? '', label: l.label, role: l.role, weight_bps: Math.round((weight[l.key] || 0) * 100) }));
      const sum = splits.reduce((s, x) => s + x.weight_bps, 0);
      if (splits.length && sum !== 10000) splits[splits.length - 1].weight_bps += 10000 - sum;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', pubTitle);
      fd.append('contributionIds', JSON.stringify([...selected]));
      fd.append('splits', JSON.stringify(splits));
      const res = await fetch(`/api/events/${slug}/publish`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'Publish failed'); return; }
      router.push(`/p/${data.id}`);
    } finally { setBusy(false); }
  }

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> Footage pool · {status}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigator.clipboard?.writeText(dropUrl)} className="rounded-xl border px-3.5 py-2.5 text-sm text-white/80 hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>Copy drop link</button>
          {isOwner && <button onClick={mintInvite} className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--indigo)' }}>Invite editor</button>}
        </div>
      </div>

      {invite && <p className="mt-3 break-all rounded-xl border px-3 py-2 text-[13px] text-white/70" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>Editor invite (copied): <span style={{ color: 'var(--cta)' }}>{invite}</span></p>}

      {/* Pool */}
      <h2 className="mt-8 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40"><Film className="h-4 w-4" /> {items.length} dropped · {selected.size} selected</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-white/45">Nothing dropped yet. Share the drop link to start collecting.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {items.map((i) => {
            const on = selected.has(i.id);
            return (
              <button key={i.id} onClick={() => toggle(i.id)} className="group relative overflow-hidden rounded-xl border text-left" style={{ borderColor: on ? 'var(--cta)' : 'var(--border)' }}>
                <div className="relative aspect-square bg-black">
                  {i.kind === 'video' ? <video src={i.url} muted playsInline className="h-full w-full object-cover" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  {on && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--cta)' }}>✓</span>}
                  {i.status === 'used' && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/70">used</span>}
                </div>
                <span className="block truncate px-2 py-1 text-[11px] text-white/60">{i.shooter}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Publish + FlowSplit */}
      <section className="mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}><Wand className="h-5 w-5" style={{ color: 'var(--cta)' }} /> Publish & register the FlowSplit</h2>
        <p className="mt-1.5 text-[14px] text-white/55">Select the clips, set who gets what %, add the music rights — it&apos;s registered on Origo, and FlowPoints flow to the chain by weight as the reel earns likes & interactions.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/40">Title</span>
            <input value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} className="w-full rounded-lg border bg-black/20 px-3 py-2.5 text-sm text-white" style={{ borderColor: 'var(--border)' }} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-white/80 hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>
            <Plus className="h-4 w-4" /> {file ? file.name.slice(0, 24) : 'Choose cut'}
            <input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        {/* split sheet */}
        {lines.length > 0 && (
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-white/40">Split sheet</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: total === 100 ? 'var(--emerald)' : '#f59e0b' }}>{total}%</span>
                <button onClick={evenSplit} className="rounded-lg px-2.5 py-1 text-[12px] text-white/80" style={{ background: 'var(--panel-2)' }}>Even split</button>
              </div>
            </div>
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.key} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">{l.label}</span>
                  {l.role === 'editor' ? (
                    <span className="rounded-md px-2 py-1 text-[12px] text-white/50" style={{ background: 'var(--panel-2)' }}>editor</span>
                  ) : l.fbid ? (
                    <select value={l.role} onChange={(e) => setRoleByFbid((r) => ({ ...r, [l.fbid!]: e.target.value }))} className="rounded-md border bg-black/30 px-2 py-1 text-[12px] text-white/80" style={{ borderColor: 'var(--border)' }}>
                      {ROLES.filter((r) => r !== 'editor').map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="rounded-md px-2 py-1 text-[12px]" style={{ background: 'var(--panel-2)', color: 'var(--gold)' }}>music</span>
                  )}
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} max={100} value={weight[l.key] ?? 0} onChange={(e) => setWeight((w) => ({ ...w, [l.key]: Math.max(0, Math.min(100, Number(e.target.value))) }))} className="w-16 rounded-md border bg-black/30 px-2 py-1 text-right text-[13px] text-white" style={{ borderColor: 'var(--border)' }} />
                    <span className="text-[12px] text-white/40">%</span>
                  </div>
                  {!l.fbid && (
                    <button onClick={() => setMusic((ms) => ms.filter((m) => `music:${m.id}` !== l.key))} className="text-white/40 hover:text-rose-400" title="Remove"><Trash className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setMusic((ms) => [...ms, { id: crypto.randomUUID().slice(0, 6), label: '' }])} className="mt-3 flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add music / rights holder</button>
            {music.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {music.map((m) => (
                  <input key={m.id} value={m.label} placeholder="Track / rights holder (e.g. Heady Teddy — Mad Honey)" onChange={(e) => setMusic((ms) => ms.map((x) => x.id === m.id ? { ...x, label: e.target.value } : x))} className="w-full rounded-md border bg-black/20 px-2.5 py-1.5 text-[12px] text-white" style={{ borderColor: 'var(--border)' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {msg && <p className="mt-3 text-sm text-rose-400">{msg}</p>}
        <button onClick={publish} disabled={busy || !file} className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-white disabled:opacity-50" style={{ background: 'var(--cta)' }}>
          <Shield className="h-5 w-5" /> {busy ? 'Publishing…' : `Publish & register split (${selected.size} clip${selected.size === 1 ? '' : 's'})`}
        </button>
      </section>

      {publications.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40"><Shield className="h-4 w-4" /> Published</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="rounded-2xl border p-4 transition-colors hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>
                <video src={p.url} muted playsInline className="aspect-video w-full rounded-lg bg-black object-cover" />
                <p className="mt-2.5 truncate text-sm font-medium text-white">{p.title}</p>
                {p.certId && <span className="mt-1 inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--emerald)' }}><Shield className="h-3 w-3" /> {p.certId}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
