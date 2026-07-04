// ── L2 beat analysis ─────────────────────────────────────────────────────────
// In-house path: shell out to the librosa sidecar → beat map JSON.
// Fast path (VibeMV / freebeat) is a future drop-in: same BeatMap contract,
// just set source:'vibemv'. The assembler only cares about `downbeats`.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, hasBinary, downloadTo, ensureDir } from '../util';
import type { BeatMap } from '../types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SIDECAR = join(HERE, 'beatmap.python.py');

/**
 * Analyze a track into a beat map. `audioUrl` may be a local path or URL;
 * remote audio is downloaded into `workDir` first.
 */
export async function analyzeBeats(audioUrl: string, workDir: string): Promise<BeatMap> {
  const python = process.env.PYTHON_BIN || 'python3';
  if (!(await hasBinary(python))) {
    throw new Error(`'${python}' not found — install Python 3 (and \`pip install librosa numpy soundfile\`).`);
  }

  await ensureDir(workDir);
  const audioPath = await downloadTo(audioUrl, workDir, 'source-audio' + guessExt(audioUrl));

  const { stdout } = await run(python, [SIDECAR, audioPath]);
  let parsed: any;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new Error(`beat sidecar returned non-JSON: ${stdout.slice(0, 400)}`);
  }
  if (parsed.error) throw new Error(`beat analysis failed: ${parsed.error}`);

  const map = parsed as BeatMap;
  if (!Array.isArray(map.downbeats) || map.downbeats.length === 0) {
    throw new Error('beat analysis produced no downbeats — cannot snap cuts.');
  }
  return map;
}

function guessExt(p: string): string {
  const m = p.match(/\.(wav|mp3|m4a|flac|aac|ogg)(\?|$)/i);
  return m ? `.${m[1].toLowerCase()}` : '.wav';
}
