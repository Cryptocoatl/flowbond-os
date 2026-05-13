import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createCaptureSchema = z.object({
  deviceId: z.string().optional(),
  zoneId: z.string().optional(),
  imageUrl: z.string().url(),
  capturedAt: z.string().datetime().optional(),
  source: z.enum(['manual', 'raspberry_pi', 'api', 'mock']).default('manual'),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const zoneId = searchParams.get('zoneId')

  let captures = [...store.cameraCaptures]
  if (zoneId) captures = captures.filter(c => c.zoneId === zoneId)
  captures.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())

  return NextResponse.json({ success: true, data: captures })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createCaptureSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const { capturedAt, ...rest } = parsed.data
    const capture = {
      ...rest,
      id: crypto.randomUUID(),
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      createdAt: new Date(),
    }

    store.cameraCaptures.push(capture)
    return NextResponse.json({ success: true, data: capture }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
