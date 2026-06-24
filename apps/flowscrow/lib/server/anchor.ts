import 'server-only';
import { encodeFunctionData, type Hex } from 'viem';

// Base (L2) proof-of-existence anchoring. The actual transaction is signed and
// paid by the anchoring party's own wallet client-side (non-custodial); this
// module only builds the calldata and reports config. Nothing sensitive is ever
// placed on-chain — only a keccak256 package hash + deal id.

export interface AnchorConfig {
  chainId: number;
  rpcUrl: string;
  easContract: string | null;
  easSchemaUid: string | null;
  anchorContract: string | null;
}

export function anchorConfig(): AnchorConfig {
  return {
    chainId: Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453'),
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org',
    easContract: process.env.NEXT_PUBLIC_EAS_CONTRACT || null,
    easSchemaUid: process.env.NEXT_PUBLIC_EAS_SCHEMA_UID || null,
    anchorContract: process.env.NEXT_PUBLIC_FLOWSCROW_ANCHOR_CONTRACT || null,
  };
}

// Minimal fallback contract: FlowScrowAnchor.anchor(bytes32 dealId, bytes32 packageHash).
export const FLOWSCROW_ANCHOR_ABI = [
  {
    type: 'function',
    name: 'anchor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes32' },
      { name: 'packageHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

// EAS attest(AttestationRequest) — preferred path on Base.
export const EAS_ABI = [
  {
    type: 'function',
    name: 'attest',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

export interface AnchorCall {
  to: Hex;
  data: Hex;
  mode: 'eas' | 'contract';
}

/**
 * Build the transaction the client wallet should send. Prefers EAS when a schema
 * UID is configured; otherwise targets the minimal FlowScrowAnchor contract.
 * `easData` must be the ABI-encoded (bytes32 dealId, bytes32 packageHash, string
 * status) tuple, encoded client-side or via a shared encoder.
 */
export function buildAnchorCall(opts: {
  dealIdBytes32: Hex;
  packageHash: Hex;
  easEncodedData?: Hex;
}): AnchorCall | null {
  const cfg = anchorConfig();

  if (cfg.easContract && cfg.easSchemaUid && opts.easEncodedData) {
    const data = encodeFunctionData({
      abi: EAS_ABI,
      functionName: 'attest',
      args: [
        {
          schema: cfg.easSchemaUid as Hex,
          data: {
            recipient: '0x0000000000000000000000000000000000000000',
            expirationTime: 0n,
            revocable: true,
            refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
            data: opts.easEncodedData,
            value: 0n,
          },
        },
      ],
    });
    return { to: cfg.easContract as Hex, data, mode: 'eas' };
  }

  if (cfg.anchorContract) {
    const data = encodeFunctionData({
      abi: FLOWSCROW_ANCHOR_ABI,
      functionName: 'anchor',
      args: [opts.dealIdBytes32, opts.packageHash],
    });
    return { to: cfg.anchorContract as Hex, data, mode: 'contract' };
  }

  return null; // no anchoring target configured — step is skippable
}
