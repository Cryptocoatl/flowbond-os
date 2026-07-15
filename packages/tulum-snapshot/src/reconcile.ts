// ============================================================================
// Reconcile — turn a raw chain read into a reviewable report + a go/no-go.
// A human reads this before anything freezes. Hard stops:
//   • EVM replay: balance sum must equal totalSupply() to the base unit.
//   • Replay with < 10 holders: wrong address until proven otherwise.
// ============================================================================
import { merkleRoot } from "./merkle.js";
import { configHash, type ContractEntry } from "./config.js";
import type { ChainSnapshot } from "./types.js";

export type Reconcile = {
  key: string;
  block: number;
  endpoint: string;
  evidenceClass: string;
  holderCount: number;
  balanceSum: string;
  totalSupply: string | null;
  supplyMatches: boolean | null; // null when totalSupply unknown / not applicable
  merkleRoot: string;
  configHash: string;
  top10: { address: string; balance: string }[];
  warnings: string[];
  errors: string[];
  ok: boolean;
};

export function reconcile(e: ContractEntry, snap: ChainSnapshot): Reconcile {
  const errors: string[] = [];
  const root = merkleRoot(snap.holders.map((h) => ({ address_norm: h.address_norm, balance: h.balance })));

  let supplyMatches: boolean | null = null;
  if (snap.evidenceClass === "replay") {
    if (snap.totalSupply == null) {
      errors.push("EVM replay without a totalSupply() reading — cannot cross-check. Do not freeze.");
    } else {
      supplyMatches = BigInt(snap.balanceSum) === BigInt(snap.totalSupply);
      if (!supplyMatches) {
        errors.push(
          `balance sum ${snap.balanceSum} != totalSupply ${snap.totalSupply} — replay is broken. Hard stop.`,
        );
      }
    }
    if (snap.holders.length < 10) {
      errors.push(`holder count ${snap.holders.length} < 10 on a replay — treat as wrong address. Hard stop.`);
    }
  }

  const top10 = [...snap.holders]
    .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1))
    .slice(0, 10)
    .map((h) => ({ address: h.address_norm, balance: h.balance }));

  return {
    key: e.key,
    block: snap.blockHeight,
    endpoint: snap.endpoint,
    evidenceClass: snap.evidenceClass,
    holderCount: snap.holders.length,
    balanceSum: snap.balanceSum,
    totalSupply: snap.totalSupply ?? null,
    supplyMatches,
    merkleRoot: root,
    configHash: configHash(e),
    top10,
    warnings: snap.warnings,
    errors,
    ok: errors.length === 0,
  };
}

export function printReconcile(r: Reconcile): void {
  const line = "─".repeat(64);
  console.log(line);
  console.log(`  SNAPSHOT  ${r.key}   [${r.evidenceClass}]`);
  console.log(line);
  console.log(`  block         ${r.block}`);
  console.log(`  endpoint      ${r.endpoint}`);
  console.log(`  holders       ${r.holderCount}`);
  console.log(`  balance sum   ${r.balanceSum}`);
  console.log(`  totalSupply   ${r.totalSupply ?? "(n/a)"}`);
  console.log(`  supply match  ${r.supplyMatches === null ? "(n/a)" : r.supplyMatches ? "✓ exact" : "✗ MISMATCH"}`);
  console.log(`  merkle root   ${r.merkleRoot}`);
  console.log(`  config hash   ${r.configHash}`);
  console.log(`  top 10:`);
  for (const t of r.top10) console.log(`     ${t.address}  ${t.balance}`);
  for (const w of r.warnings) console.log(`  ⚠️  ${w}`);
  for (const err of r.errors) console.log(`  ⛔  ${err}`);
  console.log(`  verdict       ${r.ok ? "OK to freeze (after human review)" : "HARD STOP — do not freeze"}`);
  console.log(line);
}
