'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const PARTICLES = 380;

/** Macro swell — sum of sines (vertex displacement), from the reference. */
function wave(x: number, z: number, t: number) {
  return (
    Math.sin(x * 0.012 + t) * 3 +
    Math.sin(z * 0.018 + t * 1.25) * 2.2 +
    Math.sin((x + z) * 0.008 + t * 0.6) * 1.4 +
    Math.sin(x * 0.05 + z * 0.04 + t * 2) * 0.5
  );
}

function Water({ reduce }: { reduce: boolean }) {
  const { gl, scene, invalidate } = useThree();
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const pointer = useRef({ x: 0, y: 0 });

  // Displaced plane (water surface) + cached base XY for the wave function.
  const geo = useMemo(() => new THREE.PlaneGeometry(3600, 3600, 120, 120), []);
  const base = useMemo(() => {
    const pos = geo.attributes.position;
    const b = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      b[i * 2] = pos.getX(i);
      b[i * 2 + 1] = pos.getY(i);
    }
    return b;
  }, [geo]);

  // Light motes drifting up through the mist.
  const particleGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const a = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      a[i * 3] = (Math.random() - 0.5) * 900;
      a[i * 3 + 1] = Math.random() * 160 + 4;
      a[i * 3 + 2] = Math.random() * -700 + 60;
    }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return g;
  }, []);

  // Mouse parallax for the camera (own listener; SVG layers parallax separately).
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      pointer.current.x = e.clientX / window.innerWidth - 0.5;
      pointer.current.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduce]);

  // Real reflections: render a golden-hour sky scene (gradient dome + sun
  // sprite) into a CubeCamera, use it as the water material's envMap. Metallic
  // material → mirror that reflects the sunset. Built once.
  useEffect(() => {
    scene.fog = new THREE.Fog(0x1c6b66, 300, 1400);

    const sky = new THREE.Scene();

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const sg2d = skyCanvas.getContext('2d')!;
    const grad = sg2d.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#06201f');
    grad.addColorStop(0.42, '#114f52');
    grad.addColorStop(0.6, '#2a8e85');
    grad.addColorStop(0.68, '#e69a44');
    grad.addColorStop(0.74, '#ffce7d');
    grad.addColorStop(1, '#0b3a3a');
    sg2d.fillStyle = grad;
    sg2d.fillRect(0, 0, 16, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
    const skyGeo = new THREE.SphereGeometry(2000, 32, 16);
    sky.add(new THREE.Mesh(skyGeo, skyMat));

    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = sunCanvas.height = 128;
    const su2d = sunCanvas.getContext('2d')!;
    const rg = su2d.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, '#fff6e0');
    rg.addColorStop(0.3, '#ffd98a');
    rg.addColorStop(1, 'rgba(255,217,138,0)');
    su2d.fillStyle = rg;
    su2d.fillRect(0, 0, 128, 128);
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunMat = new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false });
    const sunSprite = new THREE.Sprite(sunMat);
    sunSprite.scale.set(700, 700, 1);
    sunSprite.position.set(0, 140, -1400);
    sky.add(sunSprite);

    const cubeRT = new THREE.WebGLCubeRenderTarget(256, {
      minFilter: THREE.LinearMipmapLinearFilter,
      generateMipmaps: true,
    });
    const cubeCam = new THREE.CubeCamera(1, 3000, cubeRT);
    cubeCam.update(gl, sky);

    if (matRef.current) {
      matRef.current.envMap = cubeRT.texture;
      matRef.current.needsUpdate = true;
    }
    invalidate(); // ensure a render after envMap is attached (covers reduced-motion)

    return () => {
      scene.fog = null;
      cubeRT.dispose();
      skyTex.dispose();
      skyMat.dispose();
      skyGeo.dispose();
      sunTex.dispose();
      sunMat.dispose();
    };
  }, [gl, scene, invalidate]);

  // Baseline displacement — also the single static frame for reduced-motion.
  useEffect(() => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, wave(base[i * 2], base[i * 2 + 1], 0.4));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    invalidate();
  }, [geo, base, invalidate]);

  useFrame((state) => {
    if (reduce) return;
    const t = state.clock.elapsedTime * 0.6;

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, wave(base[i * 2], base[i * 2 + 1], t));
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const pa = particleGeo.attributes.position as THREE.BufferAttribute;
    const arr = pa.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      arr[i * 3 + 1] += 0.12;
      if (arr[i * 3 + 1] > 170) arr[i * 3 + 1] = 4;
    }
    pa.needsUpdate = true;

    const cam = state.camera;
    cam.position.x += (pointer.current.x * 40 - cam.position.x) * 0.04;
    cam.position.y += (26 - pointer.current.y * 20 - cam.position.y) * 0.04;
    cam.lookAt(0, 2, -260);
  });

  return (
    <>
      <directionalLight color={0xffd9a0} intensity={1.2} position={[0, 90, -260]} />
      <hemisphereLight args={[0x9fe6dc, 0x1a4a40, 0.45]} />
      <ambientLight color={0x224b46} intensity={0.35} />
      <mesh geometry={geo} rotation-x={-Math.PI / 2} position-y={-2}>
        <meshStandardMaterial
          ref={matRef}
          color={0x0c4a47}
          roughness={0.1}
          metalness={0.92}
          envMapIntensity={1.25}
        />
      </mesh>
      <points geometry={particleGeo}>
        <pointsMaterial
          color={0xffe6ad}
          size={2.8}
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}

export default function HeroScene({ reduce = false }: { reduce?: boolean }) {
  return (
    <Canvas
      id="water"
      frameloop={reduce ? 'demand' : 'always'}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 52, near: 1, far: 3000, position: [0, 26, 180] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: 'absolute', inset: 0, zIndex: 3, width: '100%', height: '100%' }}
    >
      <Water reduce={reduce} />
    </Canvas>
  );
}
