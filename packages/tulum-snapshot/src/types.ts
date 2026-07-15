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
  balanceSum: string; // sum of base units, decimal string
  totalSupply?: string; // at blockHeight, when knowable (EVM: must equal balanceSum)
  blockHeight: number;
  endpoint: string; // exact RPC endpoint used (auditable)
  evidenceClass: "archival" | "replay" | "present-state";
  warnings: string[];
};
