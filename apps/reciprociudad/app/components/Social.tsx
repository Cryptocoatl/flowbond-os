'use client';

import Script from 'next/script';
import { richKey } from '@/lib/rich';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

type Props = { copy: Record<string, string> };

/**
 * Instagram — follow button + featured content.
 * When `social.reel` holds a permalink the official embed transforms the
 * blockquote on load (the branded `.ig-card` is the fallback until embed.js
 * runs). Otherwise the card links straight to the profile, so the link is
 * never dead.
 */
export default function Social({ copy }: Props) {
  const handleUrl = copy['social.url'] || 'https://www.instagram.com/reciprociudad';
  const reel = (copy['social.reel'] || '').trim();
  const isReel = /^https?:\/\/(www\.)?instagram\.com\//i.test(reel);

  return (
    <section className="section" id="social">
      <div className="wrap">
        <div className="ig-grid">
          <div className="ig-copy reveal">
            <span className="eyebrow">{copy['social.eyebrow']}</span>
            <h2 className="display-md">{richKey(copy, 'social.title')}</h2>
            <p>{richKey(copy, 'social.body')}</p>
            <div className="ig-actions">
              <a className="ig-btn" href={handleUrl} target="_blank" rel="noopener">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                {copy['social.btn']}
              </a>
              <span className="ig-handle">{copy['social.handle']}</span>
            </div>
          </div>

          <div className="ig-frame reveal">
            {isReel ? (
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={reel}
                data-instgrm-version="14"
                style={{ background: 'transparent', border: 0, margin: 0, width: '100%' }}
              >
                <FeaturedCard href={reel} copy={copy} />
              </blockquote>
            ) : (
              <FeaturedCard href={handleUrl} copy={copy} />
            )}
          </div>
        </div>
      </div>

      {isReel && (
        <Script
          src="https://www.instagram.com/embed.js"
          strategy="lazyOnload"
          onLoad={() => window.instgrm?.Embeds.process()}
        />
      )}
    </section>
  );
}

function FeaturedCard({ href, copy }: { href: string; copy: Record<string, string> }) {
  return (
    <a className="ig-card" href={href} target="_blank" rel="noopener">
      <div className="play">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="meta">{copy['social.handle']} · Instagram</div>
      <h3>{copy['social.cardTitle']}</h3>
    </a>
  );
}
