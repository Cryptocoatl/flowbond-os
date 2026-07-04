// ── CLI runner ───────────────────────────────────────────────────────────────
// Run a job from the terminal without the web server:
//   pnpm --filter @flowbond/flowstudio edit:run -- jobs/este-mundial.json
// Loads .env.local, reads the job JSON, runs the pipeline, prints the result.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEdit } from './pipeline';
import type { EditJob } from './types';

async function loadEnv() {
  // Minimal .env.local loader (no dep): KEY=VALUE lines, ignores comments.
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(here, '../../../.env.local');
    const raw = await readFile(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}

async function main() {
  await loadEnv();
  const jobArg = process.argv[2] || 'src/modules/edit/jobs/este-mundial.json';
  const jobPath = resolve(process.cwd(), jobArg);
  const job = JSON.parse(await readFile(jobPath, 'utf8')) as EditJob;

  console.log(`▶ FlowStudio edit · ${job.title}`);
  const result = await runEdit(job);
  console.log('\n✅ Done');
  console.log(`   reel:     ${result.mp4}`);
  console.log(`   variants: ${result.hookVariants.length}`);
  console.log(`   handoff:  ${result.handoffDir}`);
  console.log(`   origo:    ${result.origoUrl ?? '(not registered)'}`);
  if (result.warnings.length) console.log('\n⚠ warnings:\n' + result.warnings.map((w) => `   - ${w}`).join('\n'));
}

main().catch((e) => {
  console.error('✖ edit failed:', e?.message ?? e);
  process.exit(1);
});
