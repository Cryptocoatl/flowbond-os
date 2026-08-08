'use client';
// Per-world environments. Each world should FEEL different, not just recolored —
// starting with a real underwater Atlantis (kelp, fish schools, rising bubbles,
// a shimmering surface far above, god rays, a drifting whale). Others fall back
// to the default terrestrial look in GameWorld; this file grows per world.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { KaiWorld } from '@/lib/kai/worlds';

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Swaying kelp forest — thin tapered strands anchored to the seabed.
function Kelp({ color }: { color: string }) {
  const strands = useMemo(() => {
    const rnd = seeded(4242);
    const arr: { x: number; z: number; h: number; ph: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 260;
      const z = (rnd() - 0.5) * 260;
      if (Math.hypot(x, z) < 8) continue;
      arr.push({ x, z, h: 5 + rnd() * 9, ph: rnd() * Math.PI * 2 });
    }
    return arr;
  }, []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < groups.current.length; i++) {
      const g = groups.current[i];
      if (g) g.rotation.z = Math.sin(t * 0.8 + strands[i].ph) * 0.22;
    }
  });
  return (
    <group>
      {strands.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} ref={(el) => (groups.current[i] = el)}>
          <mesh position={[0, s.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.22, s.h, 5]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// A school of fish circling a center point, bobbing as they go.
function FishSchool({ center, radius, count, color, speed }: { center: [number, number, number]; radius: number; count: number; color: string; speed: number }) {
  const g = useRef<THREE.Group>(null);
  const fish = useMemo(() => {
    const rnd = seeded(Math.floor(center[0] * 13 + center[2] * 7 + 1));
    return Array.from({ length: count }, () => ({
      a: rnd() * Math.PI * 2,
      r: radius * (0.7 + rnd() * 0.5),
      y: (rnd() - 0.5) * 4,
      s: 0.5 + rnd() * 0.6,
    }));
  }, [center, radius, count]);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * speed;
  });
  return (
    <group position={center}>
      <group ref={g}>
        {fish.map((f, i) => (
          <mesh key={i} position={[Math.cos(f.a) * f.r, f.y, Math.sin(f.a) * f.r]} rotation={[0, -f.a, Math.PI / 2]} scale={f.s}>
            <coneGeometry args={[0.22, 0.7, 5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Bubbles that rise and reset — a column of buoyant orbs.
function Bubbles() {
  const orbs = useMemo(() => {
    const rnd = seeded(88);
    return Array.from({ length: 40 }, () => ({
      x: (rnd() - 0.5) * 200,
      z: (rnd() - 0.5) * 200,
      y0: rnd() * 40,
      sp: 2 + rnd() * 3,
      s: 0.1 + rnd() * 0.25,
    }));
  }, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < orbs.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const y = (orbs[i].y0 + t * orbs[i].sp) % 40;
      m.position.y = y;
      m.position.x = orbs[i].x + Math.sin(t + i) * 0.4;
    }
  });
  return (
    <group>
      {orbs.map((o, i) => (
        <mesh key={i} position={[o.x, o.y0, o.z]} scale={o.s} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#bfefff" transparent opacity={0.35} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// God rays slicing down from the surface.
function GodRays({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.03;
  });
  const rays = useMemo(() => {
    const rnd = seeded(9);
    return Array.from({ length: 6 }, (_, i) => ({ x: (rnd() - 0.5) * 120, z: (rnd() - 0.5) * 120, r: 4 + rnd() * 5, k: i }));
  }, []);
  return (
    <group ref={g}>
      {rays.map((r) => (
        <mesh key={r.k} position={[r.x, 20, r.z]} rotation={[0, 0, 0.06]}>
          <coneGeometry args={[r.r, 44, 5, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// A whale drifting far in the blue.
function Whale({ color }: { color: string }) {
  const m = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    const t = clock.elapsedTime * 0.05;
    m.current.position.x = Math.sin(t) * 120;
    m.current.position.z = Math.cos(t) * 120;
    m.current.position.y = 22 + Math.sin(t * 2) * 3;
    m.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={m}>
      <mesh scale={[10, 5, 22]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 3, -18]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[6, 8, 4]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// Coral clusters scattered on the seabed (instanced).
function Coral({ world }: { world: KaiWorld }) {
  const items = useMemo(() => {
    const rnd = seeded(321);
    const arr: { x: number; z: number; s: number; c: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const x = (rnd() - 0.5) * 280;
      const z = (rnd() - 0.5) * 280;
      if (Math.hypot(x, z) < 10) continue;
      arr.push({ x, z, s: 0.7 + rnd() * 1.6, c: rnd() });
    }
    return arr;
  }, []);
  const palette = ['#ff8fb0', '#ffc36b', '#8fe3ff', world.theme.terrain[2]];
  return (
    <group>
      {palette.map((col, ci) => (
        <Instances key={ci} range={items.length} limit={90} castShadow>
          <dodecahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.18} roughness={0.5} flatShading />
          {items
            .filter((_, i) => i % palette.length === ci)
            .map((it, i) => (
              <Instance key={i} position={[it.x, 0.5 * it.s, it.z]} scale={it.s} />
            ))}
        </Instances>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers for the terrestrial worlds
// ---------------------------------------------------------------------------
function Ground({ color, size = 440 }: { color: string; size?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Hills({ color, seed = 55 }: { color: string; seed?: number }) {
  const peaks = useMemo(() => {
    const rnd = seeded(seed);
    return Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + rnd() * 0.25;
      const dist = 150 + rnd() * 45;
      return { x: Math.cos(a) * dist, z: Math.sin(a) * dist, h: 26 + rnd() * 55, r: 26 + rnd() * 28 };
    });
  }, [seed]);
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

function scatter(seed: number, count: number, spread: number, clearR = 10) {
  const rnd = seeded(seed);
  const arr: { x: number; z: number; s: number; rot: number }[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rnd() - 0.5) * spread;
    const z = (rnd() - 0.5) * spread;
    if (Math.hypot(x, z) < clearR) continue;
    arr.push({ x, z, s: 0.7 + rnd() * 1.5, rot: rnd() * Math.PI });
  }
  return arr;
}

// A windmill with spinning blades (escuela / nuevo).
function Windmill({ position, color }: { position: [number, number, number]; color: string }) {
  const b = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (b.current) b.current.rotation.z += dt * 1.2;
  });
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.35, 6, 8]} />
        <meshStandardMaterial color="#e8e8ee" roughness={0.7} />
      </mesh>
      <group ref={b} position={[0, 5.6, 0.4]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 3, 0.1]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// A floating, bobbing lantern (espíritu / nuevo).
function Lantern({ position, color }: { position: [number, number, number]; color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2 + position[0]) * 0.4;
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <boxGeometry args={[0.6, 0.9, 0.6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.85} />
      </mesh>
      <pointLight color={color} intensity={1.4} distance={7} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// SELVA — lush jungle with a great ceiba, fireflies, layered canopy
// ---------------------------------------------------------------------------
export function SelvaEnvironment({ world }: { world: KaiWorld }) {
  const trees = useMemo(() => scatter(2024, 170, 300, 10), []);
  const foliage = world.theme.terrain[2];
  return (
    <group>
      <Ground color={world.theme.terrain[1]} />
      <Hills color={world.theme.terrain[0]} seed={71} />
      <Instances range={trees.length} limit={200} castShadow>
        <cylinderGeometry args={[0.16, 0.28, 2.6, 6]} />
        <meshStandardMaterial color="#43331f" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 1.3 * t.s, t.z]} scale={t.s} rotation={[0, t.rot, 0]} />
        ))}
      </Instances>
      <Instances range={trees.length} limit={200} castShadow>
        <coneGeometry args={[1.6, 3.8, 8]} />
        <meshStandardMaterial color={foliage} roughness={1} flatShading />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 3.7 * t.s, t.z]} scale={t.s} rotation={[0, t.rot, 0]} />
        ))}
      </Instances>
      {/* great ceiba */}
      <group position={[0, 0, -22]}>
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[1.1, 2, 12, 8]} />
          <meshStandardMaterial color="#5a4530" roughness={1} />
        </mesh>
        <mesh position={[0, 13, 0]} castShadow>
          <icosahedronGeometry args={[6, 1]} />
          <meshStandardMaterial color={foliage} roughness={1} flatShading />
        </mesh>
      </group>
      {/* fireflies */}
      <Sparkles count={90} scale={[200, 8, 200]} position={[0, 3, 0]} size={2.4} speed={0.35} color="#F4C25A" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// EGIPTO — desert, pyramids, obelisks, palms
// ---------------------------------------------------------------------------
export function EgiptoEnvironment({ world }: { world: KaiWorld }) {
  const dunes = useMemo(() => scatter(444, 40, 320, 20), []);
  const obelisks = useMemo(() => scatter(445, 26, 300, 24), []);
  const palms = useMemo(() => scatter(446, 22, 240, 14), []);
  const sand = world.theme.terrain[1];
  return (
    <group>
      <Ground color={sand} />
      <Hills color={world.theme.terrain[0]} seed={12} />
      {/* pyramids */}
      {[[-30, -40, 2.2], [26, -52, 3], [70, -30, 1.7]].map(([x, z, s], i) => (
        <mesh key={i} position={[x, 14 * s, z]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[16 * s, 22 * s, 4]} />
          <meshStandardMaterial color={world.theme.terrain[2]} roughness={1} flatShading />
        </mesh>
      ))}
      {/* dunes */}
      {dunes.map((d, i) => (
        <mesh key={i} position={[d.x, -1, d.z]} scale={[d.s * 8, d.s * 2, d.s * 8]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={sand} roughness={1} />
        </mesh>
      ))}
      {/* obelisks */}
      <Instances range={obelisks.length} limit={40} castShadow>
        <boxGeometry args={[0.8, 6, 0.8]} />
        <meshStandardMaterial color={world.theme.terrain[2]} emissive="#5a3a10" emissiveIntensity={0.1} roughness={0.9} />
        {obelisks.map((o, i) => (
          <Instance key={i} position={[o.x, 3 * o.s, o.z]} scale={[o.s, o.s * 1.5, o.s]} rotation={[0, o.rot, 0]} />
        ))}
      </Instances>
      {/* palms */}
      {palms.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <mesh position={[0, 2.2 * p.s, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, 4.4 * p.s, 6]} />
            <meshStandardMaterial color="#7a5a34" roughness={1} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[0, 4.4 * p.s, 0]} rotation={[0.5, (k * Math.PI * 2) / 5, 0]}>
              <coneGeometry args={[0.4, 2.4, 4]} />
              <meshStandardMaterial color="#4f8a3a" roughness={1} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      <Sparkles count={60} scale={[220, 16, 220]} position={[0, 8, 0]} size={2} speed={0.15} opacity={0.4} color="#ffe6a0" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// ESCUELA — living school: garden beds, greenhouse, solar, windmills
// ---------------------------------------------------------------------------
export function EscuelaEnvironment({ world }: { world: KaiWorld }) {
  const trees = useMemo(() => scatter(770, 60, 260, 24), []);
  return (
    <group>
      <Ground color={world.theme.terrain[1]} />
      <Hills color={world.theme.terrain[0]} seed={90} />
      {/* garden beds grid */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = -18 + (i % 4) * 12;
        const z = -20 + Math.floor(i / 4) * 10;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[6, 0.6, 4]} />
              <meshStandardMaterial color="#5a3f28" roughness={1} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <boxGeometry args={[5.6, 0.3, 3.6]} />
              <meshStandardMaterial color="#3d6b2a" roughness={1} />
            </mesh>
          </group>
        );
      })}
      {/* greenhouse */}
      <mesh position={[26, 3, 10]}>
        <boxGeometry args={[10, 6, 8]} />
        <meshStandardMaterial color="#bfe8ff" transparent opacity={0.28} roughness={0.1} metalness={0.2} />
      </mesh>
      {/* solar panels */}
      {[-30, -24, -18].map((x, i) => (
        <mesh key={i} position={[x, 1.6, 22]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[5, 0.2, 3]} />
          <meshStandardMaterial color="#1a2b5a" emissive="#2a4a8a" emissiveIntensity={0.2} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <Windmill position={[34, 0, -24]} color={world.color} />
      <Windmill position={[-36, 0, -14]} color={world.color} />
      {/* fruit trees */}
      <Instances range={trees.length} limit={80} castShadow>
        <coneGeometry args={[1.4, 3, 8]} />
        <meshStandardMaterial color={world.theme.terrain[2]} roughness={1} flatShading />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 2.2 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>
      <Sparkles count={50} scale={[180, 10, 180]} position={[0, 4, 0]} size={2} speed={0.3} color="#d8ffb0" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// ESPÍRITU — misty garden: still pond, floating lanterns, drifting petals, arches
// ---------------------------------------------------------------------------
export function EspirituEnvironment({ world }: { world: KaiWorld }) {
  const lanterns = useMemo(() => scatter(6060, 16, 200, 8), []);
  const stones = useMemo(() => scatter(6061, 40, 260, 10), []);
  return (
    <group>
      <Ground color={world.theme.terrain[1]} />
      <Hills color={world.theme.terrain[0]} seed={33} />
      {/* still pond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 20]}>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#c9bfe8" transparent opacity={0.6} metalness={0.4} roughness={0.2} />
      </mesh>
      {/* neutral arches (torii-like, no religious marks) */}
      {[[-16, -10], [16, -10], [0, -26]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[-2.6, 3, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 6, 8]} />
            <meshStandardMaterial color={world.color} roughness={0.7} />
          </mesh>
          <mesh position={[2.6, 3, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 6, 8]} />
            <meshStandardMaterial color={world.color} roughness={0.7} />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <boxGeometry args={[6.4, 0.5, 0.5]} />
            <meshStandardMaterial color={world.color} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* smooth stones */}
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.3 * s.s, s.z]} scale={[s.s, s.s * 0.5, s.s]}>
          <dodecahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={world.theme.terrain[2]} roughness={0.9} flatShading />
        </mesh>
      ))}
      {lanterns.map((l, i) => (
        <Lantern key={i} position={[l.x, 2 + l.s, l.z]} color="#ffd6ec" />
      ))}
      {/* drifting petals */}
      <Sparkles count={120} scale={[200, 20, 200]} position={[0, 8, 0]} size={3} speed={0.25} opacity={0.6} color="#ffc0dd" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// NUEVO — solarpunk village: houses, gardens, solar, windmills, rainbow
// ---------------------------------------------------------------------------
export function NuevoEnvironment({ world }: { world: KaiWorld }) {
  const houseCols = ['#e8896b', '#6bb0e8', '#e8c46b', '#8ad86b', '#c98ae8'];
  const houses = useMemo(() => {
    const rnd = seeded(9090);
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const r = 24 + rnd() * 20;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, rot: -a, c: houseCols[i % houseCols.length], s: 0.9 + rnd() * 0.5 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const trees = useMemo(() => scatter(9091, 40, 240, 14), []);
  return (
    <group>
      <Ground color={world.theme.terrain[1]} />
      <Hills color={world.theme.terrain[0]} seed={20} />
      {/* houses */}
      {houses.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]} rotation={[0, h.rot, 0]} scale={h.s}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[4, 3, 4]} />
            <meshStandardMaterial color={h.c} roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[3.2, 2, 4]} />
            <meshStandardMaterial color="#8a4a3a" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 3.6, 2]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[2.4, 0.15, 1.6]} />
            <meshStandardMaterial color="#1a2b5a" metalness={0.6} roughness={0.3} emissive="#2a4a8a" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
      {/* rainbow arch */}
      {['#ff6b6b', '#ffb36b', '#ffe66b', '#6be87a', '#6bb0e8', '#b06be8'].map((c, i) => (
        <mesh key={i} position={[0, 0, -30]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[26 - i * 1.2, 0.5, 8, 40, Math.PI]} />
          <meshBasicMaterial color={c} transparent opacity={0.7} />
        </mesh>
      ))}
      <Windmill position={[40, 0, 8]} color={world.color} />
      <Windmill position={[-42, 0, -10]} color={world.color} />
      {/* community garden trees */}
      <Instances range={trees.length} limit={60} castShadow>
        <coneGeometry args={[1.5, 3.2, 8]} />
        <meshStandardMaterial color={world.theme.terrain[2]} roughness={1} flatShading />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 2.4 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>
      <Sparkles count={70} scale={[200, 16, 200]} position={[0, 6, 0]} size={2.4} speed={0.35} color="#fff0b0" />
    </group>
  );
}

export function AtlantisEnvironment({ world }: { world: KaiWorld }) {
  const surface = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (surface.current) surface.current.position.y = 39 + Math.sin(clock.elapsedTime * 0.6) * 0.6;
  });
  return (
    <group>
      {/* seabed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[440, 440, 1, 1]} />
        <meshStandardMaterial color={world.theme.terrain[0]} roughness={1} />
      </mesh>
      {/* shimmering surface far above */}
      <mesh ref={surface} rotation={[Math.PI / 2, 0, 0]} position={[0, 39, 0]}>
        <planeGeometry args={[440, 440]} />
        <meshBasicMaterial color={world.theme.terrain[2]} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Coral world={world} />
      <Kelp color={world.theme.terrain[1]} />
      <Bubbles />
      <GodRays color={world.theme.terrain[2]} />
      <Whale color={world.theme.terrain[0]} />
      <FishSchool center={[24, 10, -18]} radius={9} count={16} color="#ffd27a" speed={0.5} />
      <FishSchool center={[-30, 14, 20]} radius={12} count={20} color="#8fe3ff" speed={-0.35} />
      <FishSchool center={[10, 20, 30]} radius={7} count={12} color="#ff9fc0" speed={0.6} />
      <Sparkles count={140} scale={[240, 40, 240]} position={[0, 20, 0]} size={2.4} speed={0.5} opacity={0.5} color="#bfefff" />
      {/* deep-water glow */}
      <pointLight position={[0, 30, 0]} color={world.theme.hemi} intensity={1.6} distance={120} />
    </group>
  );
}
