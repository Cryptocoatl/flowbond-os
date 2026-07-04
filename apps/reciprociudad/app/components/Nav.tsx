'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '#origen', label: 'El origen' },
  { href: '#sistema', label: 'El sistema' },
  { href: '#viaje', label: 'El viaje' },
  { href: '#iniciativas', label: 'Iniciativas' },
  { href: '#social', label: 'Instagram' },
];

export default function Nav() {
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
          <Image className="logo-mark" src="/logo-512.png" alt="" width={38} height={38} priority />
          Reciprociudad
        </a>
        <nav className="nav-links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <a href="#unete" className="btn btn-sun">
          Entrar a la red
        </a>
      </div>
    </header>
  );
}
