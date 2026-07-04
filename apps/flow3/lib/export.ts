// Real export: plays the ordered timeline onto an offscreen canvas with the
// grade/effects baked in, captures it via MediaRecorder, returns a downloadable
// Blob. Video-only for v1 (audio mux comes with the server render path).
import { ASPECTS, GRADES, RES_HEIGHT, filterString, type EditState } from './grade';
import type { Clip } from './clips';

function pickMime(): string {
  const c = [
    'video/mp4;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const m of c) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  return 'video/webm';
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, cw: number, ch: number) {
  const scale = Math.max(cw / sw, ch / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.drawImage(src, (cw - w) / 2, (ch - h) / 2, w, h);
}

function paintOverlays(ctx: CanvasRenderingContext2D, edit: EditState, cw: number, ch: number) {
  const g = GRADES[edit.grade];
  if (g.overlayAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = g.overlayAlpha;
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, g.shadow);
    grad.addColorStop(0.45, 'rgba(0,0,0,0)');
    grad.addColorStop(1, g.highlight);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
  if (edit.vignette > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const r = ctx.createRadialGradient(cw / 2, ch * 0.45, ch * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, `rgba(0,0,0,${0.7 * edit.vignette})`);
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
  if (edit.letterbox) {
    const bar = ch * 0.07;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, bar);
    ctx.fillRect(0, ch - bar, cw, bar);
  }
}

function frame(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, edit: EditState, cw: number, ch: number) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.filter = filterString(edit);
  drawCover(ctx, src, sw, sh, cw, ch);
  ctx.restore();
  paintOverlays(ctx, edit, cw, ch);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ExportOpts {
  clips: Clip[]; // already in play order
  edit: EditState;
  fps?: number;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

export async function exportTimeline({ clips, edit, fps = 30, onProgress, signal }: ExportOpts): Promise<Blob> {
  if (!clips.length) throw new Error('no_clips');

  const ar = ASPECTS[edit.aspect];
  const ch = RES_HEIGHT[edit.resolution];
  const cw = Math.round((ch * ar.w) / ar.h / 2) * 2; // even width
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 12_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((res) => (recorder.onstop = () => res()));
  recorder.start();

  const total = clips.reduce((s, c) => s + c.duration, 0);
  let elapsed = 0;

  // one reusable video element
  const vid = document.createElement('video');
  vid.muted = true;
  vid.playsInline = true;

  for (const clip of clips) {
    if (signal?.aborted) break;

    if (clip.type === 'image') {
      const img = new Image();
      img.src = clip.url;
      await img.decode().catch(() => {});
      const end = performance.now() + clip.duration * 1000;
      while (performance.now() < end && !signal?.aborted) {
        frame(ctx, img, clip.width, clip.height, edit, cw, ch);
        onProgress?.((elapsed + (clip.duration - (end - performance.now()) / 1000)) / total);
        await wait(1000 / fps);
      }
      elapsed += clip.duration;
    } else {
      vid.src = clip.url;
      await new Promise<void>((res) => { vid.oncanplay = () => res(); vid.load(); });
      vid.currentTime = 0;
      await vid.play().catch(() => {});
      while (!vid.ended && vid.currentTime < clip.duration - 0.05 && !signal?.aborted) {
        frame(ctx, vid, clip.width, clip.height, edit, cw, ch);
        onProgress?.((elapsed + vid.currentTime) / total);
        await wait(1000 / fps);
      }
      vid.pause();
      elapsed += clip.duration;
    }
    // dip-to-black between clips for 'dip'/'crossfade'
    if (edit.transition !== 'cut' && clip !== clips[clips.length - 1]) {
      for (let a = 0; a <= 1 && !signal?.aborted; a += 0.15) {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, cw, ch);
        await wait(1000 / fps);
      }
    }
  }

  recorder.stop();
  await stopped;
  onProgress?.(1);
  return new Blob(chunks, { type: recorder.mimeType });
}
