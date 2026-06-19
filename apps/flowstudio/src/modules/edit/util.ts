// ── Shared helpers: filesystem, downloads, subprocess ────────────────────────
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline as streamPipeline } from 'node:stream/promises';
import os from 'node:os';

/** Root where FlowStudio renders/handoffs land. RULES.md → ~/FlowStudio. */
export function studioRoot(): string {
  return process.env.FLOWSTUDIO_ROOT || join(os.homedir(), 'FlowStudio');
}

export async function ensureDir(dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Download a URL (or copy a local file path) into outDir/name. Returns the path. */
export async function downloadTo(
  urlOrPath: string,
  outDir: string,
  name: string,
  opts: { headers?: Record<string, string> } = {},
): Promise<string> {
  await ensureDir(outDir);
  const dest = join(outDir, name);

  // Local file → already on disk; let callers pass paths through transparently.
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath;

  const res = await fetch(urlOrPath, { headers: opts.headers });
  if (!res.ok || !res.body) throw new Error(`download failed ${res.status} for ${urlOrPath}`);
  await streamPipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
  return dest;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run a command, capturing output. Rejects on non-zero unless `allowFail`. */
export function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; allowFail?: boolean } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      const result = { code: code ?? -1, stdout, stderr };
      if (code === 0 || opts.allowFail) resolve(result);
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

/** True if a binary resolves on PATH (used to fail fast with a clear message). */
export async function hasBinary(bin: string): Promise<boolean> {
  try {
    await run(process.platform === 'win32' ? 'where' : 'which', [bin], { allowFail: false });
    return true;
  } catch {
    return false;
  }
}
