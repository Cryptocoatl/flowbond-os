import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createDeviceSchema = z.object({
  zoneId: z.string().optional(),
  name: z.string().min(1).max(128),
  type: z.enum([
    'raspberry_pi', 'soil_sensor', 'camera', 'weather_station',
    'water_flow_meter', 'water_level_sensor', 'valve_controller',
  ]),
  firmwareVersion: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET() {
  return NextResponse.json({ success: true, data: store.devices })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createDeviceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const device = {
      ...parsed.data,
      id: crypto.randomUUID(),
      status: 'offline' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.devices.push(device)
    return NextResponse.json({ success: true, data: device }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
