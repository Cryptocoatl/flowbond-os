'use client';
// =============================================================================
// LogActionModal — the submit half of the mission loop. Calls kai_submit_proof
// (the real RPC: geofence + one-per-day + dup-hash enforced server-side). Honest
// states: needs a session (FBID auth is the next unlock), respects the geofence,
// and on success the proof enters the node-leader validation queue. On approval,
// the world blooms live for everyone via Realtime.
// =============================================================================
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase';
import type { Mission } from '@/lib/kai/types';
import { CATEGORY_META } from '@/lib/kai/meta';
import { Icon } from './Icon';

type Phase = 'idle' | 'locating' | 'submitting' | 'done' | 'error';

export function LogActionModal({
  mission,
  regionSlug,
  regionName,
  center,
  onClose,
}: {
  mission: Mission;
  regionSlug: string;
  regionName: string;
  center: { lat: number; lng: number };
  onClose: () => void;
}) {
  const m = CATEGORY_META[mission.category];
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState('');
  const [onSite, setOnSite] = useState(true); // demo default: simulate on-site

  async function submit() {
    setPhase('submitting');
    setMsg('');
    try {
      const sb = browserSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth?.user) {
        setPhase('error');
        setMsg('Sign in to log a verified action. (FBID login is the next unlock.)');
        return;
      }
      // location: on-site simulation uses region center; else the device GPS.
      let lat = center.lat;
      let lng = center.lng;
      if (!onSite && 'geolocation' in navigator) {
        setPhase('locating');
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setPhase('submitting');
      }
      const mediaHash = crypto.randomUUID().replace(/-/g, '');
      const { error } = await sb.rpc('kai_submit_proof', {
        p_region_slug: regionSlug,
        p_mission_slug: mission.slug,
        p_lat: lat,
        p_lng: lng,
        p_performed_at: new Date().toISOString(),
        p_media_key: `demo/${mediaHash}`,
        p_media_hash: mediaHash,
      });
      if (error) {
        setPhase('error');
        setMsg(error.message.replace(/^.*?:\s*/, ''));
        return;
      }
      setPhase('done');
    } catch (e) {
      setPhase('error');
      setMsg(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal>
      <button aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative w-full max-w-md animate-fade-up p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ color: m.color, background: `${m.color}14`, boxShadow: `inset 0 0 0 1px ${m.color}22` }}>
            <Icon name={m.icon} size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-kai-text">{mission.name}</div>
            <div className="text-[12px] text-kai-muted">{regionName} · +{mission.xpReward} XP on validation</div>
          </div>
        </div>

        {phase === 'done' ? (
          <div className="rounded-xl2 border border-kai-jade/25 bg-kai-jade/[0.06] p-4 text-center">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-kai-jade/15 text-kai-jade">
              <Icon name="shield" size={20} />
            </div>
            <div className="text-sm text-kai-text">Proof submitted</div>
            <p className="mt-1 text-[12px] text-kai-muted">A node leader will validate it. On approval the world blooms — live.</p>
            <button onClick={onClose} className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-sm text-kai-text">Done</button>
          </div>
        ) : (
          <>
            <ol className="mb-4 space-y-2 text-[13px] text-kai-muted">
              <li className="flex items-center gap-2"><StepDot n={1} /> Do the real action in {regionName}</li>
              <li className="flex items-center gap-2"><StepDot n={2} /> Capture proof (photo · GPS · time)</li>
              <li className="flex items-center gap-2"><StepDot n={3} /> Node leaders validate → XP + world heals</li>
            </ol>

            <label className="mb-3 flex items-center gap-2 text-[12px] text-kai-muted">
              <input type="checkbox" checked={onSite} onChange={(e) => setOnSite(e.target.checked)} className="accent-kai-gold" />
              Simulate on-site location (demo)
            </label>

            {phase === 'error' && (
              <div className="mb-3 rounded-lg border border-kai-danger/25 bg-kai-danger/[0.08] px-3 py-2 text-[12px] text-kai-danger">
                {msg}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-white/10 py-2 text-sm text-kai-muted">Cancel</button>
              <button
                onClick={submit}
                disabled={phase === 'submitting' || phase === 'locating'}
                className="flex-1 rounded-full py-2 text-sm font-medium text-black disabled:opacity-60"
                style={{ background: m.color }}
              >
                {phase === 'locating' ? 'Locating…' : phase === 'submitting' ? 'Submitting…' : 'Log this action'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10 text-[10px] text-kai-faint">
      {n}
    </span>
  );
}
