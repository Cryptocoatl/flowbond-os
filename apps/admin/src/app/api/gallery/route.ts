import { NextResponse } from 'next/server'
import { uploadImage, deleteImage } from '@/lib/storage'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const caption = (form.get('caption') as string) ?? ''

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const image = await uploadImage(file, caption)
  return NextResponse.json(image)
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, pathname } = await req.json()
  await deleteImage(id, pathname)
  return NextResponse.json({ ok: true })
}
