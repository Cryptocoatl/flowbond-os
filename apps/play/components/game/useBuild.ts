'use client';
// useBuild — the player's co-created world. Placements are stored per world in
// localStorage (moves to the DB later so worlds can be shared/visited). Props
// are placed a few meters in front of the player, facing the camera.
import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Mirrors `props` so undo can report WHICH creation it removed synchronously —
  // a state updater doesn't run soon enough to return the value to the caller.
  const propsRef = useRef<Placed[]>([]);

  const apply = useCallback((list: Placed[]) => {
    propsRef.current = list;
    setProps(list);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(worldId));
      apply(raw ? (JSON.parse(raw) as Placed[]) : []);
    } catch {
      apply([]);
    }
  }, [worldId, apply]);

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
      const next = [...propsRef.current, p];
      apply(next);
      persist(next);
      return p;
    },
    [persist, apply],
  );

  /** Removes your most recent creation and returns it, so co-op can tell the room. */
  const undo = useCallback((): Placed | null => {
    const cur = propsRef.current;
    if (cur.length === 0) return null;
    const removed = cur[cur.length - 1];
    const next = cur.slice(0, -1);
    apply(next);
    persist(next);
    return removed;
  }, [persist, apply]);

  const clear = useCallback(() => {
    apply([]);
    persist([]);
  }, [persist, apply]);

  return { props, place, undo, clear };
}
