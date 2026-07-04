// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Sealed mode (on-device inference)  — master spec §5
//
//  This is her confessor tier: decrypt → infer → re-encrypt, ALL on device, no
//  server route ever touched. It is the only tier that earns the "literally no
//  one — not even FlowBond, not even Anthropic" claim.
//
//  M1 STATUS: DEFERRED. Shipping a quantized on-device model is a later
//  milestone (platform on-device model / WebGPU runtime). We expose the seam
//  here and report Sealed as unavailable rather than fake the guarantee — a fake
//  Sealed mode would violate §0's honesty clause.
// ════════════════════════════════════════════════════════════════════════

export const SEALED_AVAILABLE = false;

export interface SealedResult { raw: string }

/** Placeholder for the on-device path. Never claims privacy it can't deliver. */
export async function inferSealed(): Promise<SealedResult> {
  throw new Error('sealed-mode-coming'); // honest: on-device model not yet shipped
}
