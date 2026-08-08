// Feature flags. Read from public env at build/edge; default OFF for anything
// that can threaten the timeline (the cinematic descent) or is not V1 scope.
export const flags = {
  /** cinematic Cesium descent intro (ADR-0004). Off by default; ship without it. */
  descent: process.env.NEXT_PUBLIC_FLAG_DESCENT === '1',
  /** show the hidden dev slider panel when the URL has ?debug=1 */
  debugPanel: true,
} as const;
