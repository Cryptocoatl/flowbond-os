// ============================================================================
// Contract registry — the single, typed source of truth for every snapshot.
// One entry == one tulum_snapshots row. zod-validated. Addresses and block
// heights are LITERALS chosen by a human; reproducibility is the product —
// anyone re-running must get a byte-identical merkle root.
//
// Two sentinels are honored deliberately:
//   MISSING  contract address not yet known → loadConfig() THROWS
//            (MissingContractError). A skipped snapshot is a seal nobody can
//            ever claim and nobody notices — so we refuse to load silently.
//   PENDING  block height not yet pinned by a human → the adapter THROWS when
//            it tries to read (MissingBlockHeightError). Config still loads so
//            the rest of the pipeline typechecks and other keys can run.
// ============================================================================
import { z } from "zod";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export const MISSING = "MISSING" as const; // unknown contract address
export const PENDING = 0 as const; //         unpinned block height

export class MissingContractError extends Error {
  constructor(public key: string) {
    super(
      `MissingContractError('${key}'): contract address is a TODO. A skipped ` +
        `snapshot is a seal nobody can claim — set the real address in config ` +
        `before loading. Get it from /admin (tulumcoin_contracts) or the human.`,
    );
    this.name = "MissingContractError";
  }
}

export class MissingBlockHeightError extends Error {
  constructor(public key: string) {
    super(
      `MissingBlockHeightError('${key}'): block height is PENDING. A human must ` +
        `pin an exact past block (never 'latest', never computed) before this ` +
        `snapshot can be read.`,
    );
    this.name = "MissingBlockHeightError";
  }
}

const ExcludeEntry = z.object({
  address: z.string(),
  reason: z.string(),
});

const ContractEntry = z.object({
  key: z.string(),
  chain: z.enum(["near", "evm", "solana"]),
  network: z.string(),
  chainId: z.number().int().optional(), // EVM only
  contract: z.string(), // MISSING allowed pre-validation; loadConfig rejects it
  kind: z.enum(["ft", "nft"]),
  credential: z.string(),
  blockHeight: z.number().int().nonnegative(), // PENDING(0) allowed; adapters guard
  deployBlock: z.number().int().nonnegative().optional(), // EVM replay start (cache after discovery)
  evidenceClass: z.enum(["archival", "replay", "present-state"]),
  excludeList: z.array(ExcludeEntry).default([]),
  notes: z.string().optional(),
});

export type ContractEntry = z.infer<typeof ContractEntry>;

// ---------------------------------------------------------------------------
// THE REGISTRY. Edit here; nowhere else.
// ---------------------------------------------------------------------------
const REGISTRY: ContractEntry[] = [
  // ---- NEAR ----
  {
    key: "ptlc",
    chain: "near",
    network: "near-mainnet",
    contract: "ptlc.tkn.near",
    kind: "ft",
    credential: "OG_JAGUAR",
    blockHeight: PENDING, // TODO(human): pin an archival block
    evidenceClass: "archival",
    excludeList: [],
    notes: "NEP-141; no holder enumeration — candidates via NearBlocks, truth via archival ft_balance_of.",
  },
  {
    key: "tulumcoin_mintbase",
    chain: "near",
    network: "near-mainnet",
    contract: "tulumcoin.mintbase1.near",
    kind: "nft",
    credential: "OG_JAGUAR",
    // ⚠️ STOP-AND-ASK: ~15 nft_batch_burn ran on blocks 78,744,777–78,745,101.
    // Pin ABOVE → burned-token OGs vanish. Pin BELOW → honor later-burned tokens.
    // A human decides what OG means. Do not choose.
    blockHeight: PENDING, // TODO(human): pin relative to the burn window
    evidenceClass: "archival",
    excludeList: [],
    notes: "Mintbase store. Burn-window decision pending (blocks 78,744,777–78,745,101).",
  },
  {
    key: "tulumcoin_snft",
    chain: "near",
    network: "near-mainnet",
    contract: "tulumcoin.snft.near",
    kind: "nft",
    credential: "OG_JAGUAR",
    blockHeight: PENDING, // TODO(human): pin an archival block
    evidenceClass: "archival",
    excludeList: [],
  },

  // ---- EVM ----
  {
    key: "tlmc_op",
    chain: "evm",
    network: "optimism",
    chainId: 10,
    contract: "0x2d940cA35332B7d65fcB264d59242550a6e02f18",
    kind: "ft",
    credential: "TLMC_STEWARD",
    blockHeight: PENDING, // TODO(human): pin an Optimism block
    evidenceClass: "replay",
    excludeList: [],
    notes: "Zero public index footprint — our Transfer replay is the first real read. If holders < 10 → STOP, do not freeze.",
  },
  {
    key: "pgc_legacy",
    chain: "evm",
    network: "bsc",
    chainId: 56,
    contract: "0x28cfa181ea060446de0ddc6fd23fa1dd4dd51dd0",
    kind: "ft",
    credential: "PETGAS_OG",
    blockHeight: PENDING, // TODO(human): pin a BSC block
    evidenceClass: "replay",
    excludeList: [
      { address: "0x0847b9441E8D5e3D59550B04442d342849534099", reason: "Petgas deployer" },
    ],
    notes: 'Deprecated "Old Contract" (migrated to 0x46617e…). Snapshotted as EARLINESS evidence only — NEVER present as the current Petgas token. OlympusDAO-style fork with authority-gated unbounded mint; presence-count only, no balance-scaled XP.',
  },
  {
    key: "pgc_current",
    chain: "evm",
    network: "bsc",
    chainId: 56,
    contract: "0x46617e7bca14de818d9E5cFf2aa106b72CB33fe3",
    kind: "ft",
    credential: "PETGAS_ALLY",
    blockHeight: PENDING, // TODO(human): pin a BSC block
    evidenceClass: "replay",
    excludeList: [
      { address: "0x0847b9441E8D5e3D59550B04442d342849534099", reason: "Petgas deployer" },
    ],
  },
  {
    key: "refi_tulum",
    chain: "evm",
    network: "optimism", // TODO(human): confirm chain — Optimism or BSC?
    chainId: 10,
    contract: MISSING, // TODO(human): ReFi Tulum NFT address → loadConfig() throws until set
    kind: "nft",
    credential: "REFI_HOLDER",
    blockHeight: PENDING,
    evidenceClass: "replay",
    excludeList: [],
  },

  // ---- SOLANA ----
  {
    key: "xelva",
    chain: "solana",
    network: "solana-mainnet",
    contract: "Bkn34e6T1ZD5tZiVgTfkQQNGX5kAuLD4fWtST3tZmoon",
    kind: "ft",
    credential: "XELVA_OG",
    blockHeight: PENDING, // Solana: current slot at read time (present-state)
    evidenceClass: "present-state",
    excludeList: [],
    notes: "Present-state read; Solana has no accessible historical state — weaker evidence class than EVM replay / NEAR archival.",
  },
  {
    key: "gorillae",
    chain: "solana",
    network: "solana-mainnet",
    contract: MISSING, // TODO(human): Gorillae collection address → loadConfig() throws until set
    kind: "nft",
    credential: "XELVA_OG",
    blockHeight: PENDING,
    evidenceClass: "present-state",
    excludeList: [],
    notes: "Collection-grouped DAS read once address is known.",
  },
];

// ---------------------------------------------------------------------------
// Loader — validates, refuses MISSING addresses loudly, returns typed entries.
// ---------------------------------------------------------------------------
export function loadConfig(): ContractEntry[] {
  const parsed = z.array(ContractEntry).parse(REGISTRY);
  for (const e of parsed) {
    if (e.contract === MISSING) throw new MissingContractError(e.key);
  }
  return parsed;
}

export function getEntry(key: string): ContractEntry {
  const e = loadConfig().find((c) => c.key === key);
  if (!e) throw new Error(`unknown snapshot key: ${key}`);
  return e;
}

/** Adapters call this before reading — refuses an unpinned block height. */
export function requireBlock(e: ContractEntry): number {
  if (e.blockHeight === PENDING) throw new MissingBlockHeightError(e.key);
  return e.blockHeight;
}

/**
 * Config hash — pins the exact state that produced a snapshot. The freeze gate
 * checks that a dry-run receipt exists for THIS hash, so config drift between
 * review and freeze is caught. Covers only the fields that affect the result.
 */
export function configHash(e: ContractEntry): string {
  const canonical = JSON.stringify({
    key: e.key,
    chain: e.chain,
    network: e.network,
    chainId: e.chainId ?? null,
    contract: e.contract,
    kind: e.kind,
    blockHeight: e.blockHeight,
    excludeList: [...e.excludeList].sort((a, b) => a.address.localeCompare(b.address)),
  });
  return "0x" + bytesToHex(sha256(utf8ToBytes(canonical)));
}
