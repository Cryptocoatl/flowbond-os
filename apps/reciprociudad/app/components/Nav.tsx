'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Props = { copy: Record<string, string>; media: Record<string, string> };

const HREFS = ['#top', '#sistema', '#viaje', '#iniciativas', '#social'];

export default function Nav({ copy, media }: Props) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header id="hdr" className={solid ? 'solid' : undefined}>
      <div className="wrap nav">
        <a className="brand" href="#top">
          <Image className="logo-mark" src={media['brand.logo']} alt="" width={38} height={38} priority />
          {copy['nav.brand']}
        </a>
        <nav className="nav-links">
          {HREFS.map((href, i) => {
            const label = copy[`nav.link${i + 1}`];
            if (!label) return null;
            return (
              <a key={href} href={href}>
                {label}
              </a>
            );
          })}
        </nav>
        <a href="#unete" className="btn btn-sun nav-cta">
          <span className="nav-cta-full">{copy['nav.cta']}</span>
          <span className="nav-cta-short">{copy['nav.ctaShort']}</span>
        </a>
      </div>
    </header>
  );
}
