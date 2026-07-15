# @flowbond/tulum-snapshot

Offline, human-run CLI that freezes on-chain holder sets into the Supabase
`tulum_*` ledger. **OG means "was there," not "holds now."** The chain is read
once per contract, at a pinned past block; from then on the ledger is the
source of truth. Never runs in a request path.

## Commands

```bash
# reads chain, prints reconcile report, writes NOTHING to the DB (drops a receipt)
pnpm tulum-snapshot dry-run --key <key>

# inserts holders, computes root, sets is_frozen=true — refuses without a
# matching dry-run receipt for the current config state
pnpm tulum-snapshot freeze --key <key>
```

Keys (one FT per chain): `ptlc` (NEAR) · `tlmc_op` (Optimism) · `petgascoin`
(BNB) · `xelva` (Solana).

## Env (never committed)

| var | for |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `freeze` inserts |
| `OP_RPC_URL`, `BSC_RPC_URL` | EVM replay (public defaults documented as fallback) |
| `NEARBLOCKS_API_KEY` | NEAR FT holder discovery |
| `HELIUS_API_KEY` | Solana DAS — **CLI halts without it** (no heuristic fallback) |

## Evidence classes

- **archival** (NEAR) — `ft_balance_of` / `nft_tokens` at a pinned block on the archival node.
- **replay** (EVM) — fold every `Transfer` from deployBlock→pinnedBlock; sum **must** equal `totalSupply()` at the block.
- **present-state** (Solana) — no accessible historical state; weakest class, recorded as such.

## Hard stops (reconcile refuses to freeze)

- EVM replay sum ≠ `totalSupply()` at the pinned block.
- EVM replay with < 10 holders (treat as wrong address until proven otherwise).

## Open human inputs (block a full run)

1. **Pin the three historical `blockHeight`s** in `src/config.ts` (`ptlc`, `tlmc_op`, `petgascoin` — currently `PENDING`). Never `latest`, never computed. Xelva is present-state (records the current slot at read time — no pin).
2. **`HELIUS_API_KEY`** in the vault for Solana; **`NEARBLOCKS_API_KEY`** for `ptlc` holder discovery.

Freezing is **permanent** — the DB trigger seals the holder set. A mistake needs
a new block height and a new snapshot row.
