'use client';
// =============================================================================
// GameWorld — Kai World · Los Siete Mundos, in the R3F format.
// A real-time 3D world (R3F + WebXR) that re-themes as you travel between the
// seven worlds. Each world drives terrain/water/fog/sky + a mascot guide + its
// own mission list. Missions spawn interactive targets you complete on foot;
// completing one makes the guide speak its teaching and grants XP; finishing a
// world unlocks the next. Third-person avatar (keyboard + touch + drag-look),
// Enter-VR, Web Speech guide voice.
//
// CO-OP: join a room (four-letter code) and you are literally in the same world
// as the other player — same objectives, one shared progress bar, a live voice
// call, and a bond that has to hold for the last objective of every mission to
// open. Nothing here is competitive: there is no score to take from each other.
// See useParty.ts (React face), lib/net/* (transport + WebRTC) and
// apps/kai-room (the Durable Object that referees the shared state).
// =============================================================================
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Sparkles, MeshReflectorMaterial, Instances, Instance, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import Link from 'next/link';
import type { RegionSummary } from '@/lib/kai/types';
import { WORLDS, worldById, worldIndex, type KaiWorld, type WorldMission } from '@/lib/kai/worlds';
import { MobileJoystick } from './MobileJoystick';
import { useAvatar } from './useAvatar';
import { AvatarModel } from './AvatarModel';
import { AvatarCreator } from './AvatarCreator';
import { DEFAULT_AVATAR, avatarScale, avatarFaceOffset } from '@/lib/kai/avatars';
import { useProgress } from './useProgress';
import { useSpeech } from './useSpeech';
import { QuizModal } from './QuizModal';
import { WorldMap } from './WorldMap';
import { MiniHud, type HudTarget } from './MiniHud';
import { AtlantisEnvironment, SelvaEnvironment, EgiptoEnvironment, EscuelaEnvironment, EspirituEnvironment, NuevoEnvironment } from './environments';
import { useBuild, type Placed } from './useBuild';
import { BuiltProp, paletteFor, BUILD_KINDS, type BuildKind } from './BuiltProps';
import { input, playerPos, playerState, phys, party as partyRt } from './runtime';
import { useParty } from './useParty';
import { PartyLayer } from './PartyLayer';
import { RemotePlayers } from './RemotePlayers';
import { normalizeCode } from '@/lib/net/protocol';

const store = createXRStore();

// Deterministic mission target layout — shared by the scene (spawns objects) and
// the HUD (minimap/compass dots), so both agree on where objectives are.
function missionPositions(worldId: string, missionIdx: number, mission: WorldMission, swim: boolean): [number, number, number][] {
  const rnd = seeded(worldIndex(worldId) * 1000 + missionIdx * 37 + 13);
  const n = mission.tipo === 'quiz' ? 1 : mission.n;
  const base = rnd() * Math.PI * 2;
  const arr: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    switch (mission.tipo) {
      case 'llevar': {
        // towers/pedestals evenly around a ring — jump (ground) or swim up
        const a = base + (i / n) * Math.PI * 2;
        const R = 15;
        arr.push([Math.cos(a) * R, swim ? 7.5 : 2.8, Math.sin(a) * R]);
        break;
      }
      case 'anillos': {
        // a rising course you pass through in order
        const a = base - 0.7 + i * 0.36;
        const r = 11 + i * 4;
        arr.push([Math.sin(a) * r, 3 + i * (swim ? 2.2 : 1.2), Math.cos(a) * r]);
        break;
      }
      case 'recoger': {
        const a = rnd() * Math.PI * 2;
        const d = 9 + rnd() * 22;
        const y = i % 2 === 1 ? (swim ? 4 + rnd() * 4 : 3.2) : 0.9;
        arr.push([Math.cos(a) * d, y, Math.sin(a) * d]);
        break;
      }
      case 'tocar': {
        const a = rnd() * Math.PI * 2;
        const d = 9 + rnd() * 22;
        const y = i % 2 === 1 ? (swim ? 3.6 : 2.6) : 0.9;
        arr.push([Math.cos(a) * d, y, Math.sin(a) * d]);
        break;
      }
      case 'encontrar': {
        const a = rnd() * Math.PI * 2;
        const d = 48 + rnd() * 24;
        arr.push([Math.cos(a) * d, swim ? 5 : 1, Math.sin(a) * d]);
        break;
      }
      case 'construir':
        // co-creation: no spatial targets, placement is UI-driven
        break;
      default: {
        // limpiar / circulo — spread wide on the ground (sprint to cover)
        const a = rnd() * Math.PI * 2;
        const d = 10 + rnd() * 28;
        arr.push([Math.cos(a) * d, 0.6, Math.sin(a) * d]);
      }
    }
  }
  return arr;
}

const lerpColor = (a: string, b: string, t: number) =>
  new THREE.Color(a).lerp(new THREE.Color(b), THREE.MathUtils.clamp(t, 0, 1));

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// ---- terrain + water + mountains (theme-driven) ---------------------------
function Terrain({ world, vitality }: { world: KaiWorld; vitality: number }) {
  const color = useMemo(() => {
    // home world tints with live vitality; others use their theme mid tone.
    if (world.id === 'selva') return lerpColor(world.theme.terrain[0], world.theme.terrain[1], vitality);
    return new THREE.Color(world.theme.terrain[1]);
  }, [world, vitality]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[420, 420, 1, 1]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Water({ world }: { world: KaiWorld }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[36, 0.04, 26]}>
      <planeGeometry args={[64, 48]} />
      <MeshReflectorMaterial
        resolution={512}
        mixBlur={1}
        mixStrength={6}
        roughness={0.9}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
        color={world.theme.water}
        metalness={0.35}
        mirror={0.5}
      />
    </mesh>
  );
}

function Mountains({ world }: { world: KaiWorld }) {
  const color = useMemo(() => new THREE.Color(world.theme.terrain[0]), [world]);
  const peaks = useMemo(() => {
    const rnd = seeded(97);
    const arr: { x: number; z: number; h: number; r: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
      const dist = 155 + rnd() * 40;
      arr.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, h: 30 + rnd() * 55, r: 26 + rnd() * 26 });
    }
    return arr;
  }, []);
  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2 - 2, p.z]}>
          <coneGeometry args={[p.r, p.h, 5]} />
          <meshStandardMaterial color={color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// Per-world scatter decor gives each world its own silhouette.
function Decor({ world }: { world: KaiWorld }) {
  const high = world.theme.terrain[2];
  const props = useMemo(() => {
    const rnd = seeded(worldIndex(world.id) * 911 + 7);
    const arr: { x: number; z: number; s: number; rot: number }[] = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * 300;
      const z = (rnd() - 0.5) * 300;
      if (Math.hypot(x, z) < 10 || Math.hypot(x - 36, z - 26) < 32) continue;
      arr.push({ x, z, s: 0.7 + rnd() * 1.5, rot: rnd() * Math.PI });
    }
    return arr;
  }, [world.id]);

  const green = world.id === 'selva' || world.id === 'escuela' || world.id === 'nuevo';

  if (green) {
    return (
      <group>
        <Instances range={props.length} limit={140} castShadow>
          <cylinderGeometry args={[0.16, 0.26, 2.4, 6]} />
          <meshStandardMaterial color="#43331f" roughness={1} />
          {props.map((t, i) => (
            <Instance key={i} position={[t.x, 1.2 * t.s, t.z]} scale={t.s} rotation={[0, t.rot, 0]} />
          ))}
        </Instances>
        <Instances range={props.length} limit={140} castShadow>
          <coneGeometry args={[1.5, 3.6, 8]} />
          <meshStandardMaterial color={high} roughness={1} flatShading />
          {props.map((t, i) => (
            <Instance key={i} position={[t.x, 3.4 * t.s, t.z]} scale={t.s} rotation={[0, t.rot, 0]} />
          ))}
        </Instances>
      </group>
    );
  }

  if (world.id === 'egipto') {
    // obelisks
    return (
      <Instances range={props.length} limit={140} castShadow>
        <boxGeometry args={[0.8, 6, 0.8]} />
        <meshStandardMaterial color={high} roughness={0.9} />
        {props.map((t, i) => (
          <Instance key={i} position={[t.x, 3 * t.s, t.z]} scale={[t.s, t.s * 1.4, t.s]} rotation={[0, t.rot, 0]} />
        ))}
      </Instances>
    );
  }

  // atlantis / astros / espiritu — glowing crystal spires
  return (
    <Instances range={props.length} limit={140} castShadow>
      <coneGeometry args={[0.6, 3.4, 6]} />
      <meshStandardMaterial color={high} emissive={world.color} emissiveIntensity={0.35} roughness={0.4} flatShading />
      {props.map((t, i) => (
        <Instance key={i} position={[t.x, 1.6 * t.s, t.z]} scale={t.s} rotation={[0, t.rot, 0]} />
      ))}
    </Instances>
  );
}

// A tall glowing spire at the heart of each world (identity marker + guide home).
function Centerpiece({ world }: { world: KaiWorld }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (m.current) m.current.rotation.y += dt * 0.15;
  });
  return (
    <group position={[0, 0, -14]}>
      <mesh ref={m} position={[0, 6, 0]}>
        <octahedronGeometry args={[2.2, 0]} />
        <meshStandardMaterial color={world.color} emissive={world.color} emissiveIntensity={0.6} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.5, 0.9, 5.2, 6]} />
        <meshStandardMaterial color="#2a2a33" roughness={0.9} />
      </mesh>
      <Sparkles count={30} scale={[6, 10, 6]} position={[0, 6, 0]} size={3} speed={0.4} color={world.color} />
      <pointLight position={[0, 7, 0]} color={world.color} intensity={3} distance={22} />
    </group>
  );
}

// ---- mascot guide ----------------------------------------------------------
function Guide({ world }: { world: KaiWorld }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.position.y = 1.6 + Math.sin(performance.now() / 600) * 0.18;
    g.current.rotation.y += dt * 0.5;
  });
  return (
    <group position={[4.5, 0, -4]}>
      <group ref={g}>
        <mesh>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshStandardMaterial color={world.color} emissive={world.color} emissiveIntensity={0.8} roughness={0.3} transparent opacity={0.85} />
        </mesh>
        <Html center distanceFactor={9} position={[0, 0, 0]} zIndexRange={[10, 0]}>
          <div style={{ fontSize: 34, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))', pointerEvents: 'none' }}>{world.guideEmoji}</div>
        </Html>
        <Sparkles count={16} scale={2} size={3} speed={0.5} color={world.color} />
      </group>
      <pointLight position={[0, 1.8, 0]} color={world.color} intensity={2} distance={9} />
    </group>
  );
}

// ---- mission targets -------------------------------------------------------
// A single collectible/touchable target. Uses 3D proximity so elevated targets
// must be jumped/swum to. Can drift in a small circle for a livelier feel.
function Target({
  id,
  position,
  color,
  emoji,
  radius,
  drift = false,
  collected,
  onCollect,
  needsBond = false,
}: {
  id: number;
  position: [number, number, number];
  color: string;
  emoji: string;
  radius: number;
  drift?: boolean;
  collected: boolean;
  onCollect: (id: number) => void;
  /** co-op gate: only opens while your teammate is bonded (close by). */
  needsBond?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const lock = useRef<THREE.Mesh>(null);
  const done = useRef(false);
  const py = position[1];
  useFrame((_, dt) => {
    if (!g.current || collected) return;
    const t = performance.now() / 1000;
    const ox = drift ? Math.cos(t * 0.9 + id) * 3 : 0;
    const oz = drift ? Math.sin(t * 0.9 + id) * 3 : 0;
    g.current.rotation.y += dt * 1.4;
    g.current.position.set(position[0] + ox, py + Math.sin(t * 2.4 + id) * 0.18, position[2] + oz);
    // The last objective of a co-op mission stays sealed until you're together.
    const sealed = needsBond && !partyRt.bonded;
    if (lock.current) {
      lock.current.visible = sealed;
      lock.current.rotation.z = t * 0.8;
    }
    if (!done.current && !sealed) {
      const d = Math.hypot(playerPos.x - g.current.position.x, (playerPos.y + 1.2) - g.current.position.y, playerPos.z - g.current.position.z);
      if (d < radius) {
        done.current = true;
        onCollect(id);
      }
    }
  });
  if (collected) return null;
  return (
    <group ref={g} position={position}>
      {/* beam from the ground up to the orb, + a ground ring marker */}
      <mesh position={[0, (2 - py) / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, py + 2, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} />
      </mesh>
      {needsBond && (
        <mesh ref={lock} visible={false}>
          <torusGeometry args={[1.05, 0.06, 8, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, -py + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh castShadow>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.35} />
      </mesh>
      <Html center distanceFactor={12} zIndexRange={[8, 0]}>
        <div style={{ fontSize: 24, pointerEvents: 'none' }}>{emoji}</div>
      </Html>
      <Sparkles count={12} scale={1.8} size={3} speed={0.6} color={color} />
      <pointLight color={color} intensity={1.6} distance={8} />
    </group>
  );
}

// A circle you must stand in for a beat (circulo).
function CircleZone({
  id,
  position,
  color,
  collected,
  onCollect,
}: {
  id: number;
  position: [number, number, number];
  color: string;
  collected: boolean;
  onCollect: (id: number) => void;
}) {
  const fill = useRef<THREE.Mesh>(null);
  const dwell = useRef(0);
  const done = useRef(false);
  useFrame((_, dt) => {
    if (collected || done.current) return;
    const d = Math.hypot(playerPos.x - position[0], playerPos.z - position[2]);
    if (d < 2.6) dwell.current = Math.min(1, dwell.current + dt / 1.2);
    else dwell.current = Math.max(0, dwell.current - dt / 0.6);
    if (fill.current) fill.current.scale.setScalar(0.2 + dwell.current * 0.8);
    if (dwell.current >= 1) {
      done.current = true;
      onCollect(id);
    }
  });
  if (collected) return null;
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2, 2.3, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={fill} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.4, 0]} color={color} intensity={1.6} distance={8} />
    </group>
  );
}

// The quiz crystal — approach to open the question.
function QuizCrystal({ position, color, onNear }: { position: [number, number, number]; color: string; onNear: () => void }) {
  const m = useRef<THREE.Mesh>(null);
  const fired = useRef(false);
  useFrame((_, dt) => {
    if (m.current) m.current.rotation.y += dt * 1.2;
    if (!fired.current) {
      const d = Math.hypot(playerPos.x - position[0], playerPos.z - position[2]);
      if (d < 4.5) {
        fired.current = true;
        onNear();
      }
    }
  });
  return (
    <group position={position}>
      <mesh ref={m} position={[0, 1.4, 0]} castShadow>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.2} metalness={0.5} transparent opacity={0.92} />
      </mesh>
      <Html center distanceFactor={10} position={[0, 2.6, 0]} zIndexRange={[8, 0]}>
        <div style={{ fontSize: 26, pointerEvents: 'none' }}>❓</div>
      </Html>
      <Sparkles count={18} scale={2.4} position={[0, 1.4, 0]} size={3} speed={0.5} color={color} />
      <pointLight position={[0, 1.6, 0]} color={color} intensity={2.2} distance={10} />
    </group>
  );
}

// A tower/pedestal you jump or swim up to; touch the light at the top (llevar).
function Tower({ id, top, color, emoji, collected, onCollect, needsBond = false }: { id: number; top: [number, number, number]; color: string; emoji: string; collected: boolean; onCollect: (id: number) => void; needsBond?: boolean }) {
  const orb = useRef<THREE.Mesh>(null);
  const done = useRef(false);
  const [x, ty, z] = top;
  useFrame((_, dt) => {
    if (collected || done.current) return;
    if (orb.current) orb.current.rotation.y += dt * 1.5;
    if (needsBond && !partyRt.bonded) return; // sealed until you're together
    const d = Math.hypot(playerPos.x - x, playerPos.y + 1.2 - ty, playerPos.z - z);
    if (d < 3) {
      done.current = true;
      onCollect(id);
    }
  });
  if (collected) return null;
  const rings = Math.max(2, Math.round(ty / 2));
  return (
    <group position={[x, 0, z]}>
      {/* trunk */}
      <mesh position={[0, ty / 2, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.9, ty, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.6} flatShading />
      </mesh>
      {/* stepping ledges (visual cue to climb) */}
      {Array.from({ length: rings }).map((_, i) => (
        <mesh key={i} position={[Math.cos(i * 2) * 1.1, (i + 1) * (ty / (rings + 1)), Math.sin(i * 2) * 1.1]} castShadow>
          <boxGeometry args={[1.1, 0.3, 1.1]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
      ))}
      {/* top light */}
      <mesh ref={orb} position={[0, ty, 0]}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      <Html center distanceFactor={12} position={[0, ty + 0.9, 0]} zIndexRange={[8, 0]}>
        <div style={{ fontSize: 24, pointerEvents: 'none' }}>{emoji}</div>
      </Html>
      <Sparkles count={16} scale={[2, 3, 2]} position={[0, ty, 0]} size={3} speed={0.6} color={color} />
      <pointLight position={[0, ty, 0]} color={color} intensity={2.2} distance={12} />
    </group>
  );
}

// A ring you pass through, in order (anillos). Only the active ring counts.
function Ring({ id, position, color, active, onPass }: { id: number; position: [number, number, number]; color: string; active: boolean; onPass: (id: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const done = useRef(false);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.z += dt * (active ? 1.2 : 0.3);
    if (active && !done.current) {
      const d = Math.hypot(playerPos.x - position[0], playerPos.y + 1.2 - position[1], playerPos.z - position[2]);
      if (d < 2.4) {
        done.current = true;
        onPass(id);
      }
    }
  });
  return (
    <group position={position}>
      <group ref={g}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.2, 0.22, 10, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1 : 0.25} roughness={0.3} transparent opacity={active ? 1 : 0.45} />
        </mesh>
      </group>
      {active && <Sparkles count={18} scale={4} size={3} speed={0.7} color={color} />}
      {active && <pointLight color={color} intensity={2.4} distance={12} />}
    </group>
  );
}

// Renders the active mission's world objects and reports collections up.
function MissionObjects({
  world,
  mission,
  positions,
  collected,
  onCollect,
  onQuizNear,
  teamGate = false,
}: {
  world: KaiWorld;
  mission: WorldMission;
  positions: [number, number, number][];
  collected: Set<number>;
  onCollect: (id: number) => void;
  onQuizNear: () => void;
  /** in co-op, seal the final objective until both guardians are bonded */
  teamGate?: boolean;
}) {
  // Only the LAST objective is sealed — you can roam and gather freely, but you
  // have to finish the mission side by side.
  const gateIdx = teamGate ? positions.length - 1 : -1;
  if (mission.tipo === 'construir') return null; // placement is UI-driven
  if (mission.tipo === 'quiz') {
    return <QuizCrystal position={[positions[0][0], 0, positions[0][2]]} color={world.color} onNear={onQuizNear} />;
  }
  if (mission.tipo === 'circulo') {
    return (
      <>
        {positions.map((p, i) => (
          <CircleZone key={i} id={i} position={[p[0], 0, p[2]]} color={world.color} collected={collected.has(i)} onCollect={onCollect} />
        ))}
      </>
    );
  }
  if (mission.tipo === 'llevar') {
    return (
      <>
        {positions.map((p, i) => (
          <Tower key={i} id={i} top={p} color={world.color} emoji={mission.emoji} collected={collected.has(i)} onCollect={onCollect} needsBond={i === gateIdx} />
        ))}
      </>
    );
  }
  if (mission.tipo === 'anillos') {
    return (
      <>
        {positions.map((p, i) => (
          <Ring key={i} id={i} position={p} color={world.color} active={i === collected.size} onPass={onCollect} />
        ))}
      </>
    );
  }
  const radius = mission.tipo === 'encontrar' ? 4.5 : 3.2;
  const drift = mission.tipo === 'recoger';
  return (
    <>
      {positions.map((p, i) => (
        <Target key={i} id={i} position={p} color={world.color} emoji={mission.emoji} radius={radius} drift={drift} collected={collected.has(i)} onCollect={onCollect} needsBond={i === gateIdx} />
      ))}
    </>
  );
}

// ---- player ----------------------------------------------------------------
function Player() {
  const { camera, gl } = useThree();
  const presenting = useRef(false);
  const vy = useRef(0);
  const jumps = useRef(0); // 0 grounded, 1 after first jump, 2 after double
  const wasHeld = useRef(false);
  const dashT = useRef(0); // remaining dash time

  useEffect(() => {
    const dom = gl.domElement;
    const down = (e: PointerEvent) => {
      input.drag = true;
      input.lastX = e.clientX;
      input.lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!input.drag) return;
      input.yaw -= (e.clientX - input.lastX) * 0.005;
      input.pitch = THREE.MathUtils.clamp(input.pitch - (e.clientY - input.lastY) * 0.005, -1.2, 0.85);
      input.lastX = e.clientX;
      input.lastY = e.clientY;
    };
    const up = () => (input.drag = false);
    const wheel = (e: WheelEvent) => {
      input.dist = THREE.MathUtils.clamp(input.dist + e.deltaY * 0.012, 3.5, 24);
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        input.jumpHeld = true;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = true;
      else if (e.code === 'KeyQ') input.dashReq = true;
      else setKey(e.code, 1);
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') input.jumpHeld = false;
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = false;
      else setKey(e.code, 0);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const unsub = store.subscribe((s) => (presenting.current = !!s.session));
    return () => {
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('wheel', wheel);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      unsub();
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (presenting.current) return;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = input.yaw;
    camera.rotation.x = input.pitch;

    const dx = -Math.sin(input.yaw);
    const dz = -Math.cos(input.yaw);
    const rx = Math.cos(input.yaw);
    const rz = -Math.sin(input.yaw);

    const ix = input.r - input.l + input.jx;
    const iz = input.f - input.b - input.jy;
    let mvx = dx * iz + rx * ix;
    let mvz = dz * iz + rz * ix;
    const ml = Math.hypot(mvx, mvz);
    if (ml > 1) {
      mvx /= ml;
      mvz /= ml;
    }
    const moving = ml > 0.01;
    // dash: a short burst of speed
    if (input.dashReq) {
      dashT.current = 0.35;
      input.dashReq = false;
    }
    const dashing = dashT.current > 0;
    if (dashing) dashT.current -= dt;
    const speed = (input.run ? 16 : 8.5) * (phys.swim ? 1.15 : 1) * (dashing ? 2.4 : 1);
    if (moving) {
      playerPos.x = THREE.MathUtils.clamp(playerPos.x + mvx * speed * dt, -150, 150);
      playerPos.z = THREE.MathUtils.clamp(playerPos.z + mvz * speed * dt, -150, 150);
      playerState.face = Math.atan2(mvx, mvz);
    }
    playerState.moving = moving;

    const held = input.jumpHeld;
    const rising = held && !wasHeld.current;
    const grounded = playerPos.y <= 0.02;

    // jump-pad launch (set by JumpPad on contact)
    if (input.launch > 0) {
      vy.current = input.launch;
      input.launch = 0;
      jumps.current = 1;
    }

    if (phys.swim) {
      // buoyant swimming: hold to rise, gentle sink otherwise
      const target = held ? 8 : moving ? -1.2 : -2.6;
      vy.current += (target - vy.current) * Math.min(1, dt * 4);
      playerPos.y = THREE.MathUtils.clamp(playerPos.y + vy.current * dt, 0, 40);
      if (playerPos.y <= 0 && vy.current < 0) vy.current = 0;
    } else {
      // grounded platformer with double-jump
      if (rising && (grounded || jumps.current < 2)) {
        vy.current = phys.jump;
        jumps.current = grounded ? 1 : 2;
      }
      // glide: hold jump while falling → float down slowly
      const gravNow = held && vy.current < 0 ? phys.grav * 0.32 : phys.grav;
      vy.current -= gravNow * dt;
      playerPos.y = Math.max(0, playerPos.y + vy.current * dt);
      if (playerPos.y === 0 && vy.current < 0) {
        vy.current = 0;
        jumps.current = 0;
      }
    }
    wasHeld.current = held;
    playerState.grounded = grounded;

    // third-person orbit camera (raises target with the player's height)
    const cp = Math.cos(input.pitch);
    const ldx = -Math.sin(input.yaw) * cp;
    const ldy = Math.sin(input.pitch);
    const ldz = -Math.cos(input.yaw) * cp;
    const dist = input.dist;
    const tx = playerPos.x - ldx * dist;
    const ty = Math.max(0.5, 2.4 + playerPos.y - ldy * dist);
    const tz = playerPos.z - ldz * dist;
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, dt * 9));
  });

  return null;
}

function PlayerAvatar({ url }: { url: string }) {
  const g = useRef<THREE.Group | null>(null);
  const [moving, setMoving] = useState(false);
  const offset = avatarFaceOffset(url);
  useFrame(() => {
    if (!g.current) return;
    g.current.position.set(playerPos.x, playerPos.y, playerPos.z);
    let d = playerState.face + offset - g.current.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.current.rotation.y += d * 0.2;
    if (playerState.moving !== moving) setMoving(playerState.moving);
  });
  return (
    <group ref={g}>
      <AvatarModel url={url} moving={moving} scale={avatarScale(url)} />
    </group>
  );
}

function setKey(code: string, v: number) {
  if (code === 'KeyW' || code === 'ArrowUp') input.f = v;
  else if (code === 'KeyS' || code === 'ArrowDown') input.b = v;
  else if (code === 'KeyA' || code === 'ArrowLeft') input.l = v;
  else if (code === 'KeyD' || code === 'ArrowRight') input.r = v;
}

// What the player physically does for each mission verb (shown as a hint).
function actionHint(tipo: WorldMission['tipo'], lang: 'es' | 'en'): string {
  const es: Record<WorldMission['tipo'], string> = {
    recoger: 'Persigue las luces · salta por las de arriba 🌟',
    tocar: 'Toca cada luz · salta a las altas ✨',
    limpiar: 'Corre y limpia cada mancha 🧹',
    llevar: 'Sube a cada torre y toca la luz de arriba 🧗',
    encontrar: 'Busca la luz escondida — está lejos 🔦',
    anillos: 'Atraviesa los anillos EN ORDEN 💫',
    circulo: 'Párate dentro del círculo un momento 🧘',
    quiz: 'Acércate al cristal ❓ para responder',
    construir: 'Abre 🔨, elige algo y colócalo donde estés',
  };
  const en: Record<WorldMission['tipo'], string> = {
    recoger: 'Chase the lights · jump for the high ones 🌟',
    tocar: 'Touch each light · jump to the high ones ✨',
    limpiar: 'Run and clean each stain 🧹',
    llevar: 'Climb each tower and touch the top light 🧗',
    encontrar: 'Find the hidden light — it\'s far 🔦',
    anillos: 'Pass through the rings IN ORDER 💫',
    circulo: 'Stand inside the circle for a moment 🧘',
    quiz: 'Approach the crystal ❓ to answer',
    construir: 'Open 🔨, pick something and place it where you stand',
  };
  return (lang === 'es' ? es : en)[tipo];
}

// ---- scene -----------------------------------------------------------------
function BuildLayer({ props, color }: { props: Placed[]; color: string }) {
  return (
    <>
      {props.map((p) => (
        <group key={p.id} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <BuiltProp kind={p.kind} color={color} />
        </group>
      ))}
    </>
  );
}

function Scene({
  world,
  vitality,
  mission,
  positions,
  collected,
  onCollect,
  onQuizNear,
  avatarUrl,
  builtProps,
  crew,
}: {
  world: KaiWorld;
  vitality: number;
  mission: WorldMission | undefined;
  positions: [number, number, number][];
  collected: Set<number>;
  onCollect: (id: number) => void;
  onQuizNear: () => void;
  avatarUrl: string | null;
  builtProps: Placed[];
  crew: ReturnType<typeof useParty>;
}) {
  const sun = useMemo<[number, number, number]>(() => [60, 26, 30], []);
  const underwater = world.id === 'atlantis';
  const space = world.id === 'astros';
  const fogDensity = underwater ? 0.02 : space ? 0.004 : 0.0095;
  return (
    <>
      <fogExp2 attach="fog" args={[new THREE.Color(world.theme.fog).getHex(), fogDensity]} />
      <hemisphereLight args={[new THREE.Color(world.theme.hemi).getHex(), new THREE.Color(world.theme.terrain[0]).getHex(), underwater || space ? 1 : 0.7]} />
      <directionalLight
        position={sun}
        intensity={underwater ? 1.1 : space ? 0.7 : 2.2}
        color={underwater ? '#9fe8ff' : '#ffe4b0'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0004}
      />
      {!underwater && !space && <Sky sunPosition={sun} turbidity={5} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} />}
      {space && <Stars radius={200} depth={60} count={4000} factor={5} saturation={0.4} fade speed={0.6} />}
      <Sparkles count={110} scale={[220, 24, 220]} position={[0, 12, 0]} size={2.2} speed={0.18} opacity={0.5} color={world.color} />
      {underwater ? (
        <AtlantisEnvironment world={world} />
      ) : world.id === 'selva' ? (
        <SelvaEnvironment world={world} />
      ) : world.id === 'egipto' ? (
        <EgiptoEnvironment world={world} />
      ) : world.id === 'escuela' ? (
        <EscuelaEnvironment world={world} />
      ) : world.id === 'espiritu' ? (
        <EspirituEnvironment world={world} />
      ) : world.id === 'nuevo' ? (
        <NuevoEnvironment world={world} />
      ) : (
        <>
          {/* astros / fallback */}
          <Mountains world={world} />
          <Terrain world={world} vitality={vitality} />
          {!space && <Water world={world} />}
          <Decor world={world} />
        </>
      )}
      <Centerpiece world={world} />
      <BuildLayer props={builtProps} color={world.color} />
      <Guide world={world} />
      <Player />
      <PlayerAvatar url={avatarUrl ?? DEFAULT_AVATAR.url} />
      {crew.room && crew.status === 'live' && (
        <RemotePlayers room={crew.room} members={crew.members} levels={crew.levels} color={world.color} />
      )}
      {mission && (
        <MissionObjects
          world={world}
          mission={mission}
          positions={positions}
          collected={collected}
          onCollect={onCollect}
          onQuizNear={onQuizNear}
          teamGate={crew.together}
        />
      )}
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.28} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

// ---- top-level game --------------------------------------------------------
export function GameWorld({ region }: { region: RegionSummary }) {
  const { progress, ready, completeMission, setWorld, setLang } = useProgress();
  const { url: avatarUrl, save } = useAvatar();
  const speech = useSpeech();
  const { speak, muted, toggleMute } = speech;

  // Co-op. When a party is live, the room server — not localStorage — decides
  // which world the group is in and which mission is active, so both players
  // are always looking at the same objective. Solo play is untouched.
  const crew = useParty();
  const [partyOpen, setPartyOpen] = useState(false);
  const inParty = crew.status === 'live' && !!crew.shared;

  const lang = progress.lang;
  const world = worldById(inParty ? crew.shared!.w : progress.world);
  const missionIdx = inParty ? crew.shared!.mi : (progress.done[world.id] ?? 0);
  const mission: WorldMission | undefined = world.missions[missionIdx];
  const worldDone = missionIdx >= world.missions.length;

  // shared objective layout for this mission (scene spawns + HUD minimap)
  const positions = useMemo<[number, number, number][]>(
    () => (mission ? missionPositions(world.id, missionIdx, mission, !!world.theme.swim) : []),
    [world.id, missionIdx, mission, world.theme.swim],
  );

  const build = useBuild(world.id);
  const palette = useMemo(() => paletteFor(world.id), [world.id]);

  // Solo: the local objective set. Co-op: mirrored from the room's shared set,
  // so whatever either of you picks up counts for both.
  const [soloCollected, setSoloCollected] = useState<Set<number>>(new Set());
  const collected = useMemo(
    () => (inParty ? new Set(crew.shared!.col) : soloCollected),
    [inParty, crew.shared, soloCollected],
  );
  const [quizOpen, setQuizOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [vrOk, setVrOk] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(true);
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildKind, setBuildKind] = useState<BuildKind>('tree');
  const introSpoken = useRef<string>('');
  const completing = useRef(false);

  // keep the selected build kind valid for the current world's palette
  useEffect(() => {
    setBuildKind((k) => (palette.includes(k) ? k : palette[0]));
  }, [palette]);

  // Event log — mirrors to the browser console AND an on-screen panel so the
  // guide/mission flow is visible without devtools.
  const logEvent = useCallback((msg: string) => {
    // eslint-disable-next-line no-console
    console.log('%c[Kai]', 'color:#F4C25A;font-weight:bold', msg);
    const t = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
    setEvents((e) => [`${t} ${msg}`, ...e].slice(0, 7));
  }, []);

  // The guide's voice + log in one place.
  const guideSpeak = useCallback(
    (text: string) => {
      logEvent(`🗨️ Guía: "${text}"`);
      speak(text, { ...world.voice, lang });
    },
    [logEvent, speak, world.voice, lang],
  );

  // apply per-world physics
  useEffect(() => {
    phys.grav = world.theme.grav ?? 22;
    phys.jump = world.theme.jump ?? 8.6;
    phys.swim = !!world.theme.swim;
  }, [world]);

  // reset per-mission state when world or mission changes
  useEffect(() => {
    setSoloCollected(new Set());
    setQuizOpen(false);
    completing.current = false;
    const m = world.missions[missionIdx];
    if (m) logEvent(`🎯 Misión ${missionIdx + 1}/${world.missions.length} · ${m.tipo} ×${m.n} · ${m.title[lang]}`);
    else logEvent(`✅ ${world.name[lang]} completado`);
  }, [world, missionIdx, lang, logEvent]);

  // speak the world intro once per world visit (after intro card dismissed)
  useEffect(() => {
    if (showIntro || !ready) return;
    if (introSpoken.current !== world.id) {
      introSpoken.current = world.id;
      guideSpeak(world.intro[lang]);
    }
  }, [showIntro, ready, world, lang, guideSpeak]);

  // Invite link: /play?sala=ABCD. If we already know this player's name we join
  // straight through — a kid tapping a link from a phone shouldn't have to fill
  // in a form. Otherwise we open the panel with the code already typed in.
  const inviteHandled = useRef(false);
  useEffect(() => {
    if (inviteHandled.current || !ready || !crew.ready) return;
    inviteHandled.current = true;
    const q = new URLSearchParams(window.location.search);
    const code = normalizeCode(q.get('sala') ?? '');
    if (!code) return;
    // `?nombre=` makes an invite link zero-tap: a kid opening it from a phone
    // lands straight in the room without meeting a form.
    const name = (q.get('nombre') ?? '').slice(0, 16) || crew.name;
    if (name) crew.join(code, name, avatarUrl ?? DEFAULT_AVATAR.url, world.id, missionIdx);
    else setPartyOpen(true);
  }, [ready, crew, avatarUrl, world.id, missionIdx]);

  useEffect(() => {
    const xr = (navigator as unknown as { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } }).xr;
    xr?.isSessionSupported?.('immersive-vr').then((ok) => setVrOk(!!ok)).catch(() => setVrOk(false));
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // advance to the next mission (called on collect-complete or quiz-correct)
  const finishMission = useCallback(() => {
    if (!mission || completing.current) return;
    completing.current = true;
    const wasLast = missionIdx + 1 >= world.missions.length;
    logEvent(`🌟 Misión completa: ${mission.title[lang]} (+${mission.xp} ✦)`);
    guideSpeak(mission.teach[lang]);
    // Both players earn the full XP — co-op never splits the reward.
    completeMission(world.id, mission.xp);
    // In a party the server is the one that advances everyone; it ignores a
    // second report for the same mission, so simultaneous finishes are safe.
    if (inParty) crew.room?.send({ t: 'done', w: world.id, mi: missionIdx });
    flash(`+${mission.xp} ✦ · ${mission.title[lang]}`);
    if (wasLast) {
      window.setTimeout(() => {
        guideSpeak(world.fin[lang]);
        flash(lang === 'es' ? `🌟 ¡Mundo completo! ${world.name.es}` : `🌟 World complete! ${world.name.en}`);
      }, 1400);
    }
  }, [mission, missionIdx, world, lang, guideSpeak, logEvent, completeMission, flash, inParty, crew.room]);

  const handleCollect = useCallback(
    (id: number) => {
      if (inParty) {
        // The room owns the shared set; it echoes back and both clients update.
        crew.room?.send({ t: 'collect', w: world.id, mi: missionIdx, id });
        return;
      }
      setSoloCollected((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        logEvent(`✨ Recogido ${next.size}/${mission?.n ?? '?'}`);
        return next;
      });
    },
    [mission, logEvent, inParty, crew.room, world.id, missionIdx],
  );

  // Detect completion from state (outside the setState updater, so React
  // StrictMode's double-invoke can't double-complete a mission).
  useEffect(() => {
    if (!mission || mission.tipo === 'quiz') return;
    if (!completing.current && collected.size >= mission.n && mission.n > 0) {
      finishMission();
    }
  }, [collected, mission, finishMission]);

  // Place a creation in the world; counts toward a `construir` mission.
  const doPlace = useCallback(() => {
    const p = build.place(buildKind);
    // In a party the room keeps it too, so your teammate sees what you made.
    if (inParty) crew.room?.send({ t: 'build', b: { id: p.id, kind: p.kind, x: p.x, z: p.z, rot: p.rot } });
    logEvent(`${BUILD_KINDS[buildKind].emoji} Colocaste: ${BUILD_KINDS[buildKind][lang]}`);
    if (mission?.tipo === 'construir') handleCollect(collected.size);
    return p;
  }, [build, buildKind, lang, mission, collected.size, handleCollect, logEvent, inParty, crew.room]);

  const doUndo = useCallback(() => {
    const removed = build.undo();
    if (removed && inParty) crew.room?.send({ t: 'unbuild', id: removed.id });
  }, [build, inParty, crew.room]);

  const doClear = useCallback(() => {
    build.clear();
    // The room only ever clears YOUR creations — a teammate's stay put.
    if (inParty) crew.room?.send({ t: 'buildclear' });
  }, [build, inParty, crew.room]);

  // What the world shows: your own creations plus your teammates'. Your own
  // come from the local list (they survive leaving the room); the room's copy
  // of yours is filtered out so nothing is drawn twice.
  const visibleProps = useMemo<Placed[]>(() => {
    if (!inParty) return build.props;
    const theirs = crew.built
      .filter((b) => b.by !== crew.you)
      .map((b) => ({ id: b.id, kind: b.kind as BuildKind, x: b.x, z: b.z, rot: b.rot }));
    return [...build.props, ...theirs];
  }, [inParty, build.props, crew.built, crew.you]);

  // open the build palette automatically during a build mission
  useEffect(() => {
    if (mission?.tipo === 'construir' && !showIntro) setBuildOpen(true);
  }, [mission, showIntro]);

  const selectWorld = useCallback(
    (id: string) => {
      setWorld(id);
      setMapOpen(false);
      playerPos.set(0, 0, 0);
      introSpoken.current = '';
      // Travelling is a group action: the whole party goes through the portal.
      if (inParty) crew.room?.send({ t: 'world', w: id, mi: progress.done[id] ?? 0 });
    },
    [setWorld, inParty, crew.room, progress.done],
  );

  // The party travelled (someone else opened the map): follow them there, and
  // remember it locally so leaving the room doesn't teleport you back.
  const partyWorld = inParty ? crew.shared!.w : null;
  useEffect(() => {
    if (!partyWorld || partyWorld === progress.world) return;
    setWorld(partyWorld);
    playerPos.set(0, 0, 0);
    introSpoken.current = '';
  }, [partyWorld, progress.world, setWorld]);

  // Keep the handshake current so a dropped phone reconnects into the right
  // world instead of dragging the party back to the start.
  useEffect(() => {
    crew.room?.syncHello({ avatar: avatarUrl ?? DEFAULT_AVATAR.url, w: world.id, mi: missionIdx });
  }, [crew.room, avatarUrl, world.id, missionIdx]);

  const done = Math.min(collected.size, mission?.n ?? 0);
  const totalDone = WORLDS.reduce((s, w) => s + Math.min(progress.done[w.id] ?? 0, w.missions.length), 0);

  // read any UI text aloud with the current world's voice (hover/click).
  const readAloud = useCallback((text: string) => speak(text, { ...world.voice, lang }), [speak, world.voice, lang]);

  // objective dots for the minimap/compass (recomputed as things get collected)
  const hudTargets: HudTarget[] = useMemo(
    () => (worldDone ? [] : positions.map((p, i) => ({ x: p[0], z: p[2], done: collected.has(i) }))),
    [positions, collected, worldDone],
  );

  return (
    <div className="fixed inset-0 bg-[#05070a]">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 3, 8], fov: 70, near: 0.05, far: 900 }} gl={{ antialias: true }}>
        <color attach="background" args={[world.theme.fog]} />
        <XR store={store}>
          <Suspense fallback={null}>
            <Scene
              world={world}
              vitality={region.state.vitality}
              mission={worldDone ? undefined : mission}
              positions={positions}
              collected={collected}
              onCollect={handleCollect}
              onQuizNear={() => setQuizOpen(true)}
              avatarUrl={avatarUrl}
              builtProps={visibleProps}
              crew={crew}
            />
          </Suspense>
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="pointer-events-none absolute inset-0">
        {/* top-left: nav + world + xp */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <Link href="/" className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-kai-text backdrop-blur-md">
            ←
          </Link>
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm backdrop-blur-md">
            <span>{world.emoji} </span>
            <span className="text-kai-text">{world.name[lang]}</span>
          </div>
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-kai-gold backdrop-blur-md">
            ✦ {progress.xp}
          </div>
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-kai-jade backdrop-blur-md">
            🌍 {totalDone}
          </div>
        </div>

        {/* top-right: buttons */}
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setPartyOpen(true)}
            className={`pointer-events-auto rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-md ${
              crew.together ? 'border-kai-jade/50 bg-kai-jade/20 text-kai-jade' : 'border-white/15 bg-black/40 text-kai-text'
            }`}
          >
            👥 {crew.together ? crew.members.length + 1 : lang === 'es' ? 'Juntos' : 'Together'}
          </button>
          <button onClick={() => setMapOpen(true)} className="pointer-events-auto rounded-full border border-kai-gold/30 bg-kai-gold/10 px-4 py-1.5 text-sm font-medium text-kai-gold backdrop-blur-md">
            🗺️ {lang === 'es' ? 'Mundos' : 'Worlds'}
          </button>
          <button onClick={() => setBuildOpen((b) => !b)} className={`pointer-events-auto rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-md ${buildOpen ? 'border-kai-jade/50 bg-kai-jade/20 text-kai-jade' : 'border-white/15 bg-black/40 text-kai-text'}`}>
            🔨 {lang === 'es' ? 'Crear' : 'Build'}
          </button>
          <button onClick={() => setCreatorOpen(true)} className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-kai-text backdrop-blur-md">
            {avatarUrl ? '🧍' : '➕🧍'}
          </button>
          <button onClick={toggleMute} className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-kai-text backdrop-blur-md">
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-kai-text backdrop-blur-md">
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
          <button onClick={() => setShowLog((s) => !s)} className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-kai-text backdrop-blur-md">
            🐞
          </button>
          <button onClick={() => store.enterVR()} disabled={!vrOk} className="pointer-events-auto rounded-full border border-kai-gold/30 bg-kai-gold/10 px-3 py-1.5 text-sm text-kai-gold backdrop-blur-md disabled:opacity-40">
            {vrOk ? 'VR' : '·'}
          </button>
        </div>

        {/* compass + minimap (nav instruments) */}
        {!worldDone && <MiniHud targets={hudTargets} color={world.color} lang={lang} />}

        {/* event log — the guide + mission flow, visible without devtools */}
        {showLog && (
          <div className="absolute bottom-20 left-3 max-w-[19rem] rounded-xl border border-white/10 bg-black/55 px-3 py-2 font-mono text-[10px] leading-relaxed text-kai-muted backdrop-blur-md">
            <div className="mb-1 flex items-center justify-between text-kai-faint">
              <span>· registro ·</span>
              <span>{muted ? '🔇' : '🔊'}</span>
            </div>
            {events.length === 0 ? (
              <div className="text-kai-faint">esperando…</div>
            ) : (
              events.map((e, i) => (
                <div key={i} className={i === 0 ? 'text-kai-text' : ''}>
                  {e}
                </div>
              ))
            )}
          </div>
        )}

        {/* objective card */}
        {mission && !worldDone && (
          <div className="pointer-events-auto absolute left-3 top-16 max-w-xs cursor-pointer rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md transition-colors hover:border-kai-gold/30" onClick={() => readAloud(`${mission.title[lang]}. ${mission.desc[lang]}`)} title={lang === 'es' ? 'Click para escuchar' : 'Click to hear'}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{mission.emoji}</span>
              <div className="text-[10px] uppercase tracking-widest text-kai-faint">
                {lang === 'es' ? 'Misión' : 'Mission'} {missionIdx + 1}/{world.missions.length}
              </div>
              <span className="ml-auto text-[11px] text-kai-faint">🔊</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-kai-text">{mission.title[lang]}</div>
            <div className="mt-0.5 text-[12px] text-kai-muted">{mission.desc[lang]}</div>
            <div className="mt-1.5 rounded-lg bg-kai-gold/10 px-2 py-1 text-[11px] font-medium text-kai-gold">
              👉 {actionHint(mission.tipo, lang)}
            </div>
            {mission.tipo !== 'quiz' && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(done / mission.n) * 100}%`, background: world.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: world.color }}>
                  {done}/{mission.n}
                </span>
              </div>
            )}
            {/* who contributed what — the mission is one shared bar, never a race */}
            {inParty && crew.together && mission.tipo !== 'quiz' && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-kai-faint">
                <span>
                  {crew.name}: <b className="text-kai-muted">{crew.shared!.by[crew.you] ?? 0}</b>
                </span>
                {crew.members.map((m) => (
                  <span key={m.id}>
                    {m.name}: <b className="text-kai-muted">{crew.shared!.by[m.id] ?? 0}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {worldDone && (
          <div className="absolute left-3 top-16 max-w-xs rounded-2xl border border-kai-jade/30 bg-black/40 px-4 py-3 backdrop-blur-md">
            <div className="text-sm font-semibold text-kai-jade">🌟 {lang === 'es' ? '¡Mundo completo!' : 'World complete!'}</div>
            <div className="mt-1 text-[12px] text-kai-muted">{lang === 'es' ? 'Abre el mapa para viajar al siguiente mundo.' : 'Open the map to travel to the next world.'}</div>
          </div>
        )}

        {/* toast */}
        {toast && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 animate-fade-up rounded-full border border-kai-gold/30 bg-black/60 px-5 py-2 text-center text-sm text-kai-text backdrop-blur-md">
            {toast}
          </div>
        )}

        {/* build palette (co-creation) */}
        {buildOpen && (
          <div className="pointer-events-auto absolute bottom-24 left-1/2 max-w-[92vw] -translate-x-1/2 rounded-2xl border border-kai-jade/30 bg-black/55 px-3 py-2.5 backdrop-blur-md">
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <span className="text-[11px] font-medium text-kai-jade">🔨 {lang === 'es' ? 'Crea tu mundo' : 'Build your world'}</span>
              <span className="text-[10px] text-kai-faint">{visibleProps.length} {lang === 'es' ? 'creaciones' : 'placed'}{inParty && crew.together ? ` · ${lang === 'es' ? 'juntos' : 'together'}` : ''}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {palette.map((k) => (
                <button
                  key={k}
                  onClick={() => setBuildKind(k)}
                  title={BUILD_KINDS[k][lang]}
                  className={`grid h-11 w-11 place-items-center rounded-xl border text-xl transition-colors ${buildKind === k ? 'border-kai-jade/60 bg-kai-jade/20' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                >
                  {BUILD_KINDS[k].emoji}
                </button>
              ))}
              <div className="mx-1 h-8 w-px bg-white/10" />
              <button onClick={doPlace} className="rounded-xl border border-kai-jade/50 bg-kai-jade/20 px-4 py-2 text-sm font-semibold text-kai-jade active:scale-95">
                ➕ {lang === 'es' ? 'Colocar' : 'Place'}
              </button>
              <button onClick={doUndo} className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-kai-text" title={lang === 'es' ? 'Deshacer' : 'Undo'}>
                ↩︎
              </button>
              <button onClick={doClear} className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-kai-text" title={lang === 'es' ? 'Borrar todo' : 'Clear'}>
                🗑️
              </button>
            </div>
            <div className="mt-1 text-center text-[10px] text-kai-faint">
              {lang === 'es' ? 'Camina, mira a dónde, y pulsa Colocar — se guarda solo' : 'Walk, aim, and press Place — it saves automatically'}
            </div>
          </div>
        )}

        {/* controls hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-[12px] text-kai-muted backdrop-blur-md">
          <span className="hidden md:inline">
            {lang === 'es'
              ? world.theme.swim
                ? 'WASD nadar · Shift correr · MANTÉN Espacio para subir · doble salto'
                : 'WASD · Shift correr · Espacio saltar (doble salto) · arrastra para mirar'
              : world.theme.swim
                ? 'WASD swim · Shift run · HOLD Space to rise'
                : 'WASD · Shift run · Space jump (double) · drag to look'}
          </span>
          <span className="md:hidden">{lang === 'es' ? 'Joystick · Correr · Saltar/Nadar' : 'Joystick · Run · Jump/Swim'}</span>
        </div>

        {/* zoom */}
        <div className="pointer-events-auto absolute right-8 top-24 flex flex-col items-center gap-2">
          <button onClick={() => (input.dist = Math.min(24, input.dist + 2.5))} className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-sm font-medium text-kai-text backdrop-blur-md" title={lang === 'es' ? 'Alejar' : 'Zoom out'}>
            🔍➖
          </button>
          <button onClick={() => (input.dist = Math.max(3.5, input.dist - 2.5))} className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-sm font-medium text-kai-text backdrop-blur-md" title={lang === 'es' ? 'Acercar' : 'Zoom in'}>
            🔍➕
          </button>
        </div>

        {/* run + dash + jump/swim (hold) */}
        <div className="pointer-events-auto absolute bottom-8 right-8 flex items-end gap-3">
          <button
            onClick={() => (input.dashReq = true)}
            className="select-none rounded-full border border-kai-gold/40 bg-kai-gold/15 px-4 py-3 text-sm font-semibold text-kai-gold backdrop-blur-md active:scale-95"
          >
            💨 {lang === 'es' ? 'Dash' : 'Dash'}
          </button>
          <button
            onPointerDown={() => (input.run = true)}
            onPointerUp={() => (input.run = false)}
            onPointerLeave={() => (input.run = false)}
            className="select-none rounded-full border border-kai-jade/40 bg-kai-jade/15 px-4 py-3 text-sm font-semibold text-kai-jade backdrop-blur-md active:scale-95"
          >
            🏃 {lang === 'es' ? 'Correr' : 'Run'}
          </button>
          <button
            onPointerDown={() => (input.jumpHeld = true)}
            onPointerUp={() => (input.jumpHeld = false)}
            onPointerLeave={() => (input.jumpHeld = false)}
            className="select-none rounded-full border border-white/20 bg-black/45 px-6 py-3 text-lg font-medium text-kai-text backdrop-blur-md active:scale-95"
          >
            {world.theme.swim ? '🫧' : '⤒'}
          </button>
        </div>

        <MobileJoystick
          onMove={(x, y) => {
            input.jx = x;
            input.jy = y;
          }}
        />

        {/* co-op: room pill, mic, emotes and the join panel */}
        <PartyLayer
          party={crew}
          lang={lang}
          avatarUrl={avatarUrl ?? DEFAULT_AVATAR.url}
          worldId={world.id}
          missionIdx={missionIdx}
          color={world.color}
          // The world intro comes first; an invite link opens the panel the
          // moment it's dismissed rather than stacking two cards on a kid.
          open={partyOpen && !showIntro}
          onOpenChange={setPartyOpen}
        />
      </div>

      {/* intro */}
      {showIntro && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass max-w-md animate-fade-up p-6 text-center">
            <div className="mb-2 text-3xl">{world.emoji}{world.guideEmoji}</div>
            <h2 className="font-display text-xl font-semibold text-kai-text">{world.name[lang]}</h2>
            <p className="mt-2 text-[13px] text-kai-muted">{world.intro[lang]}</p>
            <div className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-[13px] text-kai-muted">
              <div>🎮 <b className="text-kai-text">WASD</b> / joystick · {lang === 'es' ? 'arrastra para mirar' : 'drag to look'}</div>
              <div>✨ {lang === 'es' ? 'Completa misiones para sanar el mundo' : 'Complete missions to heal the world'}</div>
              <div>🗺️ {lang === 'es' ? 'Viaja entre 7 mundos desde el Mapa' : 'Travel between 7 worlds from the Map'}</div>
            </div>
            <button onClick={() => setShowIntro(false)} className="mt-5 rounded-full bg-kai-gold px-7 py-2 text-sm font-semibold text-black">
              {lang === 'es' ? 'Comenzar' : 'Begin'}
            </button>

            {/* One tap back into the room you were last in — a 7-year-old should
                never have to retype a code to play with someone again. */}
            {crew.status === 'off' &&
              (crew.code && crew.name ? (
                <button
                  onClick={() => {
                    crew.join(crew.code, crew.name, avatarUrl ?? DEFAULT_AVATAR.url, world.id, missionIdx);
                    setShowIntro(false);
                  }}
                  className="mt-3 w-full rounded-full border border-kai-jade/50 bg-kai-jade/15 px-5 py-2.5 text-sm font-semibold text-kai-jade"
                >
                  👥 {lang === 'es' ? `Jugar juntos · sala ${crew.code}` : `Play together · room ${crew.code}`}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowIntro(false);
                    setPartyOpen(true);
                  }}
                  className="mt-3 w-full rounded-full border border-white/15 bg-black/30 px-5 py-2.5 text-sm text-kai-text"
                >
                  👥 {lang === 'es' ? 'Jugar con alguien más' : 'Play with someone'}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* quiz */}
      {quizOpen && mission?.quiz && (
        <QuizModal
          quiz={mission.quiz}
          emoji={mission.emoji}
          lang={lang}
          voice={world.voice}
          speech={speech}
          onCorrect={() => {
            setQuizOpen(false);
            finishMission();
          }}
          onClose={() => setQuizOpen(false)}
        />
      )}

      {/* world map */}
      {mapOpen && (
        <WorldMap
          progress={Object.fromEntries(WORLDS.map((w) => [w.id, progress.done[w.id] ?? 0]))}
          activeId={world.id}
          lang={lang}
          onSelect={selectWorld}
          onClose={() => setMapOpen(false)}
        />
      )}

      {/* avatar creator */}
      {creatorOpen && (
        <AvatarCreator
          onCreated={(u) => {
            save(u);
            setCreatorOpen(false);
          }}
          onClose={() => setCreatorOpen(false)}
        />
      )}
    </div>
  );
}
