'use client';

/**
 * Gate key check: client hashes the entered passphrase with SHA-256 and
 * compares against NEXT_PUBLIC_OPENFLOW_KEY_HASH (hex). The passphrase itself
 * never ships in the bundle or the repo — only its hash.
 *
 * Default hash below = the passphrase Steph set on 2026-07-11 (she holds it).
 * To rotate: NEXT_PUBLIC_OPENFLOW_KEY_HASH=$(echo -n '<new passphrase>' | shasum -a 256 | cut -d' ' -f1)
 * in the Vercel env (Production) overrides this default; or update it here + redeploy.
 */
const DEFAULT_HASH = '6b4ce56dde28a5a512a220da1c71e42e5182f1614b9651f6cba7d04b4578a3c6';

export const OPENFLOW_KEY_HASH = (
  process.env.NEXT_PUBLIC_OPENFLOW_KEY_HASH ?? DEFAULT_HASH
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
