'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

// The "why" of a collective — its purpose + intention, saved so the reading
// stays focused on what the group actually wants to understand. The host can
// edit it; everyone woven in sees it.
const PURPOSES = ['team / project', 'family', 'romance', 'co-living / house', 'friends', 'creative collab', 'dynamic mix'];

export default function CollectiveContext({
  mapId, name, purpose, intention, isOwner,
}: {
  mapId: string;
  name: string;
  purpose: string | null;
  intention: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState(purpose ?? '');
  const [i, setI] = useState(intention ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await browserClient().rpc('set_flow_map_context', {
        p_map_id: mapId, p_name: name, p_purpose: p, p_intention: i,
      });
      setEditing(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  // Nothing set + not the host → render nothing.
  if (!purpose && !intention && !editing && !isOwner) return null;

  if (editing) {
    return (
      <div className="af-card p-4 mt-5 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec]">{t('Why this constellation')}</p>
        <select value={p} onChange={(e) => setP(e.target.value)} className="af-input">
          <option value="">{t('What is this group?')}</option>
          {PURPOSES.map((x) => <option key={x} value={x}>{t(x)}</option>)}
        </select>
        <textarea
          value={i}
          onChange={(e) => setI(e.target.value)}
          rows={2}
          placeholder={t('What do you want to understand together? (focuses the reading)')}
          className="af-input resize-none"
        />
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className="af-btn af-btn-primary af-btn-sm">{t('Save')}</button>
          <button onClick={() => setEditing(false)} className="af-btn af-btn-ghost af-btn-sm">{t('Cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="af-card p-4 mt-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec]">{t('Why this constellation')}</p>
        {isOwner && (
          <button onClick={() => setEditing(true)} className="text-[11px] text-[#9698a8] hover:text-[#cfc8e8]">
            {purpose || intention ? t('Edit') : t('+ Add purpose')}
          </button>
        )}
      </div>
      {purpose && <p className="text-sm text-[#e3c07a] mt-1.5 capitalize">{t(purpose)}</p>}
      {intention && <p className="text-sm text-[#cfc8e8] mt-1 leading-relaxed">“{intention}”</p>}
      {!purpose && !intention && isOwner && (
        <p className="text-sm text-[#9698a8] mt-1">{t('Add what this group is for — it focuses every reading on what you want to understand together.')}</p>
      )}
    </div>
  );
}
