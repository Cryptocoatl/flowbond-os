import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/PageShell'
import { DocBlocks } from '@/components/DocBlocks'
import { DOCS, DOC_INDEX } from '@/content/docs'

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) return {}
  return {
    title: `${doc.title} — FlowBond Docs`,
    description: doc.summary,
    alternates: { canonical: `/docs/${doc.slug}` },
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) notFound()

  return (
    <PageShell eyebrow={doc.group} title={doc.title} lead={doc.summary}>
      <nav className="doc-sidenav" aria-label="Documentation">
        {DOC_INDEX.map((g) => (
          <div key={g.group}>
            <h5>{g.group}</h5>
            {g.pages.map((p) => (
              <a key={p.slug} href={`/docs/${p.slug}`} className={p.slug === doc.slug ? 'here' : undefined}>
                {p.title}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <DocBlocks blocks={doc.blocks} />

      <div className="doc-foot">
        <a href="/docs">← All documentation</a>
        <a href="/contact">Something wrong here? Tell us →</a>
      </div>
    </PageShell>
  )
}
