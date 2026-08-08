// Shared result shape every chain adapter produces. Balances are DECIMAL
// STRINGS of raw base units — no floats, no division, ever.
export type SnapshotHolder = {
  address_norm: string;
  balance: string; // raw base units, decimal string
  token_ids?: string[]; // NFTs only
};

export type ChainSnapshot = {
  key: string;
  holders: SnapshotHolder[];
  balanceSum: string; // sum over `holders` — POST-exclusion. The ledger.
  /**
   * Sum over every positive balance the chain read produced, INCLUDING excluded
   * addresses. This — not balanceSum — is what totalSupply() must equal: the
   * exclude list is an editorial choice about who earns a credential, and must
   * never be mistaken for a broken replay. Omit when the chain can't enumerate
   * every holder (NEAR index-based discovery), where it means coverage, not truth.
   */
  supplySum?: string;
  excludedSum?: string; // what the exclude list removed (balanceSum + excludedSum == supplySum)
  totalSupply?: string; // at blockHeight, when knowable (EVM replay: must equal supplySum)
  blockHeight: number;
  endpoint: string; // exact RPC endpoint used (auditable)
  evidenceClass: "archival" | "replay" | "present-state";
  warnings: string[];
};
