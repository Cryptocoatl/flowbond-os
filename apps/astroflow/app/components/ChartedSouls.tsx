'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

export interface Soul {
  id: string;
  display_name: string;
  avatar_color: string;
  sun: string | null;
  moon: string | null;
  rising: string | null;
  claim_code: string;
}
export interface OwnedMap { id: string; name: string }

// Your charted souls: people you've read but who haven't activated their FBID.
// Keep them, send their activation link, add them to a constellation (existing
// or brand-new), or forget them. This is where Instant charts live on.
export default function ChartedSouls({ souls, myMaps }: { souls: Soul[]; myMaps: OwnedMap[] }) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState('');
  const [openAdd, setOpenAdd] = useState('');
  const [newName, setNewName] = useState('');
  const sb = browserClient();

  function copyLink(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/claim/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(''), 1800);
  }
  const attach = (mapId: string, guest: string) =>
    start(async () => { await sb.rpc('attach_guest', { map_id: mapId, guest }); setOpenAdd(''); router.refresh(); });
  const newMap = (guest: string, name: string) =>
    start(async () => {
      const { data } = await sb.rpc('create_guest_map', { name: name || t('Our constellation'), ctx: 'friendship', guest });
      setOpenAdd(''); setNewName('');
      if (data) router.push(`/map/${data}`); else router.refresh();
    });
  const forget = (guest: string) =>
    start(async () => { await sb.rpc('forget_guest', { guest }); router.refresh(); });

  return (
    <div id="souls" className="mt-6 pt-4 border-t border-white/5 scroll-mt-16">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec] mb-1">{t("Souls you've charted")}</div>
      <p className="text-[11px] text-[#5b5e72] mb-3">
        {t('People you read from their birth data. They wait as ghost stars until they activate their FBID — send their link, weave them into a constellation, or let them go.')}
      </p>
      {souls.length === 0 ? (
        <div className="text-sm text-[#5b5e72] border border-dashed border-[#242a3b] rounded-xl p-4">
          {t('None yet — chart someone on')} <a href="/instant" className="text-[#b6abec] underline">{t('Instant')}</a> {t('and they appear here, kept safe.')}
        </div>
      ) : (
        <div className="space-y-2">
          {souls.map((s) => (
            <div key={s.id} className="rounded-xl border border-dashed border-[#3a4158] bg-[#11131f] p-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full border border-dashed shrink-0" style={{ borderColor: s.avatar_color, background: `${s.avatar_color}33` }} />
                <span className="font-serif text-[#ece9e0]">{s.display_name}</span>
                <span className="text-xs text-[#9698a8]">
                  {s.sun} ☉ · {s.moon} ☾{s.rising ? ` · ${s.rising} ↑` : ''}
                </span>
                <span className="text-[9px] uppercase tracking-wide text-[#8fb8e0] ml-auto">{t('ghost · awaiting FBID')}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <button onClick={() => copyLink(s.claim_code)} className="text-xs bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-3 py-1.5">
                  {copied === s.claim_code ? t('Link copied ✓') : t('✦ Send activation link')}
                </button>
                <button onClick={() => setOpenAdd(openAdd === s.id ? '' : s.id)} disabled={pending} className="text-xs bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-3 py-1.5">
                  {t('Add to a constellation')}
                </button>
                <button onClick={() => forget(s.id)} disabled={pending} className="text-xs text-[#d9663c]">{t('forget')}</button>
              </div>
              {openAdd === s.id && (
                <div className="mt-3 pt-3 border-t border-white/5" style={{ animation: 'af-rise 0.3s ease-out' }}>
                  {myMaps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {myMaps.map((m) => (
                        <button key={m.id} onClick={() => attach(m.id, s.id)} disabled={pending}
                          className="text-xs rounded-full border border-[#242a3b] px-2.5 py-1 text-[#cfc8e8] hover:border-[#9a8fe0]/50">
                          ❖ {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('…or name a new constellation')}
                      className="flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-lg px-3 py-1.5 text-xs text-[#ece9e0] outline-none" />
                    <button onClick={() => newMap(s.id, newName)} disabled={pending} className="text-xs bg-[#9a8fe0]/25 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-3">
                      {t('Weave it ✦')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
