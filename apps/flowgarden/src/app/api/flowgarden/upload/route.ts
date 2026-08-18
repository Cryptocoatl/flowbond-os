import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB per photo
const MAX_FILES = 24 // one walk around a garden; keeps the request under Workers' limits

interface Uploaded { path: string; name: string }
interface Rejected { name: string; reason: string }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  // `files` is the multi-photo field used by the garden survey; `file` is the
  // original single-photo field the chat composer still posts. Accept both so
  // one endpoint serves both flows.
  const incoming = [...formData.getAll('files'), ...formData.getAll('file')]
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (incoming.length === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (incoming.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many photos at once (max ${MAX_FILES}). Send them in a couple of batches.` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const uploaded: Uploaded[] = []
  const rejected: Rejected[] = []

  // Sequential rather than parallel: a phone on garden wifi uploading 20 photos
  // at once is how you get half of them timing out. Partial success is fine —
  // the caller is told exactly which ones landed.
  for (const file of incoming) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      rejected.push({ name: file.name, reason: 'not a JPEG, PNG, WebP or HEIC image' })
      continue
    }
    if (file.size > MAX_BYTES) {
      rejected.push({ name: file.name, reason: 'larger than 10 MB' })
      continue
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    // crypto.randomUUID() is a global in both Node and Workers; importing
    // node:crypto here would be one more thing to go wrong on the edge.
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    try {
      const bytes = await file.arrayBuffer()
      const { error } = await admin.storage
        .from('flowgarden-photos')
        .upload(path, new Uint8Array(bytes), { contentType: file.type, upsert: false })
      if (error) {
        rejected.push({ name: file.name, reason: error.message })
        continue
      }
      uploaded.push({ path, name: file.name })
    } catch (err) {
      rejected.push({ name: file.name, reason: err instanceof Error ? err.message : 'upload failed' })
    }
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: rejected[0]?.reason ?? 'Nothing uploaded', rejected },
      { status: 400 },
    )
  }

  return NextResponse.json({
    // Single-photo callers (the chat) read `path`; the survey reads `paths`.
    path: uploaded[0].path,
    paths: uploaded.map(u => u.path),
    uploaded,
    rejected,
  })
}
