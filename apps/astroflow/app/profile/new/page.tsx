'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Visibility } from '../../../lib/astro/types';
import PlaceAutocomplete from '../../components/PlaceAutocomplete';
import { browserClient } from '../../../lib/supabase';

const TIERS: { v: Visibility; label: string; help: string }[] = [
  { v: 'private', label: 'Only me', help: 'Fully private. No one else can see your chart.' },
  { v: 'specific', label: 'Specific people', help: 'Only FlowBond @handles you grant. They can also request access.' },
  { v: 'friends', label: 'Just friends', help: 'Any accepted FlowBond friend can see your chart.' },
  { v: 'public', label: 'Everyone on AstroFlow', help: 'Anyone on AstroFlow can view it and add you to collective flow maps.' },
];

export default function NewProfile() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: '', handle: '', date: '', time: '', unknownTime: false,
    place: '', tz: '', lat: '', lng: '', avatarColor: '#9a8fe0',
  });
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Personalized guest invite (?claim=<code>): the inviter already entered
  // this person's birth data, so the form arrives prefilled — one look,
  // tweak if needed, and the chart is theirs.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('claim');
    if (!code) return;
    setClaimCode(code);
    fetch(`/api/guest?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => {
        if (!g || g.claimed) return;
        setForm((f) => ({
          ...f,
          displayName: g.display_name ?? f.displayName,
          date: g.birth_date ?? f.date,
          time: g.birth_time ? String(g.birth_time).slice(0, 5) : '',
          unknownTime: !g.birth_time,
          place: g.birth_place ?? f.place,
          tz: g.birth_tz ?? f.tz,
          lat: g.birth_lat != null ? String(g.birth_lat) : f.lat,
          lng: g.birth_lng != null ? String(g.birth_lng) : f.lng,
          avatarColor: g.avatar_color ?? f.avatarColor,
        }));
        setVisibility('specific'); // they're joining a weave — shares need to take effect
      })
      .catch(() => {});
  }, []);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/astro/compute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          handle: form.handle || undefined,
          avatarColor: form.avatarColor,
          visibility,
          birth: {
            date: form.date,
            time: form.unknownTime ? null : form.time,
            tz: form.tz,
            lat: parseFloat(form.lat),
            lng: parseFloat(form.lng),
            place: form.place,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      if (claimCode) {
        // Take the seat: swap the guest entry for this fresh profile in every
        // collective chart that holds them, then land on the dashboard.
        const { error } = await browserClient().rpc('claim_guest', { code: claimCode });
        if (error) throw new Error(error.message);
        router.push('/dashboard');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      router.push(next);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full bg-[#11131f] border border-[#242a3b] rounded-lg px-3 py-2 text-[#ece9e0] text-sm';
  return (
    <div className="max-w-lg mx-auto p-6 text-[#ece9e0]">
      <h1 className="text-3xl font-serif mb-1">Add your chart</h1>
      <p className="text-[#9698a8] text-sm mb-6">Computed to the degree from your birth moment, then woven into the constellation.</p>

      <label className="text-xs uppercase tracking-wider text-[#5b5e72]">Display name</label>
      <input className={input} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />

      <label className="text-xs uppercase tracking-wider text-[#5b5e72] mt-4 block">Handle <span className="lowercase tracking-normal text-[#5b5e72]">(optional — your @ on AstroFlow)</span></label>
      <div className="flex items-center gap-1">
        <span className="text-[#9698a8]">@</span>
        <input className={input} placeholder="auto from your FlowBond ID if blank" value={form.handle}
          onChange={(e) => set('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-[#5b5e72]">Birth date</label>
          <input type="date" className={input} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-[#5b5e72]">Birth time</label>
          <input type="time" disabled={form.unknownTime} className={input} value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 mt-2 text-xs text-[#9698a8]">
        <input type="checkbox" checked={form.unknownTime} onChange={(e) => set('unknownTime', e.target.checked)} />
        I don&apos;t know my birth time (skips houses &amp; rising)
      </label>

      <label className="text-xs uppercase tracking-wider text-[#5b5e72] mt-4 block">Birth place</label>
      <PlaceAutocomplete
        value={form.place}
        onSelect={(r) =>
          setForm((f) => ({ ...f, place: r.place, tz: r.tz, lat: String(r.lat), lng: String(r.lng) }))
        }
      />
      {form.lat && form.lng && (
        <p className="text-[11px] text-[#7fd1a8] mt-1">
          ✓ {form.tz || 'tz unresolved'} · {parseFloat(form.lat).toFixed(4)},{' '}
          {parseFloat(form.lng).toFixed(4)} (E+)
        </p>
      )}
      {/* Manual override / fallback when no geocoder token is configured */}
      <details className="mt-2">
        <summary className="text-[10px] text-[#5b5e72] cursor-pointer">Enter coordinates manually</summary>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <input className={input} placeholder="IANA tz" value={form.tz} onChange={(e) => set('tz', e.target.value)} />
          <input className={input} placeholder="lat" value={form.lat} onChange={(e) => set('lat', e.target.value)} />
          <input className={input} placeholder="lng (E+)" value={form.lng} onChange={(e) => set('lng', e.target.value)} />
        </div>
      </details>

      <label className="text-xs uppercase tracking-wider text-[#5b5e72] mt-6 block mb-2">Who can see this chart?</label>
      <div className="space-y-2">
        {TIERS.map((t) => (
          <button key={t.v} onClick={() => setVisibility(t.v)}
            className={`w-full text-left p-3 rounded-lg border transition ${visibility === t.v ? 'border-[#e3c07a] bg-[#e3c07a]/10' : 'border-[#242a3b] bg-[#11131f]'}`}>
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-xs text-[#9698a8]">{t.help}</div>
          </button>
        ))}
      </div>

      {err && <p className="text-[#d9663c] text-sm mt-4">{err}</p>}
      <button onClick={submit} disabled={busy}
        className="mt-6 w-full bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg py-3 disabled:opacity-50">
        {busy ? 'Computing…' : 'Compute & save my chart'}
      </button>
    </div>
  );
}
