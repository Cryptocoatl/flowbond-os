'use client';
// AvatarModel — routes to either a rigged GLB avatar or a procedural one, so all
// call sites (world, preview, panel) render any avatar through one component.
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Group } from 'three';
import { isProc, procId } from '@/lib/kai/avatars';
import { ProcAvatar } from './ProcAvatar';

// A rigged GLB avatar playing its own embedded idle/walk clips (self-hosted).
function GlbAvatar({
  url,
  moving,
  scale,
  position,
}: {
  url: string;
  moving: boolean;
  scale: number;
  position?: [number, number, number];
}) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => cloneSkeleton(scene as never), [scene]);
  const { actions, names } = useAnimations(animations, group as unknown as Parameters<typeof useAnimations>[1]);

  const idleName = useMemo(() => names.find((n) => /idle/i.test(n)) ?? names[0], [names]);
  const walkName = useMemo(() => names.find((n) => /walk/i.test(n)) ?? idleName, [names, idleName]);

  useEffect(() => {
    const next = moving ? walkName : idleName;
    const prev = moving ? idleName : walkName;
    if (next && actions[next]) actions[next].reset().fadeIn(0.25).play();
    if (prev && prev !== next && actions[prev]) actions[prev].fadeOut(0.25);
  }, [moving, actions, idleName, walkName]);

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

export function AvatarModel({
  url,
  moving = false,
  scale = 1,
  position,
}: {
  url: string;
  moving?: boolean;
  scale?: number;
  position?: [number, number, number];
}) {
  if (isProc(url)) {
    return (
      <group position={position}>
        <ProcAvatar id={procId(url)} moving={moving} scale={scale} />
      </group>
    );
  }
  return <GlbAvatar url={url} moving={moving} scale={scale} position={position} />;
}

useGLTF.preload('/avatars/soldier.glb');
useGLTF.preload('/avatars/robot.glb');
