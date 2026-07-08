import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectsRoot, jobsDir, projectName } from './paths';
import { certsByHash } from './origo-read';

export interface Branch {
  name: string; // file name
  label: string; // human label
  kind: 'clean' | 'lyric' | 'hook' | 'other';
  path: string;
  sizeMB: number;
  mtime: number;
  hash?: string;
  cert?: { id: string; visibility: string };
}
export interface Shot { id: string; path: string }
export interface Creation {
  slug: string;
  title: string;
  author: string;
  branchCount: number;
  shotCount: number;
  posterBranch?: string; // path of the branch to poster from
  branches: Branch[];
  shots: Shot[];
  cutSheet?: any;
}

const hashCache = new Map<string, { mtime: number; hash: string }>();
function sha256File(path: string): Promise<string> {
  return new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(path).on('error', rej).on('data', (c) => h.update(c)).on('end', () => res(h.digest('hex')));
  });
}
async function hashCached(path: string, mtime: number): Promise<string> {
  const hit = hashCache.get(path);
  if (hit && hit.mtime === mtime) return hit.hash;
  const hash = await sha256File(path);
  hashCache.set(path, { mtime, hash });
  return hash;
}

const prettify = (s: string) =>
  s.replace(/--/g, ' · ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function branchMeta(file: string): { label: string; kind: Branch['kind'] } {
  if (/lyric/i.test(file)) return { label: 'Lyric cut', kind: 'lyric' };
  const hook = file.match(/hook(\d+)/i);
  if (hook) return { label: `Hook variant ${hook[1]}`, kind: 'hook' };
  if (/reel--v01\.mp4$/i.test(file)) return { label: 'Master cut', kind: 'clean' };
  return { label: file.replace(/\.mp4$/i, ''), kind: 'other' };
}

/** Map projectName → {title, author} from the job configs. */
async function titleMap(): Promise<Map<string, { title: string; author: string }>> {
  const m = new Map<string, { title: string; author: string }>();
  try {
    for (const f of await readdir(jobsDir())) {
      if (!f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(await readFile(join(jobsDir(), f), 'utf8'));
        if (j.title && j.author) m.set(projectName(j.author, j.title), { title: j.title, author: j.author });
      } catch {
        /* skip bad job */
      }
    }
  } catch {
    /* no jobs dir */
  }
  return m;
}

async function buildCreation(
  dir: string,
  titles: Map<string, { title: string; author: string }>,
): Promise<Creation> {
  const root = join(projectsRoot(), dir);
  const meta = titles.get(dir);
  const title = meta?.title ?? prettify(dir);
  const author = meta?.author ?? '';

  const branches: Branch[] = [];
  const rendersDir = join(root, 'renders');
  if (existsSync(rendersDir)) {
    for (const f of (await readdir(rendersDir)).filter((x) => x.endsWith('.mp4')).sort()) {
      const p = join(rendersDir, f);
      const s = await stat(p);
      const { label, kind } = branchMeta(f);
      const b: Branch = { name: f, label, kind, path: p, sizeMB: +(s.size / 1e6).toFixed(1), mtime: s.mtimeMs };
      b.hash = await hashCached(p, s.mtimeMs);
      branches.push(b);
    }
  }
  // master cut first, then lyric, hooks, others
  const order = { clean: 0, lyric: 1, hook: 2, other: 3 };
  branches.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));

  const shots: Shot[] = [];
  const genDir = join(root, 'gen');
  if (existsSync(genDir)) {
    for (const f of (await readdir(genDir)).filter((x) => x.endsWith('.mp4')).sort()) {
      shots.push({ id: f.replace(/\.mp4$/i, ''), path: join(genDir, f) });
    }
  }

  let cutSheet: any;
  const cs = join(root, 'handoff', 'cut-sheet.json');
  if (existsSync(cs)) {
    try {
      cutSheet = JSON.parse(await readFile(cs, 'utf8'));
    } catch {
      /* skip */
    }
  }

  return {
    slug: dir,
    title,
    author,
    branchCount: branches.length,
    shotCount: shots.length,
    posterBranch: branches[0]?.path,
    branches,
    shots,
    cutSheet,
  };
}

/** Confirm Origo certs for all branches across the given creations (by hash). */
async function attachCerts(creations: Creation[]): Promise<void> {
  const certs = await certsByHash(creations.flatMap((c) => c.branches.map((b) => b.hash || '')));
  const byHash = new Map(certs.map((c) => [c.content_hash, c]));
  for (const c of creations)
    for (const b of c.branches) {
      const cc = b.hash ? byHash.get(b.hash) : undefined;
      if (cc) b.cert = { id: cc.cert_id, visibility: cc.visibility };
    }
}

/** A project is hidden from the studio if it contains a `.hidden` marker file. */
const isHidden = (dir: string) => existsSync(join(projectsRoot(), dir, '.hidden'));

export async function listCreations(): Promise<Creation[]> {
  if (!existsSync(projectsRoot())) return [];
  const dirs = (await readdir(projectsRoot(), { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !isHidden(d.name))
    .map((d) => d.name);
  const titles = await titleMap();
  const creations = await Promise.all(dirs.map((d) => buildCreation(d, titles)));
  await attachCerts(creations);
  return creations
    .filter((c) => c.branchCount > 0 || c.shotCount > 0)
    .sort((a, b) => (b.branches[0]?.mtime ?? 0) - (a.branches[0]?.mtime ?? 0));
}

export async function getCreation(slugDir: string): Promise<Creation | null> {
  if (!existsSync(join(projectsRoot(), slugDir))) return null;
  const titles = await titleMap();
  const c = await buildCreation(slugDir, titles);
  await attachCerts([c]);
  return c;
}
