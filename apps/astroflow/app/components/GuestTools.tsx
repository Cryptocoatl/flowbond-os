'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';
import PlaceAutocomplete, { type PlaceResult } from './PlaceAutocomplete';

interface GuestRow {
  id: string;
  display_name: string;
  claimed: boolean;
  claim_code: string | null;
}

// Owner-only tools on a collective chart: add a guest from raw birth data
// (no FlowBond profile needed) and copy their personalized claim link —
// the link lands on the live chart already updating with their data.
export default function GuestTools({ mapId, guests }: { mapId: string; guests: GuestRow[] }) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: '', date: '', time: '', unknownTime: false, place: '', tz: '', lat: NaN, lng: NaN });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const ready = form.name.trim() && form.date && form.tz && Number.isFinite(form.lat) && (form.unknownTime || form.time);

  async function addGuest() {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mapId,
          displayName: form.name,
          birth: {
            date: form.date,
            time: form.unknownTime ? null : form.time,
            tz: form.tz, lat: form.lat, lng: form.lng, place: form.place,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Failed'));
      setForm({ name: '', date: '', time: '', unknownTime: false, place: '', tz: '', lat: NaN, lng: NaN });
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/claim/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(''), 1600);
  }

  const remove = (guestId: string) =>
    start(async () => {
      await browserClient().rpc('remove_guest', { map_id: mapId, guest: guestId });
      router.refresh();
    });

  const input = 'w-full bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-sm text-[#ece9e0]';

  return (
    <div>
      {guests.length > 0 && (
        <div className="space-y-2 mb-4">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{g.display_name}</span>
              {g.claimed ? (
                <span className="text-[10px] uppercase tracking-wide text-[#7bd0c6]">{t('claimed ✓')}</span>
              ) : (
                <>
                  {g.claim_code && (
                    <button
                      onClick={() => copyLink(g.claim_code!)}
                      className="text-xs bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-3 py-1"
                    >
                      {copied === g.claim_code ? t('Copied ✓') : t('Copy their invite')}
                    </button>
                  )}
                  <button onClick={() => remove(g.id)} disabled={pending} className="text-xs text-[#d9663c]">
                    {t('remove')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#9698a8] mb-3">
        {t("Add someone with their birth moment — their chart joins this weave instantly. They won't be linked to the flow until they claim the personalized invite you send them.")}
      </p>
      <div className="space-y-2">
        <input className={input} placeholder={t('Their name')} value={form.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className={input} value={form.date} onChange={(e) => set('date', e.target.value)} />
          <input type="time" disabled={form.unknownTime} className={input} value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-xs text-[#9698a8]">
          <input type="checkbox" checked={form.unknownTime} onChange={(e) => set('unknownTime', e.target.checked)} />
          {t('birth time unknown')}
        </label>
        <PlaceAutocomplete
          value={form.place}
          onSelect={(r: PlaceResult) => setForm((f) => ({ ...f, place: r.place, lat: r.lat, lng: r.lng, tz: r.tz }))}
        />
        <button
          onClick={addGuest}
          disabled={busy || !ready}
          className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {busy ? t('Computing their chart…') : t('Weave them in')}
        </button>
        {err && <p className="text-[#d9663c] text-sm">{err}</p>}
      </div>
    </div>
  );
}
