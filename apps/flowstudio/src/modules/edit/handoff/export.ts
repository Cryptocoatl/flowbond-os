// ── L4/L5 handoff · CapCut + DaVinci package ─────────────────────────────────
// CapCut and DaVinci are HUMAN craft steps, never automated nodes (the doc is
// explicit: CapCut has no timeline API). After the programmatic reel is built,
// we drop a tidy package the human can open: the master reel, every source clip,
// the song, the beat map, and an EDL-ish cut sheet so the editor sees exactly
// where cuts landed. Naming follows ~/FlowStudio/RULES.md.
import { join } from 'node:path';
import { copyFile, writeFile } from 'node:fs/promises';
import { ensureDir } from '../util';
import type { BeatMap, EditJob, GeneratedClip } from '../types';

export interface HandoffInput {
  job: EditJob;
  reelPath: string;
  clips: GeneratedClip[];
  beatmap: BeatMap;
  audioPath: string;
  outDir: string; // e.g. ~/FlowStudio/20_projects/<client>--<project>/handoff
  slots: number[]; // beat-snapped durations, in clip order
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function exportHandoff(input: HandoffInput): Promise<string> {
  const dir = await ensureDir(input.outDir);

  // Cut sheet: where each clip starts/ends on the timeline (the editor's map).
  let t = 0;
  const cuts = input.clips.map((c, i) => {
    const start = +t.toFixed(3);
    t += input.slots[i] ?? c.seconds;
    return {
      order: i,
      sceneId: c.sceneId,
      provider: c.provider,
      model: c.model,
      source: c.localPath,
      start,
      end: +t.toFixed(3),
      seconds: input.slots[i] ?? c.seconds,
    };
  });

  const readme =
    `# Handoff · ${input.job.title}\n\n` +
    `Programmatic reel: **${input.reelPath}**\n\n` +
    `## Human steps\n` +
    `- **CapCut (Tier 1):** captions polish, trend audio, taste pass. Import the reel + clips.\n` +
    `- **DaVinci Resolve (Tier 2):** color + master. Cut sheet below maps every edit point.\n\n` +
    `## Guardrails\n${input.job.ipGuardrails ?? '(none specified)'}\n\n` +
    `## Cut sheet\n` +
    cuts.map((c) => `- ${c.start}s–${c.end}s · ${c.sceneId} · ${c.provider}/${c.model}`).join('\n') +
    `\n\n_Beat map: ${input.beatmap.bpm} BPM, ${input.beatmap.downbeats.length} downbeats. Cuts land on bars._\n`;

  await writeFile(join(dir, 'README.md'), readme);
  await writeFile(join(dir, 'cut-sheet.json'), JSON.stringify({ beatmap: input.beatmap, cuts }, null, 2));

  // Copy assets in so the package is self-contained (RULES.md: files stay local).
  const stem = `${slug(input.job.author)}--${slug(input.job.title)}`;
  await copyFile(input.reelPath, join(dir, `${stem}--master--v01.mp4`)).catch(() => {});
  await copyFile(input.audioPath, join(dir, `${stem}--song${ext(input.audioPath)}`)).catch(() => {});

  return dir;
}

function ext(p: string): string {
  const m = p.match(/\.[a-z0-9]+$/i);
  return m ? m[0] : '';
}
