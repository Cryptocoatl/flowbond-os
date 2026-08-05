'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

/**
 * The scroll-scrubbed journey — one continuous scene the camera flies through as
 * `progress` (0→1) advances with the page scroll:
 *   0.00–0.18  amanecer sobre el lago ancestral
 *   0.14–0.36  descenso al agua · las chinampas se encienden
 *   0.40–0.66  Tenochtitlan RENACE (still 4K viva)
 *   0.64–1.00  zoom-out al planeta · de México al mundo
 * All motion is driven by the ref (no autoplay) except a gentle water swell,
 * which is frozen under reduced-motion.
 */

type Vec3 = [number, number, number];

const CAM: { p: number; pos: Vec3; look: Vec3 }[] = [
  { p: 0.0, pos: [0, 44, 214], look: [0, 14, -220] },
  { p: 0.18, pos: [0, 16, 92], look: [0, 6, -260] },
  { p: 0.36, pos: [0, 10, 24], look: [0, 8, -262] },
  { p: 0.58, pos: [0, 30, -122], look: [0, 34, -262] },
  { p: 0.8, pos: [0, 98, -430], look: [0, 60, -900] },
  { p: 1.0, pos: [0, 72, -560], look: [0, 60, -900] },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number) => t * t * (3 - 2 * t);
/** normalized, eased progress within [a,b] */
const seg = (p: number, a: number, b: number) => smooth(clamp01((p - a) / (b - a)));

function sampleCam(p: number, pos: THREE.Vector3, look: THREE.Vector3) {
  let i = 0;
  while (i < CAM.length - 1 && p > CAM[i + 1].p) i++;
  const a = CAM[i];
  const b = CAM[Math.min(i + 1, CAM.length - 1)];
  const t = a === b ? 0 : smooth(clamp01((p - a.p) / (b.p - a.p)));
  pos.set(
    THREE.MathUtils.lerp(a.pos[0], b.pos[0], t),
    THREE.MathUtils.lerp(a.pos[1], b.pos[1], t),
    THREE.MathUtils.lerp(a.pos[2], b.pos[2], t),
  );
  look.set(
    THREE.MathUtils.lerp(a.look[0], b.look[0], t),
    THREE.MathUtils.lerp(a.look[1], b.look[1], t),
    THREE.MathUtils.lerp(a.look[2], b.look[2], t),
  );
}

/** Macro water swell — sum of sines (from the hero water). */
function wave(x: number, z: number, t: number) {
  return (
    Math.sin(x * 0.012 + t) * 3 +
    Math.sin(z * 0.018 + t * 1.25) * 2.2 +
    Math.sin((x + z) * 0.008 + t * 0.6) * 1.4
  );
}

export default function JourneyScene({
  progress,
  reduce,
  media,
}: {
  progress: MutableRefObject<number>;
  reduce: boolean;
  /** slot → URL; replaceable from /admin, defaults baked in lib/site-content.ts */
  media: Record<string, string>;
}) {
  const { camera } = useThree();
  const [cityTex, planetTex] = useTexture([media['journey.tenochtitlan'], media['journey.mundo']]);

  useLayoutEffect(() => {
    for (const t of [cityTex, planetTex]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
  }, [cityTex, planetTex]);

  // Water geometry + cached base XY.
  const waterGeo = useMemo(() => new THREE.PlaneGeometry(4200, 4200, 90, 90), []);
  const base = useMemo(() => {
    const pos = waterGeo.attributes.position;
    const b = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      b[i * 2] = pos.getX(i);
      b[i * 2 + 1] = pos.getY(i);
    }
    return b;
  }, [waterGeo]);

  // Chinampas — floating garden tiles that ignite one by one during Act I.
  const chinampas = useMemo(() => {
    const rng = (s: number) => {
      const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr: { pos: Vec3; rot: number; scale: number; thr: number }[] = [];
    let k = 0;
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = 0; gz <= 6; gz++) {
        k++;
        const jx = (rng(k) - 0.5) * 26;
        const jz = (rng(k * 1.7) - 0.5) * 26;
        arr.push({
          pos: [gx * 46 + jx, 0.4, -40 - gz * 46 + jz],
          rot: (rng(k * 2.3) - 0.5) * 0.5,
          scale: 12 + rng(k * 3.1) * 8,
          thr: 0.14 + (gz / 6) * 0.2 + rng(k * 4.7) * 0.02,
        });
      }
    }
    return arr;
  }, []);
  const chinampaRefs = useRef<(THREE.Mesh | null)[]>([]);

  const waterMat = useRef<THREE.MeshStandardMaterial>(null);
  const cityRef = useRef<THREE.Mesh>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const motesRef = useRef<THREE.Points>(null);

  const motesGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 320;
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      a[i * 3] = (Math.random() - 0.5) * 700;
      a[i * 3 + 1] = Math.random() * 150 + 4;
      a[i * 3 + 2] = Math.random() * -600 + 40;
    }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return g;
  }, []);

  // Static baseline displacement (also the reduced-motion frame).
  useLayoutEffect(() => {
    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, wave(base[i * 2], base[i * 2 + 1], 0.4));
    pos.needsUpdate = true;
    waterGeo.computeVertexNormals();
  }, [waterGeo, base]);

  const camPos = useMemo(() => new THREE.Vector3(), []);
  const camLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const p = clamp01(progress.current);

    // Camera dolly along the act path.
    sampleCam(p, camPos, camLook);
    camera.position.lerp(camPos, 0.12);
    camera.lookAt(camLook);

    // Water swell (skipped when reduced).
    if (!reduce) {
      const t = state.clock.elapsedTime * 0.55;
      const pos = waterGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, wave(base[i * 2], base[i * 2 + 1], t));
      pos.needsUpdate = true;
      waterGeo.computeVertexNormals();

      const arr = motesGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += 0.1;
        if (arr[i + 1] > 160) arr[i + 1] = 4;
      }
      motesGeo.attributes.position.needsUpdate = true;
    }

    // Chinampa ignition.
    for (let i = 0; i < chinampas.length; i++) {
      const m = chinampaRefs.current[i];
      if (!m) continue;
      const lit = seg(p, chinampas[i].thr, chinampas[i].thr + 0.05);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + lit * 1.7;
      mat.opacity = 0.25 + lit * 0.75;
      m.scale.setScalar(chinampas[i].scale * (0.6 + lit * 0.4));
    }

    // Motes fade with Act I.
    if (motesRef.current) {
      (motesRef.current.material as THREE.PointsMaterial).opacity =
        0.7 * seg(p, 0.08, 0.22) * (1 - seg(p, 0.62, 0.78));
    }

    // City still: rise + fade in, then hand off to the planet.
    if (cityRef.current) {
      const inn = seg(p, 0.4, 0.52);
      const out = seg(p, 0.66, 0.78);
      const mat = cityRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = inn * (1 - out);
      cityRef.current.position.y = 34 - (1 - inn) * 10;
    }

    // Planet: fade in for the finale.
    if (planetRef.current) {
      const mat = planetRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = seg(p, 0.64, 0.8);
    }

    // Water dims as we leave the valley.
    if (waterMat.current) {
      waterMat.current.opacity = 1 - seg(p, 0.6, 0.8) * 0.85;
    }
  });

  return (
    <>
      <directionalLight color={0xffd9a0} intensity={1.35} position={[40, 90, -260]} />
      <hemisphereLight args={[0xffe6ad, 0x0e3f3e, 0.6]} />
      <ambientLight color={0x244b46} intensity={0.4} />

      {/* Water */}
      <mesh geometry={waterGeo} rotation-x={-Math.PI / 2} position-y={-2} renderOrder={0}>
        <meshStandardMaterial
          ref={waterMat}
          color={0x0c4a47}
          roughness={0.16}
          metalness={0.86}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Chinampas */}
      {chinampas.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => {
            chinampaRefs.current[i] = el;
          }}
          position={c.pos}
          rotation-x={-Math.PI / 2}
          rotation-z={c.rot}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1.3]} />
          <meshStandardMaterial
            color={0x2f7a3e}
            emissive={0xffcf6a}
            emissiveIntensity={0.15}
            roughness={0.7}
            metalness={0}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Light motes */}
      <points ref={motesRef} geometry={motesGeo} renderOrder={1}>
        <pointsMaterial
          color={0xffe6ad}
          size={2.6}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Tenochtitlan renace — 4K still */}
      <mesh ref={cityRef} position={[0, 34, -262]} renderOrder={2}>
        <planeGeometry args={[300, 168]} />
        <meshBasicMaterial map={cityTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* El planeta — de México al mundo */}
      <mesh ref={planetRef} position={[0, 60, -900]} renderOrder={3}>
        <planeGeometry args={[936, 524]} />
        <meshBasicMaterial map={planetTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}
