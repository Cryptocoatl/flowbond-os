import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runEdit } from '../src/modules/edit/pipeline';
import type { EditJob } from '../src/modules/edit/types';
import { studioRoot } from './paths';

const runsDir = () => join(studioRoot(), '.cache', 'runs');
const statusPath = (id: string) => join(runsDir(), `${id}.json`);

export interface RunStatus {
  id: string;
  title: string;
  state: 'running' | 'done' | 'error';
  startedAt: number;
  finishedAt?: number;
  result?: { mp4: string; hookVariants: number; bpm: number; warnings: string[] };
  error?: string;
}

/** Kick off a pipeline run in the background; return a run id to poll. The run
 *  continues on the long-lived Node server after this returns. */
export async function startRun(job: EditJob): Promise<string> {
  await mkdir(runsDir(), { recursive: true });
  const id = `run-${Date.now().toString(36)}`;
  const base: RunStatus = { id, title: job.title || 'Untitled', state: 'running', startedAt: Date.now() };
  await writeFile(statusPath(id), JSON.stringify(base));

  runEdit(job)
    .then(async (r) => {
      const done: RunStatus = {
        ...base,
        state: 'done',
        finishedAt: Date.now(),
        result: { mp4: r.mp4, hookVariants: r.hookVariants.length, bpm: r.beatmap.bpm, warnings: r.warnings },
      };
      await writeFile(statusPath(id), JSON.stringify(done));
    })
    .catch(async (e) => {
      await writeFile(statusPath(id), JSON.stringify({ ...base, state: 'error', finishedAt: Date.now(), error: String(e?.message ?? e) }));
    });

  return id;
}

export async function getRun(id: string): Promise<RunStatus | null> {
  try {
    return JSON.parse(await readFile(statusPath(id.replace(/[^a-z0-9-]/gi, '')), 'utf8'));
  } catch {
    return null;
  }
}
