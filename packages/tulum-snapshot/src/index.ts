// Public surface of @flowbond/tulum-snapshot.
export * from "./config.js";
export * from "./types.js";
export { merkleRoot } from "./merkle.js";
export { reconcile, printReconcile, type Reconcile } from "./reconcile.js";
export { scanEvm } from "./chains/evm.js";
export { scanNear } from "./chains/near.js";
export { scanSolana } from "./chains/solana.js";

import type { ContractEntry } from "./config.js";
import type { ChainSnapshot } from "./types.js";
import { scanEvm } from "./chains/evm.js";
import { scanNear } from "./chains/near.js";
import { scanSolana } from "./chains/solana.js";

/** Dispatch a config entry to its chain adapter. */
export function scan(e: ContractEntry): Promise<ChainSnapshot> {
  return e.chain === "evm" ? scanEvm(e) : e.chain === "near" ? scanNear(e) : scanSolana(e);
}
