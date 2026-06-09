// Minimal ambient types for secrets.js-grempe (audited Shamir Secret Sharing).
// We use only share/combine over hex strings.
declare module 'secrets.js-grempe' {
  export function share(secretHex: string, numShares: number, threshold: number, padLength?: number): string[];
  export function combine(shares: string[]): string;
  export function newShare(id: number | string, shares: string[]): string;
  export function init(bits?: number): void;
}
