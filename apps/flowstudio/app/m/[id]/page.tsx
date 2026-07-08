import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbRead } from '../../../lib/supabase-admin';
import { displayNameFor } from '../../../lib/auth';
import { MEDIA_BUCKET, type MediaItem } from '../../../lib/media';
import { Shield, Sparkles } from '../../components/icons';
import ShareBar from '../../p/[id]/ShareBar';

export const dynamic = 'force-dynamic';

export default async function MediaSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // RLS exposes only shared (unlisted/public) items; private 404s for everyone but the owner's app.
  const { data } = await dbRead().from('studio_media').select('*').eq('id', id).maybeSingle();
  const m = data as MediaItem | null;
  if (!m) notFound();

  const url = dbRead().storage.from(MEDIA_BUCKET).getPublicUrl(m.storage_path).data.publicUrl;
  const author = await displayNameFor(m.owner_fbid);
  const certUrl = m.origo_cert_id ? `https://origo.flowme.one/?cert=${m.origo_cert_id}` : null;

  return (
    <main className="max-w-3xl">
      <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/40">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--cta)' }} /> FlowStudio · shared by a human
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {m.title || 'Untitled'}
      </h1>
      <p className="mt-1 text-sm text-white/50">by <span className="text-white/80">{author}</span></p>

      <div className="mt-5 overflow-hidden rounded-2xl border bg-black" style={{ borderColor: 'var(--border)' }}>
        {m.kind === 'video' ? (
          <video src={url} controls playsInline className="mx-auto max-h-[70vh] w-auto" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={m.title ?? ''} className="mx-auto max-h-[70vh] w-auto" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={url} download className="rounded-xl px-4 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--cta)' }}>Download</a>
        <ShareBar title={m.title || 'FlowStudio'} />
        {certUrl && (
          <a href={certUrl} target="_blank" rel="noreferrer"
            className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium"
            style={{ background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }}>
            <Shield className="h-4 w-4" /> Verified on Origo
          </a>
        )}
      </div>

      <p className="mt-6 text-[13px] text-white/40">
        <Link href="/" className="underline">FlowStudio</Link> — human-made media, authorship kept.
      </p>
    </main>
  );
}
