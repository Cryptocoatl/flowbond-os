import { keccak256, toHex, type Hex } from 'viem';
import type { FlowDocument, Task } from './types';

/** Stable keccak256 over the confirmed task set (codes + statuses). */
export function tasksHash(tasks: Task[]): Hex {
  const canonical = tasks
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((t) => `${t.code}:${t.status}`)
    .join('|');
  return keccak256(toHex(canonical));
}

/**
 * The proof-of-existence package hash anchored on Base:
 *   keccak256(agreement.sha256 ‖ courtesy_letter.sha256 ‖ tasksHash).
 * Contains no PII, document contents, or keys — only hashes.
 */
export function packageHash(documents: FlowDocument[], tasks: Task[]): Hex {
  const agreement = documents.find((d) => d.kind === 'agreement')?.sha256 ?? '';
  const letter = documents.find((d) => d.kind === 'courtesy_letter')?.sha256 ?? '';
  const material = `${agreement}‖${letter}‖${tasksHash(tasks)}`;
  return keccak256(toHex(material));
}

/** keccak256 over an arbitrary uuid, as a bytes32 for the EAS/anchor calldata. */
export function dealIdBytes32(dealId: string): Hex {
  return keccak256(toHex(dealId));
}
