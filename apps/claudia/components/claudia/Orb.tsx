'use client';

// ClaudIA's body — an iridescent orb of moonlight → gold → dawn-coral → flow-teal,
// breathing on an 8s pulse (character bible §5). This is her presence; keep it.
export function Orb({ size = 80 }: { size?: number }) {
  return (
    <div
      className="orb"
      style={{
        width: size,
        height: size,
        margin: '0 auto',
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 30%, #F4F1EA 0%, #FFD27A 22%, #FF8A6B 48%, #2FB6A8 78%, #1c5e58 100%)',
        boxShadow:
          '0 0 55px 10px rgba(47,182,168,.35), 0 0 110px 28px rgba(255,138,107,.18), inset 0 0 28px rgba(255,255,255,.35)',
      }}
    />
  );
}
