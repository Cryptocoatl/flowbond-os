import Link from 'next/link';
import { loadReviewCards } from './load';
import ReviewBoard from './ReviewBoard';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const { cards, rounds } = await loadReviewCards();

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '28px 20px 80px' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: 30,
          margin: '0 0 4px',
        }}
      >
        Draft Review
      </h1>
      <p style={{ color: 'var(--gf-muted)', marginTop: 0, maxWidth: 620, lineHeight: 1.6 }}>
        Every draft passes {rounds.length} audit rounds before it can be called ready. Nothing here
        is ever sent to a funder — you submit on their portal, and this records that you did.
      </p>

      {cards.length === 0 ? (
        <div className="gf-card" style={{ textAlign: 'center', padding: 40, marginTop: 16 }}>
          <p style={{ color: 'var(--gf-muted)' }}>Nothing tracked yet.</p>
          <Link className="gf-btn" href="/grants">
            Browse grants →
          </Link>
        </div>
      ) : (
        <ReviewBoard cards={cards} rounds={rounds} />
      )}
    </main>
  );
}
