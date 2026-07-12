export default function Nav() {
  return (
    <nav>
      <a className="nav-logo" href="#top" aria-label="Tulum Coin">
        <span className="coin-el" role="img" aria-label="Moneda Tulum Coin" />
        <span className="wordmark">Tulum Coin</span>
      </a>
      <div className="nav-links">
        <a href="#token">El token</a>
        <a href="#ecosistema">Ecosistema</a>
        <a href="#refi">ReFi Tulum</a>
        <a href="#circula">Circula</a>
        <a href="#verify">Verificar OG</a>
        <a href="#fest">Fest</a>
      </div>
      <a className="nav-cta" href="#verify">Entrar</a>
    </nav>
  );
}
