'use client';
// =============================================================================
// RemotePlayers — everyone else, inside the world with you.
//
// Each teammate is a full avatar (the same models the local player picks from),
// carrying a floating name tag, a ring that lights up while they're talking,
// and — when you're close enough — a glowing bond between you.
//
// This component is also where `party` in runtime.ts gets written, so the rest
// of the game can ask "is my teammate near?" without knowing about the network.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { RoomClient, Remote } from '@/lib/net/room';
import type { Member } from '@/lib/net/protocol';
import { AvatarModel } from './AvatarModel';
import { avatarFaceOffset, avatarScale, DEFAULT_AVATAR } from '@/lib/kai/avatars';
import { playerPos, playerState, party, BOND_RADIUS } from './runtime';

/** A teammate: interpolated body, name tag, and a voice ring. */
function RemoteAvatar({
  member,
  room,
  levels,
  color,
}: {
  member: Member;
  room: RoomClient;
  levels: Map<string, number>;
  color: string;
}) {
  const g = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const movingRef = useRef(false);
  // The only React state in the remote-player path — flips just on walk/idle,
  // never on position, which arrives ~12×/second.
  const [moving, setMoving] = useState(false);
  const offset = avatarFaceOffset(member.avatar);
  const url = member.avatar || DEFAULT_AVATAR.url;

  useFrame(() => {
    const r = room.remotes.get(member.id);
    if (!g.current || !r) return;
    g.current.position.set(r.x, r.y, r.z);

    let d = r.face + offset - g.current.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.current.rotation.y += d * 0.2;

    if (r.moving !== movingRef.current) {
      movingRef.current = r.moving;
      setMoving(r.moving);
    }

    // Voice ring: grows and brightens with how loudly they're speaking.
    const lvl = member.voice ? (levels.get(member.id) ?? 0) : 0;
    if (ring.current && ringMat.current) {
      const s = 1 + lvl * 0.9;
      ring.current.scale.set(s, s, s);
      ringMat.current.opacity = member.voice ? 0.25 + lvl * 0.65 : 0;
    }
  });

  return (
    <group ref={g}>
      <AvatarModel url={url} moving={moving} scale={avatarScale(url)} />
      {/* voice ring at their feet */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.75, 1.05, 32]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Html center distanceFactor={14} position={[0, 2.5, 0]} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[13px] font-medium text-white backdrop-blur-sm">
          {member.voice ? '🎙️ ' : ''}
          {member.name}
        </div>
      </Html>
    </group>
  );
}

/**
 * The bond: a glowing link drawn between you and your nearest teammate while
 * you're close. Rendered as a stretched cylinder so it glows with bloom.
 */
function Bond({ room, memberIds, color }: { room: RoomClient; memberIds: string[]; color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, dt) => {
    // One place per frame for all the networking: tell the room where we are,
    // then smooth everyone else toward where they said they were.
    room.pushPos(playerPos.x, playerPos.y, playerPos.z, playerState.face, playerState.moving);
    room.interpolate(dt);

    // Find the closest teammate and publish it for the rest of the game.
    let best: Remote | null = null;
    let bestD = Infinity;
    for (const id of memberIds) {
      const r = room.remotes.get(id);
      if (!r) continue;
      const d = Math.hypot(r.x - playerPos.x, r.y - playerPos.y, r.z - playerPos.z);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }

    party.active = memberIds.length > 0;
    party.near = best ? bestD : Infinity;
    party.bonded = !!best && bestD <= BOND_RADIUS;
    if (best) {
      party.nx = best.x;
      party.ny = best.y;
      party.nz = best.z;
    }

    if (!mesh.current || !mat.current) return;
    if (!best || bestD > BOND_RADIUS) {
      mesh.current.visible = false;
      return;
    }
    mesh.current.visible = true;

    // Chest height on both ends so the link reads as a tie between people.
    const ax = playerPos.x, ay = playerPos.y + 1.3, az = playerPos.z;
    const bx = best.x, by = best.y + 1.3, bz = best.z;
    dir.set(bx - ax, by - ay, bz - az);
    const len = Math.max(0.001, dir.length());
    mid.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    mesh.current.position.copy(mid);
    q.setFromUnitVectors(up, dir.normalize());
    mesh.current.quaternion.copy(q);
    mesh.current.scale.set(1, len, 1);
    // Brightest when you're right next to each other, fading out at the edge.
    mat.current.opacity = 0.85 * (1 - bestD / BOND_RADIUS) + 0.12;
  });

  return (
    <mesh ref={mesh} visible={false}>
      <cylinderGeometry args={[0.05, 0.05, 1, 6, 1, true]} />
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function RemotePlayers({ room, members, levels, color }: { room: RoomClient; members: Member[]; levels: Map<string, number>; color: string }) {
  const ids = useMemo(() => members.map((m) => m.id), [members]);

  // Leaving the room must put the game back into honest solo state, or the
  // co-op gate would stay unlocked (or stuck locked) on a stale `bonded`.
  useEffect(
    () => () => {
      party.active = false;
      party.bonded = false;
      party.near = Infinity;
    },
    [],
  );

  return (
    <>
      <Bond room={room} memberIds={ids} color={color} />
      {members.map((m) => (
        <RemoteAvatar key={m.id} member={m} room={room} levels={levels} color={color} />
      ))}
    </>
  );
}
