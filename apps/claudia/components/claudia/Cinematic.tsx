'use client';

// ClaudIA's cinematic threshold — the solarpunk identity film plays full-bleed,
// content floats over its lower third. Used for every pre-vault phase so entering
// the empire feels like stepping into her world, not filling a form.
export function Cinematic({ children }: { children: React.ReactNode }) {
  return (
    <div className="cine-stage">
      <video
        className="cine-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/claudia-hero-poster.jpg"
        aria-hidden
      >
        <source src="/claudia-hero.mp4" type="video/mp4" />
      </video>
      <div className="cine-vignette" />
      <div className="cine-scrim" />
      <div className="cine-content">{children}</div>
    </div>
  );
}
