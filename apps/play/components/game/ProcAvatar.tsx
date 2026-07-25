'use client';
// ProcAvatar — procedural avatars built from Three primitives (no GLB, no CDN).
// Gives players more characters to choose from immediately, and works offline.
// Each has a simple idle bob + a walk cycle (arm/leg swing) driven by `moving`.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ProcId = 'kai' | 'tef' | 'niko' | 'sol' | 'luna' | 'terra' | 'lumen' | 'pip';

interface Palette {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
}

const PALETTES: Record<Exclude<ProcId, 'lumen' | 'pip'>, Palette> = {
  kai: { skin: '#e8b98a', shirt: '#3fae72', pants: '#3a4a6a', hair: '#3a2a1a' },
  tef: { skin: '#e8c49a', shirt: '#4fc9e8', pants: '#245a6a', hair: '#59d3e8' },
  niko: { skin: '#d8a878', shirt: '#f4c25a', pants: '#4a3a2a', hair: '#2a2a2a' },
  sol: { skin: '#c98a5a', shirt: '#ff9a3a', pants: '#8a4a1a', hair: '#1a1a1a' },
  luna: { skin: '#e0c0d0', shirt: '#8a6fff', pants: '#2a2a4a', hair: '#c9b3f0' },
  terra: { skin: '#a87848', shirt: '#7ec850', pants: '#4a3a1a', hair: '#2a1a0a' },
};

// A small stylized humanoid (~1.7u tall). Faces -Z (forward).
function Humanoid({ pal, moving, goggles }: { pal: Palette; moving: boolean; goggles?: boolean }) {
  const larm = useRef<THREE.Group>(null);
  const rarm = useRef<THREE.Group>(null);
  const lleg = useRef<THREE.Group>(null);
  const rleg = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt * (moving ? 9 : 2.2);
    const amp = moving ? 0.8 : 0.12;
    const s = Math.sin(t.current) * amp;
    if (larm.current) larm.current.rotation.x = s;
    if (rarm.current) rarm.current.rotation.x = -s;
    if (lleg.current) lleg.current.rotation.x = moving ? -s : 0;
    if (rleg.current) rleg.current.rotation.x = moving ? s : 0;
  });

  return (
    <group>
      {/* legs */}
      <group ref={lleg} position={[-0.16, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.5, 4, 8]} />
          <meshStandardMaterial color={pal.pants} roughness={0.9} />
        </mesh>
      </group>
      <group ref={rleg} position={[0.16, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.5, 4, 8]} />
          <meshStandardMaterial color={pal.pants} roughness={0.9} />
        </mesh>
      </group>
      {/* torso */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <capsuleGeometry args={[0.24, 0.5, 6, 12]} />
        <meshStandardMaterial color={pal.shirt} roughness={0.8} />
      </mesh>
      {/* arms */}
      <group ref={larm} position={[-0.3, 1.28, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.42, 4, 8]} />
          <meshStandardMaterial color={pal.shirt} roughness={0.8} />
        </mesh>
      </group>
      <group ref={rarm} position={[0.3, 1.28, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.42, 4, 8]} />
          <meshStandardMaterial color={pal.shirt} roughness={0.8} />
        </mesh>
      </group>
      {/* head */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial color={pal.skin} roughness={0.7} />
      </mesh>
      {/* hair cap */}
      <mesh position={[0, 1.72, -0.02]} castShadow>
        <sphereGeometry args={[0.235, 20, 20, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <meshStandardMaterial color={pal.hair} roughness={0.85} />
      </mesh>
      {/* eyes (face -Z) */}
      <mesh position={[-0.08, 1.63, -0.2]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.08, 1.63, -0.2]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {goggles && (
        <mesh position={[0, 1.68, -0.19]}>
          <torusGeometry args={[0.14, 0.03, 8, 20]} />
          <meshStandardMaterial color="#8ad8ff" emissive="#3a6a8a" emissiveIntensity={0.4} metalness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// A luminous spirit being — hovers, no legs; gentle bob + inner glow.
function Lumen({ moving }: { moving: boolean }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt * (moving ? 4 : 1.6);
    if (g.current) {
      g.current.position.y = 1.0 + Math.sin(t.current) * 0.12;
      g.current.rotation.y += dt * 0.6;
    }
  });
  return (
    <group ref={g}>
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#b69cff" emissive="#8a6fff" emissiveIntensity={0.9} roughness={0.3} transparent opacity={0.9} />
      </mesh>
      <mesh scale={1.4}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#d8c8ff" transparent opacity={0.12} />
      </mesh>
      <pointLight color="#b69cff" intensity={2} distance={6} />
    </group>
  );
}

// A friendly little box-bot.
function Pip({ moving }: { moving: boolean }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt * (moving ? 8 : 2);
    if (g.current) g.current.position.y = Math.abs(Math.sin(t.current)) * (moving ? 0.14 : 0.05);
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.4]} />
        <meshStandardMaterial color="#7cc7ff" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[0.42, 0.36, 0.36]} />
        <meshStandardMaterial color="#eaf4ff" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.44, -0.2]}>
        <planeGeometry args={[0.3, 0.16]} />
        <meshBasicMaterial color="#1a2a3a" />
      </mesh>
      <mesh position={[-0.07, 1.45, -0.21]}>
        <circleGeometry args={[0.03, 12]} />
        <meshBasicMaterial color="#8affea" />
      </mesh>
      <mesh position={[0.07, 1.45, -0.21]}>
        <circleGeometry args={[0.03, 12]} />
        <meshBasicMaterial color="#8affea" />
      </mesh>
      <pointLight color="#8affea" intensity={0.7} distance={3} position={[0, 1.44, -0.2]} />
    </group>
  );
}

export function ProcAvatar({ id, moving = false, scale = 1 }: { id: ProcId; moving?: boolean; scale?: number }) {
  const body = useMemo(() => {
    if (id === 'lumen') return <Lumen moving={moving} />;
    if (id === 'pip') return <Pip moving={moving} />;
    return <Humanoid pal={PALETTES[id]} moving={moving} goggles={id === 'niko' || id === 'sol'} />;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, moving]);
  return <group scale={scale}>{body}</group>;
}
