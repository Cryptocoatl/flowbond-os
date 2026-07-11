'use client';

/**
 * Gate key check: client hashes the entered passphrase with SHA-256 and
 * compares against NEXT_PUBLIC_OPENFLOW_KEY_HASH (hex). The passphrase itself
 * never ships in the bundle — only its hash.
 *
 * PLACEHOLDER (for /test only): hash of `flows-bond-2026`.
 * ⚠️ Set the real hash in the deploy env BEFORE sharing with Jeff:
 *   NEXT_PUBLIC_OPENFLOW_KEY_HASH=$(echo -n '<real passphrase>' | shasum -a 256 | cut -d' ' -f1)
 */
const PLACEHOLDER_HASH = 'cbc6b2d89be038f4104967226a3488e5ee5ae1796d808a3cf4c8d3dbd472fab8';

export const OPENFLOW_KEY_HASH = (
  process.env.NEXT_PUBLIC_OPENFLOW_KEY_HASH ?? PLACEHOLDER_HASH
).toLowerCase();

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkKey(entered: string): Promise<boolean> {
  const hash = await sha256Hex(entered.trim());
  return hash === OPENFLOW_KEY_HASH;
}
