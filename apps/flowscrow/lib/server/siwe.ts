import 'server-only';
import { verifyMessage, isAddress, getAddress, type Hex } from 'viem';

// Server-side verification of an optional personal wallet signature (Base/EVM).
// Non-custodial: the user signs with their own wallet; we verify and store only
// the address. Never a private key.

export interface SiweVerifyInput {
  address: string;
  message: string;
  signature: Hex;
}

/** Verify an EIP-191 personal_sign signature against the claimed address. */
export async function verifyWalletSignature(input: SiweVerifyInput): Promise<boolean> {
  if (!isAddress(input.address)) return false;
  try {
    return await verifyMessage({
      address: getAddress(input.address),
      message: input.message,
      signature: input.signature,
    });
  } catch {
    return false;
  }
}

/** Canonical attestation message a party signs to bind their wallet to a deal. */
export function attestationMessage(dealId: string, address: string, nonce: string): string {
  return [
    'FlowScrow — personal wallet attestation',
    '',
    `Deal: ${dealId}`,
    `Wallet: ${getAddress(address)}`,
    `Nonce: ${nonce}`,
    '',
    'This supplementary signature is not a legal signature. Binding execution is via DocuSign.',
  ].join('\n');
}
