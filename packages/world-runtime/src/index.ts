// @flowbond/world-runtime — public surface.
// Re-export the canonical visual-state type so renderers depend on one shape.
export type { RegionVisualState } from '@flowbond/state-engine';
export type { SceneParams } from './sceneParams';
export { resolveSceneParams, DEFAULT_MAPPING } from './visualMapping';
export type { MappingConfig } from './visualMapping';
export { StateTween } from './tween';
export type { TweenOptions } from './tween';
// Scene + descent are heavy/DOM-bound; import from subpaths to keep them
// out of server bundles:
//   import { RegionScene } from '@flowbond/world-runtime/scene';
//   import { createDescent } from '@flowbond/world-runtime/descent';
