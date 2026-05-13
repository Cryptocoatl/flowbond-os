import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createReadingSchema = z.object({
  deviceId: z.string().optional(),
  zoneId: z.string().optional(),
  readingType: z.enum(['soil_moisture', 'temperature', 'humidity', 'light', 'ph', 'ec', 'water_level', 'water_flow']),
  value: z.number(),
  unit: z.string().min(1),
  source: z.enum(['manual', 'raspberry_pi', 'api', 'mock']).default('manual'),
  recordedAt: z.string().datetime().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const zoneId = searchParams.get('zoneId')
  const type = searchParams.get('type')

  let readings = [...store.sensorReadings]
  if (zoneId) readings = readings.filter(r => r.zoneId === zoneId)
  if (type) readings = readings.filter(r => r.readingType === type)

  readings.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
  return NextResponse.json({ success: true, data: readings })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createReadingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const { recordedAt, ...rest } = parsed.data
    const reading = {
      ...rest,
      id: crypto.randomUUID(),
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      createdAt: new Date(),
    }

    store.sensorReadings.push(reading)
    return NextResponse.json({ success: true, data: reading }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
