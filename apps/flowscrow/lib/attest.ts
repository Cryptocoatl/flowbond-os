import { getAddress } from 'viem';

// Client-safe (no server-only). The canonical attestation message both the client
// (to sign) and the server (to verify) must build identically.
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
