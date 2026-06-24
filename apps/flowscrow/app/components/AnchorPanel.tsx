'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  encodeAbiParameters,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Non-custodial Base anchor. The party signs + pays with their OWN wallet; we only
// record tx_hash + package_hash. Nothing sensitive on-chain — just two hashes.

const ANCHOR_ABI = [
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

const EAS_ABI = [
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

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function AnchorPanel({
  dealId,
  dealIdBytes32,
  packageHash,
  status,
}: {
  dealId: string;
  dealIdBytes32: Hex;
  packageHash: Hex;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const chainId = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453');
  const easContract = process.env.NEXT_PUBLIC_EAS_CONTRACT;
  const easSchema = process.env.NEXT_PUBLIC_EAS_SCHEMA_UID;
  const anchorContract = process.env.NEXT_PUBLIC_FLOWSCROW_ANCHOR_CONTRACT;

  const target =
    easContract && easSchema ? { to: easContract, mode: 'eas' as const } :
    anchorContract ? { to: anchorContract, mode: 'contract' as const } :
    null;

  async function anchor() {
    setErr(null);
    const eth = (typeof window !== 'undefined' ? (window as unknown as { ethereum?: unknown }).ethereum : null);
    if (!eth) return setErr('No browser wallet found (Coinbase Wallet / WalletConnect).');
    if (!target) return setErr('No anchoring target configured.');

    setBusy(true);
    try {
      const chain = chainId === 84532 ? baseSepolia : base;
      const wallet = createWalletClient({ chain, transport: custom(eth as never) });
      const [account] = await wallet.requestAddresses();

      let data: Hex;
      if (target.mode === 'eas') {
        const schemaData = encodeAbiParameters(
          [
            { name: 'dealId', type: 'bytes32' },
            { name: 'packageHash', type: 'bytes32' },
            { name: 'status', type: 'string' },
          ],
          [dealIdBytes32, packageHash, status],
        );
        data = encodeFunctionData({
          abi: EAS_ABI,
          functionName: 'attest',
          args: [
            {
              schema: easSchema as Hex,
              data: {
                recipient: '0x0000000000000000000000000000000000000000',
                expirationTime: 0n,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: schemaData,
                value: 0n,
              },
            },
          ],
        });
      } else {
        data = encodeFunctionData({
          abi: ANCHOR_ABI,
          functionName: 'anchor',
          args: [dealIdBytes32, packageHash],
        });
      }

      const txHash = await wallet.sendTransaction({ account, to: target.to as Hex, data, chain });

      const res = await fetch('/api/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, txHash, packageHash, chain: 'base' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'record failed');
      }
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>
        On-chain anchor <span style={{ fontSize: 11, color: '#8a978c', fontWeight: 400 }}>· optional</span>
      </h3>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.5 }}>
        Records a tamper-evident timestamp on Base — the keccak256 package hash only. Not a legal
        signature. You sign and pay gas with your own wallet.
      </p>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          color: '#8a978c',
          wordBreak: 'break-all',
          marginBottom: 10,
        }}
      >
        package {packageHash}
      </div>
      <button className="btn btn-gold" disabled={busy || !target} onClick={anchor}>
        {busy ? 'Anchoring…' : 'Anchor on Base'}
      </button>
      {!target && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#8a978c' }}>
          Configure NEXT_PUBLIC_EAS_SCHEMA_UID or NEXT_PUBLIC_FLOWSCROW_ANCHOR_CONTRACT to enable.
        </p>
      )}
      {err && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#d98c7a' }}>{err}</p>}
    </div>
  );
}
