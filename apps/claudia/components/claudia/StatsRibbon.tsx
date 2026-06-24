'use client';

// The master ribbon — four living counters across the top of the dashboard.
export function StatsRibbon({
  connected, totalApps, openTasks, careDue, isRoot,
}: {
  connected: number;
  totalApps: number;
  openTasks: number;
  careDue: number;
  isRoot: boolean;
}) {
  const stats = [
    { label: 'Mundos conectados', value: `${connected}/${totalApps}`, accent: '#2FB6A8', emoji: '🌐' },
    { label: 'Listas abiertas', value: String(openTasks), accent: '#FFD27A', emoji: '✦' },
    { label: 'Tu cuidado', value: careDue ? `${careDue} pendiente${careDue > 1 ? 's' : ''}` : 'al día', accent: careDue ? '#FF8A6B' : '#2FB6A8', emoji: careDue ? '🌙' : '💚' },
    { label: 'Tu rol', value: isRoot ? 'super-admin 👑' : 'soberana', accent: '#F4F1EA', emoji: '✺' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 11,
        marginBottom: 16,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(244,241,234,.1)',
            borderRadius: 16,
            padding: '12px 14px',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.accent, opacity: 0.7 }} />
          <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,241,234,.45)', marginBottom: 5 }}>
            {s.emoji} {s.label}
          </div>
          <div style={{ fontSize: 19, fontWeight: 500, color: s.accent, letterSpacing: '0.01em' }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
