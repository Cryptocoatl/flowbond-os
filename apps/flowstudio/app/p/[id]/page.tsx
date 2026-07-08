import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbRead } from '../../../lib/supabase-admin';
import { displayNameFor } from '../../../lib/auth';
import { PUB_BUCKET, type Publication } from '../../../lib/flowdrop';
import { Shield, Sparkles, Film, Branch } from '../../components/icons';
import ShareBar from './ShareBar';
import EngageBar from './EngageBar';

interface SplitLine { label: string; role: string; weight_bps: number; beneficiary_fbid: string | null }
const ROLE_COLOR: Record<string, string> = {
  videographer: '#25d4e8', animator: '#7c5cff', creator: '#f5c451', editor: '#f43f5e', music: '#34d399', sound: '#a78bfa', color: '#fb923c', owner: '#94a3b8',
};

export const dynamic = 'force-dynamic';

export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Publications are world-readable by RLS when visibility is public/unlisted.
  const { data } = await dbRead().from('flowdrop_publications').select('*').eq('id', id).maybeSingle();
  const pub = data as Publication | null;
  if (!pub) notFound();

  const videoUrl = dbRead().storage.from(PUB_BUCKET).getPublicUrl(pub.storage_path).data.publicUrl;

  // The provenance chain is denormalised onto the publication at publish time, so
  // this public page never touches the private contributions table.
  const editorName = pub.credits?.editor ?? (await displayNameFor(pub.editor_fbid));
  const shooterNames = pub.credits?.shooters ?? [];

  const certUrl = pub.origo_cert_id ? `https://origo.flowme.one/?cert=${pub.origo_cert_id}` : null;

  // FlowSplit + engagement (both public-read).
  const { data: splitRows } = await dbRead().from('flowstudio_splits').select('label, role, weight_bps, beneficiary_fbid').eq('publication_id', id).order('weight_bps', { ascending: false });
  const splits = (splitRows as SplitLine[]) ?? [];
  const { data: eng } = await dbRead().from('flowstudio_engagement').select('views, likes, interactions, points_minted').eq('publication_id', id).maybeSingle();
  const counts = { views: Number(eng?.views ?? 0), likes: Number(eng?.likes ?? 0), interactions: Number(eng?.interactions ?? 0), points_minted: Number(eng?.points_minted ?? 0) };

  return (
    <main className="max-w-3xl">
      <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> FlowStudio · made by humans
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {pub.title}
      </h1>

      <div className="mt-5 overflow-hidden rounded-2xl border bg-black" style={{ borderColor: 'var(--border)' }}>
        <video src={videoUrl} controls playsInline className="mx-auto max-h-[70vh] w-auto" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={videoUrl} download
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--panel-2)' }}>
          Download
        </a>
        <ShareBar title={pub.title} />
        <EngageBar id={id} initial={counts} />
        {certUrl && (
          <a href={certUrl} target="_blank" rel="noreferrer"
            className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium"
            style={{ background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }}>
            <Shield className="h-4 w-4" /> Verified on Origo · {pub.origo_cert_id}
          </a>
        )}
      </div>

      {/* FlowSplit — who + how much, registered */}
      {splits.length > 0 && (
        <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
              <Branch className="h-4 w-4" /> FlowSplit · who earns what
            </h2>
            <span className="text-[12px] text-white/45">likes & interactions pay this split in FlowPoints</span>
          </div>
          {/* stacked bar */}
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
            {splits.map((s, i) => (
              <span key={i} title={`${s.label} · ${(s.weight_bps / 100).toFixed(0)}%`} style={{ width: `${s.weight_bps / 100}%`, background: ROLE_COLOR[s.role] ?? 'var(--muted)' }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {splits.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ROLE_COLOR[s.role] ?? 'var(--muted)' }} />
                <span className="min-w-0 flex-1 truncate text-white/85">{s.label}</span>
                <span className="text-[12px] uppercase tracking-wide text-white/40">{s.role}</span>
                <span className="w-12 text-right font-medium text-white">{(s.weight_bps / 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Provenance chain */}
      <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
          <Film className="h-4 w-4" /> Provenance chain
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/75">
          {shooterNames.length > 0 ? (
            <>
              Shot by <span className="font-medium text-white">{shooterNames.join(', ')}</span>
              {' · '}
            </>
          ) : null}
          Edited by <span className="font-medium text-white">{editorName}</span>
        </p>
        <p className="mt-2 text-[13px] text-white/45">
          Every contributor in this chain is credited on Origo and rewarded in FlowCredits — rewarding the
          chain of human-created content.
        </p>
      </section>

      <p className="mt-6 text-[13px] text-white/40">
        <Link href="/" className="underline">FlowStudio</Link> — pooled event footage, edited by people, provenance on Origo.
      </p>
    </main>
  );
}
