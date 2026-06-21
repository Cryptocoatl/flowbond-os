'use client';

import Script from 'next/script';

const REEL = 'https://www.instagram.com/reel/DZteNpkRW7U/'; // TODO(content): swap permalink to rotate the featured reel
const HANDLE = 'https://www.instagram.com/reciprociudad';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/**
 * Instagram — follow button + the featured reel via the official embed.
 * `embed.js` transforms the blockquote on load; until then (or in a sandbox
 * that blocks it) the branded `.ig-card` fallback shows and links to the reel.
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
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={REEL}
              data-instgrm-version="14"
              style={{ background: 'transparent', border: 0, margin: 0, width: '100%' }}
            >
              <a className="ig-card" href={REEL} target="_blank" rel="noopener">
                <div className="play">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="meta">REEL · @reciprociudad</div>
                <h3>Ver el reel en Instagram →</h3>
              </a>
            </blockquote>
          </div>
        </div>
      </div>

      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds.process()}
      />
    </section>
  );
}
