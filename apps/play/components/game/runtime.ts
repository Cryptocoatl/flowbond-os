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

/**
 * Co-op state, written once per frame by RemotePlayers and read by whatever
 * needs it (objectives, HUD) without prop-drilling through the scene.
 *
 * The "bond" is the heart of the co-op design: stay close to your teammate and
 * a link forms between you. It is never a race — the bond is the only thing
 * that opens the last objective of a mission, so the game rewards travelling
 * together rather than splitting up to finish faster.
 */
export const party = {
  /** at least one teammate is in the room */
  active: false,
  /** a teammate is within BOND_RADIUS right now */
  bonded: false,
  /** distance to the nearest teammate (Infinity when alone) */
  near: Infinity,
  /** nearest teammate's world position, for the compass arrow */
  nx: 0,
  ny: 0,
  nz: 0,
};

/** How close two guardians must be for the bond to hold. */
export const BOND_RADIUS = 12;
