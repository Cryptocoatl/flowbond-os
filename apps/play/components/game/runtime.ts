// Shared, mutable player/input runtime for the 3D world. Kept in one module so
// both the R3F scene (Player, targets) and the DOM HUD (compass, minimap) read
// the same live values each frame without React re-renders.
import * as THREE from 'three';

export const input = {
  f: 0,
  b: 0,
  l: 0,
  r: 0,
  jx: 0,
  jy: 0,
  yaw: 0,
  pitch: -0.25,
  drag: false,
  lastX: 0,
  lastY: 0,
  /** true while jump/ascend is held (rising edge = jump; held = swim up). */
  jumpHeld: false,
  /** true while sprinting. */
  run: false,
  /** third-person camera distance (zoom). */
  dist: 8,
  /** transient upward launch from a jump pad. */
  launch: 0,
  /** one-shot dash request (burst of speed). */
  dashReq: false,
};

export const playerPos = new THREE.Vector3(0, 0, 0);
export const playerState = { moving: false, face: Math.PI, grounded: true };
/** physics for the current world (set from the world theme). */
export const phys = { grav: 22, jump: 8.6, swim: false };
