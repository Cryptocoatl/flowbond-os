'use client';
// EnvStrip — live local time + computed moon phase for the region. Weather/AQI
// read "—" until a real feed is wired (honest, not faked). Real signals first.
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

/** Conway-style moon phase (0..7) from a date. Deterministic, no network. */
function moonPhase(d: Date): string {
  let r = d.getFullYear() % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + d.getMonth() + 1 + d.getDate();
  if (d.getMonth() < 2) r += 2;
  r = Math.floor(r) % 30;
  return PHASES[Math.round((r / 30) * 8) % 8];
}

function Cell({ icon, label, value }: { icon: 'sun' | 'moon' | 'temp' | 'wind'; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon name={icon} size={15} className="text-kai-faint" />
      <div className="min-w-0 leading-tight">
        <div className="text-[9px] uppercase tracking-wider text-kai-faint">{label}</div>
        <div className="truncate text-[12px] font-medium text-kai-text">{value}</div>
      </div>
    </div>
  );
}

export function EnvStrip() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const time = now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const phase = now ? moonPhase(now) : '—';

  return (
    // Four cells wrapping inside a hero that is only 366px wide made a ragged
    // two-and-a-half-row block; a grid gives them equal columns at every size.
    <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 rounded-xl2 border border-white/[0.06] bg-black/25 px-4 py-2.5 backdrop-blur-md sm:w-auto sm:grid-cols-4 sm:gap-x-5">
      <Cell icon="sun" label="Local time" value={time} />
      <Cell icon="moon" label="Moon" value={phase} />
      <Cell icon="temp" label="Weather" value="—" />
      <Cell icon="wind" label="Air" value="—" />
    </div>
  );
}
