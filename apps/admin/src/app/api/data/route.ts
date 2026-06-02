import { NextResponse } from 'next/server'
import { getData, saveData } from '@/lib/storage'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getData()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await saveData(body)
  return NextResponse.json({ ok: true })
}
