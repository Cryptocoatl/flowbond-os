// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Zero-Knowledge Crypto Spine  (lib/claudia/crypto.ts)
//  THE DEFINING INVARIANT (master spec §0):
//    Hand an attacker the Supabase service_role key + a full DB dump + every
//    backup, and they recover ZERO bytes of any message, task, or care content.
//
//  Everything in this file runs CLIENT-SIDE ONLY. The server stores ciphertext
//  and key material it cannot use. No code path here ever runs on the server,
//  and no server-side decrypt path exists at any threshold.
//
//  Primitives (no hand-rolled crypto — libsodium + an audited Shamir lib):
//    • XChaCha20-Poly1305 AEAD .......... content + envelope sealing
//    • HKDF-SHA-256 ..................... all key derivation
//    • Shamir Secret Sharing ............ secrets.js-grempe (future 3-of-5)
//
//  Key hierarchy:
//    Master Secret (MS, 256-bit, in-memory only, never transmitted)
//      └─ KEK = HKDF(MS, "claudia-kek")
//           └─ per-conversation DEK (random) — wrapped by KEK → claudia_wrapped_deks
//                └─ message/task content — XChaCha20-Poly1305 under the DEK
//
//  Factor sealing — MS is recoverable only by the user, never the server:
//    M1 LIVE: passkey (WebAuthn-PRF) + recovery (BIP39).  Each independently
//    seals MS (envelope encryption) → claudia_key_shares.sealed_share, so either
//    unlocks (recovery-backed). The Shamir machinery below is wired and ready so
//    that when ≥5 factors exist enrollment switches to a true 3-of-5 split with
//    NO schema change (sealed_share simply holds a Shamir share instead of an
//    MS envelope). See FACTORS / THRESHOLDS.
// ════════════════════════════════════════════════════════════════════════

import _sodium from './_sodium';
// secrets.js-grempe has no types; it operates on hex strings.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as secrets from 'secrets.js-grempe';
// We use ONLY the BIP39 english wordlist (pure data) from the bip39 package, and
// implement generate/validate on libsodium — bip39's own seed path pulls in Node's
// Buffer, which isn't polyfilled in the Next client bundle. Keeping crypto on
// libsodium keeps the ZK spine self-contained and browser-safe.
import { wordlists } from 'bip39';
const WORDLIST: string[] = wordlists.english;

let _ready: Promise<void> | null = null;
let sodium: typeof _sodium;

// crypto_auth_hmacsha256 / crypto_hash_sha256 exist at runtime in libsodium but
// are absent from @types/libsodium-wrappers@0.7.x — narrow a typed accessor.
interface ExtraSodium {
  crypto_auth_hmacsha256(message: Uint8Array, key: Uint8Array): Uint8Array;
  crypto_hash_sha256(message: Uint8Array): Uint8Array;
}
const ext = (): ExtraSodium => sodium as unknown as ExtraSodium;

/** Await once before any crypto call. Idempotent. */
export async function ready(): Promise<void> {
  if (!_ready) {
    _ready = _sodium.ready.then(() => {
      sodium = _sodium;
    });
  }
  return _ready;
}

// ── factor model ──────────────────────────────────────────────────────────
export type FactorId = 'passkey' | 'hwkey' | 'wallet' | 'recovery' | 'enclave2';

/** The full 5-factor scheme. `live` flags what M1 actually wires. */
export const FACTORS: Record<FactorId, { kind: 'sealing'; live: boolean; label: string }> = {
  passkey: { kind: 'sealing', live: true, label: 'Passkey (WebAuthn-PRF)' },
  recovery: { kind: 'sealing', live: true, label: 'Recovery phrase (BIP39)' },
  hwkey: { kind: 'sealing', live: false, label: 'Hardware security key (FIDO2)' },
  wallet: { kind: 'sealing', live: false, label: 'Wallet (SIWE/SIWS · ECIES)' },
  enclave2: { kind: 'sealing', live: false, label: 'Second secure-enclave passkey' },
};

/** Master-spec thresholds. M1 unlock is recovery-backed single-factor (any one
 *  live factor opens its MS envelope); the 3-of-5 / 5-of-5 Shamir thresholds
 *  activate automatically once ≥5 factors are enrolled. */
export const THRESHOLDS = { normalUnlock: 3, sensitiveOp: 5, totalShares: 5 } as const;

export const liveFactors = (): FactorId[] =>
  (Object.keys(FACTORS) as FactorId[]).filter((f) => FACTORS[f].live);

// ── byte / base64 helpers (base64 is the wire format; bytea stays at rest) ──
export const toB64 = (b: Uint8Array): string => sodium.to_base64(b, sodium.base64_variants.ORIGINAL);
export const fromB64 = (s: string): Uint8Array => sodium.from_base64(s, sodium.base64_variants.ORIGINAL);
const concat = (...parts: Uint8Array[]): Uint8Array => {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

const NPUB = () => sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES; // 24

// ── HKDF-SHA-256 (RFC 5869, single 32-byte block) ───────────────────────────
// crypto_auth_hmacsha256(message, key) — key fixed at 32 bytes, so we derive a
// fixed 32-byte domain salt and expand a single output block (we only need 256-bit keys).
function hkdf32(ikm: Uint8Array, info: string): Uint8Array {
  const salt = sodium.crypto_generichash(32, sodium.from_string('claudia/hkdf/v1'));
  const prk = ext().crypto_auth_hmacsha256(ikm, salt);                        // extract
  const block = ext().crypto_auth_hmacsha256(
    concat(sodium.from_string(info), Uint8Array.of(0x01)),
    prk,
  );                                                                          // expand T(1)
  return block; // 32 bytes
}

// ── AEAD envelope: output = nonce(24) ‖ ciphertext+tag ────────────────────
function aeadSeal(plaintext: Uint8Array, key: Uint8Array, ad: Uint8Array = new Uint8Array()): Uint8Array {
  const nonce = sodium.randombytes_buf(NPUB());
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, ad, null, nonce, key);
  return concat(nonce, ct);
}
function aeadOpen(blob: Uint8Array, key: Uint8Array, ad: Uint8Array = new Uint8Array()): Uint8Array {
  const nonce = blob.slice(0, NPUB());
  const ct = blob.slice(NPUB());
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, ad, nonce, key);
}

// ════════════════════════════════════════════════════════════════════════
//  Master Secret + key hierarchy
// ════════════════════════════════════════════════════════════════════════

/** 256-bit Master Secret. Held in memory only; NEVER persisted raw or transmitted. */
export function generateMasterSecret(): Uint8Array {
  return sodium.randombytes_buf(32);
}

/** Key-Encrypting-Key derived from the MS. Wraps every per-conversation DEK. */
export function deriveKEK(ms: Uint8Array): Uint8Array {
  return hkdf32(ms, 'claudia-kek');
}

/** A fresh per-conversation Data-Encryption-Key. */
export function randomDEK(): Uint8Array {
  return sodium.randombytes_buf(32);
}

/** Wrap a DEK under the KEK → opaque blob for claudia_wrapped_deks.wrapped_dek. */
export function wrapDEK(dek: Uint8Array, kek: Uint8Array): string {
  return toB64(aeadSeal(dek, kek));
}
export function unwrapDEK(wrapped: string, kek: Uint8Array): Uint8Array {
  return aeadOpen(fromB64(wrapped), kek);
}

// ── content encryption (messages, task bodies, thread titles) ─────────────
export interface Sealed {
  ciphertext: string; // base64 of ciphertext+tag
  nonce: string;      // base64 of the 24-byte nonce
}

/** Encrypt a UTF-8 string under a DEK. Produces base64 ciphertext + nonce — the
 *  exact shape the ciphertext-only schema (§6) stores. */
export function encryptContent(plaintext: string, dek: Uint8Array): Sealed {
  const nonce = sodium.randombytes_buf(NPUB());
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    sodium.from_string(plaintext), new Uint8Array(), null, nonce, dek,
  );
  return { ciphertext: toB64(ct), nonce: toB64(nonce) };
}

/** Decrypt back to a UTF-8 string. Throws if the tag fails (tamper / wrong key). */
export function decryptContent(sealed: Sealed, dek: Uint8Array): string {
  const pt = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, fromB64(sealed.ciphertext), new Uint8Array(), fromB64(sealed.nonce), dek,
  );
  return sodium.to_string(pt);
}

// ════════════════════════════════════════════════════════════════════════
//  Factor sealing — only the user can ever reassemble the key
// ════════════════════════════════════════════════════════════════════════

/** Envelope-seal the MS under a 32-byte factor key (M1 sealed_share format). */
export function sealMS(ms: Uint8Array, factorKey: Uint8Array): string {
  return toB64(aeadSeal(ms, factorKey));
}
/** Open an MS envelope with its factor key. Throws on wrong/absent factor. */
export function openMS(sealed: string, factorKey: Uint8Array): Uint8Array {
  return aeadOpen(fromB64(sealed), factorKey);
}

// ── Factor 4: BIP39 recovery phrase (libsodium-only, Buffer-free) ─────────
const sha256 = (b: Uint8Array): Uint8Array => ext().crypto_hash_sha256(b);
const bytesToBits = (b: Uint8Array): string =>
  Array.from(b).map((x) => x.toString(2).padStart(8, '0')).join('');
const normalizeMnemonic = (m: string): string =>
  m.normalize('NFKD').trim().toLowerCase().replace(/\s+/g, ' ');

/** Mint a fresh 24-word BIP39 recovery phrase (256-bit entropy + 8-bit checksum).
 *  Shown ONCE to the user; never stored, never transmitted. */
export function generateRecoveryMnemonic(): string {
  const entropy = sodium.randombytes_buf(32);                 // 256 bits
  const checksum = bytesToBits(sha256(entropy)).slice(0, 8);  // ENT/32 = 8 bits
  const bits = bytesToBits(entropy) + checksum;               // 264 bits = 24 × 11
  const words: string[] = [];
  for (let i = 0; i < bits.length; i += 11) {
    words.push(WORDLIST[parseInt(bits.slice(i, i + 11), 2)]);
  }
  return words.join(' ');
}

/** Validate a 24-word BIP39 phrase (membership + checksum). */
export function isValidMnemonic(mnemonic: string): boolean {
  const words = normalizeMnemonic(mnemonic).split(' ');
  if (words.length !== 24) return false;
  let bits = '';
  for (const w of words) {
    const idx = WORDLIST.indexOf(w);
    if (idx === -1) return false;
    bits += idx.toString(2).padStart(11, '0');
  }
  const entropyBits = bits.slice(0, 256);
  const checksumBits = bits.slice(256);
  const entropy = new Uint8Array(32);
  for (let i = 0; i < 32; i++) entropy[i] = parseInt(entropyBits.slice(i * 8, i * 8 + 8), 2);
  return bytesToBits(sha256(entropy)).slice(0, 8) === checksumBits;
}

/** Derive the recovery factor key from the phrase via HKDF over the normalized
 *  words. The phrase carries the full 256 bits of entropy, so this is sound. */
export function recoveryFactorKey(mnemonic: string): Uint8Array {
  return hkdf32(sodium.from_string(normalizeMnemonic(mnemonic)), 'claudia-factor-recovery');
}

// ── Factor 1: passkey via WebAuthn PRF (hmac-secret) ──────────────────────
// PRF gives us a high-entropy secret bound to a non-extractable platform key.
// The browser holds the credential; we never see private key material.
const PRF_SALT = () => sodium.crypto_generichash(32, sodium.from_string('claudia/prf/v1'));
const RP_NAME = 'ClaudIA · La Guardiana';

function bufToU8(b: ArrayBuffer | ArrayBufferView): Uint8Array {
  return b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer);
}

/** Create a passkey for this FBID with the PRF extension requested.
 *  `userId` should be the FBID (auth.uid) bytes; `userName` a display handle.
 *  Returns the credential id (base64) to persist alongside the sealed share. */
export async function enrollPasskey(userId: string, userName: string): Promise<{ credentialId: string }> {
  if (typeof navigator === 'undefined' || !navigator.credentials) {
    throw new Error('passkeys-unavailable');
  }
  // Built as an untyped literal then cast — sodium's Uint8Array<ArrayBufferLike>
  // is valid BufferSource at runtime, and `prf` extension typing varies by lib.
  const publicKey = {
    rp: { name: RP_NAME },
    user: { id: sodium.from_string(userId), name: userName, displayName: userName },
    challenge: sodium.randombytes_buf(32),
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    extensions: { prf: {} },
  };
  const cred = (await navigator.credentials.create(
    { publicKey } as unknown as CredentialCreationOptions,
  )) as PublicKeyCredential | null;
  if (!cred) throw new Error('passkey-enroll-cancelled');
  return { credentialId: toB64(bufToU8(cred.rawId)) };
}

/** Assert a passkey and derive its factor key from the PRF output.
 *  Used right after enrollment to seal the MS, and on every unlock. */
export async function passkeyFactorKey(credentialId?: string): Promise<Uint8Array> {
  if (typeof navigator === 'undefined' || !navigator.credentials) {
    throw new Error('passkeys-unavailable');
  }
  const allow = credentialId
    ? [{ type: 'public-key', id: fromB64(credentialId) }]
    : undefined;
  const publicKey = {
    challenge: sodium.randombytes_buf(32),
    allowCredentials: allow,
    userVerification: 'required',
    extensions: { prf: { eval: { first: PRF_SALT() } } },
  };
  const assertion = (await navigator.credentials.get(
    { publicKey } as unknown as CredentialRequestOptions,
  )) as PublicKeyCredential | null;
  if (!assertion) throw new Error('passkey-assert-cancelled');
  const results = assertion.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer } };
  };
  const prf = results?.prf?.results?.first;
  if (!prf) throw new Error('prf-unsupported'); // browser/authenticator lacks PRF
  return hkdf32(bufToU8(prf), 'claudia-factor-passkey');
}

// ── enrollment + unlock ceremonies ────────────────────────────────────────
export interface SealedShareRow { factor: FactorId; sealed_share: string; }

/**
 * Enrollment (M1): generate MS, seal it independently under each provided live
 * factor key. Returns the rows for claudia_key_shares + the wrapped DEK helper.
 * Only `sealed_share` blobs leave the device — the server cannot open any of them.
 */
export function enrollSealMS(
  ms: Uint8Array,
  factorKeys: Partial<Record<FactorId, Uint8Array>>,
): SealedShareRow[] {
  const rows: SealedShareRow[] = [];
  for (const f of liveFactors()) {
    const key = factorKeys[f];
    if (key) rows.push({ factor: f, sealed_share: sealMS(ms, key) });
  }
  if (!rows.length) throw new Error('no-live-factor-keys');
  return rows;
}

/** Unlock (M1): open the MS from ANY one live factor's sealed share. */
export function unlockMS(sealedShare: string, factorKey: Uint8Array): Uint8Array {
  return openMS(sealedShare, factorKey);
}

// ════════════════════════════════════════════════════════════════════════
//  Shamir machinery — wired and ready for the full 3-of-5 future
//  (M1 does not gate on this; documented so the upgrade is config, not migration)
// ════════════════════════════════════════════════════════════════════════

/** Split an MS into `n` Shamir shares with reconstruction threshold `t`. */
export function shamirSplit(
  ms: Uint8Array,
  n: number = THRESHOLDS.totalShares,
  t: number = THRESHOLDS.normalUnlock,
): string[] {
  return secrets.share(sodium.to_hex(ms), n, t);
}
/** Reconstruct an MS from ≥t Shamir shares. */
export function shamirCombine(shares: string[]): Uint8Array {
  return sodium.from_hex(secrets.combine(shares));
}

/** True once enough factors are live to use the spec's 3-of-5 Shamir unlock. */
export const shamirReady = (): boolean => liveFactors().length >= THRESHOLDS.totalShares;
