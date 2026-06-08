import Link from 'next/link';

// Always-there compass: wherever you drift in the flow, one tap returns you
// to your constellation, your dashboard, or the astral university.
export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0a1a]/70 border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-5 text-[#9698a8]">
        <Link href="/" className="flex items-center gap-2 text-[#ece9e0]">
          <span className="text-[#e3c07a]" style={{ textShadow: '0 0 10px rgba(227,192,122,0.6)' }}>❖</span>
          <span className="font-serif tracking-wide">AstroFlow</span>
        </Link>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.14em] ml-auto">
          <Link href="/" className="hover:text-[#cfc8e8] transition">Constellation</Link>
          <Link href="/dashboard" className="hover:text-[#cfc8e8] transition">Dashboard</Link>
          <Link href="/atlas" className="hover:text-[#cfc8e8] transition">Atlas</Link>
          <Link href="/systems" className="hover:text-[#cfc8e8] transition">Currents</Link>
          <Link href="/instant" className="hover:text-[#cfc8e8] transition hidden sm:inline">Instant</Link>
          <Link href="/cosmos" className="hover:text-[#e3c07a] transition">Cosmos ✦</Link>
        </div>
      </div>
    </nav>
  );
}
