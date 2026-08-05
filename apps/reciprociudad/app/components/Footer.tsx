import Image from 'next/image';

type Props = { copy: Record<string, string>; media: Record<string, string> };

export default function Footer({ copy, media }: Props) {
  return (
    <footer>
      <div className="wrap foot">
        <a className="brand" href="#top">
          <Image className="logo-mark" src={media['brand.logo']} alt="" width={36} height={36} />
          {copy['footer.brand']}
        </a>
        <nav className="foot-links">
          <a href="#sistema">{copy['nav.link2']}</a>
          <a href="#viaje">{copy['nav.link3']}</a>
          <a href="#iniciativas">{copy['nav.link4']}</a>
          <a href={copy['social.url']} target="_blank" rel="noopener">
            {copy['nav.link5']}
          </a>
          <a href="#red">{copy['red.eyebrow']}</a>
          <a href="#unete">{copy['nav.cta']}</a>
        </nav>
        <small>{copy['footer.tagline']}</small>
      </div>
    </footer>
  );
}
