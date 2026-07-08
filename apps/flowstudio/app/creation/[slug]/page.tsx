import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreation } from '../../../lib/library';
import CreationDetail from '../../components/CreationDetail';
import { ArrowLeft } from '../../components/icons';

export const dynamic = 'force-dynamic';

export default async function CreationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creation = await getCreation(slug);
  if (!creation) notFound();

  return (
    <main>
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Creations
      </Link>
      <CreationDetail creation={creation} />
    </main>
  );
}
