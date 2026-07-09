'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useGame } from '@/components/providers/GameProvider';
import { OpCard } from '@/components/missions/OpCard';
import { RankLadder } from '@/components/missions/RankLadder';
import { Leaderboard } from '@/components/missions/Leaderboard';
import { ProofModal } from '@/components/missions/ProofModal';
import { ENERGY_GATE } from '@/lib/game';
import { fmt } from '@/lib/format';
import type { Mission } from '@/lib/types';

export default function MisionesPage() {
  const { user, profile, missions, leaders, claim, complete, enroll, toast } = useGame();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [proofFor, setProofFor] = useState<Mission | null>(null);

  const xp = profile?.xp ?? 0;
  const isGuardian = Boolean(profile?.is_guardian);
  const energy = profile?.energy ?? 0;

  async function handleClaim(m: Mission) {
    if (!user) {
      toast('Inicia sesión para aceptar misiones', 'jade');
      return;
    }
    if (!isGuardian) {
      await enroll();
      return;
    }
    if (ENERGY_GATE && energy <= 0) {
      toast('Sin energía ⚡ espera la recarga solar', 'jade');
      return;
    }
    setBusyId(m.id);
    try {
      await claim(m.id);
    } catch (e) {
      toast(messageOf(e), 'jade');
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(m: Mission, proofUrl?: string) {
    setBusyId(m.id);
    try {
      await complete(m.id, proofUrl);
      setFlashId(m.id);
      setTimeout(() => setFlashId((id) => (id === m.id ? null : id)), 800);
    } catch (e) {
      toast(messageOf(e), 'jade');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel">
      <span className="eyebrow">Operaciones regenerativas</span>
      <h1 className="bs-h1">
        Acepta la <span className="jade">misión</span>.
        <br />
        Transmuta el <span className="gold">residuo</span>.
      </h1>
      <p className="lede">
        Cuando un nodo se llena, se abre una operación con su ubicación. Cambia la cubeta, sanitiza,
        lleva a composta. El sistema te paga en XP, oro y artefactos del ecosistema.
      </p>

      {!user && (
        <div className="empty" style={{ marginTop: 18 }}>
          <Link href="/login" className="loot oro" style={{ textDecoration: 'none' }}>
            Inicia sesión
          </Link>{' '}
          para volverte guardián y aceptar misiones.
        </div>
      )}
      {user && !isGuardian && (
        <div className="empty" style={{ marginTop: 18 }}>
          Aún no eres guardián.{' '}
          <button className="opbtn go" style={{ marginLeft: 8 }} onClick={() => enroll()}>
            Conviértete en guardián
          </button>
        </div>
      )}

      <div className="opsgrid">
        {missions.length === 0 ? (
          <div className="empty">No hay operaciones abiertas. Todos los nodos están sanos 🌿</div>
        ) : (
          missions.map((m) => (
            <OpCard
              key={m.id}
              mission={m}
              busy={busyId === m.id}
              flash={flashId === m.id}
              canClaim={!user || !isGuardian || m.status === 'open'}
              canComplete={Boolean(user && m.status === 'claimed' && m.guardian_id === user.id)}
              onClaim={() => handleClaim(m)}
              onComplete={() => setProofFor(m)}
            />
          ))
        )}
      </div>

      <div className="section-h">
        <h2>Tu ascenso</h2>
        <span className="meta">{fmt(xp)} XP totales</span>
      </div>
      <RankLadder xp={xp} />

      <div className="section-h">
        <h2>Gremio del mes</h2>
        <span className="meta">CDMX</span>
      </div>
      <Leaderboard rows={leaders} meId={user?.id ?? null} />

      {proofFor && user && (
        <ProofModal
          mission={proofFor}
          userId={user.id}
          onClose={() => setProofFor(null)}
          onConfirm={(url) => handleComplete(proofFor, url)}
        />
      )}
    </section>
  );
}

function messageOf(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  if (msg.includes('no energy')) return 'Sin energía ⚡ espera la recarga solar';
  if (msg.includes('not an active guardian')) return 'Primero conviértete en guardián';
  if (msg.includes('auth required')) return 'Inicia sesión para continuar';
  return 'No se pudo completar la acción';
}
