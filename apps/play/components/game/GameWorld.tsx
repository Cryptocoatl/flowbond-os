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
import { Sky, Stars, Sparkles, MeshReflectorMaterial, Instances, Instance, Html, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import Link from 'next/link';
import type { RegionSummary } from '@/lib/kai/types';
import { WORLDS, TOTAL_MISSIONS, worldById, worldIndex, type KaiWorld, type WorldMission } from '@/lib/kai/worlds';
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
import { useViewport } from './useViewport';
import { QualityContext, useQuality, useQualityPref, scaled, QUALITY_LABEL, type QualityPref } from './useQuality';
import { HudMenu, HudMenuRow, HudMenuAction, HudSegment } from './HudMenu';
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
  const q = useQuality();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[36, 0.04, 26]}>
      <planeGeometry args={[64, 48]} />
      {q.reflections ? (
        <MeshReflectorMaterial
          resolution={q.tier === 'alto' ? 512 : 256}
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
      ) : (
        /* A mirror re-renders the whole scene every frame. Below the top tier
           the water is a glossy, slightly transparent surface instead — same
           read at a glance, none of the second render pass. */
        <meshStandardMaterial color={world.theme.water} roughness={0.22} metalness={0.5} transparent opacity={0.9} />
      )}
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

    // Look/zoom is multi-touch aware. It used to be a single global `drag`
    // flag listening to every pointermove on the window, which meant that on
    // a phone the thumb working the joystick ALSO swung the camera — the world
    // spun every time you tried to walk. Now only the pointer that started on
    // the canvas steers, and a second finger on the canvas pinches to zoom.
    const touches = new Map<number, { x: number; y: number }>();
    let lookId: number | null = null;
    let pinchStart = 0;
    let pinchDist = 0;

    const spread = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 1) {
        lookId = e.pointerId;
        input.drag = true;
        input.lastX = e.clientX;
        input.lastY = e.clientY;
      } else if (touches.size === 2) {
        // second finger on the world → pinch-zoom, and looking pauses so the
        // camera does not lurch as the fingers spread.
        input.drag = false;
        lookId = null;
        pinchStart = spread();
        pinchDist = input.dist;
      }
    };

    const move = (e: PointerEvent) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2 && pinchStart > 0) {
        const s = spread();
        if (s > 0) input.dist = THREE.MathUtils.clamp(pinchDist * (pinchStart / s), 3.5, 24);
        return;
      }
      if (!input.drag || e.pointerId !== lookId) return;
      input.yaw -= (e.clientX - input.lastX) * 0.005;
      input.pitch = THREE.MathUtils.clamp(input.pitch - (e.clientY - input.lastY) * 0.005, -1.2, 0.85);
      input.lastX = e.clientX;
      input.lastY = e.clientY;
    };

    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (e.pointerId === lookId) {
        lookId = null;
        input.drag = false;
      }
      if (touches.size < 2) pinchStart = 0;
      // lifting one finger of a pinch hands the look back to the other one
      if (touches.size === 1) {
        const [id] = [...touches.keys()];
        const t = touches.get(id)!;
        lookId = id;
        input.lastX = t.x;
        input.lastY = t.y;
        input.drag = true;
      }
    };

    const wheel = (e: WheelEvent) => {
      input.dist = THREE.MathUtils.clamp(input.dist + e.deltaY * 0.012, 3.5, 24);
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
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
      window.removeEventListener('pointercancel', up);
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
  const q = useQuality();
  const sun = useMemo<[number, number, number]>(() => [60, 26, 30], []);
  const underwater = world.id === 'atlantis';
  const space = world.id === 'astros';
  const fogDensity = underwater ? 0.02 : space ? 0.004 : 0.0095;
  // A tighter shadow frustum on the lighter tiers: the same 512² map spread
  // over 160m of world is mush, over 90m it still reads as a shadow.
  const shadowSpan = q.tier === 'alto' ? 80 : 48;
  return (
    <>
      <fogExp2 attach="fog" args={[new THREE.Color(world.theme.fog).getHex(), fogDensity]} />
      <hemisphereLight args={[new THREE.Color(world.theme.hemi).getHex(), new THREE.Color(world.theme.terrain[0]).getHex(), underwater || space ? 1 : 0.7]} />
      <directionalLight
        position={sun}
        // With shadows off the world flattens out, so the sun picks up a
        // little of the missing contrast rather than just losing it.
        intensity={(underwater ? 1.1 : space ? 0.7 : 2.2) * (q.shadows ? 1 : 1.12)}
        color={underwater ? '#9fe8ff' : '#ffe4b0'}
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={shadowSpan}
        shadow-camera-bottom={-shadowSpan}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {!underwater && !space && <Sky sunPosition={sun} turbidity={5} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} />}
      {space && <Stars radius={200} depth={60} count={scaled(4000, q)} factor={5} saturation={0.4} fade speed={0.6} />}
      <Sparkles count={scaled(110, q)} scale={[220, 24, 220]} position={[0, 12, 0]} size={2.2} speed={0.18} opacity={0.5} color={world.color} />
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
      {/* Vignette is nearly free and does most of the "cinematic" work, so it
          survives every tier; bloom and MSAA are what get traded away. */}
      <EffectComposer multisampling={q.msaa} enableNormalPass={false}>
        {q.bloom ? (
          <Bloom mipmapBlur intensity={q.tier === 'alto' ? 0.9 : 0.65} luminanceThreshold={0.55} luminanceSmoothing={0.2} />
        ) : (
          <></>
        )}
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

  // How much screen there is, and how much GPU. Both decide what the HUD and
  // the scene are allowed to be — see useViewport.ts / useQuality.ts.
  const vp = useViewport();
  const { pref: qualityPref, tier: qualityTier, quality, choose: chooseQuality } = useQualityPref();
  // The live watchdog only ever lowers the ceiling, so it cannot oscillate;
  // choosing a tier by hand clears whatever it had decided.
  const [dprCap, setDprCap] = useState<number | null>(null);
  useEffect(() => setDprCap(null), [qualityTier]);
  const dpr = useMemo<[number, number]>(
    () => [quality.dpr[0], Math.max(quality.dpr[0], dprCap ?? quality.dpr[1])],
    [quality, dprCap],
  );

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
  // The event log is a developer instrument. It used to open by default, which
  // on a phone meant a black panel sitting exactly where the joystick goes.
  const [showLog, setShowLog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(true);
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

  // The party pill and its bond hint dock on the row under the top bar, so
  // everything else on that row starts below them when a room is open.
  const rowTop =
    crew.status === 'live' && crew.members.length > 0
      ? 'calc(var(--hud-row2) + 5.25rem)'
      : crew.status !== 'off'
        ? 'calc(var(--hud-row2) + 3rem)'
        : 'var(--hud-row2)';

  // objective dots for the minimap/compass (recomputed as things get collected)
  const hudTargets: HudTarget[] = useMemo(
    () => (worldDone ? [] : positions.map((p, i) => ({ x: p[0], z: p[2], done: collected.has(i) }))),
    [positions, collected, worldDone],
  );

  return (
    <div className="game-surface fixed inset-0 bg-[#05070a]">
      <QualityContext.Provider value={quality}>
        <Canvas
          // 'soft' is PCFSoft filtering: same shadow map, far less staircase
          // on the edges, which is most of what made the old render look cheap.
          shadows={quality.shadows ? 'soft' : false}
          dpr={dpr}
          // A phone held in landscape sees a letterbox; widening the lens keeps
          // the objective and the guide in frame instead of cropping them out.
          camera={{ position: [0, 3, 8], fov: vp.short ? 78 : 70, near: 0.05, far: quality.far }}
          // The effect composer draws the final image as a fullscreen quad, so
          // canvas MSAA would cost memory and change nothing — anti-aliasing is
          // the composer's `multisampling`, which the tier decides.
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={[world.theme.fog]} />
          {/* The tier is a guess about the device. This is the measurement: if
              frames start slipping, shed pixels rather than let it stutter. */}
          <PerformanceMonitor
            flipflops={2}
            onDecline={() => setDprCap((c) => Math.max(quality.dpr[0], Math.round(((c ?? quality.dpr[1]) - 0.25) * 100) / 100))}
            onFallback={() => setDprCap(quality.dpr[0])}
          />
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
      </QualityContext.Provider>

      {/* =====================================================================
          HUD. Three rails anchored to the physical screen — a top bar that
          never wraps, a right instrument column, and a bottom control deck —
          each padded by the notch/home-indicator insets. Anything optional
          (keyboard hints, the debug log, the zoom buttons a pinch replaces)
          disappears on a phone rather than stacking on top of the game.
          ===================================================================== */}
      <div className="pointer-events-none absolute inset-0">
        {/* ---- top rail ---------------------------------------------------- */}
        <div
          className="pointer-events-none absolute flex items-center gap-1.5"
          style={{ top: 'var(--hud-t)', left: 'var(--hud-l)', right: 'var(--hud-r)' }}
        >
          {/* Left cluster shrinks; the buttons on the right never do. The old
              bar let both grow and flex-wrap, which is how seven pills ended
              up stacked three rows deep across the top of a phone. */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link href="/" className="hud-icon hud-tap pointer-events-auto" aria-label={lang === 'es' ? 'Salir' : 'Exit'}>
              ←
            </Link>
            <div className="hud-pill min-w-0 [flex-shrink:1]" style={{ maxWidth: vp.compact ? '12rem' : '18rem' }}>
              <span>{world.emoji}</span>
              <span className="truncate">{world.name[lang]}</span>
            </div>
            {!vp.compact && (
              <>
                <div className="hud-pill text-kai-gold">✦ {progress.xp}</div>
                <div className="hud-pill text-kai-jade">
                  🌍 {totalDone}/{TOTAL_MISSIONS}
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {!vp.compact && (
              <button
                onClick={toggleMute}
                className="hud-icon hud-tap pointer-events-auto"
                aria-label={lang === 'es' ? 'Voz de la guía' : 'Guide voice'}
                title={lang === 'es' ? 'Voz de la guía' : 'Guide voice'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            )}
            <button
              onClick={() => setPartyOpen(true)}
              className={`hud-tap pointer-events-auto ${vp.compact ? 'hud-icon' : 'hud-pill'} ${
                crew.together ? 'border-kai-jade/50 bg-kai-jade/20 text-kai-jade' : ''
              }`}
              aria-label={lang === 'es' ? 'Jugar juntos' : 'Play together'}
            >
              {vp.compact ? (
                <span className="text-[13px]">👥{crew.together ? crew.members.length + 1 : ''}</span>
              ) : (
                <>👥 {crew.together ? crew.members.length + 1 : lang === 'es' ? 'Juntos' : 'Together'}</>
              )}
            </button>
            <button
              onClick={() => setMapOpen(true)}
              className={`hud-tap pointer-events-auto border-kai-gold/30 bg-kai-gold/10 text-kai-gold ${vp.compact ? 'hud-icon' : 'hud-pill'}`}
              aria-label={lang === 'es' ? 'Mundos y misiones' : 'Worlds and missions'}
            >
              {vp.compact ? '🗺️' : <>🗺️ {lang === 'es' ? 'Mundos' : 'Worlds'}</>}
            </button>
            {!vp.compact && (
              <button
                onClick={() => setBuildOpen((b) => !b)}
                className={`hud-pill hud-tap pointer-events-auto ${
                  buildOpen ? 'border-kai-jade/50 bg-kai-jade/20 text-kai-jade' : ''
                }`}
              >
                🔨 {lang === 'es' ? 'Crear' : 'Build'}
              </button>
            )}
            <button
              onClick={() => setMenuOpen((m) => !m)}
              className={`hud-icon hud-tap pointer-events-auto ${menuOpen ? 'border-kai-gold/40 bg-kai-gold/15 text-kai-gold' : ''}`}
              aria-label={lang === 'es' ? 'Ajustes' : 'Settings'}
            >
              ⋯
            </button>
          </div>
        </div>

        {/* ---- overflow drawer --------------------------------------------- */}
        <HudMenu open={menuOpen} onClose={() => setMenuOpen(false)} title={lang === 'es' ? 'Ajustes' : 'Settings'}>
          {vp.compact && (
            <HudMenuAction
              onClick={() => {
                setBuildOpen((b) => !b);
                setMenuOpen(false);
              }}
            >
              🔨 {buildOpen ? (lang === 'es' ? 'Cerrar creación' : 'Close build') : lang === 'es' ? 'Crear tu mundo' : 'Build your world'}
            </HudMenuAction>
          )}
          {/* Off by default: the browser's built-in synthesiser is a robot, and
              every teaching is already on screen as text. Opt in if you want it. */}
          <HudMenuAction onClick={toggleMute}>
            {muted ? '🔇' : '🔊'}{' '}
            {muted
              ? lang === 'es'
                ? 'Voz de la guía: apagada'
                : 'Guide voice: off'
              : lang === 'es'
                ? 'Voz de la guía: encendida'
                : 'Guide voice: on'}
          </HudMenuAction>
          <HudMenuAction
            onClick={() => {
              setCreatorOpen(true);
              setMenuOpen(false);
            }}
          >
            🧍 {avatarUrl ? (lang === 'es' ? 'Cambiar tu personaje' : 'Change your character') : lang === 'es' ? 'Elegir personaje' : 'Choose a character'}
          </HudMenuAction>

          <HudMenuRow label={lang === 'es' ? 'Idioma' : 'Language'}>
            <HudSegment
              value={lang}
              onChange={(l) => setLang(l)}
              options={[
                { id: 'es' as const, label: 'Español' },
                { id: 'en' as const, label: 'English' },
              ]}
            />
          </HudMenuRow>

          {/* The world was tuned on a laptop. This is the dial that makes it
              playable on a phone — and lets a good phone ask for more. */}
          <HudMenuRow label={lang === 'es' ? 'Calidad gráfica' : 'Graphics'}>
            <HudSegment
              value={qualityPref}
              onChange={(p) => chooseQuality(p as QualityPref)}
              options={(['auto', 'bajo', 'medio', 'alto'] as const).map((id) => ({ id, label: QUALITY_LABEL[id][lang] }))}
            />
            <div className="w-full text-[10px] text-kai-faint">
              {lang === 'es' ? 'Ahora: ' : 'Now: '}
              <span className="text-kai-muted">{QUALITY_LABEL[qualityTier][lang]}</span>
              {qualityPref === 'auto' ? (lang === 'es' ? ' · elegida por tu equipo' : ' · picked for your device') : ''}
            </div>
          </HudMenuRow>

          <HudMenuAction onClick={() => store.enterVR()} disabled={!vrOk}>
            🥽 {vrOk ? (lang === 'es' ? 'Entrar en VR' : 'Enter VR') : lang === 'es' ? 'VR no disponible aquí' : 'VR unavailable here'}
          </HudMenuAction>
          <HudMenuAction onClick={() => setShowLog((s) => !s)}>
            🐞 {showLog ? (lang === 'es' ? 'Ocultar registro' : 'Hide log') : lang === 'es' ? 'Ver registro' : 'Show log'}
          </HudMenuAction>
        </HudMenu>

        {/* ---- right rail: instruments + zoom ------------------------------ */}
        <div
          className="pointer-events-none absolute flex flex-col items-end gap-2"
          style={{ top: rowTop, right: 'var(--hud-r)' }}
        >
          {!worldDone && !vp.short && <MiniHud targets={hudTargets} color={world.color} lang={lang} compact={vp.compact} />}
          {/* On touch the two fingers already pinch the camera, so the buttons
              would only be two more things covering the world. */}
          {!vp.touch && (
            <div className="pointer-events-auto flex flex-col gap-1.5">
              <button
                onClick={() => (input.dist = Math.min(24, input.dist + 2.5))}
                className="hud-icon hud-tap"
                title={lang === 'es' ? 'Alejar' : 'Zoom out'}
              >
                ➖
              </button>
              <button
                onClick={() => (input.dist = Math.max(3.5, input.dist - 2.5))}
                className="hud-icon hud-tap"
                title={lang === 'es' ? 'Acercar' : 'Zoom in'}
              >
                ➕
              </button>
            </div>
          )}
        </div>

        {/* ---- objective card ---------------------------------------------- */}
        {mission && !worldDone && (
          <div
            className="hud-panel pointer-events-auto absolute overflow-hidden"
            style={{
              top: rowTop,
              left: 'var(--hud-l)',
              // never grows under the instrument column on the right
              width: vp.compact ? 'min(22rem, calc(100vw - var(--hud-l) - var(--hud-r) - 5rem))' : '20rem',
            }}
          >
            <div className="flex items-center gap-1 px-2 py-2">
              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setCardOpen((c) => !c)}
                title={lang === 'es' ? 'Mostrar / ocultar' : 'Show / hide'}
              >
                <span className="text-lg leading-none">{mission.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] uppercase tracking-[0.16em] text-kai-faint">
                    {lang === 'es' ? 'Misión' : 'Mission'} {missionIdx + 1}/{world.missions.length}
                    {vp.compact ? ` · ✦${progress.xp}` : ''}
                  </span>
                  <span className="block truncate text-[13px] font-semibold text-kai-text">{mission.title[lang]}</span>
                </span>
              </button>
              {/* Read-aloud only exists when the voice is actually on. */}
              {!muted && (
                <button
                  onClick={() => readAloud(`${mission.title[lang]}. ${mission.desc[lang]}`)}
                  className="shrink-0 px-1 text-[13px] text-kai-faint"
                  aria-label={lang === 'es' ? 'Escuchar' : 'Listen'}
                >
                  🔊
                </button>
              )}
              <button
                onClick={() => setCardOpen((c) => !c)}
                className="shrink-0 px-1 text-[11px] text-kai-faint"
                aria-label={cardOpen ? 'Ocultar' : 'Mostrar'}
              >
                {cardOpen ? '▴' : '▾'}
              </button>
            </div>

            {cardOpen && (
              <div className="px-3 pb-2.5">
                <div className="text-[12px] leading-snug text-kai-muted">{mission.desc[lang]}</div>
                <div className="mt-1.5 rounded-lg bg-kai-gold/10 px-2 py-1 text-[11px] font-medium text-kai-gold">
                  👉 {actionHint(mission.tipo, lang)}
                </div>
                {mission.tipo !== 'quiz' && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(done / mission.n) * 100}%`, background: world.color }}
                      />
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
          </div>
        )}

        {worldDone && (
          <div
            className="hud-panel pointer-events-auto absolute border-kai-jade/30 px-4 py-3"
            style={{ top: rowTop, left: 'var(--hud-l)', width: 'min(20rem, calc(100vw - var(--hud-l) - var(--hud-r) - 5rem))' }}
          >
            <div className="text-sm font-semibold text-kai-jade">🌟 {lang === 'es' ? '¡Mundo completo!' : 'World complete!'}</div>
            <div className="mt-1 text-[12px] text-kai-muted">
              {lang === 'es' ? 'Abre el mapa para viajar al siguiente mundo.' : 'Open the map to travel to the next world.'}
            </div>
            <button
              onClick={() => setMapOpen(true)}
              className="mt-2.5 w-full rounded-full border border-kai-gold/40 bg-kai-gold/15 px-4 py-2 text-[13px] font-semibold text-kai-gold hud-tap"
            >
              🗺️ {lang === 'es' ? 'Ir al mapa' : 'Open the map'}
            </button>
          </div>
        )}

        {/* ---- event log (opt-in, from the ⋯ menu) -------------------------- */}
        {showLog && (
          <div
            className="hud-panel pointer-events-none absolute max-h-[8.5rem] w-[17rem] max-w-[calc(100vw-2rem)] overflow-hidden px-3 py-2 font-mono text-[10px] leading-relaxed text-kai-muted"
            style={{ left: 'var(--hud-l)', bottom: 'calc(var(--hud-b) + 9.5rem)' }}
          >
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

        {/* ---- toast ------------------------------------------------------- */}
        {toast && (
          <div
            className="pointer-events-none absolute left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-fade-up rounded-full border border-kai-gold/30 bg-black/70 px-5 py-2 text-center text-sm text-kai-text backdrop-blur-md"
            style={{ bottom: 'calc(var(--hud-b) + 7.5rem)' }}
          >
            {toast}
          </div>
        )}

        {/* ---- build palette ------------------------------------------------ */}
        {buildOpen && (
          <div
            className="hud-panel pointer-events-auto absolute left-1/2 -translate-x-1/2 border-kai-jade/30 px-3 py-2.5"
            style={{
              bottom: `calc(var(--hud-b) + ${vp.touch ? '7.5rem' : '3.5rem'})`,
              width: 'min(30rem, calc(100vw - 1.5rem))',
            }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <span className="text-[11px] font-medium text-kai-jade">🔨 {lang === 'es' ? 'Crea tu mundo' : 'Build your world'}</span>
              <span className="text-[10px] text-kai-faint">
                {visibleProps.length} {lang === 'es' ? 'creaciones' : 'placed'}
                {inParty && crew.together ? ` · ${lang === 'es' ? 'juntos' : 'together'}` : ''}
              </span>
            </div>
            {/* The palette scrolls sideways instead of wrapping into three rows
                that swallow the bottom half of a phone. */}
            <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {palette.map((k) => (
                <button
                  key={k}
                  onClick={() => setBuildKind(k)}
                  title={BUILD_KINDS[k][lang]}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-xl transition-colors ${
                    buildKind === k ? 'border-kai-jade/60 bg-kai-jade/20' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  {BUILD_KINDS[k].emoji}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                onClick={doPlace}
                className="hud-tap flex-1 rounded-xl border border-kai-jade/50 bg-kai-jade/20 px-4 py-2.5 text-sm font-semibold text-kai-jade"
              >
                ➕ {lang === 'es' ? 'Colocar' : 'Place'}
              </button>
              <button onClick={doUndo} className="hud-tap rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-kai-text" title={lang === 'es' ? 'Deshacer' : 'Undo'}>
                ↩︎
              </button>
              <button onClick={doClear} className="hud-tap rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-kai-text" title={lang === 'es' ? 'Borrar todo' : 'Clear'}>
                🗑️
              </button>
            </div>
            <div className="mt-1 text-center text-[10px] text-kai-faint">
              {lang === 'es' ? 'Camina, mira a dónde, y pulsa Colocar — se guarda solo' : 'Walk, aim, and press Place — it saves automatically'}
            </div>
          </div>
        )}

        {/* ---- keyboard hint (desktop only) --------------------------------- */}
        {!vp.touch && !vp.short && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-4 py-1.5 text-[12px] text-kai-muted backdrop-blur-md"
            style={{ bottom: 'var(--hud-b)' }}
          >
            {lang === 'es'
              ? world.theme.swim
                ? 'WASD nadar · Shift correr · MANTÉN Espacio para subir · rueda para acercar'
                : 'WASD · Shift correr · Espacio saltar (doble) · arrastra para mirar · rueda para acercar'
              : world.theme.swim
                ? 'WASD swim · Shift run · HOLD Space to rise · wheel to zoom'
                : 'WASD · Shift run · Space jump (double) · drag to look · wheel to zoom'}
          </div>
        )}

        {/* ---- bottom-right control deck ------------------------------------ */}
        <div
          className="pointer-events-auto absolute flex items-end gap-2"
          style={{ bottom: 'var(--hud-b)', right: 'var(--hud-r)' }}
        >
          <div className="flex flex-col gap-2">
            <button
              onClick={() => (input.dashReq = true)}
              className="hud-tap select-none rounded-full border border-kai-gold/40 bg-kai-gold/15 px-3.5 py-2.5 text-[13px] font-semibold text-kai-gold backdrop-blur-md"
            >
              💨{vp.compact ? '' : ' Dash'}
            </button>
            <button
              onPointerDown={() => (input.run = true)}
              onPointerUp={() => (input.run = false)}
              onPointerLeave={() => (input.run = false)}
              onPointerCancel={() => (input.run = false)}
              className="hud-tap select-none rounded-full border border-kai-jade/40 bg-kai-jade/15 px-3.5 py-2.5 text-[13px] font-semibold text-kai-jade backdrop-blur-md"
            >
              🏃{vp.compact ? '' : ` ${lang === 'es' ? 'Correr' : 'Run'}`}
            </button>
          </div>
          {/* The one button a thumb reaches for constantly gets to be big. */}
          <button
            onPointerDown={() => (input.jumpHeld = true)}
            onPointerUp={() => (input.jumpHeld = false)}
            onPointerLeave={() => (input.jumpHeld = false)}
            onPointerCancel={() => (input.jumpHeld = false)}
            className="hud-tap grid select-none place-items-center rounded-full border border-white/25 bg-black/50 text-2xl text-kai-text backdrop-blur-md"
            style={{ height: vp.short ? '3.5rem' : '4.25rem', width: vp.short ? '3.5rem' : '4.25rem' }}
            aria-label={world.theme.swim ? (lang === 'es' ? 'Subir' : 'Rise') : lang === 'es' ? 'Saltar' : 'Jump'}
          >
            {world.theme.swim ? '🫧' : '⤒'}
          </button>
        </div>

        {/* ---- joystick ------------------------------------------------------ */}
        {vp.touch && (
          <MobileJoystick
            compact={vp.short}
            onMove={(x, y) => {
              input.jx = x;
              input.jy = y;
            }}
          />
        )}

        {/* co-op: room pill, mic, emotes and the join panel */}
        <PartyLayer
          party={crew}
          lang={lang}
          compact={vp.compact}
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
        <div
          className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          style={{ paddingTop: 'calc(var(--sa-t) + 1rem)', paddingBottom: 'calc(var(--sa-b) + 1rem)' }}
        >
          <div className="glass my-auto w-full max-w-md animate-fade-up p-5 text-center sm:p-6">
            <div className="mb-2 text-3xl">{world.emoji}{world.guideEmoji}</div>
            <h2 className="font-display text-xl font-semibold text-kai-text">{world.name[lang]}</h2>
            <p className="mt-2 text-[13px] text-kai-muted">{world.intro[lang]}</p>
            {/* The controls a phone actually has are not the controls a laptop
                has; telling a kid on an iPad to press WASD is telling them
                nothing. */}
            <div className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-[13px] text-kai-muted">
              {vp.touch ? (
                <>
                  <div>🕹️ {lang === 'es' ? 'Pulgar izquierdo para caminar · arrastra para mirar' : 'Left thumb to walk · drag to look'}</div>
                  <div>🤏 {lang === 'es' ? 'Pellizca con dos dedos para acercar o alejar' : 'Pinch with two fingers to zoom'}</div>
                </>
              ) : (
                <div>🎮 <b className="text-kai-text">WASD</b> · {lang === 'es' ? 'arrastra para mirar · rueda para acercar' : 'drag to look · wheel to zoom'}</div>
              )}
              <div>✨ {lang === 'es' ? 'Completa misiones para sanar el mundo' : 'Complete missions to heal the world'}</div>
              <div>🗺️ {lang === 'es' ? 'Los 7 mundos y sus 92 misiones están en el Atlas' : 'All 7 worlds and their 92 missions live in the Atlas'}</div>
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
          xp={progress.xp}
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
