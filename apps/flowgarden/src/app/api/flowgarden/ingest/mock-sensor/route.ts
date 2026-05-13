import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'
import type { IngestSensorPayload } from '@flowbond/core'

export const dynamic = 'force-dynamic'

// Mock ingestion endpoint — simulates a Raspberry Pi posting sensor data.
// Future: this same endpoint accepts real hardware payloads.
const ingestSchema = z.object({
  device_id: z.string(),
  garden_zone_id: z.string().optional(),
  readings: z.array(z.object({
    type: z.enum(['soil_moisture', 'temperature', 'humidity', 'light', 'ph', 'ec', 'water_level', 'water_flow']),
    value: z.number(),
    unit: z.string(),
  })),
  recorded_at: z.string().datetime(),
  source: z.enum(['manual', 'raspberry_pi', 'api', 'mock']),
})

export async function POST(req: Request) {
  try {
    const body: IngestSensorPayload = await req.json()
    const parsed = ingestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const { device_id, garden_zone_id, readings, recorded_at, source } = parsed.data

    // Optionally update device last_seen_at
    const deviceIdx = store.devices.findIndex(d => d.id === device_id)
    if (deviceIdx !== -1) {
      store.devices[deviceIdx] = {
        ...store.devices[deviceIdx],
        status: 'online',
        lastSeenAt: new Date(recorded_at),
        updatedAt: new Date(),
      }
    }

    const created = readings.map(r => ({
      id: crypto.randomUUID(),
      deviceId: device_id,
      zoneId: garden_zone_id,
      readingType: r.type,
      value: r.value,
      unit: r.unit,
      source,
      recordedAt: new Date(recorded_at),
      createdAt: new Date(),
    }))

    store.sensorReadings.push(...created)

    return NextResponse.json({
      success: true,
      data: {
        ingested: created.length,
        readings: created,
        device_status: deviceIdx !== -1 ? 'updated' : 'not_found',
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid payload' } },
      { status: 500 },
    )
  }
}
