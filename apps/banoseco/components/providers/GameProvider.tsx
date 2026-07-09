'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { browserClient } from '@/lib/supabase/client';
import {
  becomeGuardian,
  claimMission,
  completeMission,
  guardianProfile,
  impactSummary,
  leaderboard,
  nearbyToilets,
  openMissions,
  recordDonation,
  refillEnergy,
} from '@/lib/rpc';
import { CDMX_CENTER } from '@/lib/game';
import { queryCoord } from '@/lib/geo';
import type {
  GuardianProfile,
  ImpactSummary,
  LeaderRow,
  Mission,
  NearbyToilet,
  SessionUser,
} from '@/lib/types';

export type ToastKind = 'gold' | 'xp' | 'jade';

interface GameValue {
  loading: boolean;
  user: SessionUser | null;
  profile: GuardianProfile | null;
  toilets: NearbyToilet[];
  missions: Mission[];
  impact: ImpactSummary | null;
  leaders: LeaderRow[];
  coords: { lat: number; lng: number } | null;
  toastMsg: { text: string; kind?: ToastKind; key: number } | null;
  toast: (text: string, kind?: ToastKind) => void;
  refreshWorld: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  claim: (missionId: string) => Promise<void>;
  complete: (missionId: string, proofUrl?: string) => Promise<{ oro: number; xp: number } | null>;
  donate: (toiletId: string, amountMxn: number) => Promise<boolean>;
  enroll: (displayName?: string) => Promise<void>;
}

const Ctx = createContext<GameValue | null>(null);

export function useGame(): GameValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used within <GameProvider>');
  return v;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [toilets, setToilets] = useState<NearbyToilet[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<GameValue['toastMsg']>(null);
  const toastSeq = useRef(0);

  const toast = useCallback((text: string, kind?: ToastKind) => {
    toastSeq.current += 1;
    setToastMsg({ text, kind, key: toastSeq.current });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await guardianProfile());
    } catch {
      /* leave previous profile */
    }
  }, [user]);

  const loadWorld = useCallback(async (c: { lat: number; lng: number }) => {
    // Privacy: send only the coarse cell (or precise if the user opted in).
    const q = queryCoord(c);
    const [t, m, im, lb] = await Promise.allSettled([
      nearbyToilets(q.lat, q.lng),
      openMissions(),
      impactSummary(),
      leaderboard(10),
    ]);
    if (t.status === 'fulfilled') setToilets(t.value);
    if (m.status === 'fulfilled') setMissions(m.value);
    if (im.status === 'fulfilled') setImpact(im.value);
    if (lb.status === 'fulfilled') setLeaders(lb.value);
  }, []);

  const refreshWorld = useCallback(async () => {
    await loadWorld(coords ?? CDMX_CENTER);
  }, [coords, loadWorld]);

  // ---- boot: session, geolocation, world, profile ----
  useEffect(() => {
    const sb = browserClient();
    let alive = true;

    (async () => {
      const { data } = await sb.auth.getUser();
      if (!alive) return;
      const u = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
      setUser(u);

      // geolocation (mobile-first); fall back to CDMX center
      const got = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(CDMX_CENTER);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(CDMX_CENTER),
          { enableHighAccuracy: true, timeout: 6000 },
        );
      });
      if (!alive) return;
      setCoords(got);
      await loadWorld(got);

      if (u) {
        try {
          await refillEnergy(); // solar recharge if a day passed
        } catch {
          /* not a guardian yet / no row */
        }
        try {
          if (alive) setProfile(await guardianProfile());
        } catch {
          /* ignore */
        }
      }
      if (alive) setLoading(false);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [user, refreshProfile]);

  // ---- realtime: missions + toilets ----
  useEffect(() => {
    const sb = browserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refreshWorld(), 350);
    };
    const channel = sb
      .channel('banoseco-world')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banoseco_missions' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banoseco_toilets' }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void sb.removeChannel(channel);
    };
  }, [refreshWorld]);

  // ---- actions ----
  const claim = useCallback(
    async (missionId: string) => {
      const ok = await claimMission(missionId);
      if (!ok) {
        toast('La misión ya fue tomada', 'jade');
      } else {
        toast('Misión aceptada · ve por la cubeta 🧤', 'jade');
      }
      await Promise.all([refreshWorld(), refreshProfile()]);
    },
    [refreshWorld, refreshProfile, toast],
  );

  const complete = useCallback(
    async (missionId: string, proofUrl?: string) => {
      const reward = await completeMission(missionId, proofUrl);
      toast(`+${reward.xp} XP · +${reward.oro} ◈ · cubeta a composta 🌾`, 'xp');
      // Bridge this contribution into the FlowBond passport (best-effort).
      void fetch('/api/flowbond/contribute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ missionId }),
      }).catch(() => {});
      await Promise.all([refreshWorld(), refreshProfile()]);
      return reward;
    },
    [refreshWorld, refreshProfile, toast],
  );

  const donate = useCallback(
    async (toiletId: string, amountMxn: number) => {
      try {
        await recordDonation(toiletId, amountMxn, 'qr');
        toast(`¡Gracias! $${amountMxn} a la red 🌱`, 'xp');
        await refreshWorld();
        return true;
      } catch {
        toast('No se pudo registrar la donación', 'jade');
        return false;
      }
    },
    [refreshWorld, toast],
  );

  const enroll = useCallback(
    async (displayName?: string) => {
      await becomeGuardian(displayName);
      try {
        await refillEnergy();
      } catch {
        /* ignore */
      }
      await refreshProfile();
      toast('Eres guardián · energía solar cargada ⚡', 'jade');
    },
    [refreshProfile, toast],
  );

  return (
    <Ctx.Provider
      value={{
        loading,
        user,
        profile,
        toilets,
        missions,
        impact,
        leaders,
        coords,
        toastMsg,
        toast,
        refreshWorld,
        refreshProfile,
        claim,
        complete,
        donate,
        enroll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
