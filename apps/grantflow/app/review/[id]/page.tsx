import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadReviewCard } from '../load';
import DraftReviewCard from '../DraftReviewCard';

export const dynamic = 'force-dynamic';

export default async function ReviewCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { cards, rounds } = await loadReviewCard(id);
  const card = cards[0];
  if (!card) notFound();

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '28px 20px 80px', maxWidth: 820 }}>
      <Link className="link" href="/review" style={{ fontSize: 12 }}>
        ← Draft Review
      </Link>
      <h1
        style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: 27,
          margin: '10px 0 16px',
        }}
      >
        {card.grantName}
      </h1>
      <DraftReviewCard card={card} rounds={rounds} defaultOpen showLink={false} />
    </main>
  );
}
