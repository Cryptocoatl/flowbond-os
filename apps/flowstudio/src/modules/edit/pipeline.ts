// ── Orchestrator · L1 → L6 ───────────────────────────────────────────────────
// runEdit() takes a song + brief and returns a beat-synced 9:16 reel (+ hook
// variants), a CapCut/DaVinci handoff package, and an Origo verify URL. v1 runs
// the genuinely-runnable spine (L1 fal generation → L2 beat → L3 ffmpeg
// assembly) and treats provenance/handoff as best-effort: a missing Origo key
// downgrades to a warning, it never sinks the render.
import { join } from 'node:path';
import { genShot } from './providers';
import { analyzeBeats } from './beat/analyze';
import { renderReel } from './assembly/render';
import { computeSlots } from './assembly/ffmpeg';
import { embedC2PA } from './provenance/c2pa';
import { registerOnOrigo } from './provenance/origo';
import { exportHandoff } from './handoff/export';
import { studioRoot, ensureDir, downloadTo } from './util';
import type { EditJob, EditResult, GeneratedClip, Scene } from './types';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Bake IP guardrails into every generation prompt (belt; the review gate is braces). */
function guardedPrompt(scene: Scene, guardrails?: string): Scene {
  if (!guardrails) return scene;
  return { ...scene, prompt: `${scene.prompt}\n\nHARD CONSTRAINTS: ${guardrails}` };
}

export async function runEdit(job: EditJob): Promise<EditResult> {
  const warnings: string[] = [];
  if ((job.tier ?? 1) === 0) {
    // RULES.md: Tier 0 never touches cloud generation. Refuse rather than leak.
    throw new Error('Job is Tier 0 (private) — cloud generation is forbidden. Reclassify or generate locally.');
  }

  const project = `${slug(job.author)}--${slug(job.title)}`;
  const base = join(studioRoot(), '20_projects', project);
  const genDir = await ensureDir(join(base, 'gen'));
  const workDir = await ensureDir(join(base, 'work'));
  const outDir = await ensureDir(join(base, 'renders'));
  const ratio = job.ratio ?? '9:16';

  // L2 — beat map (drives every cut). Audio downloaded locally if remote.
  const beatmap = await analyzeBeats(job.audioUrl, workDir);
  const audioPath = await downloadTo(job.audioUrl, workDir, 'song' + (job.audioUrl.match(/\.[a-z0-9]+(\?|$)/i)?.[0]?.replace(/\?.*/, '') ?? '.wav'));

  // L1 — generate every scene (in parallel) at the ratio, with guardrails baked in.
  const scenes = job.scenes.map((s) => guardedPrompt({ ...s, ratio: s.ratio ?? ratio }, job.ipGuardrails));
  const shots = await Promise.all(scenes.map((s) => genShot(s, genDir)));
  const clips: GeneratedClip[] = shots.map((sh, i) => ({
    sceneId: scenes[i].id,
    provider: sh.provider,
    model: sh.model,
    localPath: sh.localPath,
    url: sh.url,
    seconds: scenes[i].seconds,
  }));

  // L1 — extra hook variants: re-roll the FIRST scene N times for A/B opening hooks.
  const variantCount = Math.max(0, (job.hookVariants ?? 1) - 1);
  const hookShots = await Promise.all(
    Array.from({ length: variantCount }, (_, k) => genShot(scenes[0], genDir, { variant: k + 1 })),
  );

  const orderedClips = clips.map((c) => ({ path: c.localPath, seconds: c.seconds }));
  const { slots } = computeSlots(beatmap.downbeats, orderedClips.map((c) => c.seconds));

  // L3 — assemble the master reel (ffmpeg, beat-synced 9:16).
  const reelPath = join(outDir, `${project}--reel--v01.mp4`);
  await renderReel({ clips: orderedClips, beatmap, audioPath, outPath: reelPath, workDir, ratio }, 'ffmpeg');

  // L3 — assemble each hook variant (swap clip 0, keep the rest).
  const hookVariants: string[] = [];
  for (let k = 0; k < hookShots.length; k++) {
    const swapped = [{ path: hookShots[k].localPath, seconds: scenes[0].seconds }, ...orderedClips.slice(1)];
    const vp = join(outDir, `${project}--reel--hook${k + 2}--v01.mp4`);
    await renderReel({ clips: swapped, beatmap, audioPath, outPath: vp, workDir: join(workDir, `hook${k + 2}`), ratio }, 'ffmpeg');
    hookVariants.push(vp);
  }

  // L6 — provenance: honest C2PA labeling + Origo registration (best-effort).
  const c2pa = await embedC2PA(reelPath, job.provenance, job.title);
  if (!c2pa.embedded) warnings.push('C2PA embedded manifest skipped (toolkit not installed); sidecar JSON + Origo record carry proof.');
  const origo = await registerOnOrigo(reelPath, { manifestPath: c2pa.manifestPath }, job.provenance, {
    title: job.title,
    author: job.author,
  });
  if (!origo.registered) warnings.push(`Origo: ${origo.reason}`);

  // L4/L5 — handoff package for the human CapCut + DaVinci passes.
  const handoffDir = await exportHandoff({
    job,
    reelPath: c2pa.mp4,
    clips,
    beatmap,
    audioPath,
    outDir: join(base, 'handoff'),
    slots,
  });

  return {
    mp4: c2pa.mp4,
    hookVariants,
    beatmap,
    clips,
    handoffDir,
    origoUrl: origo.url,
    verifyBadge: origo.badge,
    warnings,
  };
}

// ── Console status (used by app/page.tsx) ────────────────────────────────────
export function pipelineStatus(): { layer: string; label: string; ready: boolean; optional?: boolean }[] {
  return [
    { layer: 'L1·fal', label: 'Generation — needs FAL_KEY', ready: !!process.env.FAL_KEY },
    { layer: 'L1·veo/runway', label: 'Optional direct providers', ready: false, optional: true },
    { layer: 'L2·beat', label: 'librosa sidecar (python3 + librosa)', ready: true },
    { layer: 'L3·ffmpeg', label: 'Beat-synced 9:16 assembly', ready: true },
    { layer: 'L3·remotion', label: 'Deferred (company license)', ready: false, optional: true },
    { layer: 'L4·capcut', label: 'Human finishing — handoff export', ready: true },
    { layer: 'L5·davinci', label: 'Human master — handoff export', ready: true },
    { layer: 'L6·c2pa', label: 'Honest manifest sidecar', ready: true },
    { layer: 'L6·origo', label: 'IP registration — needs ORIGO_API_URL/KEY', ready: !!(process.env.ORIGO_API_URL && process.env.ORIGO_API_KEY), optional: true },
  ];
}
