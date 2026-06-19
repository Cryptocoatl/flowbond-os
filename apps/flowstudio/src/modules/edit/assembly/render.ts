// ── L3 engine adapter ────────────────────────────────────────────────────────
// One seam so the rest of the pipeline never hardcodes an assembly engine.
// v1 = ffmpeg (free). Remotion can drop in later (it needs a paid FlowBond
// company license: ~$100/mo or $1000/yr min — see Reel.tsx for the seam).
import { assembleFfmpeg, type AssembleInput } from './ffmpeg';

export type AssemblyEngine = 'ffmpeg' | 'remotion';

export async function renderReel(input: AssembleInput, engine: AssemblyEngine = 'ffmpeg'): Promise<string> {
  if (engine === 'remotion') {
    throw new Error(
      'Remotion engine is not wired in v1 — it requires a FlowBond company license. ' +
        'Build the seam in assembly/Reel.tsx, then route here.',
    );
  }
  return assembleFfmpeg(input);
}
