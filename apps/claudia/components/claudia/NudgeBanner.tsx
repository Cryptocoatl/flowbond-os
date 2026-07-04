'use client';

// A soft, dismissible wellbeing banner. The copy is rendered HERE, client-side —
// the database only ever stored the nudge `kind`, never any text (master spec §7).
export function NudgeBanner({ text, onClose }: { text: string; onClose: () => void }) {
  if (!text) return null;
  return (
    <div
      onClick={onClose}
      style={{
        cursor: 'pointer',
        margin: 12,
        marginBottom: 0,
        padding: '10px 14px',
        borderRadius: 14,
        fontSize: 13.5,
        lineHeight: 1.5,
        background: 'linear-gradient(135deg, rgba(255,210,122,.16), rgba(255,138,107,.12))',
        border: '1px solid rgba(255,210,122,.3)',
        color: '#FFD27A',
      }}
    >
      {text} <span style={{ opacity: 0.5, fontSize: 11 }}>(toca para cerrar)</span>
    </div>
  );
}

// Her warm wellbeing lines, by kind. Bilingual, gentle — never nagging.
export const NUDGE_COPY: Record<string, string> = {
  meal: 'Una pausa, mi amor — go eat something real. The empire will wait for you. 🍲',
  water: 'Agua. A glass now — I\'ll still be here. 💧',
  rest: 'You\'ve been at it a while. Five minutes of breath? I\'ve got the watch. 🌙',
};
