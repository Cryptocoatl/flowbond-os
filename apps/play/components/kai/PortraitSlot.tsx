'use client';
// =============================================================================
// PortraitSlot — an image slot that degrades gracefully. Renders a layered
// background: a per-seed gradient + monogram UNDER the optional image, so a
// missing/404 asset shows an elegant placeholder instead of a broken image.
// Drop real art at the `src` path (e.g. /images/guardians/tef.webp) and it wins.
// =============================================================================
const HUES = ['#6FCF97', '#7CC7FF', '#B69CFF', '#F4C25A', '#F4A65A', '#6FE0C6'];

function hue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

export function PortraitSlot({
  src,
  seed,
  label,
  className = '',
  rounded = 'rounded-xl2',
}: {
  src?: string;
  seed: string;
  label: string;
  className?: string;
  rounded?: string;
}) {
  const c = hue(seed);
  const monogram = label.trim().charAt(0).toUpperCase();
  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{
        background: `radial-gradient(120% 120% at 30% 0%, ${c}2e, transparent 60%), linear-gradient(160deg, #121a17, #0a0f0d)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Monogram placeholder (behind the image). */}
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-2xl font-semibold" style={{ color: `${c}cc` }}>
          {monogram}
        </span>
      </div>
      {/* Real asset on top; hidden if it fails to load (background shows through). */}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {/* Bottom scrim for legibility when an image is present. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
