'use client';
// useBuild — the player's co-created world. Placements are stored per world in
// localStorage (moves to the DB later so worlds can be shared/visited). Props
// are placed a few meters in front of the player, facing the camera.
import { useCallback, useEffect, useState } from 'react';
import { playerPos, input } from './runtime';
import type { BuildKind } from './BuiltProps';

export interface Placed {
  id: string;
  kind: BuildKind;
  x: number;
  z: number;
  rot: number;
}

const key = (worldId: string) => `kai.build.${worldId}.v1`;

export function useBuild(worldId: string) {
  const [props, setProps] = useState<Placed[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(worldId));
      setProps(raw ? (JSON.parse(raw) as Placed[]) : []);
    } catch {
      setProps([]);
    }
  }, [worldId]);

  const persist = useCallback(
    (list: Placed[]) => {
      try {
        localStorage.setItem(key(worldId), JSON.stringify(list));
      } catch {
        /* ignore */
      }
    },
    [worldId],
  );

  // place the given kind ~3.5m in front of the player, on the ground
  const place = useCallback(
    (kind: BuildKind): Placed => {
      const fx = -Math.sin(input.yaw);
      const fz = -Math.cos(input.yaw);
      const p: Placed = {
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        kind,
        x: Math.max(-150, Math.min(150, playerPos.x + fx * 3.5)),
        z: Math.max(-150, Math.min(150, playerPos.z + fz * 3.5)),
        rot: input.yaw,
      };
      setProps((prev) => {
        const next = [...prev, p];
        persist(next);
        return next;
      });
      return p;
    },
    [persist],
  );

  const undo = useCallback(() => {
    setProps((prev) => {
      const next = prev.slice(0, -1);
      persist(next);
      return next;
    });
  }, [persist]);

  const clear = useCallback(() => {
    setProps([]);
    persist([]);
  }, [persist]);

  return { props, place, undo, clear };
}
