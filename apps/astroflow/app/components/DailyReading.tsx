'use client';
import { useState } from 'react';
import { useT } from '../../lib/i18n/provider';

// The daily "sky now" reading — FlowMe reads today's transits over your natal
// chart. Time-dependent, so it's always computed fresh (never cached).
export default function DailyReading({ handle }: { handle: string }) {
  const t = useT();
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function run() {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handles: [handle], system: 'transits', context: 'friendship' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Failed'));
      setReading(json.reading);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl p-[1px]"
      style={{ background: 'linear-gradient(135deg, rgba(154,143,224,0.45), rgba(227,192,122,0.25), rgba(123,208,198,0.35))' }}>
      <div className="rounded-2xl p-5 bg-[#0e1020]/95">
        {!reading && (
          <button className="af-btn af-btn-primary" disabled={busy} onClick={run}>
            {busy ? t('Reading the sky…') : t('✦ Read my sky today')}
          </button>
        )}
        {err && <div className="text-[13px] text-[#f0a0a0] mt-2">{err}</div>}
        {reading && (
          <>
            <div className="text-[15px] leading-relaxed text-[#e8e6f0] whitespace-pre-wrap">{reading}</div>
            <button className="af-btn af-btn-ghost mt-4" disabled={busy} onClick={run}>
              {busy ? t('Reading the sky…') : t('Read again')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
