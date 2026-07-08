'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash, Film, Music, Wand, Sparkles, Play } from '../components/icons';

type Scene = { id: string; prompt: string; model: string; seconds: number; clipPath?: string };
const MODELS = [
  { value: 'kling', label: 'Kling v3 — default' },
  { value: 'veo', label: 'Veo (unverified slug)' },
  { value: 'seedance', label: 'Seedance 2.0' },
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const input = 'w-full rounded-lg border bg-black/20 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2';
const inputStyle = { borderColor: 'var(--border)', boxShadow: 'none' } as const;
let sid = 0;
const newScene = (): Scene => ({ id: `shot${++sid}`, prompt: '', model: 'kling', seconds: 4 });

export default function NewCreation() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('Steph Ferrera');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioStartSec, setAudioStartSec] = useState(0);
  const [snapToBeat, setSnapToBeat] = useState(true);
  const [hookVariants, setHookVariants] = useState(1);
  const [register, setRegister] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([newScene(), newScene()]);
  const [run, setRun] = useState<{ id?: string; state?: string; error?: string; result?: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (i: number, patch: Partial<Scene>) => setScenes((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => setScenes((s) => {
    const j = i + d; if (j < 0 || j >= s.length) return s;
    const c = [...s]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const buildJob = () => ({
    title, author, audioUrl, ratio: '9:16', tier: 1, hookVariants, register, snapToBeat,
    audioStartSec: audioStartSec || undefined,
    scenes: scenes.map((s) => ({ id: s.id, prompt: s.prompt, model: s.model, seconds: s.seconds, ...(s.clipPath ? { clipPath: s.clipPath } : {}) })),
    provenance: { fbid: '', components: { lyrics_direction: 'humanEdits', audio: 'trainedAlgorithmicMedia (Suno)', video: 'compositeWithTrainedAlgorithmicMedia (Kling)' }, license: 'remix-with-attribution + revenue-share', proofOfHuman: true },
  });

  const valid = title.trim() && audioUrl.trim() && scenes.length > 0 && scenes.every((s) => s.prompt.trim() || s.clipPath);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(buildJob()) });
      const d = await res.json();
      alert(d.file ? `Saved job: ${d.file}` : d.error || 'Save failed');
    } finally { setSaving(false); }
  }

  async function generate() {
    setRun({ state: 'starting' });
    const res = await fetch('/api/edit/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ job: buildJob() }) });
    const d = await res.json();
    if (!d.id) { setRun({ state: 'error', error: d.error || 'failed to start' }); return; }
    setRun({ id: d.id, state: 'running' });
    const poll = setInterval(async () => {
      const s = await (await fetch(`/api/edit/status?id=${d.id}`)).json();
      setRun(s);
      if (s.state === 'done' || s.state === 'error') clearInterval(poll);
    }, 3000);
  }

  const projectSlug = title && author ? `${slug(author)}--${slug(title)}` : '';

  return (
    <main>
      <Link href="/" className="text-sm text-white/50 hover:text-white">← Creations</Link>
      <h1 className="mt-3 flex items-center gap-2.5 font-display text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        <Wand className="h-7 w-7" style={{ color: 'var(--cta)' }} /> New creation
      </h1>
      <p className="mt-2 text-[15px] text-white/55">Compose a video — define the song, the shots, and the cut. Generate, watch, branch.</p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Settings */}
        <aside className="panel h-fit space-y-4 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40"><Sparkles className="h-4 w-4" /> Settings</h2>
          <Field label="Title"><input className={input} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Este Mundial…" /></Field>
          <Field label="Author"><input className={input} style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <Field label="Song (path or URL)"><input className={input} style={inputStyle} value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="~/FlowStudio/10_assets/…/song.mp3" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audio start (s)"><input type="number" step="0.1" className={input} style={inputStyle} value={audioStartSec} onChange={(e) => setAudioStartSec(+e.target.value)} /></Field>
            <Field label="Hook variants"><input type="number" min={1} max={5} className={input} style={inputStyle} value={hookVariants} onChange={(e) => setHookVariants(+e.target.value)} /></Field>
          </div>
          <Toggle label="Lyric-lock cuts" hint="off = snap to beat" value={!snapToBeat} onChange={(v) => setSnapToBeat(!v)} />
          <Toggle label="Register on Origo" hint="after render" value={register} onChange={setRegister} />
        </aside>

        {/* Shots */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40"><Film className="h-4 w-4" /> Shots · {scenes.length}</h2>
            <button onClick={() => setScenes((s) => [...s, newScene()])} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] text-white/80 hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>
              <Plus className="h-4 w-4" /> Add shot
            </button>
          </div>
          <div className="space-y-3">
            {scenes.map((s, i) => (
              <div key={s.id} className="panel rounded-xl p-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md text-[12px] font-semibold" style={{ background: 'var(--panel-2)', color: 'var(--cta)' }}>{i + 1}</span>
                  <input className={`${input} flex-1`} style={inputStyle} value={s.id} onChange={(e) => set(i, { id: e.target.value })} />
                  <div className="flex items-center gap-1">
                    <button onClick={() => move(i, -1)} className="rounded-md border px-2 py-1.5 text-white/60 hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>↑</button>
                    <button onClick={() => move(i, 1)} className="rounded-md border px-2 py-1.5 text-white/60 hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>↓</button>
                    <button onClick={() => setScenes((x) => x.filter((_, j) => j !== i))} className="rounded-md border px-2 py-1.5 text-white/60 hover:bg-white/5" style={{ borderColor: 'var(--border)' }}><Trash className="h-4 w-4" /></button>
                  </div>
                </div>
                <textarea className={`${input} mt-2.5 min-h-[68px] resize-y`} style={inputStyle} value={s.prompt} onChange={(e) => set(i, { prompt: e.target.value })} placeholder="Photorealistic cinematic shot of…" />
                <div className="mt-2.5 grid grid-cols-[1fr_110px] gap-2">
                  <select className={input} style={inputStyle} value={s.model} onChange={(e) => set(i, { model: e.target.value })}>
                    {MODELS.map((m) => <option key={m.value} value={m.value} className="bg-[#16142e]">{m.label}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <input type="number" step="0.1" min={0.4} className={input} style={inputStyle} value={s.seconds} onChange={(e) => set(i, { seconds: +e.target.value })} />
                    <span className="text-[12px] text-white/40">s</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={generate} disabled={!valid || run?.state === 'running'} className="flex items-center gap-2 rounded-xl px-5 py-3 font-medium text-white transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40" style={{ background: 'linear-gradient(135deg,var(--cta),#f43f5e)' }}>
              <Play className="h-5 w-5" /> {run?.state === 'running' ? 'Generating…' : 'Generate'}
            </button>
            <button onClick={save} disabled={!title || saving} className="rounded-xl border px-4 py-3 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40" style={{ borderColor: 'var(--border)' }}>
              {saving ? 'Saving…' : 'Save job'}
            </button>
            {!valid && <span className="text-[12px] text-white/35">Need a title, song, and a prompt on each shot.</span>}
          </div>

          {run && run.state !== 'starting' && (
            <div className="panel mt-5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm">
                {run.state === 'running' && <><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--cta)' }} /> Generating shots → beat map → cut…</>}
                {run.state === 'done' && <span style={{ color: 'var(--emerald)' }}>✓ Done · {Math.round(run.result?.bpm ?? 0)} BPM</span>}
                {run.state === 'error' && <span className="text-rose-400">✕ {run.error}</span>}
                {run.state === 'unknown' && <span className="text-white/50">waiting…</span>}
              </div>
              {run.state === 'done' && projectSlug && (
                <Link href={`/creation/${projectSlug}`} className="mt-3 inline-block rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: 'var(--indigo)' }}>
                  Open creation →
                </Link>
              )}
              {run.result?.warnings?.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12px] text-white/45">{run.result.warnings.map((w: string, i: number) => <li key={i}>· {w}</li>)}</ul>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-white/55">{label}</span>
      {children}
    </label>
  );
}
function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left" style={{ borderColor: 'var(--border)' }}>
      <span><span className="block text-sm text-white">{label}</span>{hint && <span className="text-[11px] text-white/35">{hint}</span>}</span>
      <span className="relative h-5 w-9 rounded-full transition-colors" style={{ background: value ? 'var(--cta)' : 'rgba(255,255,255,0.15)' }}>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: value ? '18px' : '2px' }} />
      </span>
    </button>
  );
}
