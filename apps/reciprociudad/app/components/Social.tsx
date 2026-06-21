'use client';

import Script from 'next/script';

const HANDLE = 'https://www.instagram.com/reciprociudad';
// Set REEL to a specific reel/post permalink (e.g. 'https://www.instagram.com/reel/XXXX/')
// to feature it via the official embed. While null, the featured card links to
// the profile so the link is always live (no dead reel).
const REEL: string | null = null;

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/**
 * Instagram — follow button + featured content.
 * If REEL is set, the official embed transforms the blockquote on load (with the
 * branded `.ig-card` as fallback until embed.js runs). Otherwise the card links
 * straight to @reciprociudad.
 */
export default function Social() {
  return (
    <section className="section" id="social">
      <div className="wrap">
        <div className="ig-grid">
          <div className="ig-copy reveal">
            <span className="eyebrow">Vívelo en Instagram</span>
            <h2 className="display-md">
              La red <em className="coral">ya late</em> ahí afuera.
            </h2>
            <p>
              Síguenos para ver las chinampas vivas en movimiento: trueques, huertos, ferias y la
              comunidad regenerando la ciudad, un reel a la vez.
            </p>
            <div className="ig-actions">
              <a className="ig-btn" href={HANDLE} target="_blank" rel="noopener">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                Seguir @reciprociudad
              </a>
              <span className="ig-handle">@reciprociudad</span>
            </div>
          </div>

          <div className="ig-frame reveal">
            {REEL ? (
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={REEL}
                data-instgrm-version="14"
                style={{ background: 'transparent', border: 0, margin: 0, width: '100%' }}
              >
                <FeaturedCard href={REEL} />
              </blockquote>
            ) : (
              <FeaturedCard href={HANDLE} />
            )}
          </div>
        </div>
      </div>

      {REEL && (
        <Script
          src="https://www.instagram.com/embed.js"
          strategy="lazyOnload"
          onLoad={() => window.instgrm?.Embeds.process()}
        />
      )}
    </section>
  );
}

function FeaturedCard({ href }: { href: string }) {
  return (
    <a className="ig-card" href={href} target="_blank" rel="noopener">
      <div className="play">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="meta">@reciprociudad · Instagram</div>
      <h3>Ver la red en Instagram →</h3>
    </a>
  );
}
