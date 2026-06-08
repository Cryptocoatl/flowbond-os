'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wordmark, Logo } from '../components/Wordmark';
import { clipFromFile, type Clip } from '@/lib/clips';
import { exportTimeline } from '@/lib/export';
import {
  ASPECTS, GRADES, applyGrade, filterString, overlayGradient,
  DEFAULT_EDIT, type EditState, type AspectKey, type GradeKey, type ResolutionKey,
} from '@/lib/grade';

const RES_QUALITY: Record<ResolutionKey, 'standard' | 'cinematic' | 'epic'> = {
  '720p': 'standard', '1080p': 'cinematic', '4k': 'epic',
};

/* ---------- graded preview of real footage ---------- */
function GradedPreview({ clip, edit, playing, videoRef }: {
  clip: Clip | null; edit: EditState; playing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const ar = ASPECTS[edit.aspect];
  const og = overlayGradient(edit);
  return (
    <div
      className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/60 bg-black"
      style={{ aspectRatio: `${ar.w} / ${ar.h}` }}
    >
      {clip ? (
        clip.type === 'video' ? (
          <video
            ref={videoRef}
            src={clip.url}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: filterString(edit) }}
            muted={false}
            playsInline
            loop
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.url} alt={clip.name} className="absolute inset-0 w-full h-full object-cover" style={{ filter: filterString(edit) }} />
        )
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink-faint text-sm">no clip selected</div>
      )}
      {/* grade overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: og.background, opacity: og.opacity, mixBlendMode: 'soft-light' }} />
      {edit.vignette > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(120% 100% at 50% 45%, transparent 50%, rgba(0,0,0,${0.7 * edit.vignette}) 100%)` }} />
      )}
      {edit.grain > 0 && <div className="grain-layer animate-grain" style={{ opacity: edit.grain * 0.4 }} />}
      {edit.letterbox && (<><div className="absolute top-0 inset-x-0 bg-black z-10" style={{ height: '7%' }} /><div className="absolute bottom-0 inset-x-0 bg-black z-10" style={{ height: '7%' }} /></>)}
      {/* HUD */}
      <div className="absolute top-3 left-3 flex gap-2 text-[0.65rem] tnum z-20">
        <span className="px-2 py-0.5 rounded bg-black/55 backdrop-blur text-ink-muted">{edit.aspect} · {edit.resolution}</span>
        <span className="px-2 py-0.5 rounded bg-black/55 backdrop-blur text-teal-bright">{GRADES[edit.grade].label}</span>
      </div>
      {!playing && clip?.type === 'video' && (
        <div className="absolute inset-0 grid place-items-center z-20 pointer-events-none">
          <span className="w-14 h-14 rounded-full bg-white/85 text-black grid place-items-center text-xl">▶</span>
        </div>
      )}
    </div>
  );
}

/* ---------- controls ---------- */
function Slider({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; fmt?: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint mb-1.5">
        <span>{label}</span><span className="font-mono text-ink-muted">{fmt ? fmt(value) : value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-teal-bright h-1 cursor-pointer" />
    </div>
  );
}

/* ---------- drop zone ---------- */
function DropZone({ onFiles, big }: { onFiles: (f: FileList) => void; big?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      onClick={() => input.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition grid place-items-center text-center ${over ? 'border-teal bg-teal/5' : 'border-line-2 hover:border-teal/40'} ${big ? 'p-20' : 'p-6'}`}
    >
      <input ref={input} type="file" accept="video/*,image/*" multiple hidden
        onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <div>
        <div className={`mx-auto mb-4 rounded-2xl bg-panel-3 grid place-items-center text-teal-bright ${big ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-lg'}`}>⤓</div>
        <p className={`display ${big ? 'text-2xl' : 'text-sm'} mb-1`}>Drop your footage</p>
        {big && <p className="text-ink-muted text-sm">Videos and photos — FlowStudio cuts, grades and finishes the rest.</p>}
      </div>
    </div>
  );
}

function TopBar({ balance, onExport, exporting, canExport }: {
  balance: number | null; onExport: () => void; exporting: boolean; canExport: boolean;
}) {
  return (
    <header className="h-14 shrink-0 border-b hairline bg-panel flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Link href="/"><Wordmark size={24} /></Link>
        <span className="hidden sm:flex items-center gap-2 text-xs text-ink-muted pl-4 border-l hairline">untitled_reel · <span className="text-teal">edit</span></span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg panel">
          <span className="text-amber text-sm">⚡</span>
          <span className="font-mono text-sm tnum">{balance === null ? '···' : balance.toLocaleString()}</span>
        </div>
        <button onClick={onExport} disabled={!canExport || exporting} className="btn-render px-4 py-1.5 rounded-lg text-sm disabled:opacity-40 flex items-center gap-2">
          <span>⬡</span> {exporting ? 'Rendering…' : 'Export'}
        </button>
      </div>
    </header>
  );
}

function Editor() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT);
  const [balance, setBalance] = useState<number | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const active = useMemo(() => clips.find((c) => c.id === activeId) ?? null, [clips, activeId]);
  const totalDur = useMemo(() => clips.reduce((s, c) => s + c.duration, 0), [clips]);
  const set = (patch: Partial<EditState>) => setEdit((e) => ({ ...e, ...patch }));

  useEffect(() => {
    fetch('/api/credits').then(async (r) => {
      if (r.status === 401) { setNeedsAuth(true); return; }
      const d = await r.json(); setBalance(d.balance ?? 0);
    }).catch(() => {});
  }, []);

  const addFiles = useCallback(async (files: FileList) => {
    const made = (await Promise.all(Array.from(files).map(clipFromFile))).filter(Boolean) as Clip[];
    if (!made.length) return;
    setClips((prev) => {
      const next = [...prev, ...made];
      if (!activeId && next[0]) setActiveId(next[0].id);
      return next;
    });
  }, [activeId]);

  const removeClip = (id: string) => setClips((prev) => {
    const c = prev.find((x) => x.id === id); if (c) URL.revokeObjectURL(c.url);
    const next = prev.filter((x) => x.id !== id);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    return next;
  });

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const runAI = async () => {
    if (!aiPrompt.trim() || aiBusy) return;
    setAiBusy(true); setNotice(null);
    try {
      const res = await fetch('/api/edit-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, clips: clips.map((c) => ({ type: c.type, name: c.name, duration: c.duration })) }),
      });
      const data = await res.json();
      if (res.status === 401) { setNeedsAuth(true); return; }
      if (!res.ok) { setNotice(data.error === 'ai_unavailable' ? 'The editor seat is offline (no AI key).' : `Couldn’t read that: ${data.error}`); return; }
      const p = data.plan;
      setEdit((e) => ({ ...e, aspect: p.aspect, grade: p.grade, brightness: p.brightness, contrast: p.contrast, saturation: p.saturation, temperature: p.temperature, vignette: p.vignette, grain: p.grain, letterbox: p.letterbox, transition: p.transition }));
      if (Array.isArray(p.order) && p.order.length === clips.length) {
        setClips((prev) => p.order.map((i: number) => prev[i]).filter(Boolean));
      }
      setAiNote(p.note);
    } catch { setNotice('The editor seat hit a snag. Try again.'); }
    finally { setAiBusy(false); }
  };

  const doExport = async () => {
    if (!clips.length || exporting) return;
    setExporting(true); setProgress(0); setNotice(null);
    const duration = Math.min(60, Math.max(10, Math.round(totalDur / 10) * 10));
    try {
      // gate on credits + log the render server-side (authoritative spend)
      const pay = await fetch('/api/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'video', prompt: aiNote || `Edited timeline · ${clips.length} clips`, title: 'FlowStudio export', options: { quality: RES_QUALITY[edit.resolution], duration } }),
      });
      const pd = await pay.json();
      if (pay.status === 402) { setNotice(`Not enough FlowCredits — this export costs ${pd.cost} ⚡. Earn more across FlowBond.`); return; }
      if (!pay.ok) { setNotice(pd.error ?? 'Could not start the render.'); return; }
      setBalance(pd.balance);

      const blob = await exportTimeline({ clips, edit, onProgress: setProgress });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      a.href = url; a.download = `flowstudio_${Date.now()}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      setNotice(`Exported ${(blob.size / 1e6).toFixed(1)} MB · ${edit.aspect} ${edit.resolution}. Saved to your downloads.`);
    } catch (e) {
      setNotice(`Render failed: ${e instanceof Error ? e.message : 'unknown'}. Try a shorter cut or WebM.`);
    } finally { setExporting(false); }
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-base">
        <div className="panel-raise rounded-2xl p-10 max-w-md text-center">
          <div className="mx-auto mb-6 w-14 h-14 grid place-items-center"><Logo size={56} /></div>
          <h1 className="display text-3xl mb-3">Open the Studio</h1>
          <p className="text-ink-muted mb-8 leading-relaxed">One FlowBond identity unlocks the editor. Sign in to claim your <span className="text-amber-bright">500 ⚡</span> and start cutting.</p>
          <Link href="/auth/login?next=/studio" className="btn-render px-8 py-3.5 rounded-xl inline-block">Enter with FBID</Link>
        </div>
      </div>
    );
  }

  // empty state — the drop-first experience
  if (!clips.length) {
    return (
      <div className="min-h-screen flex flex-col bg-base">
        <TopBar balance={balance} onExport={doExport} exporting={exporting} canExport={false} />
        <div className="flex-1 grid place-items-center p-6">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="display text-3xl sm:text-4xl mb-2">Drop footage. <span className="text-grade">Direct the edit.</span></h1>
              <p className="text-ink-muted">Bring your videos and photos. Tell the editor the vibe. FlowStudio grades, reframes and finishes it.</p>
            </div>
            <DropZone onFiles={addFiles} big />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      <TopBar balance={balance} onExport={doExport} exporting={exporting} canExport={clips.length > 0} />
      <div className="flex-1 flex min-h-0">
        {/* media bin */}
        <aside className="w-56 shrink-0 border-r hairline bg-panel flex flex-col">
          <div className="px-3 h-9 flex items-center justify-between border-b hairline">
            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">Media · {clips.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {clips.map((c) => (
              <div key={c.id} className={`group relative rounded-lg overflow-hidden ring-1 transition ${activeId === c.id ? 'ring-teal/70' : 'ring-white/8 hover:ring-white/20'}`}>
                <button onClick={() => { setActiveId(c.id); setPlaying(false); }} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.thumb} alt={c.name} className="w-full aspect-video object-cover" />
                  <span className="absolute top-1 left-1 text-[0.55rem] px-1 py-0.5 rounded bg-black/60 text-ink z-10">{c.type === 'video' ? '🎬' : '🖼'} {c.duration.toFixed(1)}s</span>
                </button>
                <button onClick={() => removeClip(c.id)} className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded bg-black/60 text-ink-muted opacity-0 group-hover:opacity-100 hover:text-red-400 z-10 text-xs">✕</button>
                <p className="text-[0.6rem] text-ink-muted px-2 py-1 truncate">{c.name}</p>
              </div>
            ))}
            <div className="pt-1"><DropZone onFiles={addFiles} /></div>
          </div>
        </aside>

        {/* preview stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#070809]">
          <div className="flex-1 grid place-items-center p-6 min-h-0 overflow-auto">
            <GradedPreview clip={active} edit={edit} playing={playing} videoRef={videoRef} />
          </div>
          <div className="h-14 shrink-0 border-t hairline flex items-center justify-center gap-2 bg-panel">
            <button onClick={togglePlay} className="w-9 h-9 grid place-items-center rounded-full bg-white text-black">{playing ? '❚❚' : '▶'}</button>
            <span className="ml-2 font-mono text-xs tnum text-ink-muted">{totalDur.toFixed(1)}s total · {clips.length} clips</span>
            {exporting && (
              <span className="ml-4 flex items-center gap-2 text-xs text-amber-bright">
                <span className="w-24 h-1 rounded bg-panel-3 overflow-hidden"><span className="block h-full bg-amber" style={{ width: `${progress * 100}%` }} /></span>
                {Math.round(progress * 100)}%
              </span>
            )}
          </div>
        </main>

        {/* inspector */}
        <aside className="w-80 shrink-0 border-l hairline bg-panel flex flex-col">
          <div className="px-4 h-9 flex items-center border-b hairline"><span className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">Editor seat</span></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* AI seat */}
            <div className="panel-raise rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2"><Logo size={18} /><span className="text-xs text-teal-bright font-medium">Tell the editor</span></div>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
                placeholder="make it warm and cinematic, vertical for reels, smooth transitions…"
                className="w-full bg-base/70 border hairline rounded-lg p-2.5 text-sm text-ink placeholder-ink-faint focus:border-teal/50 focus:outline-none resize-none leading-relaxed mb-2" />
              <button onClick={runAI} disabled={aiBusy || !aiPrompt.trim()} className="w-full btn-ghost py-2 rounded-lg text-sm text-teal-bright disabled:opacity-40">
                {aiBusy ? 'Editing…' : 'Apply edit ✦'}
              </button>
              {aiNote && <p className="text-[0.7rem] text-ink-muted mt-2 leading-snug">“{aiNote}”</p>}
            </div>

            {/* aspect */}
            <div>
              <label className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint block mb-2">Size</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(ASPECTS) as AspectKey[]).map((k) => (
                  <button key={k} onClick={() => set({ aspect: k })} className={`py-1.5 rounded-lg text-[0.7rem] transition ${edit.aspect === k ? 'bg-teal/15 text-teal-bright ring-1 ring-teal/40' : 'panel text-ink-muted hover:text-ink'}`}>{k}</button>
                ))}
              </div>
            </div>

            {/* grade presets */}
            <div>
              <label className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint block mb-2">Grade</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(GRADES) as GradeKey[]).map((k) => (
                  <button key={k} onClick={() => setEdit((e) => applyGrade(e, k))} className={`py-1.5 rounded-lg text-[0.7rem] transition ${edit.grade === k ? 'bg-teal/15 text-teal-bright ring-1 ring-teal/40' : 'panel text-ink-muted hover:text-ink'}`}>{GRADES[k].label}</button>
                ))}
              </div>
            </div>

            {/* light & color */}
            <div className="space-y-3">
              <label className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint block">Light &amp; color</label>
              <Slider label="Exposure" value={edit.brightness} min={0.5} max={1.5} step={0.01} onChange={(n) => set({ brightness: n })} />
              <Slider label="Contrast" value={edit.contrast} min={0.5} max={1.6} step={0.01} onChange={(n) => set({ contrast: n })} />
              <Slider label="Saturation" value={edit.saturation} min={0} max={2} step={0.01} onChange={(n) => set({ saturation: n })} />
              <Slider label="Temperature" value={edit.temperature} min={-100} max={100} step={1} fmt={(n) => `${n > 0 ? '+' : ''}${n.toFixed(0)}`} onChange={(n) => set({ temperature: n })} />
            </div>

            {/* effects */}
            <div className="space-y-3">
              <label className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint block">Effects</label>
              <Slider label="Vignette" value={edit.vignette} min={0} max={1} step={0.01} onChange={(n) => set({ vignette: n })} />
              <Slider label="Film grain" value={edit.grain} min={0} max={1} step={0.01} onChange={(n) => set({ grain: n })} />
              <button onClick={() => set({ letterbox: !edit.letterbox })} className={`w-full py-2 rounded-lg text-xs transition ${edit.letterbox ? 'bg-teal/15 text-teal-bright ring-1 ring-teal/40' : 'panel text-ink-muted'}`}>Cinematic letterbox {edit.letterbox ? 'on' : 'off'}</button>
            </div>

            {/* transition + resolution */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint block mb-2">Transition</label>
                <select value={edit.transition} onChange={(e) => set({ transition: e.target.value as EditState['transition'] })} className="w-full panel rounded-lg text-xs px-2 py-2 text-ink">
                  <option value="cut">Hard cut</option><option value="crossfade">Crossfade</option><option value="dip">Dip to black</option>
                </select>
              </div>
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint block mb-2">Resolution</label>
                <select value={edit.resolution} onChange={(e) => set({ resolution: e.target.value as ResolutionKey })} className="w-full panel rounded-lg text-xs px-2 py-2 text-ink">
                  <option value="720p">720p</option><option value="1080p">1080p</option><option value="4k">4K</option>
                </select>
              </div>
            </div>

            {notice && <p className="text-xs text-amber-bright bg-amber/10 border border-amber/25 rounded-lg px-3 py-2.5 leading-relaxed">{notice}</p>}
          </div>
        </aside>
      </div>

      {/* timeline */}
      <div className="h-32 shrink-0 border-t hairline bg-panel flex flex-col">
        <div className="px-3 h-7 flex items-center border-b hairline"><span className="text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">Timeline · {edit.transition}</span></div>
        <div className="flex-1 flex items-center gap-1.5 px-3 overflow-x-auto">
          {clips.map((c, i) => (
            <button key={c.id} onClick={() => { setActiveId(c.id); setPlaying(false); }}
              className={`tl-clip h-16 shrink-0 ${activeId === c.id ? 'ring-1 ring-teal' : ''}`}
              style={{ width: `${Math.max(70, c.duration * 22)}px` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: filterString(edit) }} />
              <div className="absolute inset-0" style={{ background: overlayGradient(edit).background, opacity: overlayGradient(edit).opacity, mixBlendMode: 'soft-light' }} />
              <span className="absolute bottom-0.5 left-1 text-[0.5rem] text-white/85 z-10">{i + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <Editor />
    </Suspense>
  );
}
