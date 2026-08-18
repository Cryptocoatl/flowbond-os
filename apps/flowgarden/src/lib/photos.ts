// SERVER-ONLY — turn stored garden photos into Claude image blocks.
//
// Photos live in the private `flowgarden-photos` bucket, so they can't be
// handed to the model as URLs; each one is signed, fetched, and inlined as
// base64. Doing it for a whole survey at once is the expensive part of the
// request, so it runs concurrently and tolerates individual failures.

import { createAdminClient } from './supabase/admin'

export type ClaudeMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface PhotoBlock {
  type: 'image'
  source: { type: 'base64'; media_type: ClaudeMediaType; data: string }
}

/** Anthropic rejects anything outside this set; HEIC has to be treated as JPEG. */
function toMediaType(contentType: string | null): ClaudeMediaType {
  const t = (contentType ?? '').toLowerCase()
  if (t.includes('png')) return 'image/png'
  if (t.includes('webp')) return 'image/webp'
  if (t.includes('gif')) return 'image/gif'
  return 'image/jpeg'
}

/**
 * Load one stored photo as a Claude image block. Returns null if the object is
 * missing or unreadable — a survey with nine good photos shouldn't fail because
 * the tenth didn't upload cleanly.
 */
export async function loadPhotoBlock(path: string): Promise<PhotoBlock | null> {
  try {
    const admin = createAdminClient()
    const { data: signed } = await admin.storage
      .from('flowgarden-photos')
      .createSignedUrl(path, 3600)
    if (!signed?.signedUrl) return null

    const res = await fetch(signed.signedUrl)
    if (!res.ok) return null

    const buf = await res.arrayBuffer()
    // Chunked conversion: btoa on a huge spread argument blows the call stack
    // for multi-MB photos.
    const bytes = new Uint8Array(buf)
    let binary = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    return {
      type: 'image',
      source: { type: 'base64', media_type: toMediaType(res.headers.get('content-type')), data: btoa(binary) },
    }
  } catch {
    return null
  }
}

/** Load many photos at once, dropping the ones that fail. Order is preserved. */
export async function loadPhotoBlocks(paths: string[]): Promise<{ blocks: PhotoBlock[]; loaded: string[] }> {
  const results = await Promise.all(
    paths.map(async p => ({ path: p, block: await loadPhotoBlock(p) })),
  )
  const ok = results.filter((r): r is { path: string; block: PhotoBlock } => r.block !== null)
  return { blocks: ok.map(r => r.block), loaded: ok.map(r => r.path) }
}

/**
 * Load a stored photo as raw bytes — what Pl@ntNet's multipart upload needs,
 * as opposed to the base64 blocks Claude takes. Returns null on any failure.
 */
export async function loadPhotoBytes(
  path: string,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    const admin = createAdminClient()
    const { data: signed } = await admin.storage
      .from('flowgarden-photos')
      .createSignedUrl(path, 3600)
    if (!signed?.signedUrl) return null
    const res = await fetch(signed.signedUrl)
    if (!res.ok) return null
    return {
      data: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get('content-type') ?? 'image/jpeg',
    }
  } catch {
    return null
  }
}
