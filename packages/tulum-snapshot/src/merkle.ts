// ============================================================================
// Merkle root — boring and reproducible on purpose.
//   leaf   = keccak256( utf8(address_norm) ++ ":" ++ utf8(balance_decimal) )
//   sort   leaves bytewise ascending
//   build  pair-hash upward; duplicate the last node on odd levels
// Anyone re-running the same frozen holder set must get a byte-identical root.
// ============================================================================
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils";

export type Holder = { address_norm: string; balance: string }; // balance = decimal string, base units

const COLON = utf8ToBytes(":");

function leaf(h: Holder): Uint8Array {
  return keccak_256(concatBytes(utf8ToBytes(h.address_norm), COLON, utf8ToBytes(h.balance)));
}

function cmp(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/** Root over the holder set. Empty set → 0x0…0 (32 zero bytes). */
export function merkleRoot(holders: Holder[]): string {
  if (holders.length === 0) return "0x" + "00".repeat(32);
  let level = holders.map(leaf).sort(cmp);
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last on odd
      next.push(keccak_256(concatBytes(left, right)));
    }
    level = next;
  }
  return "0x" + bytesToHex(level[0]);
}
