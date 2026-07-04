'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWalletClient, custom } from 'viem';
import { attestationMessage } from '@/lib/attest';
import { apiUrl } from '@/lib/path';

// Optional supplementary personal signature. The party signs the attestation
// message with their own wallet (EIP-191 personal_sign); the server verifies and
// stores only the address. Never a private key.
export function WalletAttest({ dealId, current }: { dealId: string; current: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function attest() {
    setErr(null);
    const eth = typeof window !== 'undefined' ? (window as unknown as { ethereum?: unknown }).ethereum : null;
    if (!eth) return setErr('No browser wallet found.');

    setBusy(true);
    try {
      const wallet = createWalletClient({ transport: custom(eth as never) });
      const [address] = await wallet.requestAddresses();
      const nonce = crypto.randomUUID();
      const message = attestationMessage(dealId, address, nonce);
      const signature = await wallet.signMessage({ account: address, message });

      const res = await fetch(apiUrl('/api/wallet/attest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, address, signature, nonce }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'attest failed');
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
        Personal wallet signature <span style={{ fontSize: 11, color: '#8a978c', fontWeight: 400 }}>· optional</span>
      </h3>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.5 }}>
        Add a supplementary signature from your own Base wallet. This is not a legal signature —
        binding execution is via DocuSign.
      </p>
      {current ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8FA98F' }}>
          bound: {current}
        </div>
      ) : (
        <button className="btn btn-ghost" disabled={busy} onClick={attest}>
          {busy ? 'Signing…' : 'Add wallet signature (Base)'}
        </button>
      )}
      {err && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#d98c7a' }}>{err}</p>}
    </div>
  );
}
