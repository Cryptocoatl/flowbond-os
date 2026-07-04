import { MODEL_REGISTRY } from '../src/modules/edit/models';
import { pipelineStatus } from '../src/modules/edit/pipeline';

// FlowStudio edit-module console. This v1 surface is intentionally thin: the
// real product is the pipeline (L1 generation → L2 beat → L3 assembly), which
// runs via `POST /api/edit/run` or the CLI (`pnpm --filter @flowbond/flowstudio edit:run`).
// This page just shows what's wired and what's still a stub, honestly.
export default function Home() {
  const status = pipelineStatus();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl">FlowStudio · AI Video Edit</h1>
      <p className="mt-3 text-white/60">
        Song + brief → beat-synced 9:16 reel. Generation is unified behind one fal.ai key;
        assembly is FFmpeg-first (Remotion seam kept for later); provenance lands on Origo with
        honest AI-assisted labeling.
      </p>

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-widest text-white/40">Pipeline status</h2>
        <ul className="mt-4 space-y-2">
          {status.map((s) => (
            <li key={s.layer} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
              <span aria-hidden>{s.ready ? '🟢' : s.optional ? '⚪️' : '🟠'}</span>
              <span className="font-mono text-sm">{s.layer}</span>
              <span className="text-white/50">{s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-widest text-white/40">
          Model registry <span className="text-white/30">(Gate-0: verify slugs at fal.ai/models)</span>
        </h2>
        <ul className="mt-4 grid gap-2 font-mono text-xs text-white/60">
          {Object.entries(MODEL_REGISTRY).map(([k, v]) => (
            <li key={k}>
              <span className="text-white/40">{k}</span> → {v.slug}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
