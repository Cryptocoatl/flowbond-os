// ============================================================================
// Solana adapter — HONEST present-state read via Helius DAS.
// Solana has no cheap historical state, so this is a present-state snapshot
// (weaker evidence class — recorded as such). No decimals=0/amount=1 heuristic:
// that counts "is NFT-like," not "is a Gorillae." If HELIUS_API_KEY is absent
// we HALT with a clear message — we do not degrade to the heuristic.
// Base58 is CASE-SENSITIVE — never lowercase it (must match the claim path).
// ============================================================================
import { type ContractEntry } from "../config.js";
import type { ChainSnapshot, SnapshotHolder } from "../types.js";

export class MissingHeliusKeyError extends Error {
  constructor() {
    super(
      "HELIUS_API_KEY is not set. Solana needs DAS — add it to the vault " +
        "(claudia keys set tulum HELIUS_API_KEY) and export it for the CLI. " +
        "Refusing to fall back to the decimals-heuristic (it can't tell collections apart).",
    );
    this.name = "MissingHeliusKeyError";
  }
}

function heliusUrl(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new MissingHeliusKeyError();
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

async function das(method: string, params: unknown): Promise<any> {
  const res = await fetch(heliusUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "tulum", method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Helius ${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

/** FT: every token account for a mint, paginated to exhaustion. */
async function scanFt(e: ContractEntry): Promise<SnapshotHolder[]> {
  const byOwner = new Map<string, bigint>();
  let cursor: string | undefined;
  for (;;) {
    const page: any = await das("getTokenAccounts", { mint: e.contract, limit: 1000, cursor });
    const accounts = page?.token_accounts ?? [];
    for (const a of accounts) {
      const amt = BigInt(a.amount ?? "0");
      if (amt > 0n) byOwner.set(a.owner, (byOwner.get(a.owner) ?? 0n) + amt);
    }
    if (!page?.cursor || accounts.length === 0) break;
    cursor = page.cursor;
  }
  return [...byOwner.entries()].map(([owner, bal]) => ({ address_norm: owner, balance: bal.toString() }));
}

/** NFT: every asset in a verified collection, paginated to exhaustion. */
async function scanNft(e: ContractEntry): Promise<SnapshotHolder[]> {
  const byOwner = new Map<string, string[]>();
  let page = 1;
  for (;;) {
    const res: any = await das("getAssetsByGroup", {
      groupKey: "collection",
      groupValue: e.contract,
      page,
      limit: 1000,
    });
    const items = res?.items ?? [];
    for (const it of items) {
      const owner = it.ownership?.owner;
      if (!owner) continue;
      const arr = byOwner.get(owner) ?? [];
      arr.push(it.id);
      byOwner.set(owner, arr);
    }
    if (items.length < 1000) break; // default page size undercounts if you stop early
    page += 1;
  }
  return [...byOwner.entries()].map(([owner, ids]) => ({ address_norm: owner, balance: String(ids.length), token_ids: ids }));
}

export async function scanSolana(e: ContractEntry): Promise<ChainSnapshot> {
  heliusUrl(); // fail fast if the key is missing
  const slot = (await das("getSlot", [])) as number; // present-state: record the slot read at
  const excluded = new Set(e.excludeList.map((x) => x.address)); // case-sensitive
  const raw = e.kind === "ft" ? await scanFt(e) : await scanNft(e);
  const holders = raw.filter((h) => !excluded.has(h.address_norm));
  const balanceSum = holders.reduce((a, h) => a + BigInt(h.balance), 0n);
  return {
    key: e.key,
    holders,
    balanceSum: balanceSum.toString(),
    blockHeight: Number(slot) || 0,
    endpoint: "https://mainnet.helius-rpc.com (DAS)",
    evidenceClass: "present-state",
    warnings: [
      "present-state read; Solana has no accessible historical state — weaker evidence class than EVM replay / NEAR archival",
    ],
  };
}
