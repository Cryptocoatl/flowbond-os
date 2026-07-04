import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="cl-scene cl-motes" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <span className="cl-rays" aria-hidden />
      <span className="cl-sun" aria-hidden />
      <div className="cl-stagger" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div className="cl-logo-halo" style={{ marginBottom: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cl-logo-img" src="/claudia-logo.png" alt="ClaudIA" width={120} height={120} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 34, margin: '6px 0 2px' }}>
          <span className="cl-shine">ClaudIA</span>
        </h1>
        <p style={{ color: 'var(--cl-gold)', fontStyle: 'italic', fontSize: 14, margin: '0 0 22px' }}>
          Unalienable technology, made and followed by love.
        </p>
        <div className="gf-card">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
