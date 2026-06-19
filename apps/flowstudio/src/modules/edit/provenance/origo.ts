// ── L6 provenance · Origo registration ───────────────────────────────────────
// Mints the IP record on Origo (C2PA manifest + Story Protocol terms + FBID
// Proof-of-Human) and returns a hosted verify URL + badge. The hosted record is
// the durable proof because social platforms strip embedded metadata on upload.
//
// v1 status: posts to ORIGO_API_URL when configured; otherwise returns a clear
// "not configured" result instead of failing the whole render. On-chain Story
// Protocol registration is performed server-side by Origo (the @story-protocol
// SDK lives behind that API), so this client stays thin.
import type { Provenance } from '../types';

export interface OrigoResult {
  registered: boolean;
  url?: string;
  badge?: string;
  reason?: string;
}

export async function registerOnOrigo(
  mp4Path: string,
  manifest: { manifestPath: string },
  provenance: Provenance,
  meta: { title: string; author: string },
): Promise<OrigoResult> {
  const base = process.env.ORIGO_API_URL;
  const key = process.env.ORIGO_API_KEY;
  if (!base || !key) {
    return { registered: false, reason: 'Origo not configured (ORIGO_API_URL / ORIGO_API_KEY).' };
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/ip-assets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        title: meta.title,
        author: meta.author,
        fbid: provenance.fbid,
        license: provenance.license,
        proofOfHuman: provenance.proofOfHuman,
        // Honest component labeling travels with the registration.
        components: provenance.components,
        artifact: { kind: 'video/mp4', localPath: mp4Path, manifest: manifest.manifestPath },
        storyProtocol: { register: true, rpc: process.env.STORY_PROTOCOL_RPC || undefined },
      }),
    });
    if (!res.ok) return { registered: false, reason: `Origo ${res.status}: ${await res.text()}` };
    const data: any = await res.json();
    return { registered: true, url: data.url ?? data.verifyUrl, badge: data.badge ?? 'Verified on Origo' };
  } catch (e: any) {
    return { registered: false, reason: e?.message ?? 'Origo registration failed.' };
  }
}
