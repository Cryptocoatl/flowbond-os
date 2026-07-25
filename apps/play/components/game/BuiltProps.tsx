'use client';
// Co-creation catalog. Players place these to build/customize their world. Each
// prop is a small self-contained procedural mesh; kinds are grouped into a
// per-world palette. Placements persist via useBuild and render in BuildLayer.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type BuildKind =
  | 'tree'
  | 'flower'
  | 'rock'
  | 'house'
  | 'lantern'
  | 'solar'
  | 'windmill'
  | 'fountain'
  | 'crystal'
  | 'coral'
  | 'torch'
  | 'star';

export const BUILD_KINDS: Record<BuildKind, { emoji: string; es: string; en: string }> = {
  tree: { emoji: '🌳', es: 'Árbol', en: 'Tree' },
  flower: { emoji: '🌺', es: 'Flor', en: 'Flower' },
  rock: { emoji: '🪨', es: 'Roca', en: 'Rock' },
  house: { emoji: '🏠', es: 'Casa', en: 'House' },
  lantern: { emoji: '🏮', es: 'Farol', en: 'Lantern' },
  solar: { emoji: '🔆', es: 'Panel solar', en: 'Solar panel' },
  windmill: { emoji: '🌬️', es: 'Molino', en: 'Windmill' },
  fountain: { emoji: '⛲', es: 'Fuente', en: 'Fountain' },
  crystal: { emoji: '💎', es: 'Cristal', en: 'Crystal' },
  coral: { emoji: '🪸', es: 'Coral', en: 'Coral' },
  torch: { emoji: '🕯️', es: 'Antorcha', en: 'Torch' },
  star: { emoji: '⭐', es: 'Estrella', en: 'Star' },
};

export const WORLD_PALETTE: Record<string, BuildKind[]> = {
  selva: ['tree', 'flower', 'rock', 'lantern'],
  atlantis: ['coral', 'crystal', 'rock', 'lantern'],
  egipto: ['rock', 'torch', 'crystal', 'house'],
  astros: ['crystal', 'star', 'lantern', 'rock'],
  escuela: ['tree', 'flower', 'solar', 'windmill', 'house', 'fountain'],
  espiritu: ['lantern', 'flower', 'rock', 'torch'],
  nuevo: ['house', 'tree', 'solar', 'windmill', 'fountain', 'flower', 'lantern'],
};

export const paletteFor = (worldId: string): BuildKind[] => WORLD_PALETTE[worldId] ?? ['tree', 'flower', 'rock', 'lantern'];

function Spinner({ children, speed = 1 }: { children: React.ReactNode; speed?: number }) {
  const r = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (r.current) r.current.rotation.y += dt * speed;
  });
  return <group ref={r}>{children}</group>;
}

// One placed creation. `color` is the world accent (used by a few kinds).
export function BuiltProp({ kind, color = '#7BE0B0' }: { kind: BuildKind; color?: string }) {
  switch (kind) {
    case 'tree':
      return (
        <group>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.3, 2.2, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          <mesh position={[0, 2.9, 0]} castShadow>
            <coneGeometry args={[1.4, 3, 8]} />
            <meshStandardMaterial color="#2fae52" roughness={1} flatShading />
          </mesh>
        </group>
      );
    case 'flower':
      return (
        <group>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 5]} />
            <meshStandardMaterial color="#3d6b2a" />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#ff7fb0" emissive="#ff7fb0" emissiveIntensity={0.3} flatShading />
          </mesh>
        </group>
      );
    case 'rock':
      return (
        <mesh position={[0, 0.5, 0]} castShadow scale={[1.2, 0.9, 1.1]}>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color="#8a8a92" roughness={1} flatShading />
        </mesh>
      );
    case 'house':
      return (
        <group>
          <mesh position={[0, 1.4, 0]} castShadow>
            <boxGeometry args={[3.4, 2.8, 3.4]} />
            <meshStandardMaterial color="#e8b06b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[2.8, 1.8, 4]} />
            <meshStandardMaterial color="#8a4a3a" roughness={0.9} flatShading />
          </mesh>
        </group>
      );
    case 'lantern':
      return (
        <group>
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[0.6, 0.9, 0.6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.8, 5]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <pointLight position={[0, 1.8, 0]} color={color} intensity={1.2} distance={7} />
        </group>
      );
    case 'solar':
      return (
        <group>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1.4, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[0, 1.5, 0]} rotation={[-0.5, 0, 0]} castShadow>
            <boxGeometry args={[3, 0.15, 2]} />
            <meshStandardMaterial color="#1a2b5a" emissive="#2a4a8a" emissiveIntensity={0.25} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      );
    case 'windmill':
      return (
        <group>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.3, 5, 8]} />
            <meshStandardMaterial color="#e8e8ee" roughness={0.7} />
          </mesh>
          <Spinner speed={1.4}>
            <group position={[0, 4.8, 0.35]}>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
                  <boxGeometry args={[0.28, 2.6, 0.1]} />
                  <meshStandardMaterial color={color} roughness={0.6} />
                </mesh>
              ))}
            </group>
          </Spinner>
        </group>
      );
    case 'fountain':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[1.6, 1.8, 0.6, 16]} />
            <meshStandardMaterial color="#b8b8c0" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[1.3, 1.3, 0.2, 16]} />
            <meshStandardMaterial color="#6bc7e8" transparent opacity={0.7} metalness={0.4} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 1.2, 8]} />
            <meshStandardMaterial color="#b8b8c0" />
          </mesh>
        </group>
      );
    case 'crystal':
      return (
        <Spinner speed={0.8}>
          <mesh position={[0, 1, 0]} castShadow>
            <octahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.2} metalness={0.4} transparent opacity={0.9} />
          </mesh>
          <pointLight position={[0, 1, 0]} color={color} intensity={1.4} distance={7} />
        </Spinner>
      );
    case 'coral':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos(i * 2) * 0.4, 0.7 + i * 0.2, Math.sin(i * 2) * 0.4]} rotation={[0.2 * i, i, 0]} castShadow>
              <coneGeometry args={[0.35, 1.4, 5]} />
              <meshStandardMaterial color={['#ff8fb0', '#ffc36b', '#8fe3ff'][i]} emissive={['#ff8fb0', '#ffc36b', '#8fe3ff'][i]} emissiveIntensity={0.2} roughness={0.5} flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'torch':
      return (
        <group>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 2, 6]} />
            <meshStandardMaterial color="#5a3a1a" roughness={1} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a1a" emissiveIntensity={1} />
          </mesh>
          <pointLight position={[0, 2.2, 0]} color="#ff9a3a" intensity={1.6} distance={8} />
        </group>
      );
    case 'star':
      return (
        <Spinner speed={1.2}>
          <mesh position={[0, 2, 0]}>
            <icosahedronGeometry args={[0.6, 0]} />
            <meshStandardMaterial color="#fff2b0" emissive="#ffe066" emissiveIntensity={1} />
          </mesh>
          <pointLight position={[0, 2, 0]} color="#ffe066" intensity={1.6} distance={9} />
        </Spinner>
      );
    default:
      return null;
  }
}
