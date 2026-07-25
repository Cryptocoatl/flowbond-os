'use client';
// AvatarPreview — a small live 3D portrait of the player's RPM avatar (idle,
// slow auto-rotate). Client-only (WebGL), mounts after hydration.
import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AvatarModel } from './AvatarModel';
import { avatarScale } from '@/lib/kai/avatars';

export function AvatarPreview({ url, className = '' }: { url: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={`${className} bg-black/30`} />;

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 1.45, 2.6], fov: 32 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <hemisphereLight args={['#ffffff', '#33421f', 0.9]} />
        <directionalLight position={[3, 5, 3]} intensity={1.6} />
        <Suspense fallback={null}>
          <AvatarModel url={url} position={[0, 0, 0]} scale={avatarScale(url)} />
        </Suspense>
        <OrbitControls target={[0, 1.0, 0]} enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2.2} minPolarAngle={Math.PI / 2.4} maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
    </div>
  );
}
