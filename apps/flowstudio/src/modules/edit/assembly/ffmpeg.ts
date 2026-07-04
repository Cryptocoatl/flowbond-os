// ── L3 assembly · FFmpeg (PRIMARY for v1) ────────────────────────────────────
// Beat-synced 9:16 reel, fully programmatic, zero license cost. Cuts land on
// the beat map's downbeats; the song is laid under the whole thing. This is the
// runnable spine — a Remotion engine can swap in later behind render.ts.
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { run, hasBinary, ensureDir } from '../util';
import type { BeatMap } from '../types';

export interface CaptionCue {
  text: string;
  start: number;
  end: number;
}

export interface AssembleInput {
  /** Clips in timeline order, with their intended (target) durations. */
  clips: { path: string; seconds: number }[];
  beatmap: BeatMap;
  audioPath: string;
  outPath: string;
  workDir: string;
  ratio?: string; // '9:16' (default)
  fps?: number; // 30 (default)
  captions?: CaptionCue[];
}

const DIMS: Record<string, [number, number]> = {
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
  '1:1': [1080, 1080],
};

/**
 * Snap clip slots to the beat grid: each clip plays until the first downbeat at
 * or after (playhead + its target seconds), guaranteeing every CUT lands on a
 * bar. Returns per-clip slot lengths plus the total reel length.
 */
export function computeSlots(downbeats: number[], sceneSeconds: number[]): { slots: number[]; total: number } {
  const db = [...downbeats].sort((a, b) => a - b);
  let playhead = db[0] ?? 0;
  const slots: number[] = [];
  for (const s of sceneSeconds) {
    const target = playhead + s;
    const next = db.find((d) => d >= target - 1e-6);
    const end = next ?? target; // past the last downbeat: fall back to raw length
    slots.push(Math.max(0.4, +(end - playhead).toFixed(3)));
    playhead = end;
  }
  return { slots, total: +slots.reduce((a, b) => a + b, 0).toFixed(3) };
}

function ffEscape(text: string): string {
  // drawtext is fussy: escape the characters that break filtergraph parsing.
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "’").replace(/%/g, '\\%');
}

export async function assembleFfmpeg(input: AssembleInput): Promise<string> {
  const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';
  if (!(await hasBinary(ffmpeg))) {
    throw new Error(`'${ffmpeg}' not found — install ffmpeg (macOS: \`brew install ffmpeg\`).`);
  }
  if (input.clips.length === 0) throw new Error('assembleFfmpeg: no clips to assemble.');

  const fps = input.fps ?? 30;
  const [W, H] = DIMS[input.ratio ?? '9:16'] ?? DIMS['9:16'];
  const work = await ensureDir(input.workDir);

  const { slots, total } = computeSlots(input.beatmap.downbeats, input.clips.map((c) => c.seconds));

  // 1) Normalize each clip to a fixed-format 9:16 segment of its slot length.
  //    -stream_loop -1 holds short clips to fill the slot; -t trims long ones.
  const segPaths: string[] = [];
  for (let i = 0; i < input.clips.length; i++) {
    const seg = join(work, `seg-${String(i).padStart(2, '0')}.mp4`);
    const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${fps},format=yuv420p`;
    await run(ffmpeg, [
      '-y', '-stream_loop', '-1', '-i', input.clips[i].path,
      '-t', String(slots[i]),
      '-vf', vf, '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      seg,
    ]);
    segPaths.push(seg);
  }

  // 2) Concat the normalized segments (identical params → stream-copy is safe).
  const listFile = join(work, 'concat.txt');
  await writeFile(listFile, segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  let silent = join(work, 'silent.mp4');
  await run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent]);

  // 3) Optional caption burn-in (e.g. the chorus), enabled between cue times.
  if (input.captions && input.captions.length) {
    const captioned = join(work, 'captioned.mp4');
    const draw = input.captions
      .map(
        (c) =>
          `drawtext=text='${ffEscape(c.text)}':fontcolor=white:fontsize=${Math.round(H * 0.06)}:` +
          `borderw=6:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.72:` +
          `enable='between(t,${c.start},${c.end})'`,
      )
      .join(',');
    await run(ffmpeg, ['-y', '-i', silent, '-vf', draw, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', captioned]);
    silent = captioned;
  }

  // 4) Lay the song under the reel; reel length = sum of beat-snapped slots.
  await run(ffmpeg, [
    '-y', '-i', silent, '-i', input.audioPath,
    '-map', '0:v', '-map', '1:a',
    '-t', String(total),
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    input.outPath,
  ]);

  return input.outPath;
}
