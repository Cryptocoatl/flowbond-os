'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

// Easy in/out of a constellation: the host can delete it, a member can leave —
// no friction, no asking permission. Part of owning your own weave.
export default function MapMembership({ mapId, isOwner }: { mapId: string; isOwner: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');

  function act() {
    setErr('');
    start(async () => {
      const sb = browserClient();
      const { error } = isOwner
        ? await sb.rpc('delete_flow_map', { p_map_id: mapId })
        : await sb.rpc('leave_flow_map', { p_map_id: mapId });
      if (error) { setErr(error.message); return; }
      router.push('/dashboard');
    });
  }

  return (
    <div className="mt-8 pt-5 border-t border-white/5">
      {!confirm ? (
        <button onClick={() => setConfirm(true)} className="text-xs text-[#d9663c] hover:text-[#e8956a] active:scale-95 transition">
          {isOwner ? t('Delete this constellation') : t('Leave this constellation')}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#9698a8]">
            {isOwner ? t('Delete for everyone? This can’t be undone.') : t('Leave this constellation?')}
          </span>
          <button onClick={act} disabled={pending} className="af-btn af-btn-danger af-btn-sm">
            {pending ? t('…') : isOwner ? t('Delete') : t('Leave')}
          </button>
          <button onClick={() => setConfirm(false)} className="text-xs text-[#9698a8] active:scale-95">{t('Cancel')}</button>
        </div>
      )}
      {err && <p className="text-[#d9663c] text-xs mt-2">{err}</p>}
    </div>
  );
}
