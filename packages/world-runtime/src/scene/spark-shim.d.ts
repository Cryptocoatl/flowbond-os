// Minimal ambient types for @sparkjsdev/spark so the package typechecks in
// Phase 0 even if upstream ships no declarations. Replace with real types once
// verified against the installed version. Only the surface we use is declared.
declare module '@sparkjsdev/spark' {
  import type { Object3D } from 'three';
  export interface SplatMeshOptions {
    url: string;
    onLoad?: () => void;
  }
  export class SplatMesh extends Object3D {
    constructor(options: SplatMeshOptions);
    numSplats: number;
    dispose(): void;
  }
}
