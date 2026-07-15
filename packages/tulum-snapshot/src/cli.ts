#!/usr/bin/env node --experimental-strip-types
// ============================================================================
// tulum-snapshot CLI — one-shot, human-run, NEVER in a request path.
//   dry-run --key <key>   reads chain, prints reconcile report, writes NOTHING
//                         to the DB (drops a local receipt keyed by config hash)
//   freeze  --key <key>   inserts holders, computes root, sets is_frozen=true
//                         — refuses without a matching dry-run receipt
//
// Freezing is PERMANENT. The DB trigger seals the holder set. There is no
// unfreeze — a mistake requires a new block height and a new snapshot row.
// ============================================================================
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getEntry, configHash } from "./config.js";
import { scan } from "./index.js";
import { reconcile, printReconcile, type Reconcile } from "./reconcile.js";

const RECEIPTS = ".snapshot-review.json"; // gitignored

type ReceiptFile = Record<string, { configHash: string; reconcile: Reconcile; at: string }>;

function readReceipts(): ReceiptFile {
  return existsSync(RECEIPTS) ? (JSON.parse(readFileSync(RECEIPTS, "utf8")) as ReceiptFile) : {};
}
function writeReceipt(key: string, hash: string, r: Reconcile): void {
  const all = readReceipts();
  all[key] = { configHash: hash, reconcile: r, at: new Date().toISOString() };
  writeFileSync(RECEIPTS, JSON.stringify(all, null, 2));
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function dryRun(key: string): Promise<void> {
  const e = getEntry(key);
  const snap = await scan(e);
  const r = reconcile(e, snap);
  printReconcile(r);
  writeReceipt(key, configHash(e), r);
  console.log(`\n📝 dry-run receipt saved for '${key}'. Review it, then: pnpm tulum-snapshot freeze --key ${key}`);
}

async function freeze(key: string): Promise<void> {
  const e = getEntry(key);
  const hash = configHash(e);
  const receipt = readReceipts()[key];
  if (!receipt || receipt.configHash !== hash) {
    throw new Error(
      `no dry-run receipt for '${key}' at the current config state (hash ${hash}). ` +
        `Run: pnpm tulum-snapshot dry-run --key ${key}`,
    );
  }
  if (!receipt.reconcile.ok) throw new Error(`dry-run for '${key}' was a HARD STOP — cannot freeze.`);

  const url = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required to freeze.");
  const sb = createClient(url, svc);

  // fresh read — the world may have moved since the dry-run (esp. Solana present-state)
  const snap = await scan(e);
  const r = reconcile(e, snap);
  printReconcile(r);
  if (!r.ok) throw new Error("re-scan at freeze time is a HARD STOP — aborting.");
  if (r.merkleRoot !== receipt.reconcile.merkleRoot) {
    console.log("⚠️  merkle root changed since dry-run (expected for Solana present-state).");
    console.log(`     reviewed ${receipt.reconcile.merkleRoot}\n     now      ${r.merkleRoot}`);
  }

  console.log(
    "\n🔒 Freezing is PERMANENT. The DB trigger seals this holder set. There is no unfreeze —\n" +
      "   a mistake requires a new block height and a new snapshot row.\n",
  );

  // 1) snapshot row (unfrozen) → 2) holders (allowed while unfrozen) → 3) freeze
  const { data: snapRow, error: se } = await sb
    .from("tulum_snapshots")
    .insert({
      key: e.key, chain: e.chain, network: e.network, chain_id: e.chainId ?? null,
      contract: e.contract, kind: e.kind, credential: e.credential,
      block_height: r.block, rpc_endpoint: r.endpoint, evidence_class: r.evidenceClass,
      total_supply: r.totalSupply, config_hash: hash, notes: e.notes ?? null,
      is_frozen: false,
    })
    .select("id")
    .single();
  if (se) throw new Error(`insert snapshot: ${se.message}`);
  const snapshotId = snapRow!.id as string;

  const rows = snap.holders.map((h) => ({
    snapshot_id: snapshotId, address_norm: h.address_norm, balance: h.balance, token_ids: h.token_ids ?? null,
  }));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error: he } = await sb.from("tulum_snapshot_holders").insert(rows.slice(i, i + 1000));
    if (he) throw new Error(`insert holders [${i}]: ${he.message}`);
  }

  const { error: fe } = await sb
    .from("tulum_snapshots")
    .update({
      merkle_root: r.merkleRoot, holder_count: r.holderCount, balance_sum: r.balanceSum,
      is_frozen: true,
    })
    .eq("id", snapshotId);
  if (fe) throw new Error(`freeze: ${fe.message}`);

  console.log(`✅ frozen '${key}' → snapshot ${snapshotId}  (${r.holderCount} holders, root ${r.merkleRoot})`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const key = arg("key");
  if (!key || (cmd !== "dry-run" && cmd !== "freeze")) {
    console.error("usage: tulum-snapshot <dry-run|freeze> --key <key>");
    process.exit(1);
  }
  if (cmd === "dry-run") await dryRun(key);
  else await freeze(key);
}

main().catch((e) => {
  console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
