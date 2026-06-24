'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Group-ZK primitive  (lib/claudia/group-crypto.ts)
//
//  This is what lets a recap or a community room be SHARED across many
//  sovereigns while the server stays blind (master spec §0 extended to groups):
//
//    • Every FBID has an IDENTITY KEYPAIR (P-256 ECDH, WebCrypto). The public
//      key is published (it's not secret); the private key is sealed in the
//      owner's vault under their KEK and never leaves the device in the clear.
//    • Every shared room has a random 32-byte ROOM KEY (RK). Shared content
//      (recap, community chat) is encrypted under RK with XChaCha20-Poly1305 —
//      reuse encryptContent/decryptContent from crypto.ts with RK as the key.
//    • RK is shared by ECIES-style wrapping: for each member we mint an
//      EPHEMERAL keypair, ECDH(ephemeral_priv, member_pub) → HKDF → wrap key,
//      seal RK under it. The server stores {ephemeral_pub, wrapped_rk} per
//      member — blobs it cannot open. Only the member, with their sealed
//      private key, can derive the wrap key and recover RK.
//
//  Dependency-free: WebCrypto for the asymmetric layer (no new npm dep), and
//  the same audited @noble symmetric primitives the rest of ClaudIA uses.
// ════════════════════════════════════════════════════════════════════════

import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { randomBytes } from '@noble/hashes/utils';
import { toB64, fromB64 } from './crypto';

const enc = new TextEncoder();
const NPUB = 24; // XChaCha20-Poly1305 nonce length
const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;

// ── byte helpers + local AEAD (mirrors crypto.ts, kept self-contained) ──────
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0); out.set(b, a.length);
  return out;
}
function hkdf32(ikm: Uint8Array, info: string): Uint8Array {
  const salt = sha256(enc.encode('claudia/hkdf/v1'));
  return hkdf(sha256, ikm, salt, info, 32);
}
function seal(plaintext: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = randomBytes(NPUB);
  return concat(nonce, xchacha20poly1305(key, nonce).encrypt(plaintext));
}
function open(blob: Uint8Array, key: Uint8Array): Uint8Array {
  return xchacha20poly1305(key, blob.slice(0, NPUB)).decrypt(blob.slice(NPUB));
}
const subtle = (): SubtleCrypto => {
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('webcrypto-unavailable');
  return crypto.subtle;
};

// ── identity keypair ────────────────────────────────────────────────────────
export interface IdentityKeyPair {
  publicJwk: JsonWebKey;     // published — server-readable, used to wrap to this FBID
  privatePkcs8: Uint8Array;  // sealed in the owner's vault, never transmitted in clear
}

/** Mint a fresh P-256 ECDH identity keypair for an FBID. */
export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const kp = await subtle().generateKey(ECDH, true, ['deriveBits']);
  const publicJwk = await subtle().exportKey('jwk', kp.publicKey);
  const privatePkcs8 = new Uint8Array(await subtle().exportKey('pkcs8', kp.privateKey));
  return { publicJwk, privatePkcs8 };
}

async function importPublic(jwk: JsonWebKey): Promise<CryptoKey> {
  return subtle().importKey('jwk', jwk, ECDH, true, []);
}
async function importPrivate(pkcs8: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey('pkcs8', pkcs8 as BufferSource, ECDH, false, ['deriveBits']);
}
async function ecdh(priv: CryptoKey, pub: CryptoKey): Promise<Uint8Array> {
  const bits = await subtle().deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  return new Uint8Array(bits);
}

// ── room key + per-member wrapping ──────────────────────────────────────────
export interface WrappedRoomKey {
  ephemeralPubJwk: JsonWebKey; // ephemeral sender public key for this member
  wrapped: string;             // base64 of AEAD(RK) under the ECDH-derived wrap key
}

/** A fresh symmetric room key — encrypts all shared content for one room. */
export function randomRoomKey(): Uint8Array {
  return randomBytes(32);
}

/** Wrap a room key TO a member, given that member's published public key. */
export async function wrapRoomKeyFor(roomKey: Uint8Array, memberPublicJwk: JsonWebKey): Promise<WrappedRoomKey> {
  const ephemeral = await subtle().generateKey(ECDH, true, ['deriveBits']);
  const memberPub = await importPublic(memberPublicJwk);
  const shared = await ecdh(ephemeral.privateKey, memberPub);
  const wrapKey = hkdf32(shared, 'claudia-room-wrap');
  const ephemeralPubJwk = await subtle().exportKey('jwk', ephemeral.publicKey);
  return { ephemeralPubJwk, wrapped: toB64(seal(roomKey, wrapKey)) };
}

/** Unwrap a room key as the member, using the member's sealed private key. */
export async function unwrapRoomKey(
  wrapped: WrappedRoomKey,
  myPrivatePkcs8: Uint8Array,
): Promise<Uint8Array> {
  const myPriv = await importPrivate(myPrivatePkcs8);
  const ephPub = await importPublic(wrapped.ephemeralPubJwk);
  const shared = await ecdh(myPriv, ephPub);
  const wrapKey = hkdf32(shared, 'claudia-room-wrap');
  return open(fromB64(wrapped.wrapped), wrapKey);
}
