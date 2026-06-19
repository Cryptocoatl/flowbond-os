'use client';
import { useState } from 'react';
import PlaceAutocomplete, { type PlaceResult } from '../components/PlaceAutocomplete';
import type { Chart } from '../../lib/astro/types';
import { useT } from '../../lib/i18n/provider';

const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'] as const;
const EL_COLOR: Record<string, string> = {
  Fire: '#e8956a', Earth: '#a8c97f', Air: '#e3c07a', Water: '#7bd0c6',
};

// One-time chart: read anyone's sky from their natal information — computed
// live, stored NOWHERE. They cannot appear as a profile until they activate
// their own FBID; but you can mint their personal activation link from this
// very chart, and the moment they claim it you are bonded in full flow.
export default function InstantChart() {
  const t = useT();
  const [form, setForm] = useState({ name: '', date: '', time: '', unknownTime: false, place: '', tz: '', lat: NaN, lng: NaN });
  const [chart, setChart] = useState<Chart | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const ready = form.date && form.tz && Number.isFinite(form.lat) && (form.unknownTime || form.time);

  const birth = () => ({
    date: form.date,
    time: form.unknownTime ? null : form.time,
    tz: form.tz, lat: form.lat, lng: form.lng, place: form.place,
  });

  async function compute() {
    setErr(''); setBusy(true); setChart(null); setLink('');
    try {
      const res = await fetch('/api/astro/peek', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ birth: birth() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Failed'));
      setChart(json.chart); setLines(json.lines ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function makeLink() {
    setErr(''); setLinkBusy(true);
    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: form.name || t('A friend'), birth: birth() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Sign in and create your chart first.'));
      setLink(`${window.location.origin}/claim/${json.claimCode}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLinkBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const input = 'w-full bg-[#11131f] border border-[#242a3b] rounded-lg px-3 py-2 text-[#ece9e0] text-sm';
  const maxEl = chart ? Math.max(1, ...ELEMENTS.map((el) => chart.elements?.[el] ?? 0)) : 1;

  return (
    <div className="max-w-lg mx-auto p-6 text-[#ece9e0]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-2">{t('One-time chart')}</p>
      <h1
        className="text-4xl font-serif mb-2"
        style={{
          background: 'linear-gradient(100deg, #ece9e0 20%, #e3c07a 60%, #b6abec 95%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}
      >
        {t('Read any sky, instantly')}
      </h1>
      <p className="text-[#9698a8] text-sm mb-6 leading-relaxed">
        {t('Have someone’s birth moment? See their chart right now — computed live,')} <b className="text-[#cfc8e8]">{t('stored nowhere')}</b>.
        {' '}{t('They only become a profile when they activate their own FBID; until then this is just light passing through.')}
      </p>

      <input className={input} placeholder={t('Their name (optional — used for the invite)')} value={form.name} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <input type="date" className={input} value={form.date} onChange={(e) => set('date', e.target.value)} />
        <input type="time" disabled={form.unknownTime} className={input} value={form.time} onChange={(e) => set('time', e.target.value)} />
      </div>
      <label className="flex items-center gap-2 mt-2 text-xs text-[#9698a8]">
        <input type="checkbox" checked={form.unknownTime} onChange={(e) => set('unknownTime', e.target.checked)} />
        {t('birth time unknown (skips houses & rising)')}
      </label>
      <div className="mt-3">
        <PlaceAutocomplete
          value={form.place}
          onSelect={(r: PlaceResult) => setForm((f) => ({ ...f, place: r.place, tz: r.tz, lat: r.lat, lng: r.lng }))}
        />
      </div>
      <button
        onClick={compute}
        disabled={busy || !ready}
        className="mt-4 w-full bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg py-3 disabled:opacity-50"
      >
        {busy ? t('Reading the sky…') : t('✦ Reveal the chart')}
      </button>
      {err && <p className="text-[#d9663c] text-sm mt-3">{err}</p>}

      {chart && (
        <div className="mt-7 rounded-2xl border border-[#242a3b] bg-[#11131f]/90 p-5" style={{ animation: 'af-rise 0.6s ease-out' }}>
          <p className="font-serif text-xl">
            {chart.bodies.Sun.sign} {t('Sun')} · {chart.bodies.Moon.sign} {t('Moon')}{chart.asc ? ` · ${chart.asc.sign} ${t('Rising')}` : ''}
          </p>
          <div className="mt-3 space-y-1.5 max-w-[280px]">
            {ELEMENTS.map((el) => {
              const v = chart.elements?.[el] ?? 0;
              return (
                <div key={el} className="flex items-center gap-2">
                  <span className="w-10 text-[10px] uppercase tracking-wider" style={{ color: EL_COLOR[el] }}>{el}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#0a0b14] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(v / maxEl) * 100}%`, background: EL_COLOR[el] }} />
                  </div>
                  <span className="w-3 text-[10px] text-[#5b5e72] text-right">{v}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5">
            {lines.map((l, i) => <div key={i} className="text-sm text-[#cfc8e8] py-0.5">{l}</div>)}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            {!link ? (
              <>
                <button
                  onClick={makeLink}
                  disabled={linkBusy}
                  className="text-sm bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-4 py-2 hover:bg-[#9a8fe0]/30 transition disabled:opacity-50"
                >
                  {linkBusy ? t('Minting their link…') : t('✦ Create their activation link')}
                </button>
                <p className="text-[10px] text-[#5b5e72] mt-2 leading-relaxed">
                  {t('A personal invite minted from this very chart. When they activate their FBID through it, this becomes their real profile and you are bonded — full mutual flow, from the chart you made.')}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-[#7bd0c6] mb-2">{t('✓ Saved to your charted souls — manage them anytime on your')} <a href="/dashboard" className="underline">{t('dashboard')}</a>.</p>
                <div className="flex gap-2 items-center">
                  <input readOnly value={link} onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-xs text-[#9698a8] font-mono" />
                  <button onClick={copyLink} className="text-xs bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-3 py-2">
                    {copied ? t('Copied ✓') : t('Copy')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
