import { SignOut } from './SignOut';

// Shown when a signed-in user is not (yet) linked to any deal — e.g. their email
// doesn't match a seeded party slot. Reveals nothing about any deal.
export function NotAParty({ email }: { email: string | null }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 460, padding: 28, textAlign: 'center' }}>
        <span className="gold" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          FlowScrow
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '8px 0' }}>
          No deal for this account
        </h1>
        <p style={{ fontSize: 13.5, color: '#9fb0a4', lineHeight: 1.6, margin: '0 0 18px' }}>
          {email ? <>You&rsquo;re signed in as <b>{email}</b>, </> : 'You are signed in, '}
          but this address isn&rsquo;t a party to any closing. If you expected access, ask counsel to
          confirm your email on the deal&rsquo;s party list, then sign in again.
        </p>
        <SignOut />
      </div>
    </main>
  );
}
