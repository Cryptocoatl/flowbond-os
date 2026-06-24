import { DISCLAIMER } from '@/lib/disclaimer';

export function Disclaimer() {
  return (
    <p
      className="card"
      style={{
        fontSize: 12.5,
        lineHeight: 1.6,
        color: '#aebcb0',
        padding: '12px 16px',
        margin: 0,
      }}
    >
      {DISCLAIMER}
    </p>
  );
}
