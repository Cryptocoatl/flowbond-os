import Image from 'next/image';

export default function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <a className="brand" href="#top">
          <Image className="logo-mark" src="/logo-512.png" alt="" width={36} height={36} />
          Reciprociudad
        </a>
        <nav className="foot-links">
          <a href="#origen">El origen</a>
          <a href="#sistema">El sistema</a>
          <a href="#viaje">El viaje</a>
          <a href="#iniciativas">Iniciativas</a>
          <a href="https://www.instagram.com/reciprociudad" target="_blank" rel="noopener">
            Instagram
          </a>
          <a href="#unete">Únete</a>
        </nav>
        <small>Hecha en la ciudad-lago · CDMX</small>
      </div>
    </footer>
  );
}
